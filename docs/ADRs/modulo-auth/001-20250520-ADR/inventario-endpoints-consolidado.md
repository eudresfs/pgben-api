# Inventário Consolidado de Endpoints - PGBen

## Visão Geral

Este documento consolida todos os endpoints da API do sistema PGBen, organizados por módulo. Este inventário servirá como referência para a implementação do novo sistema de permissões granulares, garantindo que todos os pontos de acesso da API sejam adequadamente protegidos.

## Estatísticas Gerais

- **Total de Módulos**: 9
- **Total de Controladores**: 25+
- **Total de Endpoints**: 100+

## Módulos e Endpoints

### Módulo de Cidadão

**Controlador**: `cidadao.controller.ts`

| Método | Rota | Descrição | Guarda Atual | Roles Exigidas |
|--------|------|-----------|--------------|---------------|
| GET | /v1/cidadao | Listar cidadãos | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |
| GET | /v1/cidadao/:id | Obter detalhes de um cidadão | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |
| POST | /v1/cidadao | Criar um novo cidadão | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |
| PUT | /v1/cidadao/:id | Atualizar um cidadão existente | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |
| DELETE | /v1/cidadao/:id | Remover um cidadão | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| GET | /v1/cidadao/:id/composicao | Listar composição familiar | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |
| POST | /v1/cidadao/:id/composicao | Adicionar membro à composição | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |
| DELETE | /v1/cidadao/:id/composicao/:membroId | Remover membro da composição | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |
| GET | /v1/cidadao/:id/historico | Listar histórico de alterações | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |
| GET | /v1/cidadao/busca | Busca avançada de cidadãos | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |

### Módulo de Solicitação

**Controlador**: `solicitacao.controller.ts`

| Método | Rota | Descrição | Guarda Atual | Roles Exigidas |
|--------|------|-----------|--------------|---------------|
| GET | /v1/solicitacao | Listar solicitações | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/solicitacao/:id | Obter detalhes de uma solicitação | JwtAuthGuard, RolesGuard | Não especificado |
| POST | /v1/solicitacao | Criar uma nova solicitação | JwtAuthGuard, RolesGuard | Não especificado |
| PUT | /v1/solicitacao/:id | Atualizar uma solicitação existente | JwtAuthGuard, RolesGuard | Não especificado |
| PUT | /v1/solicitacao/:id/submeter | Submeter uma solicitação para análise | JwtAuthGuard, RolesGuard | Não especificado |
| PUT | /v1/solicitacao/:id/avaliar | Avaliar uma solicitação | JwtAuthGuard, RolesGuard | ADMIN, GESTOR, TECNICO, COORDENADOR |
| PUT | /v1/solicitacao/:id/liberar | Liberar um benefício aprovado | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PUT | /v1/solicitacao/:id/cancelar | Cancelar uma solicitação | JwtAuthGuard, RolesGuard | ADMIN, GESTOR, TECNICO |
| GET | /v1/solicitacao/:id/historico | Listar histórico de uma solicitação | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/solicitacao/:id/pendencias | Listar pendências de uma solicitação | JwtAuthGuard, RolesGuard | Não especificado |

**Controlador**: `solicitacao-beneficio.controller.ts`

| Método | Rota | Descrição | Guarda Atual | Roles Exigidas |
|--------|------|-----------|--------------|---------------|
| POST | /v1/solicitacao | Criar solicitação de benefício | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado* |
| GET | /v1/solicitacao | Listar solicitações de benefício | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado* |
| GET | /v1/solicitacao/:id | Obter detalhes de uma solicitação | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado* |
| PATCH | /v1/solicitacao/:id/status | Atualizar status de uma solicitação | JwtAuthGuard, RolesGuard | Não especificado** |
| GET | /v1/solicitacao/:id/historico | Obter histórico de uma solicitação | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado* |

### Módulo de Benefício

