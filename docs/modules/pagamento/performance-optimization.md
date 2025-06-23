# Guia de Otimização de Performance - Módulo de Pagamento

## Visão Geral

Este documento apresenta estratégias e implementações para otimizar a performance do módulo de pagamento do Sistema SEMTAS, focando em consultas de banco de dados, cache, processamento em lote e monitoramento.

## 1. Otimização de Consultas de Banco de Dados

### 1.1 Índices Recomendados

```sql
-- Índices para consultas frequentes
CREATE INDEX CONCURRENTLY idx_pagamento_concessao_status 
  ON pagamento (concessao_id, status);

CREATE INDEX CONCURRENTLY idx_pagamento_data_prevista_liberacao 
  ON pagamento (data_prevista_liberacao) 
  WHERE status IN ('pendente', 'processando');

CREATE INDEX CONCURRENTLY idx_pagamento_beneficiario_periodo 
  ON pagamento (beneficiario_id, data_prevista_liberacao);

CREATE INDEX CONCURRENTLY idx_pagamento_created_at_status 
  ON pagamento (created_at, status);

-- Índice composto para renovação automática
CREATE INDEX CONCURRENTLY idx_concessao_renovacao 
  ON concessao (data_fim, status, renovacao_automatica) 
  WHERE renovacao_automatica = true AND status = 'ativa';
```

### 1.2 Consultas Otimizadas

#### Busca de Pagamentos por Período
```typescript
// ❌ Consulta não otimizada
async findPagamentosPorPeriodo(dataInicio: Date, dataFim: Date) {
  return this.pagamentoRepository.find({
    where: {
      dataPrevistaLiberacao: Between(dataInicio, dataFim)
    },
    relations: ['concessao', 'concessao.solicitacao', 'concessao.solicitacao.beneficiario']
  });
}

// ✅ Consulta otimizada
async findPagamentosPorPeriodoOtimizado(
  dataInicio: Date, 
  dataFim: Date,
  page: number = 1,
  limit: number = 50
) {
  const offset = (page - 1) * limit;
  
  return this.pagamentoRepository
    .createQueryBuilder('p')
    .select([
      'p.id',
      'p.numeroParcela',
      'p.valor',
      'p.dataPrevistaLiberacao',
      'p.status',
      'c.id',
      'c.numeroConcessao',
      's.id',
      'b.nome',
      'b.cpf'
    ])
    .leftJoin('p.concessao', 'c')
    .leftJoin('c.solicitacao', 's')
    .leftJoin('s.beneficiario', 'b')
    .where('p.dataPrevistaLiberacao BETWEEN :dataInicio AND :dataFim', {
      dataInicio,
      dataFim
    })
    .orderBy('p.dataPrevistaLiberacao', 'ASC')
    .offset(offset)
    .limit(limit)
    .getManyAndCount();
}
```

#### Consulta de Renovações Pendentes
```typescript
// ✅ Consulta otimizada para renovação automática
async findConcessoesParaRenovacao(diasAntecedencia: number = 30) {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() + diasAntecedencia);
  
  return this.concessaoRepository
    .createQueryBuilder('c')
    .select([
      'c.id',
      'c.numeroConcessao',
      'c.dataFim',
      'c.quantidadeParcelas',
      's.id',
      's.tipoBeneficio',
      'b.id',
      'b.nome',
      'b.cpf'
    ])
    .leftJoin('c.solicitacao', 's')
    .leftJoin('s.beneficiario', 'b')
    .where('c.renovacaoAutomatica = :renovacao', { renovacao: true })
    .andWhere('c.status = :status', { status: 'ativa' })
    .andWhere('c.dataFim <= :dataLimite', { dataLimite })
    .andWhere('c.dataFim > :hoje', { hoje: new Date() })
    .orderBy('c.dataFim', 'ASC')
    .getMany();
}
```

### 1.3 Uso de Views Materializadas

