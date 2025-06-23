# Mudanças na Lógica de Liberação de Pagamentos

## Resumo das Alterações

Este documento descreve as mudanças implementadas no sistema de pagamentos para remover a renovação automática e implementar uma nova lógica de liberação baseada em datas previstas.

## Principais Mudanças

### 1. Remoção da Renovação Automática

**Antes:**
- Pagamentos eram criados um por vez
- Scheduler executava diariamente para criar novos pagamentos
- Renovação automática no 6º mês para alguns benefícios

**Depois:**
- Todos os pagamentos são criados na aprovação da solicitação
- Status inicial: `PENDENTE`
- Liberação controlada por data prevista

### 2. Nova Lógica de Criação de Pagamentos

**Arquivo:** `src/modules/beneficio/services/concessao.service.ts`
- Status inicial da concessão alterado de `PENDENTE` para `CONCEDIDA`
- Todos os pagamentos criados de uma vez baseado em `quantidade_parcelas`

**Arquivo:** `src/modules/pagamento/services/pagamento.service.ts`
- Método `gerarPagamentosParaConcessao` modificado
- Cria todas as parcelas com status `PENDENTE`
- Data prevista calculada baseada na periodicidade

### 3. Novo Serviço de Liberação

**Arquivo:** `src/modules/pagamento/services/pagamento-liberacao.service.ts`

Funcionalidades:
- Verificação de elegibilidade para liberação
- Liberação individual e em lote
- Regras especiais para aluguel social (recibo obrigatório)
- Processamento automático diário

### 4. Novos Endpoints

**Arquivo:** `src/modules/pagamento/controllers/pagamento.controller.ts`

Endpoints adicionados:
- `GET /pagamentos/:id/elegibilidade-liberacao` - Verifica se pode liberar
- `PATCH /pagamentos/:id/liberar` - Libera pagamento individual
- `POST /pagamentos/liberar-lote` - Libera múltiplos pagamentos
- `GET /pagamentos/elegiveis-liberacao` - Lista pagamentos elegíveis
- `POST /pagamentos/processar-liberacao-automatica` - Processamento manual

### 5. Novo Scheduler de Liberação

**Arquivo:** `src/modules/pagamento/schedulers/pagamento-liberacao.scheduler.ts`

- Executa diariamente às 06:00
- Processa liberação automática baseada na data prevista
- Verifica recibos de aluguel social a cada 4 horas

### 6. Scheduler Antigo Desabilitado

**Arquivo:** `src/modules/pagamento/schedulers/pagamento-renovacao.scheduler.ts`
- Método `@Cron` comentado
- Funcionalidade removida
- Mantido para compatibilidade

### 7. Novo Tipo de Documento

**Arquivo:** `src/enums/tipo-documento.enum.ts`
- Adicionado `RECIBO_ALUGUEL` para comprovação de pagamento do mês anterior

### 8. Novos Decoradores de Auditoria

**Arquivo:** `src/shared/decorators/auditoria.decorator.ts`
- `@AuditoriaPagamento.Liberacao()`
- `@AuditoriaPagamento.LiberacaoLote()`
- `@AuditoriaPagamento.ProcessamentoAutomatico()`

## Regras de Negócio Implementadas

### Liberação Geral
1. Pagamento deve estar com status `PENDENTE`
2. Concessão deve estar `CONCEDIDA`
3. Data prevista deve ter chegado (hoje >= data prevista)
4. Não pode ter sido cancelado

### Regra Especial - Aluguel Social
1. **Primeira parcela:** Liberação normal (sem recibo)
2. **Demais parcelas:** Exige recibo do mês anterior
3. Recibo deve ser do tipo `RECIBO_ALUGUEL`
4. Recibo deve estar aprovado

### Processamento Automático
1. Executa diariamente às 06:00
2. Busca pagamentos elegíveis
3. Aplica regras de validação
4. Libera automaticamente os elegíveis
5. Registra logs de auditoria

## Fluxo Atualizado

```
1. Solicitação Aprovada
   ↓
2. Concessão Criada (status: CONCEDIDA)
   ↓
3. Todos os Pagamentos Criados (status: PENDENTE)
   ↓
4. Scheduler Diário (06:00)
   ↓
5. Verificação de Elegibilidade
   ↓
6. Liberação Automática (status: LIBERADO)
   ↓
7. Processamento de Pagamento
```

## Arquivos Modificados

### Criados
- `src/modules/pagamento/services/pagamento-liberacao.service.ts`
- `src/modules/pagamento/schedulers/pagamento-liberacao.scheduler.ts`

### Modificados
- `src/modules/beneficio/services/concessao.service.ts`
- `src/modules/pagamento/services/pagamento.service.ts`
- `src/modules/pagamento/controllers/pagamento.controller.ts`
- `src/modules/pagamento/pagamento.module.ts`
- `src/modules/pagamento/schedulers/pagamento-renovacao.scheduler.ts`
- `src/enums/tipo-documento.enum.ts`
- `src/shared/decorators/auditoria.decorator.ts`

## Próximos Passos

1. **Testes:** Implementar testes unitários e de integração
2. **Migração:** Criar scripts para migrar dados existentes
3. **Documentação:** Atualizar documentação da API
4. **Monitoramento:** Configurar alertas para falhas de liberação
5. **Interface:** Atualizar frontend para novos endpoints

## Considerações de Segurança

- Todos os endpoints protegidos por autenticação JWT
- Permissões específicas para cada operação
- Auditoria completa de todas as operações
- Validação rigorosa de dados de entrada
- Logs detalhados para rastreabilidade

## Impacto na Performance

- **Positivo:** Menos consultas ao banco (pagamentos criados de uma vez)
- **Positivo:** Processamento em lote mais eficiente
- **Neutro:** Scheduler executa uma vez por dia
- **Monitorar:** Volume de pagamentos processados simultaneamente