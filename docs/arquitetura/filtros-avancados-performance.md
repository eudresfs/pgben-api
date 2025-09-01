# Filtros Avançados - Guia de Performance

## 🚀 Estratégias de Otimização

### 1. Índices de Banco de Dados

#### Índices Básicos por Módulo

```sql
-- Solicitações
CREATE INDEX CONCURRENTLY idx_solicitacao_status ON solicitacao(status);
CREATE INDEX CONCURRENTLY idx_solicitacao_tipo ON solicitacao(tipo);
CREATE INDEX CONCURRENTLY idx_solicitacao_created_at ON solicitacao(created_at);
CREATE INDEX CONCURRENTLY idx_solicitacao_updated_at ON solicitacao(updated_at);
CREATE INDEX CONCURRENTLY idx_solicitacao_arquivado ON solicitacao(arquivado);

-- Índice composto para filtros frequentes
CREATE INDEX CONCURRENTLY idx_solicitacao_status_created ON solicitacao(status, created_at DESC);
CREATE INDEX CONCURRENTLY idx_solicitacao_tipo_status ON solicitacao(tipo, status);

-- Pagamentos
CREATE INDEX CONCURRENTLY idx_pagamento_status ON pagamento(status);
CREATE INDEX CONCURRENTLY idx_pagamento_forma_pagamento ON pagamento(forma_pagamento);
CREATE INDEX CONCURRENTLY idx_pagamento_valor ON pagamento(valor);
CREATE INDEX CONCURRENTLY idx_pagamento_created_at ON pagamento(created_at);

-- Índice para faixas de valores
CREATE INDEX CONCURRENTLY idx_pagamento_valor_status ON pagamento(valor, status);

-- Usuários
CREATE INDEX CONCURRENTLY idx_usuario_status ON usuario(status);
CREATE INDEX CONCURRENTLY idx_usuario_ultimo_acesso ON usuario(ultimo_acesso);
CREATE INDEX CONCURRENTLY idx_usuario_created_at ON usuario(created_at);

-- Cidadãos
CREATE INDEX CONCURRENTLY idx_cidadao_cpf ON cidadao(cpf);
CREATE INDEX CONCURRENTLY idx_cidadao_status ON cidadao(status);
CREATE INDEX CONCURRENTLY idx_cidadao_created_at ON cidadao(created_at);
```

#### Índices para Busca Textual

```sql
-- Índices GIN para busca textual eficiente
CREATE INDEX CONCURRENTLY idx_solicitacao_search_gin 
ON solicitacao USING gin(to_tsvector('portuguese', 
  coalesce(protocolo, '') || ' ' || 
  coalesce(descricao, '')
));

CREATE INDEX CONCURRENTLY idx_cidadao_search_gin 
ON cidadao USING gin(to_tsvector('portuguese', 
  coalesce(nome, '') || ' ' || 
  coalesce(cpf, '') || ' ' || 
  coalesce(email, '')
));

CREATE INDEX CONCURRENTLY idx_usuario_search_gin 
ON usuario USING gin(to_tsvector('portuguese', 
  coalesce(nome, '') || ' ' || 
  coalesce(email, '') || ' ' || 
  coalesce(cpf, '')
));

-- Índices ILIKE para buscas parciais (fallback)
CREATE INDEX CONCURRENTLY idx_cidadao_nome_ilike ON cidadao(nome varchar_pattern_ops);
CREATE INDEX CONCURRENTLY idx_cidadao_cpf_ilike ON cidadao(cpf varchar_pattern_ops);
CREATE INDEX CONCURRENTLY idx_solicitacao_protocolo_ilike ON solicitacao(protocolo varchar_pattern_ops);
```

#### Índices para Relacionamentos

