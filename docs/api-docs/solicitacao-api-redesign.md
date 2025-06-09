# Redesign da API do Módulo de Solicitação

## Análise dos Controllers Atuais

### 1. DeterminacaoJudicialController (`/solicitacao/determinacao-judicial`)
- POST `/` - Criar determinação judicial
- GET `/solicitacao/:solicitacaoId` - Listar determinações de uma solicitação
- GET `/:id` - Buscar determinação por ID
- PATCH `/:id` - Atualizar determinação
- PATCH `/:id/cumprir` - Registrar cumprimento
- DELETE `/:id` - Remover determinação

### 2. ExportacaoController (`/solicitacao/exportacao`)
- GET `/csv` - Exportar solicitações em CSV

### 3. MonitoramentoAluguelSocialController (`/monitoramento-aluguel-social`)
- POST `/registrar-visita` - Registrar visita de monitoramento
- GET `/pendentes` - Listar solicitações pendentes
- GET `/alertas` - Listar alertas de monitoramento
- GET `/:id/status-monitoramento` - Verificar status
- GET `/:id/historico-visitas` - Obter histórico de visitas
- PATCH `/:id/visitas/:indice` - Atualizar visita
- DELETE `/:id/visitas/:indice` - Remover visita

### 4. PendenciaController (`/solicitacao/pendencias`)
- POST `/` - Criar pendência
- GET `/` - Listar pendências
- GET `/:id` - Buscar pendência por ID
- PUT `/:pendenciaId/resolver` - Resolver pendência
- PUT `/:pendenciaId/cancelar` - Cancelar pendência
- GET `/solicitacao/:solicitacaoId` - Listar pendências de solicitação
- GET `/relatorios/vencidas` - Listar pendências vencidas

### 5. SolicitacaoController (`/solicitacao`)
- GET `/` - Listar solicitações
- GET `/:id` - Buscar solicitação por ID
- POST `/` - Criar solicitação
- PUT `/:id` - Atualizar solicitação
- PUT `/:id/submeter` - Submeter para análise
- PUT `/:id/avaliar` - Avaliar solicitação
- PUT `/:id/liberar` - Liberar benefício
- PUT `/:id/cancelar` - Cancelar solicitação
- GET `/:id/historico` - Listar histórico
- POST `/:id/processo-judicial` - Vincular processo judicial
- DELETE `/:id/processo-judicial` - Desvincular processo judicial
- POST `/:id/determinacao-judicial` - Vincular determinação judicial
- DELETE `/:id/determinacao-judicial` - Desvincular determinação judicial
- POST `/converter-papel` - Converter papel do cidadão

### 6. WorkflowSolicitacaoController (`/solicitacao/workflow`)
- GET `/:solicitacaoId/estados-possiveis` - Obter estados possíveis
- POST `/:solicitacaoId/submeter` - Submeter rascunho
- POST `/:solicitacaoId/enviar-para-analise` - Enviar para análise
- POST `/:solicitacaoId/iniciar-analise` - Iniciar análise
- POST `/:solicitacaoId/aprovar` - Aprovar solicitação
- POST `/:solicitacaoId/liberar` - Liberar solicitação
- POST `/:solicitacaoId/rejeitar` - Rejeitar solicitação
- POST `/:solicitacaoId/cancelar` - Cancelar solicitação
- POST `/:solicitacaoId/iniciar-processamento` - Iniciar processamento
- POST `/:solicitacaoId/concluir` - Concluir solicitação
- POST `/:solicitacaoId/arquivar` - Arquivar solicitação
- POST `/:solicitacaoId/transicao/:novoEstado` - Transição genérica
- POST `/:solicitacaoId/atualizar-status` - Atualizar status

## Conflitos Identificados

### 1. Duplicação de Funcionalidades
- **Workflow**: Operações de transição de estado estão duplicadas entre `SolicitacaoController` e `WorkflowSolicitacaoController`
- **Determinação Judicial**: Operações divididas entre `DeterminacaoJudicialController` e `SolicitacaoController`

### 2. Inconsistências de Rota
- `MonitoramentoAluguelSocialController` usa rota raiz diferente (`/monitoramento-aluguel-social` vs `/solicitacao/...`)
- Falta padronização nos nomes (hífen vs camelCase)

### 3. Problemas de Organização
- Recursos relacionados espalhados em controllers diferentes
- Falta hierarquia clara entre recursos pai e filho

## Proposta de Redesign

### 1. Solicitação Base (`/solicitacao`)
```
GET /                                   # Listar solicitações
POST /                                  # Criar solicitação
GET /:id                               # Buscar por ID
PUT /:id                               # Atualizar solicitação
GET /:id/historico                     # Histórico de alterações
POST /converter-papel                  # Converter papel do cidadão
GET /exportacao/csv                    # Exportar em CSV
```

### 2. Workflow (`/solicitacao/:id/workflow`)
```
GET /estados-possiveis                 # Estados possíveis
POST /submeter                         # Submeter rascunho
POST /analisar                         # Iniciar análise
POST /aprovar                          # Aprovar
POST /rejeitar                         # Rejeitar
POST /liberar                          # Liberar
POST /cancelar                         # Cancelar
POST /arquivar                         # Arquivar
POST /concluir                         # Concluir
POST /processar                        # Iniciar processamento
POST /transicao/:estado               # Transição genérica
```

### 3. Determinação Judicial (`/solicitacao/:id/determinacao-judicial`)
```
GET /                                  # Listar determinações
POST /                                 # Criar determinação
GET /:determinacaoId                   # Buscar determinação
PATCH /:determinacaoId                 # Atualizar determinação
DELETE /:determinacaoId                # Remover determinação
POST /:determinacaoId/cumprir         # Registrar cumprimento
```

### 4. Processo Judicial (`/solicitacao/:id/processo-judicial`)
```
POST /                                 # Vincular processo
DELETE /                               # Desvincular processo
```

### 5. Pendências (`/solicitacao/:id/pendencias`)
```
GET /                                  # Listar pendências
POST /                                 # Criar pendência
GET /:pendenciaId                      # Buscar pendência
PUT /:pendenciaId/resolver            # Resolver pendência
PUT /:pendenciaId/cancelar            # Cancelar pendência
```

### 6. Pendências Globais (`/solicitacao/pendencias`)
```
GET /                                  # Listar todas as pendências
GET /vencidas                         # Listar vencidas
```

### 7. Monitoramento Aluguel Social (`/solicitacao/:id/monitoramento`)
```
GET /status                           # Status do monitoramento
GET /historico                        # Histórico de visitas
POST /visitas                         # Registrar visita
PATCH /visitas/:indice               # Atualizar visita
DELETE /visitas/:indice              # Remover visita
```

### 8. Monitoramento Global (`/solicitacao/monitoramento`)
```
GET /pendentes                        # Listar pendentes
GET /alertas                          # Listar alertas
```

## Benefícios do Redesign

1. **Hierarquia Clara**: Recursos organizados hierarquicamente
2. **Eliminação de Duplicações**: Unificação de operações similares
3. **Padronização**: URLs consistentes com kebab-case
4. **Melhor Organização**: Separação clara entre diferentes aspectos
5. **Simplificação**: Redução do número de endpoints

## Plano de Implementação

1. Criar novos controllers com a estrutura proposta
2. Migrar funcionalidades dos controllers antigos
3. Atualizar permissões e guards
4. Criar DTOs consistentes
5. Atualizar documentação Swagger
6. Implementar redirecionamentos para compatibilidade
7. Deprecar controllers antigos gradualmente