```sql
-- View materializada para relatórios de performance
CREATE MATERIALIZED VIEW mv_pagamento_estatisticas AS
SELECT 
  DATE_TRUNC('month', data_prevista_liberacao) as mes,
  status,
  COUNT(*) as quantidade,
  SUM(valor) as valor_total,
  AVG(valor) as valor_medio
FROM pagamento 
WHERE data_prevista_liberacao >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', data_prevista_liberacao), status;

-- Índice na view materializada
CREATE INDEX idx_mv_pagamento_estatisticas_mes_status 
  ON mv_pagamento_estatisticas (mes, status);

-- Refresh automático (executar via cron)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_pagamento_estatisticas;
```

## 2. Implementação de Cache

### 2.1 Cache Redis

```typescript
// cache.service.ts
import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class CacheService {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
  }
  
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }
  
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
  
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### 2.2 Cache Decorator

```typescript
// cache.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache_key';
export const CACHE_TTL = 'cache_ttl';

export const Cacheable = (key: string, ttl: number = 3600) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY, key)(target, propertyName, descriptor);
    SetMetadata(CACHE_TTL, ttl)(target, propertyName, descriptor);
  };
};

// cache.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from './cache.service';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private cacheService: CacheService,
    private reflector: Reflector
  ) {}
  
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const cacheKey = this.reflector.get<string>(CACHE_KEY, context.getHandler());
    const cacheTtl = this.reflector.get<number>(CACHE_TTL, context.getHandler());
    
    if (!cacheKey) {
      return next.handle();
    }
    
    const request = context.switchToHttp().getRequest();
    const fullCacheKey = this.buildCacheKey(cacheKey, request);
    
    // Tentar buscar do cache
    const cachedResult = await this.cacheService.get(fullCacheKey);
    if (cachedResult) {
      return of(cachedResult);
    }
    
    // Executar método e cachear resultado
    return next.handle().pipe(
      tap(async (result) => {
        await this.cacheService.set(fullCacheKey, result, cacheTtl);
      })
    );
  }
  
  private buildCacheKey(baseKey: string, request: any): string {
    const params = JSON.stringify(request.params || {});
    const query = JSON.stringify(request.query || {});
    return `${baseKey}:${Buffer.from(params + query).toString('base64')}`;
  }
}
```

### 2.3 Uso do Cache no PagamentoService

```typescript
// pagamento.service.ts (métodos com cache)
export class PagamentoService {
  
  @Cacheable('pagamento:estatisticas', 1800) // 30 minutos
  async getEstatisticasPagamento(periodo: string): Promise<any> {
    // Lógica para buscar estatísticas
    return this.pagamentoRepository
      .createQueryBuilder('p')
      .select('p.status, COUNT(*) as quantidade, SUM(p.valor) as total')
      .where('p.dataPrevistaLiberacao >= :inicio', { inicio: this.calcularDataInicio(periodo) })
      .groupBy('p.status')
      .getRawMany();
  }
  
  @Cacheable('pagamento:beneficiario', 600) // 10 minutos
  async findPagamentosByBeneficiario(beneficiarioId: string): Promise<Pagamento[]> {
    return this.pagamentoRepository.find({
      where: {
        concessao: {
          solicitacao: {
            beneficiarioId
          }
        }
      },
      relations: ['concessao'],
      order: { dataPrevistaLiberacao: 'DESC' }
    });
  }
  
