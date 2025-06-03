# Módulo de Solicitação

## Visão Geral

O Módulo de Solicitação é responsável por gerenciar todo o ciclo de vida das solicitações de benefícios no sistema PGBen. Ele implementa uma arquitetura orientada a eventos que permite o processamento assíncrono de ações relacionadas às solicitações, como mudanças de status, notificações, prazos e priorização.

## Responsabilidades

O módulo possui as seguintes responsabilidades principais:

1. **Gerenciamento do Ciclo de Vida**: Controle completo do ciclo de vida das solicitações, desde a criação até o arquivamento.
2. **Workflow de Estados**: Implementação das regras de transição entre estados da solicitação.
3. **Validação de Regras de Negócio**: Validação das regras específicas para cada transição de estado.
4. **Controle de Prazos**: Gerenciamento dos prazos para análise, documentação e processamento.
5. **Priorização**: Priorização automática de solicitações com base em critérios configuráveis.
6. **Notificações**: Geração de notificações contextuais para eventos importantes.
7. **Integração com Processos Judiciais**: Gerenciamento de determinações judiciais associadas às solicitações.
8. **Gestão de Pendências**: Controle de pendências relacionadas às solicitações.

## Arquitetura

O módulo segue uma arquitetura orientada a eventos, composta por:

### Entidades

- **Solicitacao**: Entidade principal que representa uma solicitação de benefício.
- **HistoricoSolicitacao**: Registro histórico de alterações nas solicitações.
- **Pendencia**: Representa pendências relacionadas a uma solicitação.
- **DeterminacaoJudicial**: Representa determinações judiciais associadas a solicitações.

### Serviços

- **SolicitacaoService**: Gerencia operações básicas de CRUD para solicitações.
- **WorkflowSolicitacaoService**: Gerencia as transições de estado das solicitações.
- **TransicaoEstadoService**: Implementa as regras de transição entre estados.
- **ValidacaoSolicitacaoService**: Valida regras de negócio específicas para cada transição.
- **PrazoSolicitacaoService**: Gerencia os prazos associados às solicitações.
- **PriorizacaoSolicitacaoService**: Implementa a lógica de priorização de solicitações.
- **NotificacaoService**: Gerencia notificações contextuais.
- **EventosService**: Centraliza a emissão de eventos relacionados às solicitações.
- **DeterminacaoJudicialService**: Gerencia determinações judiciais.

### Listeners

- **SolicitacaoEventListener**: Escuta eventos do sistema e executa ações correspondentes.

### Controllers

- **SolicitacaoController**: Expõe endpoints para operações básicas de solicitações.
- **WorkflowSolicitacaoController**: Expõe endpoints para transições de estado.
- **DeterminacaoJudicialController**: Expõe endpoints para gerenciar determinações judiciais.

## Fluxos Principais

### Fluxo de Criação de Solicitação

1. Cliente envia requisição para criar uma solicitação.
2. `SolicitacaoController` recebe a requisição e chama `SolicitacaoService`.
3. `SolicitacaoService` cria a solicitação no estado inicial (RASCUNHO).
4. `EventosService` emite evento `CREATED`.
5. `SolicitacaoEventListener` processa o evento e executa ações adicionais.

### Fluxo de Transição de Estado

1. Cliente envia requisição para alterar o estado de uma solicitação.
2. `WorkflowSolicitacaoController` recebe a requisição e chama `WorkflowSolicitacaoService`.
3. `WorkflowSolicitacaoService` delega a validação para `TransicaoEstadoService`.
4. `TransicaoEstadoService` verifica se a transição é permitida.
5. `ValidacaoSolicitacaoService` valida regras de negócio específicas.
6. Se válido, `WorkflowSolicitacaoService` realiza a transição.
7. `EventosService` emite evento `STATUS_CHANGED`.
8. `SolicitacaoEventListener` processa o evento e executa ações adicionais, como:
   - Atualização de prazos via `PrazoSolicitacaoService`
   - Envio de notificações via `NotificacaoService`

