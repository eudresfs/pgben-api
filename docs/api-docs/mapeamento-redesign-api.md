# Mapeamento de Redesign da API

Este documento apresenta o mapeamento dos endpoints originais para a nova estrutura proposta, buscando melhorar a semântica e eliminar conflitos de rotas.

## Tabela Comparativa de Endpoints

| Endpoint Original | Novo Endpoint | Alteração |
|-------------------|---------------|-----------|
| **Determinação Judicial** |  |  |
| `POST /solicitacao/determinacao-judicial` | `POST /determinacoes-judiciais` | Sim |
| `GET /solicitacao/determinacao-judicial/solicitacao/:solicitacaoId` | `GET /solicitacoes/:id/determinacoes-judiciais` | Sim |
| `GET /solicitacao/determinacao-judicial/:id` | `GET /determinacoes-judiciais/:id` | Sim |
| `PATCH /solicitacao/determinacao-judicial/:id` | `PUT /determinacoes-judiciais/:id` | Sim |
| `PATCH /solicitacao/determinacao-judicial/:id/cumprir` | `POST /determinacoes-judiciais/:id/cumprimento` | Sim |
| `DELETE /solicitacao/determinacao-judicial/:id` | `DELETE /determinacoes-judiciais/:id` | Sim |
| **Exportação** |  |  |
| `GET /solicitacao/exportacao/csv` | `GET /exportacoes/solicitacoes/csv` | Sim |
| **Monitoramento de Aluguel Social** |  |  |
| `POST /monitoramento-aluguel-social/registrar-visita` | `POST /solicitacoes/:id/monitoramentos` | Sim |
| `GET /monitoramento-aluguel-social/pendentes` | `GET /monitoramentos/pendentes` | Sim |
| `GET /monitoramento-aluguel-social/alertas` | `GET /monitoramentos/alertas` | Sim |
| `GET /monitoramento-aluguel-social/:id/status-monitoramento` | `GET /solicitacoes/:id/monitoramentos/status` | Sim |
| `GET /monitoramento-aluguel-social/:id/historico-visitas` | `GET /solicitacoes/:id/monitoramentos` | Sim |
| `PATCH /monitoramento-aluguel-social/:id/visitas/:indice` | `PUT /solicitacoes/:id/monitoramentos/:monitoramentoId` | Sim |
| `DELETE /monitoramento-aluguel-social/:id/visitas/:indice` | `DELETE /solicitacoes/:id/monitoramentos/:monitoramentoId` | Sim |
| **Pendências** |  |  |
| `POST /pendencias` | `POST /pendencias` | Não |
| `GET /pendencias/:pendenciaId` | `GET /pendencias/:id` | Sim |
| `GET /pendencias` | `GET /pendencias` | Não |
| `PUT /pendencias/:pendenciaId/resolver` | `POST /pendencias/:id/resolver` | Sim |
| `PUT /pendencias/:pendenciaId/cancelar` | `POST /pendencias/:id/cancelar` | Sim |
| `GET /pendencias/solicitacao/:solicitacaoId` | `GET /solicitacoes/:id/pendencias` | Sim |
| `GET /pendencias/relatorios/vencidas` | `GET /pendencias/relatorios/vencidas` | Não |
| **Solicitação** |  |  |
| `GET /solicitacao` | `GET /solicitacoes` | Sim |
| `GET /solicitacao/:id` | `GET /solicitacoes/:id` | Sim |
| `POST /solicitacao` | `POST /solicitacoes` | Sim |
| `PUT /solicitacao/:id` | `PUT /solicitacoes/:id` | Sim |
| `PUT /solicitacao/:id/submeter` | `POST /solicitacoes/:id/estado` | Sim |
| `PUT /solicitacao/:id/avaliar` | `POST /solicitacoes/:id/estado` | Sim |
| `PUT /solicitacao/:id/liberar` | `POST /solicitacoes/:id/estado` | Sim |
| `PUT /solicitacao/:id/cancelar` | `POST /solicitacoes/:id/estado` | Sim |
| `GET /solicitacao/:id/historico` | `GET /solicitacoes/:id/historico` | Sim |
| `POST /solicitacao/:id/processo-judicial` | `POST /solicitacoes/:id/processos-judiciais` | Sim |
| `DELETE /solicitacao/:id/processo-judicial` | `DELETE /solicitacoes/:id/processos-judiciais/:procId` | Sim |
| `POST /solicitacao/:id/determinacao-judicial` | `POST /solicitacoes/:id/determinacoes-judiciais` | Sim |
| `DELETE /solicitacao/:id/determinacao-judicial` | `DELETE /solicitacoes/:id/determinacoes-judiciais/:detId` | Sim |
| `POST /solicitacao/converter-papel` | `POST /solicitacoes/conversoes-papel` | Sim |
| **Workflow de Solicitação** |  |  |
| `GET /solicitacao/workflow/:solicitacaoId/estados-possiveis` | `GET /solicitacoes/:id/estado/possiveis` | Sim |
| `POST /solicitacao/workflow/:solicitacaoId/submeter` | `POST /solicitacoes/:id/estado` | Sim |
| `POST /solicitacao/workflow/:solicitacaoId/enviar-para-analise` | `POST /solicitacoes/:id/estado` | Sim |
| `POST /solicitacao/workflow/:solicitacaoId/iniciar-analise` | `POST /solicitacoes/:id/estado` | Sim |
| `POST /solicitacao/workflow/:solicitacaoId/aprovar` | `POST /solicitacoes/:id/estado` | Sim |
| `POST /solicitacao/workflow/:solicitacaoId/liberar` | `POST /solicitacoes/:id/estado` | Sim |
| `POST /solicitacao/workflow/:solicitacaoId/rejeitar` | `POST /solicitacoes/:id/estado` | Sim |
| `POST /solicitacao/workflow/:solicitacaoId/cancelar` | `POST /solicitacoes/:id/estado` | Sim |
| `POST /solicitacao/workflow/:solicitacaoId/iniciar-processamento` | `POST /solicitacoes/:id/estado` | Sim |
| `POST /solicitacao/workflow/:solicitacaoId/concluir` | `POST /solicitacoes/:id/estado` | Sim |
| `POST /solicitacao/workflow/:solicitacaoId/arquivar` | `POST /solicitacoes/:id/estado` | Sim |
| `POST /solicitacao/workflow/:solicitacaoId/transicao/:novoEstado` | `POST /solicitacoes/:id/estado` | Sim |
| `POST /solicitacao/workflow/:solicitacaoId/atualizar-status` | `POST /solicitacoes/:id/estado` | Sim |