```sql
-- Foreign Keys com índices
CREATE INDEX CONCURRENTLY idx_solicitacao_cidadao_id ON solicitacao(cidadao_id);
CREATE INDEX CONCURRENTLY idx_solicitacao_unidade_id ON solicitacao(unidade_id);
CREATE INDEX CONCURRENTLY idx_solicitacao_responsavel_id ON solicitacao(responsavel_id);

CREATE INDEX CONCURRENTLY idx_pagamento_beneficiario_id ON pagamento(beneficiario_id);
CREATE INDEX CONCURRENTLY idx_pagamento_conta_bancaria_id ON pagamento(conta_bancaria_id);

-- Índices para tabelas de junção
CREATE INDEX CONCURRENTLY idx_usuario_perfil_usuario_id ON usuario_perfil(usuario_id);
CREATE INDEX CONCURRENTLY idx_usuario_perfil_perfil_id ON usuario_perfil(perfil_id);
CREATE INDEX CONCURRENTLY idx_usuario_unidade_usuario_id ON usuario_unidade(usuario_id);
CREATE INDEX CONCURRENTLY idx_usuario_unidade_unidade_id ON usuario_unidade(unidade_id);
```

### 2. Otimizações de Query

#### Query Builder Otimizado

```typescript
// ❌ RUIM: Joins desnecessários
async findAll(filtros: SolicitacaoFiltrosDto) {
  const query = this.repository
    .createQueryBuilder('solicitacao')
    .leftJoinAndSelect('solicitacao.cidadao', 'cidadao')
    .leftJoinAndSelect('solicitacao.unidade', 'unidade')
    .leftJoinAndSelect('solicitacao.responsavel', 'responsavel')
    .leftJoinAndSelect('solicitacao.documentos', 'documentos')
    .leftJoinAndSelect('solicitacao.historico', 'historico');

  return this.filtrosAvancadosService.aplicarFiltros(query, filtros);
}

// ✅ BOM: Joins condicionais
async findAll(filtros: SolicitacaoFiltrosDto) {
  const query = this.repository.createQueryBuilder('solicitacao');

  // Joins apenas quando necessário
  const needsCidadaoJoin = filtros.cidadao_cpf || 
    (filtros.searchFields && filtros.searchFields.some(f => f.includes('cidadao')));
  
  if (needsCidadaoJoin) {
    query.leftJoinAndSelect('solicitacao.cidadao', 'cidadao');
  }

  const needsUnidadeJoin = filtros.unidade_id?.length > 0;
  if (needsUnidadeJoin) {
    query.leftJoinAndSelect('solicitacao.unidade', 'unidade');
  }

  return this.filtrosAvancadosService.aplicarFiltros(query, filtros);
}
```

#### Seleção de Campos Específicos

```typescript
// ✅ BOM: Selecionar apenas campos necessários
async findAllMinimal(filtros: SolicitacaoFiltrosDto) {
  const query = this.repository
    .createQueryBuilder('solicitacao')
    .select([
      'solicitacao.id',
      'solicitacao.protocolo',
      'solicitacao.status',
      'solicitacao.tipo',
      'solicitacao.created_at',
      'cidadao.id',
      'cidadao.nome',
      'cidadao.cpf'
    ])
    .leftJoin('solicitacao.cidadao', 'cidadao');

  return this.filtrosAvancadosService.aplicarFiltros(query, filtros);
}
```

### 3. Cache Estratégico

#### Cache de Resultados

```typescript
@Injectable()
export class SolicitacaoService {
  constructor(
    @InjectRepository(Solicitacao)
    private repository: Repository<Solicitacao>,
    private filtrosAvancadosService: FiltrosAvancadosService,
    private cacheService: CacheService,
  ) {}

  async findAll(filtros: SolicitacaoFiltrosDto) {
    // Gerar chave de cache inteligente
    const cacheKey = this.generateCacheKey(filtros);
    
    // Verificar cache
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Executar query
    const resultado = await this.executeQuery(filtros);

    // Cache com TTL baseado no tipo de consulta
    const ttl = this.calculateCacheTTL(filtros);
    await this.cacheService.set(cacheKey, resultado, ttl);

    return resultado;
  }

  private generateCacheKey(filtros: SolicitacaoFiltrosDto): string {
    // Normalizar filtros para cache consistente
    const normalizedFilters = {
      ...filtros,
      status: filtros.status?.sort(),
      tipo: filtros.tipo?.sort(),
    };
    
    return `solicitacoes:${createHash('md5')
      .update(JSON.stringify(normalizedFilters))
      .digest('hex')}`;
  }

  private calculateCacheTTL(filtros: SolicitacaoFiltrosDto): number {
    // Cache mais longo para consultas históricas
    if (filtros.data_fim && new Date(filtros.data_fim) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
      return 3600; // 1 hora para dados antigos
    }
    
    // Cache mais curto para dados recentes
    return 300; // 5 minutos para dados atuais
  }
}
```

