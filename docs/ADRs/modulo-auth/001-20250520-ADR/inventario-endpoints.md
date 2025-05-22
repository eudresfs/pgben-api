# Inventário de Endpoints da API do PGBen

Este documento mapeia todos os endpoints da API do PGBen, organizados por módulo, para auxiliar na implementação do sistema de permissões granulares.

**Data de Criação**: 21/05/2025  
**Última Atualização**: 21/05/2025  

## Índice
- [Módulo de Cidadão](#módulo-de-cidadão)
- [Módulo de Solicitação](#módulo-de-solicitação)
- [Módulo de Benefício](#módulo-de-benefício)
- [Módulo de Documento](#módulo-de-documento)
- [Módulo de Auditoria](#módulo-de-auditoria)
- [Módulo de Usuários](#módulo-de-usuários)
- [Módulo de Unidades](#módulo-de-unidades)
- [Módulo de Relatórios](#módulo-de-relatórios)
- [Módulo de Configurações](#módulo-de-configurações)
- [Módulo de Notificação](#módulo-de-notificação)
- [Módulo de Pagamento](#módulo-de-pagamento)
- [Módulo de Métricas](#módulo-de-métricas)
- [Outros Módulos](#outros-módulos)

## Módulo de Cidadão
*Controladores analisados:*
- `cidadao.controller.ts`
- `papel-cidadao.controller.ts`

### Endpoints de Cidadão

| Método | Rota | Descrição | Implementação | Guarda Atual |
|--------|------|-----------|---------------|------------|
| GET | /v1/cidadao | Listar cidadãos com filtros e paginação | CidadaoController.findAll | JwtAuthGuard, RolesGuard |
| GET | /v1/cidadao/:id | Obter detalhes de um cidadão por ID | CidadaoController.findOne | JwtAuthGuard, RolesGuard |
| POST | /v1/cidadao | Criar um novo cidadão | CidadaoController.create | JwtAuthGuard, RolesGuard |
| PUT | /v1/cidadao/:id | Atualizar um cidadão existente | CidadaoController.update | JwtAuthGuard, RolesGuard |
| GET | /v1/cidadao/cpf/:cpf | Buscar cidadão por CPF | CidadaoController.findByCpf | JwtAuthGuard, RolesGuard |
| GET | /v1/cidadao/nis/:nis | Buscar cidadão por NIS | CidadaoController.findByNis | JwtAuthGuard, RolesGuard |
| GET | /v1/cidadao/:id/solicitacao | Obter histórico de solicitações de um cidadão | CidadaoController.findSolicitacoes | JwtAuthGuard, RolesGuard |
| POST | /v1/cidadao/:id/composicao | Adicionar membro à composição familiar | CidadaoController.addComposicaoFamiliar | JwtAuthGuard, RolesGuard |

### Endpoints de Papel de Cidadão

| Método | Rota | Descrição | Implementação | Guarda Atual |
|--------|------|-----------|---------------|------------|
| POST | /v1/cidadao/papel | Criar novo papel para um cidadão | PapelCidadaoController.create | JwtAuthGuard, RolesGuard |
| GET | /v1/cidadao/papel/cidadao/:cidadaoId | Listar papéis de um cidadão | PapelCidadaoController.findByCidadaoId | JwtAuthGuard, RolesGuard |
| GET | /v1/cidadao/papel/tipo/:tipoPapel | Buscar cidadãos por tipo de papel | PapelCidadaoController.findCidadaosByTipoPapel | JwtAuthGuard, RolesGuard |
| GET | /v1/cidadao/papel/verificar/:cidadaoId/:tipoPapel | Verificar se um cidadão possui um determinado papel | PapelCidadaoController.verificarPapel | JwtAuthGuard, RolesGuard |
| DELETE | /v1/cidadao/papel/:id | Desativar papel de um cidadão | PapelCidadaoController.desativar | JwtAuthGuard, RolesGuard |

### Observações:
- Todos os endpoints estão protegidos por `JwtAuthGuard` e `RolesGuard`
- Não há anotações `@Roles()` explícitas nos métodos, sugerindo que o controle de acesso baseado em roles pode estar sendo implementado de outra forma
- Será necessário verificar como o `RolesGuard` está determinando quais roles têm acesso a quais endpoints

## Módulo de Solicitação
*Controladores analisados:*
- `solicitacao.controller.ts`

### Endpoints de Solicitação

| Método | Rota | Descrição | Implementação | Guarda Atual | Roles Exigidas |
|--------|------|-----------|---------------|------------|---------------|
| GET | /v1/solicitacao | Listar solicitações | SolicitacaoController.findAll | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/solicitacao/:id | Obter detalhes de uma solicitação | SolicitacaoController.findOne | JwtAuthGuard, RolesGuard | Não especificado |
| POST | /v1/solicitacao | Criar uma nova solicitação | SolicitacaoController.create | JwtAuthGuard, RolesGuard | Não especificado |
| PUT | /v1/solicitacao/:id | Atualizar uma solicitação existente | SolicitacaoController.update | JwtAuthGuard, RolesGuard | Não especificado |
| PUT | /v1/solicitacao/:id/submeter | Submeter uma solicitação para análise | SolicitacaoController.submeterSolicitacao | JwtAuthGuard, RolesGuard | Não especificado |
| PUT | /v1/solicitacao/:id/avaliar | Avaliar uma solicitação (aprovar/reprovar) | SolicitacaoController.avaliarSolicitacao | JwtAuthGuard, RolesGuard | ADMIN, GESTOR, TECNICO, COORDENADOR |
| PUT | /v1/solicitacao/:id/liberar | Liberar um benefício aprovado | SolicitacaoController.liberarBeneficio | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PUT | /v1/solicitacao/:id/cancelar | Cancelar uma solicitação | SolicitacaoController.cancelarSolicitacao | JwtAuthGuard, RolesGuard | ADMIN, GESTOR, TECNICO |
| GET | /v1/solicitacao/:id/historico | Listar histórico de uma solicitação | SolicitacaoController.getHistorico | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/solicitacao/:id/pendencias | Listar pendências de uma solicitação | SolicitacaoController.getPendencias | JwtAuthGuard, RolesGuard | Não especificado |

### Observações:
- Alguns endpoints têm especificações explícitas de roles usando o decorador `@Roles()`
- Outros endpoints não especificam roles, mas estão protegidos pelo `RolesGuard`
- As ações mais sensíveis (liberar benefício, avaliar, cancelar) têm controle de acesso mais restrito
- Todas as operações têm verificações adicionais no próprio serviço usando a função `canAccessSolicitacao`

## Módulo de Benefício
*Controladores analisados:*
- `beneficio.controller.ts`
- `campo-dinamico.controller.ts`
- `especificacao-aluguel-social.controller.ts`
- `especificacao-cesta-basica.controller.ts`
- `especificacao-funeral.controller.ts`
- `especificacao-natalidade.controller.ts`
- `exportacao.controller.ts`
- `formulario-condicional.controller.ts`
- `formulario-dinamico.controller.ts`
- `solicitacao-beneficio.controller.ts`

### Endpoints de Benefício (TipoBeneficio)

| Método | Rota | Descrição | Implementação | Guarda Atual | Roles Exigidas |
|--------|------|-----------|---------------|------------|---------------|
| GET | /v1/beneficio | Listar tipos de benefícios | BeneficioController.findAll | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/beneficio/:id | Obter detalhes de um tipo de benefício | BeneficioController.findOne | JwtAuthGuard, RolesGuard | Não especificado |
| POST | /v1/beneficio | Criar novo tipo de benefício | BeneficioController.create | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PUT | /v1/beneficio/:id | Atualizar tipo de benefício existente | BeneficioController.update | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| GET | /v1/beneficio/:id/requisitos | Listar requisitos documentais de um benefício | BeneficioController.findRequisitos | JwtAuthGuard, RolesGuard | Não especificado |
| POST | /v1/beneficio/:id/requisitos | Adicionar requisito documental a um benefício | BeneficioController.addRequisito | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PUT | /v1/beneficio/:id/fluxo | Configurar fluxo de aprovação de um benefício | BeneficioController.configurarFluxo | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |

### Endpoints de Solicitação de Benefício

| Método | Rota | Descrição | Implementação | Guarda Atual | Roles Exigidas |
|--------|------|-----------|---------------|------------|---------------|
| POST | /v1/solicitacao | Criar solicitação de benefício | SolicitacaoBeneficioController.create | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/solicitacao | Listar solicitações de benefício | SolicitacaoBeneficioController.findAll | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/solicitacao/:id | Obter detalhes de uma solicitação de benefício | SolicitacaoBeneficioController.findOne | JwtAuthGuard, RolesGuard | Não especificado |
| PATCH | /v1/solicitacao/:id/status | Atualizar status de uma solicitação | SolicitacaoBeneficioController.updateStatus | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/solicitacao/:id/historico | Obter histórico de alterações de uma solicitação | SolicitacaoBeneficioController.getHistorico | JwtAuthGuard, RolesGuard | Não especificado |

### Observações:
- Os endpoints de administração de tipos de benefício (criar, atualizar, adicionar requisitos, configurar fluxo) estão restritos aos roles ADMIN e GESTOR
- O controlador de solicitação de benefício não especifica roles explícitas, mas aplica verificações de autorização adicionais no código
- Existe validação de transição de status para solicitações (PENDENTE → ANALISE → APROVADA/REJEITADA → etc.)

## Módulo de Documento
*Controladores analisados:*
- `documento.controller.ts`

### Endpoints de Documento

| Método | Rota | Descrição | Implementação | Guarda Atual | Roles Exigidas |
|--------|------|-----------|---------------|------------|---------------|
| GET | /v1/documento/solicitacao/:solicitacaoId | Listar documentos de uma solicitação | DocumentoController.findBySolicitacao | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/documento/:id | Obter detalhes de um documento | DocumentoController.findOne | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/documento/:id/download | Baixar um documento | DocumentoController.download | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/documento/:id/thumbnail | Obter thumbnail de um documento | DocumentoController.getThumbnail | JwtAuthGuard, RolesGuard | Não especificado |
| POST | /v1/documento/upload | Fazer upload de um documento | DocumentoController.upload | JwtAuthGuard, RolesGuard | Não especificado |
| DELETE | /v1/documento/:id | Remover um documento | DocumentoController.remove | JwtAuthGuard, RolesGuard | ADMIN, GESTOR, TECNICO |
| POST | /v1/documento/:id/verificar | Verificar um documento | DocumentoController.verificarDocumento | JwtAuthGuard, RolesGuard | ADMIN, GESTOR, TECNICO, COORDENADOR |
| POST | /v1/documento/:id/scan-malware | Verificar documento em busca de malware | DocumentoController.scanMalware | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |

### Observações:
- Operações de visualização/download não têm restrições de roles explícitas, mas incluem verificações de autorização internas
- As operações mais sensíveis (remoção, verificação e scan de malware) têm restrições de roles específicas
- Existêm verificações de segurança adicionais, como a verificação de malware durante uploads
- O serviço inclui suporte para criptografia de documentos sensíveis

## Módulo de Auditoria
*Controladores analisados:*
- `auditoria.controller.ts`
- `auditoria-exportacao.controller.ts`
- `auditoria-monitoramento.controller.ts`

### Endpoints de Auditoria

| Método | Rota | Descrição | Implementação | Guarda Atual | Roles Exigidas |
|--------|------|-----------|---------------|------------|---------------|
| POST | /v1/auditoria | Criar log de auditoria manualmente | AuditoriaController.create | JwtAuthGuard, RolesGuard | ADMIN |
| GET | /v1/auditoria | Buscar logs de auditoria | AuditoriaController.findAll | JwtAuthGuard, RolesGuard | ADMIN |
| GET | /v1/auditoria/:id | Buscar log de auditoria por ID | AuditoriaController.findOne | JwtAuthGuard, RolesGuard | ADMIN |
| GET | /v1/auditoria/entidade/:entidade/:id | Buscar logs por entidade | AuditoriaController.findByEntidade | JwtAuthGuard, RolesGuard | ADMIN |
| GET | /v1/auditoria/usuario/:id | Buscar logs por usuário | AuditoriaController.findByUsuario | JwtAuthGuard, RolesGuard | ADMIN |
| GET | /v1/auditoria/relatorios/dados-sensiveis | Relatório de acessos a dados sensíveis | AuditoriaController.relatorioAcessosDadosSensiveis | JwtAuthGuard, RolesGuard | ADMIN |

### Endpoints de Exportação de Auditoria

| Método | Rota | Descrição | Implementação | Guarda Atual | Roles Exigidas |
|--------|------|-----------|---------------|------------|---------------|
| POST | /v1/auditoria/exportacao | Exportar logs de auditoria | AuditoriaExportacaoController.exportarLogs | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/auditoria/exportacao/download | Baixar arquivo de exportação | AuditoriaExportacaoController.downloadArquivo | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/auditoria/exportacao/arquivos | Listar arquivos de exportação | AuditoriaExportacaoController.listarArquivos | JwtAuthGuard, RolesGuard | Não especificado |

### Endpoints de Monitoramento de Auditoria

| Método | Rota | Descrição | Implementação | Guarda Atual | Roles Exigidas |
|--------|------|-----------|---------------|------------|---------------|
| GET | /v1/auditoria/monitoramento/estatisticas | Obter estatísticas de auditoria | AuditoriaMonitoramentoController.getEstatisticas | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/auditoria/monitoramento/saude | Obter relatório de saúde | AuditoriaMonitoramentoController.getRelatorioSaude | JwtAuthGuard, RolesGuard | Não especificado |
| GET | /v1/auditoria/monitoramento/atualizar | Forçar atualização de estatísticas | AuditoriaMonitoramentoController.forcarAtualizacao | JwtAuthGuard, RolesGuard | Não especificado |

### Observações:
- Os endpoints principais de auditoria são restritos explicitamente à role ADMIN
- Os endpoints de exportação e monitoramento não especificam roles, mas estão protegidos pelo RolesGuard
- O módulo de auditoria é essencial para conformidade com a LGPD, registrando acessos a dados sensíveis
- Existem endpoints específicos para geração de relatórios para fins de compliance

## Módulo de Usuários
*Controladores analisados:*
- `usuario.controller.ts`

### Endpoints de Usuários

| Método | Rota | Descrição | Implementação | Guarda Atual | Roles Exigidas |
|--------|------|-----------|---------------|------------|---------------|
| GET | /v1/usuario | Listar usuários com filtros e paginação | UsuarioController.findAll | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| GET | /v1/usuario/:id | Obter detalhes de um usuário | UsuarioController.findOne | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| POST | /v1/usuario | Criar um novo usuário | UsuarioController.create | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PUT | /v1/usuario/:id | Atualizar um usuário existente | UsuarioController.update | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PATCH | /v1/usuario/:id/status | Ativar/desativar um usuário | UsuarioController.updateStatus | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PUT | /v1/usuario/:id/senha | Alterar senha de um usuário | UsuarioController.updateSenha | JwtAuthGuard, RolesGuard | Verificação especial* |
| GET | /v1/usuario/me | Obter perfil do usuário atual | UsuarioController.getProfile | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |

### Observações:
- A maioria dos endpoints de gerenciamento de usuários estão restritos a ADMIN e GESTOR
- O endpoint de alteração de senha tem uma lógica especial (*): permite que usuários alterem suas próprias senhas, mas apenas ADMIN pode alterar senhas de outros usuários
- O endpoint para obter o próprio perfil está disponível para qualquer usuário autenticado
- Este módulo é especialmente importante para nosso sistema de permissões granulares, pois é o responsável pelo gerenciamento das roles dos usuários

## Módulo de Unidades
*Controladores analisados:*
- `unidade.controller.ts`
- `setor.controller.ts`

### Endpoints de Unidades

| Método | Rota | Descrição | Implementação | Guarda Atual | Roles Exigidas |
|--------|------|-----------|---------------|------------|---------------|
| GET | /v1/unidade | Listar unidades com filtros e paginação | UnidadeController.findAll | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |
| GET | /v1/unidade/:id | Obter detalhes de uma unidade | UnidadeController.findOne | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |
| POST | /v1/unidade | Criar uma nova unidade | UnidadeController.create | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PUT | /v1/unidade/:id | Atualizar uma unidade existente | UnidadeController.update | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PATCH | /v1/unidade/:id/status | Ativar/desativar uma unidade | UnidadeController.updateStatus | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| GET | /v1/unidade/:id/setor | Listar setores de uma unidade | UnidadeController.findSetores | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |

### Endpoints de Setores

| Método | Rota | Descrição | Implementação | Guarda Atual | Roles Exigidas |
|--------|------|-----------|---------------|------------|---------------|
| POST | /v1/setor | Criar um novo setor | SetorController.create | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PUT | /v1/setor/:id | Atualizar um setor existente | SetorController.update | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| GET | /v1/setor/:id | Obter detalhes de um setor | SetorController.findOne | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |

### Observações:
- As operações de consulta (GET) estão disponíveis para qualquer usuário autenticado
- As operações de modificação (POST, PUT, PATCH) estão restritas a ADMIN e GESTOR
- Este módulo é importante para o sistema de permissões granulares porque muitas permissões estarão vinculadas às unidades específicas
- Será necessário implementar permissões por unidade (ex: um técnico pode acessar apenas os cidadãos da sua unidade)
- Os setores representam as subdivisões dentro das unidades e são importantes para o controle de acesso granular

## Módulo de Relatórios
*Controladores analisados:*
- `relatorios.controller.ts` (no diretório `relatorios-unificado`)

### Endpoints de Relatórios

| Método | Rota | Descrição | Implementação | Guarda Atual | Roles Exigidas |
|--------|------|-----------|---------------|------------|---------------|
| GET | /v1/relatorios/beneficios-concedidos | Gera relatório de benefícios concedidos | RelatoriosController.beneficiosConcedidos | JwtAuthGuard, RolesGuard | ADMIN, GESTOR, TECNICO |
| GET | /v1/relatorios/solicitacoes-por-status | Gera relatório de solicitações por status | RelatoriosController.solicitacoesPorStatus | JwtAuthGuard, RolesGuard | ADMIN, GESTOR, TECNICO |
| GET | /v1/relatorios/atendimentos-por-unidade | Gera relatório de atendimentos por unidade | RelatoriosController.atendimentosPorUnidade | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |

### Observações:
- Os relatórios podem ser gerados em três formatos: PDF, Excel e CSV
- Dois tipos de relatórios (benefícios concedidos e solicitações por status) estão disponíveis para técnicos, enquanto o relatório de atendimentos por unidade é restrito a ADMIN e GESTOR
- Todos os relatórios possuem filtros por período (data_inicio e data_fim) obrigatórios
- Os relatórios podem ter filtros adicionais como unidade_id e tipo_beneficio_id
- Este módulo é importante para o sistema de permissões granulares, pois lida com informações consolidadas que podem ser sensíveis

## Módulo de Configurações
*Controladores analisados:*
- `parametro.controller.ts`
- `integracao.controller.ts`
- `template.controller.ts` (pendente)
- `workflow.controller.ts` (pendente)
- `limites.controller.ts` (pendente)

### Endpoints de Parâmetros

| Método | Rota | Descrição | Implementação | Guarda Atual | Roles Exigidas |
|--------|------|-----------|---------------|------------|---------------|
| GET | /configuracao/parametros | Buscar todos os parâmetros | ParametroController.buscarTodos | Sem guarda | Não especificado* |
| GET | /configuracao/parametros/:chave | Buscar parâmetro por chave | ParametroController.buscarPorChave | Sem guarda | Não especificado* |
| POST | /configuracao/parametros | Criar novo parâmetro | ParametroController.criar | Sem guarda | Não especificado* |
| PUT | /configuracao/parametros/:chave | Atualizar parâmetro existente | ParametroController.atualizar | Sem guarda | Não especificado* |
| DELETE | /configuracao/parametros/:chave | Remover parâmetro | ParametroController.remover | Sem guarda | Não especificado* |
| POST | /configuracao/parametros/cache/limpar | Limpar cache de parâmetros | ParametroController.limparCache | Sem guarda | Não especificado* |

### Observações:
- *Os decoradores de Roles estão comentados no código (`// @Roles('admin')`), sugerindo que a intenção original era restringir esses endpoints apenas para administradores
- Este módulo gerencia parâmetros de configuração do sistema que podem ter impacto direto no funcionamento da aplicação
- Não há guarda de autenticação (JwtAuthGuard) explicitamente definida neste controlador
- A falta de restrições de acesso neste controlador representa um risco de segurança que precisa ser endereçado na implementação do sistema de permissões granulares

### Endpoints de Integrações

| Método | Rota | Descrição | Implementação | Guarda Atual | Roles Exigidas |
|--------|------|-----------|---------------|------------|---------------|
| GET | /configuracao/integracoes | Buscar todas as configurações de integração | IntegracaoController.buscarTodas | Sem guarda | Não especificado |
| GET | /configuracao/integracoes/:codigo | Buscar configuração por código | IntegracaoController.buscarPorCodigo | Sem guarda | Não especificado |
| PUT | /configuracao/integracoes/:codigo | Criar ou atualizar configuração | IntegracaoController.atualizarOuCriar | Sem guarda | Não especificado |
| DELETE | /configuracao/integracoes/:codigo | Remover configuração | IntegracaoController.remover | Sem guarda | Não especificado |
| POST | /configuracao/integracoes/testar | Testar configuração de integração | IntegracaoController.testar | Sem guarda | Não especificado |
| PUT | /configuracao/integracoes/:codigo/status | Ativar/desativar configuração | IntegracaoController.alterarStatus | Sem guarda | Não especificado |
| GET | /configuracao/integracoes/ativa/:tipo | Buscar configuração ativa por tipo | IntegracaoController.buscarConfigAtiva | Sem guarda | Não especificado |

### Observações:
- Não há decoração @ApiBearerAuth() no controlador, o que pode indicar que não há autenticação JWT configurada
- Não há decoração @UseGuards() nem @Roles() no controlador, deixando todos os endpoints sem proteção de autenticação ou autorização
- Este módulo gerencia integrações externas (como SMTP, APIs terceiras), que são configurações críticas de segurança
- A falta de controle de acesso nestes endpoints é particularmente crítica, pois pode permitir a configuração não autorizada de integrações externas

### Endpoints de Templates

| Método | Rota | Descrição | Implementação | Guarda Atual | Roles Exigidas |
|--------|------|-----------|---------------|------------|---------------|
| GET | /configuracao/templates | Buscar todos os templates | TemplateController.buscarTodos | Sem guarda | Não especificado |
| GET | /configuracao/templates/:codigo | Buscar template por código | TemplateController.buscarPorCodigo | Sem guarda | Não especificado |
| POST | /configuracao/templates | Criar novo template | TemplateController.criar | Sem guarda | Não especificado |
| PUT | /configuracao/templates/:codigo | Atualizar template existente | TemplateController.atualizar | Sem guarda | Não especificado |
| DELETE | /configuracao/templates/:codigo | Remover template | TemplateController.remover | Sem guarda | Não especificado |
| POST | /configuracao/templates/testar | Testar renderização de template | TemplateController.testar | Sem guarda | Não especificado |
| PUT | /configuracao/templates/:codigo/status | Ativar/desativar template | TemplateController.alterarStatus | Sem guarda | Não especificado |
| GET | /configuracao/templates/tipo/:tipo | Buscar templates por tipo | TemplateController.buscarPorTipo | Sem guarda | Não especificado |

### Observações:
- Similar aos outros controladores do módulo de Configurações, este não possui nenhuma proteção de autenticação ou autorização
- Não há decoração @ApiBearerAuth(), o que indica que não está configurado para exigir token JWT
- Este módulo gerencia templates de e-mail e outros documentos que podem ser usados no sistema
- A falta de controle de acesso pode permitir a modificação não autorizada de templates, representando um risco de segurança e integridade para comunicações oficiais do sistema

### Endpoints de Workflows

| Método | Rota | Descrição | Implementação | Guarda Atual | Roles Exigidas |
|--------|------|-----------|---------------|------------|---------------|
| GET | /configuracao/workflows | Buscar todos os workflows | WorkflowController.buscarTodos | Sem guarda | Não especificado |
| GET | /configuracao/workflows/:tipoBeneficioId | Buscar workflow por tipo de benefício | WorkflowController.buscarPorTipoBeneficio | Sem guarda | Não especificado |
| PUT | /configuracao/workflows/:tipoBeneficioId | Criar ou atualizar workflow | WorkflowController.atualizarOuCriar | Sem guarda | Não especificado |
| DELETE | /configuracao/workflows/:tipoBeneficioId | Remover workflow | WorkflowController.remover | Sem guarda | Não especificado |
| PUT | /configuracao/workflows/:tipoBeneficioId/status | Ativar/desativar workflow | WorkflowController.alterarStatus | Sem guarda | Não especificado |

### Observações:
- Similar aos outros controladores de Configuração, este não possui nenhuma proteção de autenticação ou autorização
- Não há decoração @ApiBearerAuth() nem @UseGuards() no controlador
- Este módulo gerencia os workflows de benefícios, que são críticos para o funcionamento do processo principal do sistema
- A falta de controle de acesso pode permitir a modificação não autorizada dos fluxos de trabalho, comprometendo a integridade do processo de concessão de benefícios

### Endpoints de Limites

| Método | Rota | Descrição | Implementação | Guarda Atual | Roles Exigidas |
|--------|------|-----------|---------------|------------|---------------|
| GET | /configuracao/limites/upload | Buscar limites de upload | LimitesController.buscarLimitesUpload | Sem guarda* | Não especificado |
| PUT | /configuracao/limites/upload | Atualizar limites de upload | LimitesController.atualizarLimitesUpload | Sem guarda* | Não especificado |
| GET | /configuracao/limites/prazos/:tipo | Buscar prazo configurado | LimitesController.buscarPrazo | Sem guarda* | Não especificado |
| PUT | /configuracao/limites/prazos/:tipo | Atualizar prazo | LimitesController.atualizarPrazo | Sem guarda* | Não especificado |
| GET | /configuracao/limites/prazos/:tipo/data-limite | Calcular data limite | LimitesController.calcularDataLimite | Sem guarda* | Não especificado |

### Observações:
- *Diferentemente dos outros controladores do módulo de Configurações, este possui a decoração @ApiBearerAuth(), indicando que está configurado para exigir um token JWT
- No entanto, não há decoração @UseGuards() nem @Roles(), o que significa que qualquer usuário autenticado pode acessar esses endpoints
- Este módulo gerencia limites operacionais críticos como tamanho máximo de arquivos e prazos para etapas do processo
- A falta de controle granular de acesso pode permitir que usuários sem autorização apropriada modifiquem esses limites

## Módulo de Notificação
*Controladores analisados:*
- `notificacao.controller.ts`
- `notification.controller.ts`
- `notification-template.controller.ts`

*Endpoints serão listados aqui após análise detalhada.*

## Módulo de Benefício
*Controladores analisados:*
- `beneficio.controller.ts`
- `solicitacao-beneficio.controller.ts`

### Endpoints de Benefícios

| Método | Rota | Descrição | Implementação | Guarda Atual | Roles Exigidas |
|--------|------|-----------|---------------|------------|---------------|
| GET | /v1/beneficio | Listar tipos de benefícios | BeneficioController.findAll | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |
| GET | /v1/beneficio/:id | Obter detalhes de um benefício | BeneficioController.findOne | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |
| POST | /v1/beneficio | Criar novo tipo de benefício | BeneficioController.create | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PUT | /v1/beneficio/:id | Atualizar tipo de benefício | BeneficioController.update | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| GET | /v1/beneficio/:id/requisitos | Listar requisitos documentais | BeneficioController.findRequisitos | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado |
| POST | /v1/beneficio/:id/requisitos | Adicionar requisito documental | BeneficioController.addRequisito | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |
| PUT | /v1/beneficio/:id/fluxo | Configurar fluxo de aprovação | BeneficioController.configurarFluxo | JwtAuthGuard, RolesGuard | ADMIN, GESTOR |

### Observações:
- As operações de consulta (GET) estão disponíveis para qualquer usuário autenticado
- As operações de modificação (POST, PUT) estão restritas aos perfis ADMIN e GESTOR
- Este módulo é central para o sistema, pois define os tipos de benefícios disponíveis e suas regras
- A configuração de fluxos e requisitos documentais é crítica para o funcionamento correto do processo de concessão de benefícios

### Endpoints de Solicitações de Benefício

| Método | Rota | Descrição | Implementação | Guarda Atual | Roles Exigidas |
|--------|------|-----------|---------------|------------|---------------|
| POST | /v1/solicitacao | Criar solicitação de benefício | SolicitacaoBeneficioController.create | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado* |
| GET | /v1/solicitacao | Listar solicitações de benefício | SolicitacaoBeneficioController.findAll | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado* |
| GET | /v1/solicitacao/:id | Obter detalhes de uma solicitação | SolicitacaoBeneficioController.findOne | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado* |
| PATCH | /v1/solicitacao/:id/status | Atualizar status de uma solicitação | SolicitacaoBeneficioController.updateStatus | JwtAuthGuard, RolesGuard | Não especificado** |
| GET | /v1/solicitacao/:id/historico | Obter histórico de uma solicitação | SolicitacaoBeneficioController.getHistorico | JwtAuthGuard, RolesGuard | Qualquer usuário autenticado* |

### Observações Adicionais:
- *Não há decoração @Roles() explícita nos métodos do controlador, o que sugere que qualquer usuário autenticado pode acessar esses endpoints, mas em um sistema real deveria haver restrições adicionais, como acesso apenas às solicitações do próprio cidadão ou da unidade do técnico
- **A atualização de status é especialmente crítica e deveria ter restrições muito mais granulares no novo sistema de permissões
- O controlador implementa uma validação de transição de status que define quais mudanças de status são permitidas, mas não especifica quais perfis podem realizar cada tipo de transição
- Há um comentário no método updateStatus que sugere que o ID do usuário seria obtido do token JWT em um cenário real

## Módulo de Métricas
*Controladores analisados:*
- `metricas.controller.ts`
- `metricas-analise.controller.ts`
{{ ... }}
- `metricas-dashboard.controller.ts`
- `metricas-definicao.controller.ts`
- `metricas-exportacao.controller.ts`
- `metricas-valores.controller.ts`

*Endpoints serão listados aqui após análise detalhada.*

## Outros Módulos
*Controladores analisados:*
- `app.controller.ts`
- `auth.controller.ts`
- `integrador.controller.ts`
- `api-exemplo.controller.ts`
- `enhanced-metrics.controller.ts`
- `health.controller.ts`
- `metrics.controller.ts`

*Endpoints serão listados aqui após análise detalhada.*