**Controlador**: `beneficio.controller.ts`

| Método | Rota | Descrição | Guarda Atual | Roles Exigidas |
|--------|------|-----------|--------------|---------------|
| GET | /v1/beneficio | Listar tipos de benefícios | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |
| GET | /v1/beneficio/:id | Obter detalhes de um benefício | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |
| POST | /v1/beneficio | Criar novo tipo de benefício | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PUT | /v1/beneficio/:id | Atualizar tipo de benefício | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| GET | /v1/beneficio/:id/requisitos | Listar requisitos documentais | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |
| POST | /v1/beneficio/:id/requisitos | Adicionar requisito documental | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PUT | /v1/beneficio/:id/fluxo | Configurar fluxo de aprovação | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |

**Controladores Adicionais**:
- `campo-dinamico.controller.ts`
- `especificacao-aluguel-social.controller.ts`
- `especificacao-cesta-basica.controller.ts`
- `especificacao-funeral.controller.ts`
- `especificacao-natalidade.controller.ts`
- `exportacao.controller.ts`
- `formulario-condicional.controller.ts`
- `formulario-dinamico.controller.ts`

### Módulo de Documento

**Controlador**: `documento.controller.ts`

| Método | Rota | Descrição | Guarda Atual | Roles Exigidas |
|--------|------|-----------|--------------|---------------|
| GET | /v1/documento/solicitacao/:solicitacaoId | Listar documentos de uma solicitação | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/documento/:id | Obter detalhes de um documento | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/documento/:id/download | Baixar um documento | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/documento/:id/thumbnail | Obter thumbnail de um documento | JwtAuthGuard, RolesGuard | Não especificado |
| POST | /v1/documento/upload | Fazer upload de um documento | JwtAuthGuard, RolesGuard | Não especificado |
| DELETE | /v1/documento/:id | Remover um documento | JwtAuthGuard, RolesGuard | ADMIN, GESTOR, TECNICO |
| POST | /v1/documento/:id/verificar | Verificar um documento | JwtAuthGuard, RolesGuard | ADMIN, GESTOR, TECNICO, COORDENADOR |
| POST | /v1/documento/:id/scan-malware | Verificar documento em busca de malware | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |

### Módulo de Auditoria

**Controlador**: `auditoria.controller.ts`

| Método | Rota | Descrição | Guarda Atual | Roles Exigidas |
|--------|------|-----------|--------------|---------------|
| POST | /v1/auditoria | Criar log de auditoria manualmente | JwtAuthGuard, RolesGuard | ADMIN |
| GET | /v1/auditoria | Buscar logs de auditoria | JwtAuthGuard, RolesGuard | ADMIN |
| GET | /v1/auditoria/:id | Buscar log de auditoria por ID | JwtAuthGuard, RolesGuard | ADMIN |
| GET | /v1/auditoria/entidade/:entidade/:id | Buscar logs por entidade | JwtAuthGuard, RolesGuard | ADMIN |
| GET | /v1/auditoria/usuario/:id | Buscar logs por usuário | JwtAuthGuard, RolesGuard | ADMIN |
| GET | /v1/auditoria/relatorios/dados-sensiveis | Relatório de acessos a dados sensíveis | JwtAuthGuard, RolesGuard | ADMIN |

**Controlador**: `auditoria-exportacao.controller.ts`

| Método | Rota | Descrição | Guarda Atual | Roles Exigidas |
|--------|------|-----------|--------------|---------------|
| POST | /v1/auditoria/exportacao | Exportar logs de auditoria | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/auditoria/exportacao/download | Baixar arquivo de exportação | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/auditoria/exportacao/arquivos | Listar arquivos de exportação | JwtAuthGuard, RolesGuard | Não especificado |

**Controlador**: `auditoria-monitoramento.controller.ts`

