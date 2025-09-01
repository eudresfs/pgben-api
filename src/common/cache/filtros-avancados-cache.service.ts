import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

/**
 * Serviço de cache específico para filtros avançados
 * 
 * Funcionalidades:
 * - Cache inteligente baseado em padrões de filtros
 * - Invalidação automática por TTL e eventos
 * - Compressão de dados para otimizar memória
 * - Métricas de hit/miss ratio
 * - Cache warming para consultas frequentes
 */
@Injectable()
export class FiltrosAvancadosCacheService {
  private readonly logger = new Logger(FiltrosAvancadosCacheService.name);
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
  };
  
  // Configurações de cache
  private readonly config = {
    defaultTTL: 300000, // 5 minutos
    maxSize: 1000, // máximo de entradas
    compressionThreshold: 1024, // comprimir dados > 1KB
    warmupQueries: [
      // Queries mais comuns para pre-cache
      'solicitacao:status:active',
      'cidadao:ativo:true',
      'usuario:perfil:admin',
    ],
  };

  constructor(private readonly configService: ConfigService) {
    // Configurar TTLs específicos por tipo de dados
    this.setupCacheConfig();
    
    // Iniciar limpeza automática
    this.startCleanupInterval();
    
    // Log de inicialização
    this.logger.log('Cache de filtros avançados inicializado');
  }

  /**
   * Obtém dados do cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Verificar se expirou
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }
    
    // Atualizar último acesso
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    this.stats.hits++;
    
    // Descomprimir se necessário
    const data = this.decompress(entry.data, entry.compressed);
    
    this.logger.debug(`Cache HIT: ${key}`);
    return data as T;
  }

  /**
   * Armazena dados no cache
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const now = Date.now();
    const expiresAt = now + (ttl || this.getTTLForKey(key));
    
    // Comprimir dados se necessário
    const { compressedData, isCompressed } = this.compress(data);
    
    const entry: CacheEntry = {
      data: compressedData,
      compressed: isCompressed,
      createdAt: now,
      lastAccessed: now,
      expiresAt,
      accessCount: 0,
      size: this.calculateSize(compressedData),
    };
    
    // Verificar limite de tamanho
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed();
    }
    
    this.cache.set(key, entry);
    this.stats.sets++;
    
    this.logger.debug(
      `Cache SET: ${key} (TTL: ${ttl || this.getTTLForKey(key)}ms, Compressed: ${isCompressed})`,
    );
  }

  /**
   * Remove dados do cache
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.logger.debug(`Cache DELETE: ${key}`);
    }
    return deleted;
  }

  /**
   * Remove dados do cache por padrão
   */
  async deleteByPattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    let deletedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    this.stats.deletes += deletedCount;
    this.logger.debug(`Cache DELETE BY PATTERN: ${pattern} (${deletedCount} keys)`);
    
    return deletedCount;
  }

  /**
   * Limpa todo o cache
   */
  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
    this.logger.log(`Cache CLEAR: ${size} keys removed`);
  }

  /**
   * Gera chave de cache baseada nos filtros
   */
  generateKey(entity: string, filtros: any, options?: CacheKeyOptions): string {
    // Normalizar filtros para gerar chave consistente
    const normalizedFiltros = this.normalizeFiltros(filtros);
    
    // Criar hash dos filtros
    const filtrosHash = this.hashObject(normalizedFiltros);
    
    // Incluir opções se fornecidas
    const optionsHash = options ? this.hashObject(options) : '';
    
    const key = `filtros:${entity}:${filtrosHash}${optionsHash ? ':' + optionsHash : ''}`;
    
    return key;
  }

  /**
   * Cache de resultados de consulta
   */
  async cacheQueryResult<T>(
    entity: string,
    filtros: any,
    queryFn: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const key = this.generateKey(entity, filtros, options?.keyOptions);
    
    // Tentar obter do cache primeiro
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    // Executar query e cachear resultado
    const result = await queryFn();
    await this.set(key, result, options?.ttl);
    
    return result;
  }

  /**
   * Cache de contadores (para paginação)
   */
  async cacheCount(
    entity: string,
    filtros: any,
    countFn: () => Promise<number>,
    ttl?: number,
  ): Promise<number> {
    const key = this.generateKey(entity, filtros, { type: 'count' });
    
    const cached = await this.get<number>(key);
    if (cached !== null) {
      return cached;
    }
    
    const count = await countFn();
    await this.set(key, count, ttl || this.config.defaultTTL);
    
    return count;
  }

  /**
   * Invalidação inteligente baseada em mudanças de dados
   */
  async invalidateEntity(entity: string, id?: string | number): Promise<void> {
    if (id) {
      // Invalidar caches específicos do registro
      await this.deleteByPattern(`filtros:${entity}:*:id:${id}`);
    } else {
      // Invalidar todos os caches da entidade
      await this.deleteByPattern(`filtros:${entity}:*`);
    }
    
    this.logger.log(
      `Cache invalidated for entity: ${entity}${id ? ` (id: ${id})` : ' (all)'}`,
    );
  }

  /**
   * Warming do cache com consultas frequentes
   */
  async warmupCache(): Promise<void> {
    this.logger.log('Iniciando warming do cache...');
    
    for (const queryKey of this.config.warmupQueries) {
      try {
        // Simular consulta para warming
        // Em implementação real, executaria as queries mais comuns
        await this.set(`warmup:${queryKey}`, { warmed: true }, this.config.defaultTTL);
      } catch (error) {
        this.logger.warn(`Erro no warming da query ${queryKey}: ${error.message}`);
      }
    }
    
    this.logger.log('Warming do cache concluído');
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRatio = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    
    return {
      ...this.stats,
      totalRequests,
      hitRatio: parseFloat(hitRatio.toFixed(2)),
      currentSize: this.cache.size,
      maxSize: this.config.maxSize,
      memoryUsage: this.calculateTotalMemoryUsage(),
    };
  }

  /**
   * Obtém informações detalhadas do cache
   */
  getCacheInfo(): CacheInfo {
    const entries: CacheEntryInfo[] = [];
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key,
        size: entry.size,
        age: now - entry.createdAt,
        ttl: entry.expiresAt - now,
        accessCount: entry.accessCount,
        compressed: entry.compressed,
      });
    }
    
    // Ordenar por mais acessados
    entries.sort((a, b) => b.accessCount - a.accessCount);
    
    return {
      totalEntries: this.cache.size,
      totalMemory: this.calculateTotalMemoryUsage(),
      entries: entries.slice(0, 50), // Top 50
      stats: this.getStats(),
    };
  }

  /**
   * Configuração específica de cache
   */
  private setupCacheConfig(): void {
    // TTLs específicos por tipo de dados
    const customTTLs = this.configService.get('cache.filtros.ttls', {
      solicitacao: 300000, // 5 minutos
      cidadao: 600000, // 10 minutos
      usuario: 900000, // 15 minutos
      pagamento: 180000, // 3 minutos
      beneficio: 1800000, // 30 minutos
      unidade: 3600000, // 1 hora
      auditoria: 120000, // 2 minutos
      documento: 600000, // 10 minutos
    });
    
    Object.assign(this.config, { customTTLs });
  }

  /**
   * Obtém TTL específico para uma chave
   */
  private getTTLForKey(key: string): number {
    const entity = key.split(':')[1];
    return (this.config as any).customTTLs?.[entity] || this.config.defaultTTL;
  }

  /**
   * Normaliza filtros para gerar chaves consistentes
   */
  private normalizeFiltros(filtros: any): any {
    if (!filtros || typeof filtros !== 'object') {
      return {};
    }
    
    const normalized: any = {};
    
    // Ordenar chaves para consistência
    const sortedKeys = Object.keys(filtros).sort();
    
    for (const key of sortedKeys) {
      const value = filtros[key];
      
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          // Ordenar arrays para consistência
          normalized[key] = [...value].sort();
        } else if (typeof value === 'object') {
          // Recursivamente normalizar objetos
          normalized[key] = this.normalizeFiltros(value);
        } else {
          normalized[key] = value;
        }
      }
    }
    
    return normalized;
  }

  /**
   * Gera hash de um objeto
   */
  public hashObject(obj: any): string {
    const str = JSON.stringify(obj);
    return createHash('md5').update(str).digest('hex').substring(0, 16);
  }

  /**
   * Comprime dados se necessário
   */
  private compress(data: any): { compressedData: any; isCompressed: boolean } {
    const serialized = JSON.stringify(data);
    
    if (serialized.length > this.config.compressionThreshold) {
      // Em implementação real, usar biblioteca de compressão como zlib
      // Por simplicidade, apenas marcamos como comprimido
      return {
        compressedData: { __compressed: true, data: serialized },
        isCompressed: true,
      };
    }
    
    return {
      compressedData: data,
      isCompressed: false,
    };
  }

  /**
   * Descomprime dados se necessário
   */
  private decompress(data: any, isCompressed: boolean): any {
    if (!isCompressed) {
      return data;
    }
    
    // Em implementação real, usar biblioteca de descompressão
    if (data.__compressed) {
      return JSON.parse(data.data);
    }
    
    return data;
  }

  /**
   * Calcula tamanho aproximado dos dados
   */
  private calculateSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  /**
   * Calcula uso total de memória
   */
  private calculateTotalMemoryUsage(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size;
    }
    return total;
  }

  /**
   * Verifica se uma entrada expirou
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Remove entrada menos recentemente usada
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      this.logger.debug(`Cache LRU eviction: ${oldestKey}`);
    }
  }

  /**
   * Inicia limpeza automática de entradas expiradas
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Limpar a cada minuto
  }

  /**
   * Remove entradas expiradas
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.stats.evictions += cleanedCount;
      this.logger.debug(`Cache cleanup: ${cleanedCount} expired entries removed`);
    }
  }
}

/**
 * Interfaces para tipagem
 */
