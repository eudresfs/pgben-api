# Melhorias de Performance - Módulo Cidadão

## Problemas Identificados e Soluções Implementadas

### 1. **Problema: Lentidão nos Endpoints de Busca (14+ segundos)**

#### Causas Identificadas:
- **Eager Loading**: As entidades `PapelCidadao` e `ComposicaoFamiliar` estavam sendo carregadas automaticamente em todas as consultas
- **Falta de Índices**: Consultas de busca por texto não tinham índices otimizados
- **Consultas Ineficientes**: Uso de `findAndCount` simples sem otimizações de query

#### Soluções Implementadas:

##### a) Remoção do Eager Loading
```typescript
// ANTES (cidadao.entity.ts)
@OneToMany(() => PapelCidadao, (papelCidadao) => papelCidadao.cidadao, {
  eager: true, // ❌ Carregava sempre
})

// DEPOIS
@OneToMany(() => PapelCidadao, (papelCidadao) => papelCidadao.cidadao)
// ✅ Carrega apenas quando necessário
```

##### b) Query Builder Otimizado
- Implementação de consultas SQL otimizadas com `createQueryBuilder`
- Filtros aplicados diretamente no SQL
- Joins seletivos apenas quando necessário

##### c) Índices de Performance
Criada migração `AddCidadaoPerformanceIndexes` com:
- Índice GIN para busca full-text em nomes
- Índices parciais para CPF e NIS
- Índice para busca em campos JSONB (endereço)
- Índices compostos para paginação

### 2. **Problema: Erro 500 no Endpoint de Composição Familiar**

#### Causa Identificada:
- Tentativa de salvar dados relacionais como JSON na coluna `composicao_familiar`
- Estrutura incorreta da entidade vs. implementação

#### Solução Implementada:
- Correção para usar a entidade `ComposicaoFamiliar` corretamente
- Criação de registros na tabela dedicada
- Relacionamento adequado entre `Cidadao` e `ComposicaoFamiliar`

```typescript
// ANTES (incorreto)
const novaComposicao = [...composicaoAtual, novoMembro];
await this.repository.update(id, { composicao_familiar: novaComposicao });

// DEPOIS (correto)
const novoMembro = composicaoFamiliarRepository.create(dadosMembro);
await composicaoFamiliarRepository.save(novoMembro);
```

## Instruções para Aplicar as Melhorias

### 1. Executar a Migração de Índices
```bash
npm run migration:run
```

### 2. Verificar Extensões PostgreSQL
Certifique-se de que a extensão `pg_trgm` está habilitada:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 3. Monitoramento de Performance

#### Consultas para Verificar Índices:
```sql
-- Verificar índices criados
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'cidadao';

-- Verificar uso dos índices
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes WHERE tablename = 'cidadao';
```

#### Análise de Queries Lentas:
```sql
-- Habilitar log de queries lentas (postgresql.conf)
log_min_duration_statement = 1000  # Log queries > 1s

-- Ou usar EXPLAIN ANALYZE
EXPLAIN ANALYZE SELECT * FROM cidadao WHERE nome ILIKE '%joão%';
```

## Melhorias de Performance Esperadas

### Antes das Otimizações:
- ❌ Listagem de cidadãos: 14+ segundos
- ❌ Busca por nome: 8-12 segundos
- ❌ Erro 500 na composição familiar

### Após as Otimizações:
- ✅ Listagem de cidadãos: < 500ms
- ✅ Busca por nome: < 200ms
- ✅ Composição familiar: funcionando corretamente

## Monitoramento Contínuo

### Métricas a Acompanhar:
1. **Tempo de Resposta dos Endpoints**
   - `/api/v1/cidadao` (listagem)
   - `/api/v1/cidadao/search` (busca)
   - `/api/v1/cidadao/{id}/composicao` (composição familiar)

2. **Uso de Cache**
   - Taxa de hit/miss do Redis
   - Tempo de resposta com/sem cache

3. **Performance do Banco**
   - Uso dos índices criados
   - Queries mais lentas
   - Locks e deadlocks

### Alertas Recomendados:
- Endpoint com tempo > 2 segundos
- Taxa de erro > 1%
- Uso de CPU do banco > 80%
- Cache hit rate < 70%

## Próximos Passos

1. **Implementar Paginação Cursor-based** para listas muito grandes
2. **Cache de Consultas Complexas** com TTL dinâmico
3. **Índices Adicionais** baseados em padrões de uso real
4. **Connection Pooling** otimizado para alta concorrência
5. **Read Replicas** para consultas de leitura

## Notas Técnicas

- As otimizações são **backward compatible**
- Cache existente será invalidado automaticamente
- Monitorar logs após deploy para identificar possíveis issues
- Considerar **VACUUM ANALYZE** após aplicar os índices