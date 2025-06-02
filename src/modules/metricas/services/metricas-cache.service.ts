import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import NodeCache from 'node-cache';

import { MetricaDefinicao } from '../../../entities/metrica-definicao.entity';
import { MetricaConfiguracao } from '../../../entities/metrica-configuracao.entity';
import { MetricaSnapshot } from '../../../entities/metrica-snapshot.entity';

/**
 * Serviço responsável pelo cacheamento de métricas
 * 
 * Este serviço implementa estratégias de cache para otimizar o desempenho
 * das consultas às métricas, reduzindo a carga no banco de dados.
 */
@Injectable()
export class MetricasCacheService {
  private readonly logger = new Logger(MetricasCacheService.name);
  private readonly cache: NodeCache;
  
  // Prefixos para as chaves de cache
  private readonly PREFIX_METRICA = 'metrica:';
  private readonly PREFIX_SNAPSHOT = 'snapshot:';
  private readonly PREFIX_SERIES = 'serie:';
  
  constructor(
    @InjectRepository(MetricaDefinicao)
    private readonly metricaDefinicaoRepository: Repository<MetricaDefinicao>,
    
    @InjectRepository(MetricaConfiguracao)
    private readonly metricaConfiguracaoRepository: Repository<MetricaConfiguracao>,
    
    @InjectRepository(MetricaSnapshot)
    private readonly metricaSnapshotRepository: Repository<MetricaSnapshot>,
    
    private readonly configService: ConfigService,
  ) {
    // Inicializar cache com configurações padrão
    const ttlPadrao = this.configService.get<number>('METRICAS_CACHE_TTL_SEGUNDOS') || 300; // 5 minutos
    
    this.cache = new NodeCache({
      stdTTL: ttlPadrao,
      checkperiod: 60, // Verificar expiração a cada 60 segundos
      useClones: false, // Economizar memória não clonando objetos
      deleteOnExpire: true,
      maxKeys: 10000, // Limitar número de chaves para evitar uso excessivo de memória
    });
    
    // Configurar evento para quando uma chave for removida do cache
    this.cache.on('expired', (key, value) => {
      this.logger.debug(`Cache expirado: ${key}`);
    });
    
    this.logger.log(`Serviço de cache inicializado (TTL padrão: ${ttlPadrao}s)`);
  }
  
  /**
   * Obter métrica do cache ou do banco de dados
   * @param codigo Código único da métrica
   * @returns Definição da métrica
   */
  async obterMetrica(codigo: string): Promise<MetricaDefinicao | null> {
    const cacheKey = `${this.PREFIX_METRICA}${codigo}`;
    
    // Tentar obter do cache
    const cachedMetrica = this.cache.get<MetricaDefinicao>(cacheKey);
    
    if (cachedMetrica) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cachedMetrica;
    }
    
    // Não encontrado no cache, buscar no banco de dados
    this.logger.debug(`Cache miss: ${cacheKey}`);
    
    const metrica = await this.metricaDefinicaoRepository.findOne({
      where: { codigo, ativa: true },
      relations: ['configuracoes'],
    });
    
    if (metrica) {
      // Obter configuração para definir o TTL do cache
      let ttl = 300; // Padrão: 5 minutos
      
      // Carregar o relacionamento lazy configuracoes
      const configuracoes = await metrica.configuracoes;
      
      if (configuracoes.length > 0) {
        const config = configuracoes[0];
        
        if (config.cacheamento_habilitado) {
          ttl = config.cache_ttl || ttl;
        } else {
          // Se o cacheamento estiver desabilitado, não armazenar em cache
          return metrica;
        }
      }
      
      // Armazenar no cache
      this.cache.set(cacheKey, metrica, ttl);
    }
    