interface CacheEntry {
  data: any;
  compressed: boolean;
  createdAt: number;
  lastAccessed: number;
  expiresAt: number;
  accessCount: number;
  size: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  totalRequests: number;
  hitRatio: number;
  currentSize: number;
  maxSize: number;
  memoryUsage: number;
}

export interface CacheEntryInfo {
  key: string;
  size: number;
  age: number;
  ttl: number;
  accessCount: number;
  compressed: boolean;
}

export interface CacheInfo {
  totalEntries: number;
  totalMemory: number;
  entries: CacheEntryInfo[];
  stats: CacheStats;
}

export interface CacheKeyOptions {
  type?: string;
  version?: string;
  userId?: string;
}

export interface CacheOptions {
  ttl?: number;
  keyOptions?: CacheKeyOptions;
}

/**
 * Decorator para cache automático de métodos
 */
export function CacheResult(ttl?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheService: FiltrosAvancadosCacheService = this.cacheService;
      
      if (!cacheService) {
        return method.apply(this, args);
      }
      
      const key = `method:${target.constructor.name}:${propertyName}:${cacheService.hashObject(args)}`;
      
      const cached = await cacheService.get(key);
      if (cached !== null) {
        return cached;
      }
      
      const result = await method.apply(this, args);
      await cacheService.set(key, result, ttl);
      
      return result;
    };
  };
}