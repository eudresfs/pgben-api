# Otimizações de Performance - Sistema PGBEN

## Visão Geral

Este documento descreve as otimizações de performance implementadas no sistema PGBEN para melhorar a experiência do usuário e reduzir a carga no servidor.

## Componentes Implementados

### 1. Interceptor de Otimização de Consultas

**Arquivo:** `src/common/interceptors/query-optimization.interceptor.ts`

**Funcionalidades:**
- Paginação automática com limites configuráveis
- Cache inteligente com TTL configurável
- Headers de cache HTTP
- Métricas de performance

**Configuração:**
```typescript
@QueryOptimization({
  enablePagination: true,
  defaultLimit: 20,
  maxLimit: 100,
  enableCache: true,
  cacheTTL: 300, // 5 minutos
  cacheKey: 'resource:list'
})
```

### 2. Middleware de Monitoramento de Performance

**Arquivo:** `src/common/middlewares/performance-monitor.middleware.ts`

**Métricas Coletadas:**
- Tempo de resposta
- Uso de memória
- Número de consultas ao banco
- Cache hits/misses
- Tamanho da resposta

### 3. Configuração Redis

**Arquivo:** `src/config/redis.config.ts`

**Características:**
- Factory para criação de instâncias Redis
- Configurações específicas por ambiente
- Event listeners para monitoramento
- Configurações de retry e timeout

### 4. Índices de Banco de Dados

**Arquivo:** `src/database/migrations/1749330812430-AddPerformanceIndexes.ts`

**Índices Criados:**
- `idx_usuario_email_status` - Otimiza login de usuários
- `idx_solicitacao_status_data` - Otimiza listagem de solicitações
- `idx_cidadao_cpf_nis` - Otimiza busca de cidadãos
- `idx_documento_solicitacao` - Otimiza consultas de documentos
- `idx_pagamento_beneficiario_status` - Otimiza consultas de pagamentos
- `idx_audit_log_usuario_data` - Otimiza consultas de auditoria

## Controllers Otimizados

### 1. BeneficioController

**Otimizações Aplicadas:**
- Cache de 5 minutos para listagem
- Cache de 10 minutos para detalhes
- Paginação com limite máximo de 100

### 2. CidadaoController

**Otimizações Aplicadas:**
- Cache de 3 minutos para listagem
- Cache de 10 minutos para detalhes
- Paginação com limite máximo de 100
- Campos seletivos baseados em `includeRelations`

### 3. SolicitacaoController

**Otimizações Aplicadas:**
- Cache de 2 minutos para listagem (dados mais dinâmicos)
- Paginação com limite padrão de 15
- Filtros otimizados por status e data

## Configurações de Ambiente

### Variáveis Redis
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=sua_senha_redis
REDIS_DB=0
REDIS_KEY_PREFIX=pgben:
```

### Variáveis de Performance
```env
ENABLE_REDIS_CACHE=true
DEFAULT_CACHE_TTL=300
ENABLE_QUERY_OPTIMIZATION=true
MAX_PAGINATION_LIMIT=100
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_METRICS_INTERVAL=60000
```

## Monitoramento

### Métricas Disponíveis

1. **Endpoint de Métricas:** `GET /api/v1/performance/metrics`
2. **Dashboard de Performance:** `GET /api/v1/performance/dashboard`
3. **Relatórios de Cache:** `GET /api/v1/performance/cache-stats`

### Logs de Performance

Todos os requests são logados com:
- Tempo de resposta
- Status de cache (hit/miss)
- Uso de memória
- Número de queries executadas

## Boas Práticas

### 1. Configuração de Cache

- **Dados estáticos (benefícios, configurações):** TTL de 10-30 minutos
- **Dados semi-estáticos (cidadãos):** TTL de 3-10 minutos
- **Dados dinâmicos (solicitações):** TTL de 1-3 minutos

### 2. Paginação

- Sempre usar paginação em listagens
- Limite máximo de 100 itens por página
- Limite padrão baseado no tipo de dados

### 3. Consultas Otimizadas

- Usar campos seletivos quando possível
- Evitar N+1 queries com eager loading
- Utilizar índices apropriados

### 4. Monitoramento

- Monitorar métricas de cache regularmente
- Ajustar TTL baseado no comportamento real
- Identificar endpoints com performance ruim

## Próximos Passos

1. **Implementar Redis Cluster** para alta disponibilidade
2. **Adicionar métricas de negócio** específicas do SEMTAS
3. **Implementar cache warming** para dados críticos
4. **Adicionar alertas** para degradação de performance
5. **Otimizar consultas complexas** com views materializadas

## Troubleshooting

### Redis não conecta
```bash
# Verificar se Redis está rodando
redis-cli ping

# Verificar logs da aplicação
tail -f logs/application.log | grep Redis
```

### Cache não está funcionando
```bash
# Verificar configurações
echo $ENABLE_REDIS_CACHE
echo $REDIS_HOST

# Verificar chaves no Redis
redis-cli keys "pgben:*"
```

### Performance degradada
```bash
# Verificar métricas
curl http://localhost:3000/api/v1/performance/metrics

# Verificar logs de performance
tail -f logs/performance.log
```

## Referências

- [NestJS Caching](https://docs.nestjs.com/techniques/caching)
- [Redis Best Practices](https://redis.io/docs/manual/clients-guide/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)