#### Cache de Contadores

```typescript
// Cache separado para contadores (mais volátil)
async getCount(filtros: SolicitacaoFiltrosDto): Promise<number> {
  const cacheKey = `count:${this.generateCacheKey(filtros)}`;
  
  const cached = await this.cacheService.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const query = this.repository.createQueryBuilder('solicitacao');
  this.applyFiltersWithoutPagination(query, filtros);
  
  const count = await query.getCount();
  
  // Cache de contadores por menos tempo
  await this.cacheService.set(cacheKey, count, 60); // 1 minuto
  
  return count;
}
```

### 4. Paginação Otimizada

#### Cursor-based Pagination para Grandes Datasets

```typescript
export class CursorPaginationDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  direction?: 'ASC' | 'DESC' = 'DESC';
}

@Injectable()
export class OptimizedPaginationService {
  async findWithCursor(filtros: SolicitacaoFiltrosDto & CursorPaginationDto) {
    const query = this.repository.createQueryBuilder('solicitacao');
    
    // Aplicar filtros
    this.applyFilters(query, filtros);
    
    // Aplicar cursor
    if (filtros.cursor) {
      const cursorDate = new Date(Buffer.from(filtros.cursor, 'base64').toString());
      const operator = filtros.direction === 'ASC' ? '>' : '<';
      query.andWhere(`solicitacao.created_at ${operator} :cursor`, { cursor: cursorDate });
    }
    
    // Ordenação e limite
    query
      .orderBy('solicitacao.created_at', filtros.direction)
      .limit(filtros.limit + 1); // +1 para verificar se há próxima página
    
    const items = await query.getMany();
    const hasNext = items.length > filtros.limit;
    
    if (hasNext) {
      items.pop(); // Remove o item extra
    }
    
    const nextCursor = hasNext && items.length > 0 
      ? Buffer.from(items[items.length - 1].created_at.toISOString()).toString('base64')
      : null;
    
    return {
      items,
      hasNext,
      nextCursor,
      limit: filtros.limit
    };
  }
}
```

### 5. Monitoramento de Performance

#### Interceptor de Performance

```typescript
@Injectable()
export class QueryPerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(QueryPerformanceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, query } = request;
    
    const startTime = Date.now();
    
    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        
        // Log queries lentas
        if (duration > 1000) {
          this.logger.warn(`Slow query detected: ${method} ${url}`, {
            duration,
            query,
            resultCount: data?.total || data?.items?.length || 0
          });
        }
        
        // Métricas para monitoramento
        this.recordMetrics(url, duration, data);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error(`Query failed after ${duration}ms: ${method} ${url}`, {
          duration,
          query,
          error: error.message
        });
        throw error;
      })
    );
  }

  private recordMetrics(endpoint: string, duration: number, data: any) {
    // Integração com sistema de métricas (Prometheus, etc.)
    // metrics.histogram('query_duration', duration, { endpoint });
    // metrics.counter('query_count', 1, { endpoint });
  }
}
```

#### Health Check de Performance

```typescript
@Injectable()
export class DatabasePerformanceHealthIndicator extends HealthIndicator {
  constructor(
    @InjectRepository(Solicitacao)
    private solicitacaoRepository: Repository<Solicitacao>,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    
    try {
      // Query simples para testar performance
      await this.solicitacaoRepository
        .createQueryBuilder('solicitacao')
        .select('COUNT(*)')
        .where('solicitacao.created_at > :date', { 
          date: new Date(Date.now() - 24 * 60 * 60 * 1000) 
        })
        .getRawOne();
      
      const duration = Date.now() - startTime;
      
      const isHealthy = duration < 500; // 500ms threshold
      
      return this.getStatus(key, isHealthy, {
        duration,
        threshold: 500
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      return this.getStatus(key, false, {
        duration,
        error: error.message
      });
    }
  }
}
```

