import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

/**
 * Configurações otimizadas de performance para PostgreSQL
 * 
 * Este arquivo contém configurações específicas para maximizar a performance
 * do banco de dados PostgreSQL no sistema SEMTAS.
 */
export const getDatabasePerformanceConfig = (
  configService: ConfigService,
): Partial<TypeOrmModuleOptions> => {
  const isProduction = configService.get('NODE_ENV') === 'production';
  const isDevelopment = configService.get('NODE_ENV') === 'development';

  return {
    // Pool de conexões otimizado
    extra: {
      // Configurações do pool de conexões
      max: isProduction ? 20 : 10, // Máximo de conexões
      min: isProduction ? 5 : 2,   // Mínimo de conexões
      acquire: 30000,              // Tempo máximo para obter conexão (30s)
      idle: 10000,                 // Tempo máximo de inatividade (10s)
      evict: 1000,                 // Intervalo de verificação de conexões inativas (1s)
      
      // Configurações específicas do PostgreSQL
      statement_timeout: 30000,     // Timeout de statement (30s)
      query_timeout: 25000,         // Timeout de query (25s)
      application_name: 'PGBEN_API',
      
      // Otimizações de performance
      shared_preload_libraries: 'pg_stat_statements,pg_trgm',
      
      // Configurações de memória
      work_mem: '256MB',           // Memória para operações de ordenação
      maintenance_work_mem: '512MB', // Memória para operações de manutenção
      effective_cache_size: '2GB', // Tamanho estimado do cache do SO
      
      // Configurações de checkpoint
      checkpoint_completion_target: 0.9,
      wal_buffers: '16MB',
      
      // Configurações de logging (apenas em desenvolvimento)
      ...(isDevelopment && {
        log_statement: 'all',
        log_duration: true,
        log_min_duration_statement: 100, // Log queries > 100ms
      }),
    },

    // Cache de queries habilitado
    cache: {
      type: 'database',
      duration: 300000, // 5 minutos
      options: {
        max: 1000, // Máximo de queries em cache
      },
    },

    // Configurações de logging otimizadas
    logging: isDevelopment ? ['query', 'error', 'warn', 'info', 'log'] : ['error', 'warn'],
    logger: 'advanced-console',
    maxQueryExecutionTime: isDevelopment ? 1000 : 5000, // Log slow queries

    // Configurações de migração
    migrationsRun: false, // Executar migrações manualmente
    synchronize: false,   // Nunca usar em produção
    
    // Configurações de entidades
    entitySkipConstructor: true, // Performance boost
    
    // Configurações específicas para performance
    installExtensions: true,
    
    // Configurações de SSL para produção
    ...(isProduction && {
      ssl: {
        rejectUnauthorized: false,
      },
    }),
  };
};

/**
 * Configurações de índices otimizados
 */
export const PERFORMANCE_INDEXES = {
  // Índices para tabela cidadao
  cidadao: [
    'CREATE INDEX IF NOT EXISTS idx_cidadao_nome_gin ON cidadao USING gin(to_tsvector(\'portuguese\', nome))',
    'CREATE INDEX IF NOT EXISTS idx_cidadao_cpf_partial ON cidadao(cpf) WHERE cpf IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_cidadao_nis_partial ON cidadao(nis) WHERE nis IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_cidadao_endereco_bairro ON cidadao USING gin((endereco->\'bairro\') gin_trgm_ops)',
    'CREATE INDEX IF NOT EXISTS idx_cidadao_created_unidade ON cidadao(created_at, unidade_id)',
    'CREATE INDEX IF NOT EXISTS idx_cidadao_status_active ON cidadao(status) WHERE status = true',
    'CREATE INDEX IF NOT EXISTS idx_cidadao_search_composite ON cidadao(nome, cpf, unidade_id, created_at)',
  ],
  
  // Índices para tabela solicitacao
  solicitacao: [
    'CREATE INDEX IF NOT EXISTS idx_solicitacao_cidadao_status ON solicitacao(cidadao_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_solicitacao_tipo_created ON solicitacao(tipo_beneficio, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_solicitacao_status_updated ON solicitacao(status, updated_at)',
    'CREATE INDEX IF NOT EXISTS idx_solicitacao_unidade_periodo ON solicitacao(unidade_id, created_at) WHERE status IN (\'APROVADA\', \'EM_ANALISE\')',
  ],
  
  // Índices para tabela usuario
  usuario: [
    'CREATE INDEX IF NOT EXISTS idx_usuario_email_active ON usuario(email) WHERE ativo = true',
    'CREATE INDEX IF NOT EXISTS idx_usuario_unidade_role ON usuario(unidade_id, role)',
    'CREATE INDEX IF NOT EXISTS idx_usuario_last_login ON usuario(ultimo_login) WHERE ultimo_login IS NOT NULL',
  ],
  
  // Índices para tabela composicao_familiar
  composicao_familiar: [
    'CREATE INDEX IF NOT EXISTS idx_composicao_cidadao_parentesco ON composicao_familiar(cidadao_id, parentesco)',
    'CREATE INDEX IF NOT EXISTS idx_composicao_cpf_unique ON composicao_familiar(cpf) WHERE cpf IS NOT NULL',
  ],
  
  // Índices para tabela documento
  documento: [
    'CREATE INDEX IF NOT EXISTS idx_documento_cidadao_tipo ON documento(cidadao_id, tipo)',
    'CREATE INDEX IF NOT EXISTS idx_documento_solicitacao_tipo ON documento(solicitacao_id, tipo) WHERE solicitacao_id IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_documento_created_status ON documento(created_at, status)',
  ],
};

