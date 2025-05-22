# Catálogo de Permissões - Módulo de Solicitação

## Visão Geral

Este documento define as permissões granulares para o módulo de Solicitação, seguindo o esquema de nomenclatura `modulo.recurso.operacao` estabelecido. O módulo de Solicitação é um dos mais críticos do sistema, pois gerencia todo o fluxo de requisição, análise e concessão de benefícios.

## Recursos Identificados

No módulo de Solicitação, identificamos os seguintes recursos principais:

1. **solicitacao** - Operações básicas de CRUD para solicitações
2. **solicitacao.status** - Operações relacionadas à mudança de status da solicitação
3. **solicitacao.pendencia** - Operações relacionadas às pendências de uma solicitação
4. **solicitacao.historico** - Operações relacionadas ao histórico de alterações

## Permissões Detalhadas

### Solicitação (Base)

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `solicitacao.listar` | Listar solicitações com filtros e paginação | GET /v1/solicitacao |
| `solicitacao.ler` | Obter detalhes de uma solicitação específica | GET /v1/solicitacao/:id |
| `solicitacao.criar` | Criar uma nova solicitação de benefício | POST /v1/solicitacao |
| `solicitacao.atualizar` | Atualizar dados de uma solicitação existente | PUT /v1/solicitacao/:id |

### Status da Solicitação

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `solicitacao.status.submeter` | Submeter uma solicitação para análise | PUT /v1/solicitacao/:id/submeter |
| `solicitacao.status.avaliar` | Avaliar uma solicitação (aprovar/reprovar) | PUT /v1/solicitacao/:id/avaliar |
| `solicitacao.status.liberar` | Liberar um benefício aprovado | PUT /v1/solicitacao/:id/liberar |
| `solicitacao.status.cancelar` | Cancelar uma solicitação | PUT /v1/solicitacao/:id/cancelar |

### Pendências e Histórico

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `solicitacao.historico.ler` | Listar histórico de uma solicitação | GET /v1/solicitacao/:id/historico |
| `solicitacao.pendencia.listar` | Listar pendências de uma solicitação | GET /v1/solicitacao/:id/pendencias |

## Permissões Compostas

Além das permissões individuais, definimos também algumas permissões compostas:

| Permissão | Descrição | Permissões Incluídas |
|-----------|-----------|----------------------|
| `solicitacao.*` | Todas as permissões do módulo de solicitação | Todas listadas acima |
| `solicitacao.status.*` | Todas as permissões relacionadas a alterações de status | `solicitacao.status.submeter`, `solicitacao.status.avaliar`, `solicitacao.status.liberar`, `solicitacao.status.cancelar` |

## Considerações de Segurança

1. **Transições de Status**: A permissão `solicitacao.status.avaliar` é particularmente crítica, pois permite alterar o status de uma solicitação para "aprovada" ou "reprovada". Atualmente essa operação está restrita a usuários com roles ADMIN, GESTOR, TECNICO e COORDENADOR. Recomenda-se uma separação ainda mais granular, como:
   - `solicitacao.status.avaliar.aprovar`
   - `solicitacao.status.avaliar.reprovar`

2. **Auditoria Obrigatória**: Todas as operações de alteração de status (submeter, avaliar, liberar, cancelar) devem ser registradas no sistema de auditoria para compliance com LGPD, incluindo o usuário que realizou a ação, data/hora, motivo da alteração e o IP de origem.

3. **Acesso Baseado em Unidade**: As permissões `solicitacao.listar` e `solicitacao.ler` devem respeitar o escopo da unidade do usuário, de modo que técnicos só possam ver solicitações de cidadãos vinculados à sua unidade.

4. **Criptografia de Dados Sensíveis**: Qualquer dado sensível incluído na solicitação (como documentos de identificação, comprovantes de residência, etc.) deve ser armazenado com criptografia AES-256-GCM, conforme já implementado no sistema.

5. **Regras de Negócio para Transições de Status**: Além das permissões granulares, o sistema deve continuar implementando as regras de negócio que validam se uma transição de status é permitida com base no status atual da solicitação (por exemplo, não permitir liberar um benefício que não foi aprovado).

## Matriz de Transições de Status

Para maior clareza, documentamos abaixo a matriz de transições de status permitidas:

| Status Atual | Status Permitidos | Permissão Necessária |
|--------------|-------------------|----------------------|
| RASCUNHO | SUBMETIDA, CANCELADA | `solicitacao.status.submeter`, `solicitacao.status.cancelar` |
| SUBMETIDA | EM_ANALISE, CANCELADA | `solicitacao.status.avaliar`, `solicitacao.status.cancelar` |
| EM_ANALISE | APROVADA, REPROVADA, CANCELADA | `solicitacao.status.avaliar`, `solicitacao.status.cancelar` |
| APROVADA | LIBERADA, CANCELADA | `solicitacao.status.liberar`, `solicitacao.status.cancelar` |
| REPROVADA | EM_ANALISE, CANCELADA | `solicitacao.status.avaliar`, `solicitacao.status.cancelar` |
| LIBERADA | CONCLUIDA, CANCELADA | `solicitacao.status.concluir` (não mapeado), `solicitacao.status.cancelar` |
| CANCELADA | - | Nenhuma transição permitida |
| CONCLUIDA | - | Nenhuma transição permitida |