### 6. Configurações de Banco

#### PostgreSQL Tuning

```sql
-- Configurações recomendadas para performance
-- postgresql.conf

-- Memória
shared_buffers = '256MB'                    -- 25% da RAM disponível
effective_cache_size = '1GB'                -- 75% da RAM disponível
work_mem = '4MB'                            -- Para operações de ordenação
maintenance_work_mem = '64MB'               -- Para operações de manutenção

-- Checkpoint
checkpoint_completion_target = 0.9
wal_buffers = '16MB'

-- Query Planner
random_page_cost = 1.1                      -- Para SSDs
effective_io_concurrency = 200               -- Para SSDs

-- Logging para análise
log_min_duration_statement = 1000            -- Log queries > 1s
log_statement = 'mod'                        -- Log modificações
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

#### Análise de Queries

```sql
-- Identificar queries lentas
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;

-- Verificar uso de índices
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;

-- Analisar tamanho das tabelas
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 📊 Benchmarks e Métricas

### Metas de Performance

| Operação | Meta | Aceitável | Crítico |
|----------|------|-----------|----------|
| Listagem simples (< 1000 registros) | < 100ms | < 300ms | > 500ms |
| Listagem com filtros (< 10000 registros) | < 200ms | < 500ms | > 1000ms |
| Busca textual | < 300ms | < 800ms | > 1500ms |
| Contagem de registros | < 50ms | < 150ms | > 300ms |
| Filtros complexos com joins | < 500ms | < 1000ms | > 2000ms |

### Ferramentas de Monitoramento

```typescript
// Exemplo de integração com Prometheus
@Injectable()
export class MetricsService {
  private readonly queryDurationHistogram = new Histogram({
    name: 'query_duration_seconds',
    help: 'Duration of database queries',
    labelNames: ['endpoint', 'status'],
    buckets: [0.1, 0.3, 0.5, 1, 2, 5]
  });

  private readonly queryCounter = new Counter({
    name: 'queries_total',
    help: 'Total number of queries',
    labelNames: ['endpoint', 'status']
  });

  recordQuery(endpoint: string, duration: number, status: 'success' | 'error') {
    this.queryDurationHistogram
      .labels(endpoint, status)
      .observe(duration / 1000);
    
    this.queryCounter
      .labels(endpoint, status)
      .inc();
  }
}
```

## 🔧 Troubleshooting

### Queries Lentas

```sql
-- Analisar plano de execução
EXPLAIN (ANALYZE, BUFFERS) 
SELECT s.* 
FROM solicitacao s 
LEFT JOIN cidadao c ON s.cidadao_id = c.id 
WHERE s.status IN ('PENDENTE', 'EM_ANALISE') 
  AND s.created_at >= '2024-01-01'
ORDER BY s.created_at DESC 
LIMIT 10;
```

### Identificar Gargalos

```typescript
// Profiling de métodos
@Injectable()
export class ProfilingService {
  @Profile('solicitacao.findAll')
  async findAll(filtros: SolicitacaoFiltrosDto) {
    const query = this.repository.createQueryBuilder('solicitacao');
    return this.filtrosAvancadosService.aplicarFiltros(query, filtros);
  }
}

// Decorator de profiling
function Profile(operation: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      
      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;
        
        console.log(`[PROFILE] ${operation}: ${duration}ms`);
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[PROFILE] ${operation} FAILED: ${duration}ms`, error);
        throw error;
      }
    };
  };
}
```

---

**🎯 Resumo das Melhores Práticas:**

1. **Índices**: Criar índices para todos os campos filtráveis
2. **Joins**: Usar joins condicionais baseados nos filtros
3. **Cache**: Implementar cache inteligente com TTL variável
4. **Paginação**: Considerar cursor-based para grandes datasets
5. **Monitoramento**: Implementar métricas e alertas
6. **Análise**: Usar EXPLAIN ANALYZE para otimizar queries
7. **Configuração**: Ajustar parâmetros do PostgreSQL
8. **Profiling**: Monitorar performance continuamente