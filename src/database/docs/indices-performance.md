# Documentação de Índices para Otimização de Performance

## Visão Geral

Este documento descreve os índices criados no banco de dados do Sistema PGBen para otimizar a performance das queries mais frequentes. Os índices foram implementados através das migrations:

- `1749330812426-CreatePagamentoIndexes.ts`
- `1749330812427-CreateAdditionalIndexes.ts`

## Índices da Tabela `pagamento`

### 1. `idx_pagamento_status_created_at`
**Campos:** `status, created_at DESC`
**Justificativa:** Otimiza listagens paginadas de pagamentos filtradas por status e ordenadas por data de criação (query mais frequente).
**Query otimizada:**
```sql
SELECT * FROM pagamento 
WHERE status = 'PENDENTE' 
ORDER BY created_at DESC 
LIMIT 20;
```

### 2. `idx_pagamento_solicitacao_id`
**Campos:** `solicitacao_id`
**Justificativa:** Otimiza busca de pagamentos por solicitação específica.
**Query otimizada:**
```sql
SELECT * FROM pagamento WHERE solicitacao_id = ?;
```

### 3. `idx_pagamento_info_bancaria_id`
**Campos:** `info_bancaria_id`
**Condição:** `WHERE info_bancaria_id IS NOT NULL`
**Justificativa:** Otimiza busca de pagamentos por informações bancárias, ignorando registros sem dados bancários.

### 4. `idx_pagamento_liberado_por`
**Campos:** `liberado_por`
**Justificativa:** Otimiza queries de auditoria para verificar pagamentos liberados por usuário específico.

### 5. `idx_pagamento_data_liberacao`
**Campos:** `data_liberacao`
**Justificativa:** Otimiza filtros por período de liberação em relatórios financeiros.
**Query otimizada:**
```sql
SELECT * FROM pagamento 
WHERE data_liberacao BETWEEN '2024-01-01' AND '2024-12-31';
```

### 6. `idx_pagamento_status_data_liberacao`
**Campos:** `status, data_liberacao`
**Justificativa:** Otimiza queries complexas que filtram por status e período simultaneamente.
**Query otimizada:**
```sql
SELECT * FROM pagamento 
WHERE status = 'PAGO' 
AND data_liberacao BETWEEN '2024-01-01' AND '2024-12-31';
```

### 7. `idx_pagamento_metodo_pagamento`
**Campos:** `metodo_pagamento`
**Justificativa:** Otimiza relatórios agrupados por método de pagamento (PIX, TED, etc.).

### 8. `idx_pagamento_valor_status`
**Campos:** `valor, status`
**Condição:** `WHERE status IN ('PROCESSADO', 'PAGO', 'LIBERADO')`
**Justificativa:** Otimiza relatórios financeiros que calculam totais por status de pagamentos efetivados.

### 9. `idx_pagamento_removed_at`
**Campos:** `removed_at`
**Condição:** `WHERE removed_at IS NULL`
**Justificativa:** Otimiza queries que excluem registros soft-deleted (padrão do sistema).

### 10. `idx_pagamento_liberado_por_created_at`
**Campos:** `liberado_por, created_at DESC`
**Justificativa:** Otimiza queries de auditoria ordenadas por data para usuário específico.

## Índices da Tabela `info_bancaria`

### 1. `idx_info_bancaria_banco_agencia_conta`
**Campos:** `banco, agencia, conta`
**Justificativa:** Otimiza validação de duplicidade e busca por dados bancários específicos.

### 2. `idx_info_bancaria_chave_pix`
**Campos:** `chave_pix`
**Condição:** `WHERE chave_pix IS NOT NULL`
**Justificativa:** Otimiza busca por chave PIX para processamento de pagamentos.

### 3. `idx_info_bancaria_ativo`
**Campos:** `ativo`
**Condição:** `WHERE ativo = true`
**Justificativa:** Otimiza listagem de informações bancárias ativas.

## Índices da Tabela `comprovante_pagamento`

### 1. `idx_comprovante_pagamento_id`
**Campos:** `pagamento_id`
**Justificativa:** Otimiza busca de comprovantes por pagamento específico.

