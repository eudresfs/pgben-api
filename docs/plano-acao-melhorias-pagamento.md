# Plano de Ação - Melhorias Módulo de Pagamentos

## Visão Geral
Este documento detalha o plano de implementação para 5 tarefas críticas de melhoria no módulo de pagamentos do sistema PGBEN.

## Ordem de Execução (por dependências)
1. **Tarefa 5**: Utilitário de tratamento de CPF
2. **Tarefa 1**: Correção de acentuação em arquivos
3. **Tarefa 2**: Filtros avançados com parcela única
4. **Tarefa 4**: Data liberação obrigatória
5. **Tarefa 3**: Correção do batch service

---

## Tarefa 5: Utilitário de Tratamento de CPF
**Status**: ⏳ Pendente
**Prioridade**: Alta
**Dependências**: Nenhuma

### Objetivo
Criar utilitário para detectar e limpar caracteres especiais apenas de CPFs nos parâmetros de busca dos filtros avançados.

### Checklist Detalhado
- [ ] Criar função `detectarELimparCPF()` em utils
- [ ] Implementar regex para detectar padrão de CPF
- [ ] Aplicar limpeza apenas quando detectar CPF
- [ ] Testar com diferentes formatos de CPF
- [ ] Integrar nos métodos de filtros avançados

### Arquivos Afetados
- `src/shared/utils/cpf-search.util.ts` (novo)
- `src/modules/pagamento/services/pagamento.service.ts`
- `src/modules/concessao/services/concessao.service.ts`
- `src/modules/solicitacao/services/solicitacao.service.ts`

---

## Tarefa 1: Correção de Acentuação em Arquivos
**Status**: ⏳ Pendente
**Prioridade**: Alta
**Dependências**: Nenhuma

### Objetivo
Corrigir erro interno do servidor quando arquivos com acentuação/caracteres especiais são enviados.

### Checklist Detalhado
- [ ] Analisar causa raiz do erro de acentuação
- [ ] Implementar sanitização de nome de arquivo
- [ ] Criar função `sanitizeFileName()`
- [ ] Aplicar encoding UTF-8 adequado
- [ ] Testar upload com caracteres especiais
- [ ] Validar armazenamento e recuperação

### Arquivos Afetados
- `src/modules/pagamento/services/comprovante.service.ts`
- `src/shared/utils/file-sanitizer.util.ts` (novo)

---

## Tarefa 2: Filtros Avançados - Parcela Única Pendente
**Status**: ⏳ Pendente
**Prioridade**: Média
**Dependências**: Tarefa 5 (utilitário CPF)

### Objetivo
Modificar `aplicarFiltrosAvancados()` para retornar apenas uma parcela pendente por concessão.

### Regras de Negócio
- Apenas uma parcela pendente por concessão
- Outras parcelas (não pendentes) retornam todas
- Ordenação por número da parcela ASC
- Parâmetro opcional para incluir todas as parcelas

### Checklist Detalhado
- [ ] Adicionar parâmetro `incluir_todas_parcelas_pendentes?: boolean`
- [ ] Implementar lógica de agrupamento por concessão
- [ ] Aplicar filtro de parcela única pendente
- [ ] Manter ordenação por numero_parcela ASC
- [ ] Testar cenários de exemplo fornecidos
- [ ] Atualizar DTO de filtros avançados

### Arquivos Afetados
- `src/modules/pagamento/services/pagamento.service.ts`
- `src/modules/pagamento/dto/pagamento-filtros-avancados.dto.ts`

---

## Tarefa 4: Data Liberação Obrigatória
**Status**: ⏳ Pendente
**Prioridade**: Média
**Dependências**: Nenhuma

### Objetivo
Tornar obrigatório o parâmetro `data_liberacao` em todos os endpoints de liberação de pagamento.

### Checklist Detalhado
- [ ] Buscar todos os endpoints de liberação
- [ ] Identificar DTOs de liberação individual
- [ ] Identificar DTOs de liberação em lote
- [ ] Tornar `data_liberacao` obrigatório nos DTOs
- [ ] Atualizar validações nos controllers
- [ ] Atualizar services para usar a data fornecida
- [ ] Testar endpoints modificados

### Arquivos a Investigar
- `src/modules/pagamento/controllers/`
- `src/modules/pagamento/dtos/`
- `src/modules/pagamento/services/`

---

## Tarefa 3: Code Review - Batch Service
**Status**: ⏳ Pendente
**Prioridade**: Média
**Dependências**: Nenhuma

### Objetivo
Corrigir gaps no `pagamento-batch.service.ts` que causam compreensão errada do resultado das liberações.

### Problemas Identificados
- Método não libera realmente, apenas enfileira
- Resultado não reflete status real da liberação
- Falta validação antes de enfileirar
- Retorno enganoso de sucesso

### Checklist Detalhado
- [ ] Analisar método `liberarPagamentosInBatch()`
- [ ] Implementar liberação real vs enfileiramento
- [ ] Corrigir retorno de resultados
- [ ] Adicionar validações pré-liberação
- [ ] Implementar aguardo de processamento
- [ ] Testar cenários de erro e sucesso
- [ ] Documentar comportamento correto

### Arquivos Afetados
- `src/modules/pagamento/services/pagamento-batch.service.ts`

---

## Critérios de Aceitação Gerais
- [ ] Todos os testes passando
- [ ] Code review aprovado
- [ ] Documentação atualizada
- [ ] Performance mantida ou melhorada
- [ ] Logs adequados implementados
- [ ] Tratamento de erros robusto

## Riscos e Mitigações
- **Risco**: Quebra de compatibilidade com frontend
- **Mitigação**: Manter backward compatibility quando possível

- **Risco**: Performance degradada em filtros
- **Mitigação**: Otimizar queries e adicionar índices se necessário

- **Risco**: Dados inconsistentes em batch
- **Mitigação**: Implementar transações adequadas

## Cronograma Estimado
- **Tarefa 5**: 2 horas
- **Tarefa 1**: 3 horas
- **Tarefa 2**: 4 horas
- **Tarefa 4**: 3 horas
- **Tarefa 3**: 3 horas
- **Total**: 15 horas

---

*Documento criado em: 2024*
*Última atualização: A ser atualizada conforme progresso*