### Fluxo de Priorização

1. `PriorizacaoSolicitacaoService` avalia solicitações com base em critérios configurados.
2. Solicitações com determinação judicial recebem prioridade máxima.
3. Solicitações com prazos expirados ou próximos recebem prioridade alta.
4. A lista de trabalho dos técnicos é ordenada conforme a priorização.

### Fluxo de Notificações

1. Eventos são emitidos pelo `EventosService`.
2. `SolicitacaoEventListener` escuta os eventos e chama `NotificacaoService`.
3. `NotificacaoService` gera notificações contextuais.
4. As notificações são enviadas para os destinatários apropriados.

## Matriz de Transições de Estado

A matriz de transições define quais mudanças de estado são permitidas:

| Estado Atual | Estados Possíveis |
|--------------|-------------------|
| RASCUNHO | PENDENTE |
| PENDENTE | EM_ANALISE, CANCELADA |
| EM_ANALISE | AGUARDANDO_DOCUMENTOS, APROVADA, INDEFERIDA, CANCELADA |
| AGUARDANDO_DOCUMENTOS | EM_ANALISE, CANCELADA |
| APROVADA | LIBERADA, CANCELADA |
| INDEFERIDA | ARQUIVADA |
| LIBERADA | EM_PROCESSAMENTO, CANCELADA |
| EM_PROCESSAMENTO | CONCLUIDA, CANCELADA |
| CONCLUIDA | ARQUIVADA |
| CANCELADA | ARQUIVADA |
| ARQUIVADA | - |

## Orientações para Desenvolvimento

### Adição de Novos Eventos

Para adicionar um novo tipo de evento:

1. Defina o tipo no enum `SolicitacaoEventType`.
2. Crie uma interface para o evento estendendo `SolicitacaoEvent`.
3. Adicione a interface ao tipo união `SolicitacaoEventUnion`.
4. Implemente um método no `EventosService` para emitir o evento.
5. Adicione um handler no `SolicitacaoEventListener` para processar o evento.

### Adição de Novas Regras de Validação

Para adicionar novas regras de validação:

1. Implemente a regra no `ValidacaoSolicitacaoService`.
2. Atualize o `TransicaoEstadoService` para utilizar a nova regra.

### Adição de Novos Critérios de Priorização

Para adicionar novos critérios de priorização:

1. Adicione o critério no método `inicializarCriterios` do `PriorizacaoSolicitacaoService`.
2. Defina a função verificadora e o peso do critério.

## Integração com Outros Módulos

O módulo de solicitação interage com outros módulos do sistema:

- **Módulo de Cidadão**: Obtém informações do beneficiário.
- **Módulo de Benefício**: Obtém configurações dos tipos de benefício.
- **Módulo de Usuário**: Gerencia permissões e atribuições.
- **Módulo de Unidade**: Gerencia unidades responsáveis pelas solicitações.
- **Módulo de Documento**: Gerencia documentos anexados às solicitações.

## Considerações de Segurança

- Todas as transições de estado requerem autenticação e autorização.
- O acesso às solicitações é restrito com base nas permissões do usuário.
- Determinações judiciais são tratadas com prioridade e segurança adicional.
- Todas as alterações são registradas no histórico para auditoria.

## Configuração

O módulo utiliza as seguintes variáveis de ambiente:

- `PRAZO_ANALISE_DIAS`: Prazo padrão para análise (em dias).
- `PRAZO_DOCUMENTOS_DIAS`: Prazo padrão para envio de documentos (em dias).
- `PRAZO_PROCESSAMENTO_DIAS`: Prazo padrão para processamento (em dias).
- `FATOR_PRIORIDADE_JUDICIAL`: Fator de redução de prazo para determinações judiciais.

## Métricas e Monitoramento

O módulo gera métricas para monitoramento:

- Tempo médio de processamento por estado
- Número de solicitações por estado
- Taxa de aprovação/reprovação
- Número de solicitações com prazos expirados
- Número de determinações judiciais