### 2. `idx_comprovante_tipo`
**Campos:** `tipo`
**Justificativa:** Otimiza filtros por tipo de comprovante.

### 3. `idx_comprovante_uploaded_por`
**Campos:** `uploaded_por`
**Justificativa:** Otimiza queries de auditoria por usuário que fez upload.

### 4. `idx_comprovante_pagamento_uploaded_created`
**Campos:** `pagamento_id, uploaded_por, created_at DESC`
**Justificativa:** Otimiza queries complexas de auditoria de comprovantes.

## Índices da Tabela `confirmacao_recebimento`

### 1. `idx_confirmacao_pagamento_id`
**Campos:** `pagamento_id`
**Justificativa:** Otimiza busca de confirmações por pagamento específico.

### 2. `idx_confirmacao_confirmado_por`
**Campos:** `confirmado_por`
**Justificativa:** Otimiza busca de confirmações por cidadão.

### 3. `idx_confirmacao_data_confirmacao`
**Campos:** `data_confirmacao`
**Justificativa:** Otimiza relatórios por período de confirmação.

## Índices da Tabela `cidadao`

### 1. `idx_cidadao_cpf`
**Campos:** `cpf`
**Condição:** `WHERE cpf IS NOT NULL`
**Justificativa:** Otimiza busca por CPF (query muito frequente).

### 2. `idx_cidadao_nome_gin`
**Campos:** `to_tsvector('portuguese', nome)`
**Tipo:** GIN (Generalized Inverted Index)
**Justificativa:** Otimiza busca textual por nome para funcionalidade de autocomplete.

### 3. `idx_cidadao_ativo`
**Campos:** `ativo`
**Condição:** `WHERE ativo = true`
**Justificativa:** Otimiza listagem de cidadãos ativos.

## Índices Adicionais da Tabela `solicitacao`

### 1. `idx_solicitacao_cidadao_id`
**Campos:** `cidadao_id`
**Justificativa:** Otimiza busca de solicitações por cidadão.

### 2. `idx_solicitacao_data_status_tipo`
**Campos:** `data_abertura, status, tipo_beneficio_id`
**Justificativa:** Otimiza relatórios complexos por período, status e tipo de benefício.

### 3. `idx_solicitacao_responsavel_analise`
**Campos:** `responsavel_analise_id`
**Condição:** `WHERE responsavel_analise_id IS NOT NULL`
**Justificativa:** Otimiza busca de solicitações por analista responsável.

## Índices da Tabela `historico_solicitacao`

### 1. `idx_historico_solicitacao_id`
**Campos:** `solicitacao_id`
**Justificativa:** Otimiza busca do histórico de uma solicitação específica.

### 2. `idx_historico_solicitacao_data`
**Campos:** `solicitacao_id, data_alteracao DESC`
**Justificativa:** Otimiza busca do histórico ordenado por data.

### 3. `idx_historico_alterado_por`
**Campos:** `alterado_por`
**Justificativa:** Otimiza queries de auditoria por usuário que fez alterações.

## Considerações de Performance

### Uso do CONCURRENTLY
Todos os índices são criados com `CREATE INDEX` para evitar bloqueios durante a criação em produção.

### Índices Condicionais
Vários índices utilizam cláusulas `WHERE` para:
- Reduzir o tamanho do índice
- Melhorar a performance
- Focar apenas nos dados relevantes

### Índices Compostos
Índices compostos são ordenados pelos campos mais seletivos primeiro, seguindo as queries mais frequentes.

### Monitoramento
Para monitorar a efetividade dos índices, utilize:

```sql
-- Verificar uso dos índices
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Verificar tamanho dos índices
SELECT 
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;
```

## Manutenção

### Reindexação
Em caso de degradação de performance, considere reindexar:

```sql
REINDEX INDEX CONCURRENTLY idx_pagamento_status_created_at;
```

### Análise de Estatísticas
Mantenha as estatísticas atualizadas:

```sql
ANALYZE pagamento;
ANALYZE info_bancaria;
ANALYZE solicitacao;
```

### Monitoramento Contínuo
Implemente monitoramento regular para:
- Identificar queries lentas
- Verificar uso dos índices
- Detectar necessidade de novos índices
- Identificar índices não utilizados