    return metrica;
  }
  
  /**
   * Obter último snapshot de uma métrica
   * @param metricaId ID da métrica
   * @param dimensoes Dimensões para filtrar o snapshot
   * @returns Último snapshot disponível
   */
  async obterUltimoSnapshot(
    metricaId: string, 
    dimensoes: Record<string, any> = {}
  ): Promise<MetricaSnapshot | null> {
    // Gerar hash das dimensões
    const dimensoesHash = this.gerarHashDimensoes(dimensoes);
    
    // Gerar chave de cache
    const cacheKey = `${this.PREFIX_SNAPSHOT}${metricaId}:${dimensoesHash}`;
    
    // Tentar obter do cache
    const cachedSnapshot = this.cache.get<MetricaSnapshot>(cacheKey);
    
    if (cachedSnapshot) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cachedSnapshot;
    }
    
    // Não encontrado no cache, buscar no banco de dados
    this.logger.debug(`Cache miss: ${cacheKey}`);
    
    // Buscar a métrica e sua configuração para determinar TTL
    const metrica = await this.metricaDefinicaoRepository.findOne({
      where: { id: metricaId },
      relations: ['configuracoes'],
    });
    
    // Verificar se o cacheamento está habilitado
    let ttl = 300; // Padrão: 5 minutos
    let cacheamentoHabilitado = true;
    
    // Corrigido: Uso de lazy loading com await
    if (metrica) {
      const configuracoes = await metrica.configuracoes;
      
      if (configuracoes.length > 0) {
        const config = configuracoes[0];
        
        if (config.cacheamento_habilitado) {
          ttl = config.cache_ttl || ttl;
        } else {
          cacheamentoHabilitado = false;
        }
      }
    }
    
    // Buscar snapshot no banco de dados
    const snapshot = await this.metricaSnapshotRepository.findOne({
      where: {
        definicao_id: metricaId,
        dimensoes_hash: dimensoesHash,
      },
      order: {
        periodo_fim: 'DESC',
      },
    });
    
    if (snapshot && cacheamentoHabilitado) {
      // Armazenar no cache
      this.cache.set(cacheKey, snapshot, ttl);
    }
    
    // Se não encontrar nenhum snapshot, retornar null em vez de indefinido
    return snapshot || null;
  }
  
  /**
   * Obter série temporal de snapshots de uma métrica
   * @param metricaId ID da métrica
   * @param inicio Data de início do período
   * @param fim Data de fim do período
   * @param dimensoes Dimensões para filtrar os snapshots
   * @returns Lista de snapshots ordenados por período
   */
  async obterSerieTemporal(
    metricaId: string,
    inicio: Date,
    fim: Date,
    dimensoes: Record<string, any> = {}
  ): Promise<MetricaSnapshot[]> {
    // Gerar hash das dimensões
    const dimensoesHash = this.gerarHashDimensoes(dimensoes);
    
    // Gerar hash do período
    const periodoHash = `${inicio.toISOString()}_${fim.toISOString()}`;
    
    // Gerar chave de cache
    const cacheKey = `${this.PREFIX_SERIES}${metricaId}:${dimensoesHash}:${periodoHash}`;
    
    // Tentar obter do cache
    const cachedSerie = this.cache.get<MetricaSnapshot[]>(cacheKey);
    
    if (cachedSerie) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cachedSerie;
    }
    
    // Não encontrado no cache, buscar no banco de dados
    this.logger.debug(`Cache miss: ${cacheKey}`);
    
    // Buscar a métrica e sua configuração para determinar TTL
    const metrica = await this.metricaDefinicaoRepository.findOne({
      where: { id: metricaId },
      relations: ['configuracoes'],
    });
    
    // Verificar se o cacheamento está habilitado
    let ttl = 300; // Padrão: 5 minutos
    let cacheamentoHabilitado = true;
    
    // Corrigido: Uso de lazy loading com await
    if (metrica) {
      const configuracoes = await metrica.configuracoes;
      
      if (configuracoes.length > 0) {
        const config = configuracoes[0];
        
        if (config.cacheamento_habilitado) {
          ttl = config.cache_ttl || ttl;
        } else {
          cacheamentoHabilitado = false;
        }
      }
    }
    
    // Buscar snapshots no banco de dados
    const snapshots = await this.metricaSnapshotRepository.find({
      where: {
        definicao_id: metricaId,
        dimensoes_hash: dimensoesHash,
        periodo_inicio: inicio,
        periodo_fim: fim,
      },
      order: {
        periodo_inicio: 'ASC',
      },
    });
    
    if (snapshots.length > 0 && cacheamentoHabilitado) {
      // Armazenar no cache
      this.cache.set(cacheKey, snapshots, ttl);
    }
    
    return snapshots;
  }
  
  /**
   * Invalida o cache de uma métrica específica
   * @param metricaId ID da métrica
   */
  invalidarCacheMetrica(metricaId: string): void {
    // Buscar todas as chaves que correspondem ao padrão
    const keyPattern = new RegExp(`^(${this.PREFIX_METRICA}|${this.PREFIX_SNAPSHOT}|${this.PREFIX_SERIES}).*${metricaId}`);
    
    const chavesParaRemover: string[] = [];
    
    // Identificar chaves a serem removidas
    this.cache.keys().forEach(key => {
      if (keyPattern.test(key)) {
        chavesParaRemover.push(key);
      }
    });
    
    if (chavesParaRemover.length > 0) {
      // Remover chaves do cache
      chavesParaRemover.forEach(key => this.cache.del(key));
      this.logger.debug(`Cache invalidado para métrica ${metricaId}: ${chavesParaRemover.length} chaves removidas`);
    }
  }
  
  /**
   * Invalida todo o cache de métricas
   */
  limparCacheCompleto(): void {
    const totalChaves = this.cache.keys().length;
    this.cache.flushAll();
    this.logger.log(`Cache completo de métricas limpo: ${totalChaves} chaves removidas`);
  }
  
  /**
   * Pré-calcula e armazena em cache métricas frequentemente acessadas
   */
  async preCalcularMetricasFrequentes(): Promise<void> {
    try {
      this.logger.log('Iniciando pré-cálculo de métricas frequentes');
      
      // Buscar métricas marcadas para exibição em dashboard
      const configuracoes = await this.metricaConfiguracaoRepository.find({
        where: { exibir_dashboard: true },
        relations: ['metrica'],
        order: { prioridade_dashboard: 'ASC' },
      });
      
      if (configuracoes.length === 0) {
        this.logger.debug('Nenhuma métrica configurada para pré-cálculo');
        return;
      }
      
      this.logger.debug(`Encontradas ${configuracoes.length} métricas para pré-cálculo`);
      
      // Obter último snapshot de cada métrica e armazenar em cache
      for (const config of configuracoes) {
        // Carregar a entidade metrica para acessar suas propriedades
        const metrica = await config.metrica;
        
        if (!metrica.ativa || !config.cacheamento_habilitado) {
          continue;
        }
        
        try {
          const snapshot = await this.obterUltimoSnapshot(metrica.id);
          
          if (snapshot) {
            this.logger.debug(`Métrica pré-calculada: ${metrica.codigo}, valor: ${snapshot.valor}`);
          }
        } catch (error) {
          this.logger.error(`Erro ao pré-calcular métrica ${metrica.codigo}: ${error.message}`);
        }
      }
      
      this.logger.log('Pré-cálculo de métricas frequentes concluído');
    } catch (error) {
      this.logger.error(`Erro no pré-cálculo de métricas: ${error.message}`);
    }
  }
  
  /**
   * Gera um hash único para as dimensões
   * @param dimensoes Objeto de dimensões
   * @returns Hash das dimensões
   */
  private gerarHashDimensoes(dimensoes: Record<string, any>): string {
    const stringDimensoes = JSON.stringify(dimensoes || {});
    return crypto.createHash('sha256').update(stringDimensoes).digest('hex');
  }
  
  /**
   * Obtém estatísticas de uso do cache
   * @returns Estatísticas do cache
   */
  obterEstatisticas(): Record<string, any> {
    const estatisticas = this.cache.getStats();
    
    return {
      keys: this.cache.keys().length,
      hits: estatisticas.hits,
      misses: estatisticas.misses,
      hit_rate: estatisticas.hits / (estatisticas.hits + estatisticas.misses || 1),
      keys_by_type: {
        metrica: this.cache.keys().filter(k => k.startsWith(this.PREFIX_METRICA)).length,
        snapshot: this.cache.keys().filter(k => k.startsWith(this.PREFIX_SNAPSHOT)).length,
        serie: this.cache.keys().filter(k => k.startsWith(this.PREFIX_SERIES)).length,
      },
    };
  }
}