## Detalhes das Mudanças

### Principais Melhorias

1. **Uso consistente de substantivos no plural**:
   - Exemplo: `/solicitacao` → `/solicitacoes`

2. **Eliminação de verbos nas URLs**:
   - Exemplo: `/pendencias/:id/resolver` → `POST /pendencias/:id/resolver` (verbo na ação HTTP)

3. **Estrutura de recursos aninhados**:
   - Exemplo: `/solicitacoes/:id/determinacoes-judiciais`

4. **Simplificação do workflow**:
   - Todos os endpoints de transição de estado foram unificados em `POST /solicitacoes/:id/estado`

5. **Padronização dos nomes de parâmetros**:
   - `:solicitacaoId` → `:id`
   - `:pendenciaId` → `:id`

6. **Organização de recursos em hierarquias lógicas**:
   - Os subrecursos agora estão claramente vinculados aos seus recursos pais

### Impacto da Migração

Para implementar esta nova estrutura sem quebrar a compatibilidade:

1. Implementar os novos endpoints
2. Manter os endpoints antigos temporariamente com redirecionamento para os novos
3. Atualizar os clientes para usar os novos endpoints
4. Após um período de transição, remover os endpoints antigos

A nova estrutura oferece um design mais RESTful, com maior clareza, consistência e facilidade de descoberta dos recursos disponíveis.