| Método | Rota | Descrição | Guarda Atual | Roles Exigidas |
|--------|------|-----------|--------------|---------------|
| GET | /v1/auditoria/monitoramento/estatisticas | Obter estatísticas de auditoria | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/auditoria/monitoramento/saude | Obter relatório de saúde | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/auditoria/monitoramento/atualizar | Forçar atualização de estatísticas | JwtAuthGuard, RolesGuard | Não especificado |

### Módulo de Usuários

**Controlador**: `usuario.controller.ts`

| Método | Rota | Descrição | Guarda Atual | Roles Exigidas |
|--------|------|-----------|--------------|---------------|
| GET | /v1/usuario | Listar usuários com filtros e paginação | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| GET | /v1/usuario/:id | Obter detalhes de um usuário | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| POST | /v1/usuario | Criar um novo usuário | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PUT | /v1/usuario/:id | Atualizar um usuário existente | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PATCH | /v1/usuario/:id/status | Ativar/desativar um usuário | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PUT | /v1/usuario/:id/senha | Alterar senha de um usuário | JwtAuthGuard, RolesGuard | Verificação especial* |
| GET | /v1/usuario/me | Obter perfil do usuário atual | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |

### Módulo de Unidades

**Controlador**: `unidade.controller.ts`

| Método | Rota | Descrição | Guarda Atual | Roles Exigidas |
|--------|------|-----------|--------------|---------------|
| GET | /v1/unidade | Listar unidades com filtros e paginação | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |
| GET | /v1/unidade/:id | Obter detalhes de uma unidade | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |
| POST | /v1/unidade | Criar uma nova unidade | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PUT | /v1/unidade/:id | Atualizar uma unidade existente | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PATCH | /v1/unidade/:id/status | Ativar/desativar uma unidade | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| GET | /v1/unidade/:id/setor | Listar setores de uma unidade | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |

**Controlador**: `setor.controller.ts`

| Método | Rota | Descrição | Guarda Atual | Roles Exigidas |
|--------|------|-----------|--------------|---------------|
| POST | /v1/setor | Criar um novo setor | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PUT | /v1/setor/:id | Atualizar um setor existente | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| GET | /v1/setor/:id | Obter detalhes de um setor | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |

### Módulo de Relatórios

**Controlador**: `relatorios.controller.ts`

| Método | Rota | Descrição | Guarda Atual | Roles Exigidas |
|--------|------|-----------|--------------|---------------|
| GET | /v1/relatorios/beneficios-concedidos | Gera relatório de benefícios concedidos | JwtAuthGuard, RolesGuard | ADMIN, GESTOR, TECNICO |
| GET | /v1/relatorios/solicitacoes-por-status | Gera relatório de solicitações por status | JwtAuthGuard, RolesGuard | ADMIN, GESTOR, TECNICO |
| GET | /v1/relatorios/atendimentos-por-unidade | Gera relatório de atendimentos por unidade | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |

### Módulo de Configurações

**Controlador**: `parametro.controller.ts`

| Método | Rota | Descrição | Guarda Atual | Roles Exigidas |
|--------|------|-----------|--------------|---------------|
| GET | /configuracao/parametros | Buscar todos os parâmetros | Sem guarda | Não especificado* |
| GET | /configuracao/parametros/:chave | Buscar parâmetro por chave | Sem guarda | Não especificado* |
| POST | /configuracao/parametros | Criar novo parâmetro | Sem guarda | Não especificado* |
| PUT | /configuracao/parametros/:chave | Atualizar parâmetro existente | Sem guarda | Não especificado* |
| DELETE | /configuracao/parametros/:chave | Remover parâmetro | Sem guarda | Não especificado* |
| POST | /configuracao/parametros/cache/limpar | Limpar cache de parâmetros | Sem guarda | Não especificado* |

**Controlador**: `integracao.controller.ts`