  // Invalidar cache quando necessário
  async updatePagamento(id: string, updateData: any): Promise<Pagamento> {
    const pagamento = await this.pagamentoRepository.update(id, updateData);
    
    // Invalidar caches relacionados
    await this.cacheService.invalidatePattern('pagamento:estatisticas:*');
    await this.cacheService.invalidatePattern(`pagamento:beneficiario:*`);
    
    return pagamento;
  }
}
```

## 3. Processamento em Lote

### 3.1 Processamento de Renovações

```typescript
// batch-processor.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class BatchProcessorService {
  private readonly logger = new Logger(BatchProcessorService.name);
  private readonly BATCH_SIZE = 100;
  
  constructor(
    private pagamentoService: PagamentoService,
    private beneficioService: BeneficioService
  ) {}
  
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processarRenovacoesAutomaticas(): Promise<void> {
    this.logger.log('Iniciando processamento de renovações automáticas');
    
    try {
      const concessoesParaRenovar = await this.beneficioService
        .findConcessoesParaRenovacao();
      
      this.logger.log(`Encontradas ${concessoesParaRenovar.length} concessões para renovar`);
      
      // Processar em lotes
      for (let i = 0; i < concessoesParaRenovar.length; i += this.BATCH_SIZE) {
        const lote = concessoesParaRenovar.slice(i, i + this.BATCH_SIZE);
        await this.processarLoteRenovacoes(lote);
        
        // Pausa entre lotes para não sobrecarregar o sistema
        await this.sleep(1000);
      }
      
      this.logger.log('Processamento de renovações concluído');
    } catch (error) {
      this.logger.error('Erro no processamento de renovações', error);
    }
  }
  
  private async processarLoteRenovacoes(concessoes: any[]): Promise<void> {
    const promises = concessoes.map(async (concessao) => {
      try {
        await this.beneficioService.renovarConcessaoAutomatica(concessao.id);
        this.logger.debug(`Concessão ${concessao.numeroConcessao} renovada com sucesso`);
      } catch (error) {
        this.logger.error(
          `Erro ao renovar concessão ${concessao.numeroConcessao}`,
          error
        );
      }
    });
    
    await Promise.allSettled(promises);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 3.2 Processamento de Pagamentos Pendentes

```typescript
// payment-processor.service.ts
@Injectable()
export class PaymentProcessorService {
  private readonly logger = new Logger(PaymentProcessorService.name);
  
  @Cron(CronExpression.EVERY_HOUR)
  async processarPagamentosPendentes(): Promise<void> {
    this.logger.log('Iniciando processamento de pagamentos pendentes');
    
    const pagamentosPendentes = await this.pagamentoService
      .findPagamentosPendentesParaProcessamento();
    
    if (pagamentosPendentes.length === 0) {
      this.logger.log('Nenhum pagamento pendente encontrado');
      return;
    }
    
    // Agrupar por tipo de processamento
    const grupos = this.agruparPagamentosPorTipo(pagamentosPendentes);
    
    for (const [tipo, pagamentos] of Object.entries(grupos)) {
      await this.processarGrupoPagamentos(tipo, pagamentos);
    }
  }
  
  private async processarGrupoPagamentos(
    tipo: string, 
    pagamentos: Pagamento[]
  ): Promise<void> {
    this.logger.log(`Processando ${pagamentos.length} pagamentos do tipo ${tipo}`);
    
    // Processar em paralelo com limite de concorrência
    const concorrencia = 10;
    const chunks = this.chunkArray(pagamentos, concorrencia);
    
    for (const chunk of chunks) {
      const promises = chunk.map(pagamento => 
        this.processarPagamentoIndividual(pagamento)
      );
      
      await Promise.allSettled(promises);
    }
  }
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

## 4. Monitoramento de Performance

### 4.1 Métricas Customizadas

```typescript
// metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, register } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly pagamentoProcessadoCounter = new Counter({
    name: 'pagamento_processado_total',
    help: 'Total de pagamentos processados',
    labelNames: ['status', 'tipo_beneficio']
  });
  
  private readonly pagamentoProcessamentoHistogram = new Histogram({
    name: 'pagamento_processamento_duration_seconds',
    help: 'Tempo de processamento de pagamentos',
    labelNames: ['operacao'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  });
  
  private readonly renovacaoAutomaticaCounter = new Counter({
    name: 'renovacao_automatica_total',
    help: 'Total de renovações automáticas',
    labelNames: ['resultado']
  });
  
  constructor() {
    register.registerMetric(this.pagamentoProcessadoCounter);
    register.registerMetric(this.pagamentoProcessamentoHistogram);
    register.registerMetric(this.renovacaoAutomaticaCounter);
  }
  
  incrementarPagamentoProcessado(status: string, tipoBeneficio: string): void {
    this.pagamentoProcessadoCounter.inc({ status, tipo_beneficio: tipoBeneficio });
  }
  
  observarTempoProcessamento(operacao: string, tempoSegundos: number): void {
    this.pagamentoProcessamentoHistogram.observe({ operacao }, tempoSegundos);
  }
  
  incrementarRenovacaoAutomatica(resultado: 'sucesso' | 'erro'): void {
    this.renovacaoAutomaticaCounter.inc({ resultado });
  }
}
```

### 4.2 Interceptor de Performance

```typescript
// performance.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(private metricsService: MetricsService) {}
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const handler = context.getHandler().name;
    const controller = context.getClass().name;
    
    return next.handle().pipe(
      tap(() => {
        const duration = (Date.now() - startTime) / 1000;
        this.metricsService.observarTempoProcessamento(
          `${controller}.${handler}`,
          duration
        );
      })
    );
  }
}
```

## 5. Configurações de Performance

### 5.1 Configuração do TypeORM

```typescript
// database.config.ts
export const databaseConfig = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  
  // Configurações de performance
  extra: {
    max: 20, // Máximo de conexões no pool
    min: 5,  // Mínimo de conexões no pool
    acquire: 30000, // Tempo máximo para obter conexão
    idle: 10000,    // Tempo máximo de conexão inativa
    
    // Configurações específicas do PostgreSQL
    statement_timeout: 30000,
    query_timeout: 30000,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000
  },
  
  // Cache de queries
  cache: {
    type: 'redis',
    options: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    },
    duration: 30000 // 30 segundos
  },
  
  // Logging otimizado
  logging: process.env.NODE_ENV === 'development' ? 'all' : ['error'],
  maxQueryExecutionTime: 1000 // Log queries que demoram mais que 1s
};
```

### 5.2 Variáveis de Ambiente

```env
# Performance - Banco de Dados
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_QUERY_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=30000