/**
 * Queries de otimização para executar periodicamente
 */
export const MAINTENANCE_QUERIES = [
  // Atualizar estatísticas das tabelas
  'ANALYZE cidadao',
  'ANALYZE solicitacao',
  'ANALYZE usuario',
  'ANALYZE composicao_familiar',
  'ANALYZE documento',
  
  // Reindexar tabelas principais (executar em horários de baixo uso)
  'REINDEX INDEX CONCURRENTLY idx_cidadao_nome_gin',
  'REINDEX INDEX CONCURRENTLY idx_cidadao_cpf_partial',
  'REINDEX INDEX CONCURRENTLY idx_solicitacao_cidadao_status',
  
  // Limpar estatísticas antigas
  'SELECT pg_stat_reset()',
  
  // Vacuum automático (configurar no PostgreSQL)
  'VACUUM (ANALYZE, VERBOSE) cidadao',
  'VACUUM (ANALYZE, VERBOSE) solicitacao',
];

/**
 * Configurações de monitoramento de performance
 */
export const MONITORING_QUERIES = {
  // Queries mais lentas
  slowQueries: `
    SELECT 
      query,
      calls,
      total_time,
      mean_time,
      rows,
      100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
    FROM pg_stat_statements 
    ORDER BY mean_time DESC 
    LIMIT 10
  `,
  
  // Índices não utilizados
  unusedIndexes: `
    SELECT 
      schemaname,
      tablename,
      indexname,
      idx_tup_read,
      idx_tup_fetch,
      pg_size_pretty(pg_relation_size(indexrelid)) as size
    FROM pg_stat_user_indexes 
    WHERE idx_tup_read = 0 AND idx_tup_fetch = 0
    ORDER BY pg_relation_size(indexrelid) DESC
  `,
  
  // Tabelas com mais operações
  tableActivity: `
    SELECT 
      schemaname,
      tablename,
      seq_scan,
      seq_tup_read,
      idx_scan,
      idx_tup_fetch,
      n_tup_ins,
      n_tup_upd,
      n_tup_del
    FROM pg_stat_user_tables 
    ORDER BY seq_scan + idx_scan DESC
  `,
  
  // Cache hit ratio
  cacheHitRatio: `
    SELECT 
      'index hit rate' as name,
      (sum(idx_blks_hit)) / nullif(sum(idx_blks_hit + idx_blks_read),0) as ratio
    FROM pg_statio_user_indexes
    UNION ALL
    SELECT 
      'table hit rate' as name,
      sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read),0) as ratio
    FROM pg_statio_user_tables
  `,
};

/**
 * Configurações de backup e recovery otimizadas
 */
export const BACKUP_CONFIG = {
  // Configurações de WAL
  wal_level: 'replica',
  max_wal_senders: 3,
  wal_keep_segments: 32,
  
  // Configurações de archive
  archive_mode: 'on',
  archive_timeout: '300s', // 5 minutos
  
  // Configurações de checkpoint
  checkpoint_timeout: '15min',
  checkpoint_completion_target: 0.9,
  
  // Configurações de recovery
  hot_standby: 'on',
  max_standby_streaming_delay: '30s',
};