| Método | Rota | Descrição | Guarda Atual | Roles Exigidas |
|--------|------|-----------|--------------|---------------|
| GET | /configuracao/integracoes | Buscar todas as configurações de integração | Sem guarda | Não especificado |
| GET | /configuracao/integracoes/:codigo | Buscar configuração por código | Sem guarda | Não especificado |
| PUT | /configuracao/integracoes/:codigo | Criar ou atualizar configuração | Sem guarda | Não especificado |
| DELETE | /configuracao/integracoes/:codigo | Remover configuração | Sem guarda | Não especificado |
| POST | /configuracao/integracoes/testar | Testar configuração de integração | Sem guarda | Não especificado |
| PUT | /configuracao/integracoes/:codigo/status | Ativar/desativar configuração | Sem guarda | Não especificado |
| GET | /configuracao/integracoes/ativa/:tipo | Buscar configuração ativa por tipo | Sem guarda | Não especificado |

**Controlador**: `template.controller.ts`

| Método | Rota | Descrição | Guarda Atual | Roles Exigidas |
|--------|------|-----------|--------------|---------------|
| GET | /configuracao/templates | Buscar todos os templates | Sem guarda | Não especificado |
| GET | /configuracao/templates/:codigo | Buscar template por código | Sem guarda | Não especificado |
| POST | /configuracao/templates | Criar novo template | Sem guarda | Não especificado |
| PUT | /configuracao/templates/:codigo | Atualizar template existente | Sem guarda | Não especificado |
| DELETE | /configuracao/templates/:codigo | Remover template | Sem guarda | Não especificado |
| POST | /configuracao/templates/testar | Testar renderização de template | Sem guarda | Não especificado |
| PUT | /configuracao/templates/:codigo/status | Ativar/desativar template | Sem guarda | Não especificado |
| GET | /configuracao/templates/tipo/:tipo | Buscar templates por tipo | Sem guarda | Não especificado |

**Controlador**: `workflow.controller.ts`

| Método | Rota | Descrição | Guarda Atual | Roles Exigidas |
|--------|------|-----------|--------------|---------------|
| GET | /configuracao/workflows | Buscar todos os workflows | Sem guarda | Não especificado |
| GET | /configuracao/workflows/:tipoBeneficioId | Buscar workflow por tipo de benefício | Sem guarda | Não especificado |
| PUT | /configuracao/workflows/:tipoBeneficioId | Criar ou atualizar workflow | Sem guarda | Não especificado |
| DELETE | /configuracao/workflows/:tipoBeneficioId | Remover workflow | Sem guarda | Não especificado |
| PUT | /configuracao/workflows/:tipoBeneficioId/status | Ativar/desativar workflow | Sem guarda | Não especificado |

## Observações Gerais

### Riscos de Segurança Identificados

1. **Módulo de Configurações**: Nenhum dos controladores deste módulo possui proteção de autenticação ou autorização, representando um risco crítico de segurança.

2. **Endpoints sem Roles Específicas**: Vários endpoints estão protegidos pelo RolesGuard, mas não especificam explicitamente quais roles têm acesso, o que pode levar a problemas de controle de acesso.

3. **Falta de Granularidade**: Operações críticas como alteração de status de solicitações não possuem controle granular suficiente para garantir a separação adequada de responsabilidades.

### Recomendações

1. **Implementação Imediata de Controles de Acesso**: Priorizar a implementação de controles de autenticação e autorização para o módulo de Configurações.

2. **Padronização de Rotas**: Padronizar a estrutura de rotas para seguir o mesmo padrão em todos os módulos.

3. **Documentação Completa**: Garantir que todos os endpoints sejam documentados com Swagger/OpenAPI, incluindo informações sobre permissões necessárias.

4. **Auditoria Abrangente**: Garantir que todas as operações sensíveis sejam registradas pelo middleware de auditoria.

5. **Validação de Entradas**: Implementar validação rigorosa de entradas para todos os endpoints, especialmente aqueles que manipulam dados sensíveis ou realizam operações críticas.