# Performance - Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TTL_DEFAULT=3600
REDIS_MAX_MEMORY=256mb

# Performance - Processamento
BATCH_SIZE=100
MAX_CONCURRENT_JOBS=10
PROCESSING_TIMEOUT=300000

# Performance - Monitoramento
METRICS_ENABLED=true
METRICS_PORT=9090
LOG_SLOW_QUERIES=true
SLOW_QUERY_THRESHOLD=1000
```

## 6. Checklist de Otimização

### ✅ Banco de Dados
- [ ] Índices criados para consultas frequentes
- [ ] Consultas otimizadas com paginação
- [ ] Views materializadas para relatórios
- [ ] Pool de conexões configurado
- [ ] Queries lentas identificadas e otimizadas

### ✅ Cache
- [ ] Redis configurado e funcionando
- [ ] Cache implementado em métodos críticos
- [ ] Estratégia de invalidação definida
- [ ] TTL apropriado para cada tipo de dado
- [ ] Monitoramento de hit rate do cache

### ✅ Processamento
- [ ] Processamento em lote implementado
- [ ] Controle de concorrência configurado
- [ ] Jobs assíncronos para operações pesadas
- [ ] Retry automático com backoff
- [ ] Timeout configurado para operações

### ✅ Monitoramento
- [ ] Métricas de performance coletadas
- [ ] Logs estruturados implementados
- [ ] Alertas configurados para problemas
- [ ] Dashboard de monitoramento criado
- [ ] Testes de carga realizados

---

**Próximos Passos**:
1. Implementar as otimizações em ambiente de desenvolvimento
2. Realizar testes de carga para validar melhorias
3. Monitorar métricas em produção
4. Ajustar configurações baseado nos resultados
5. Documentar lições aprendidas