# Catálogo Consolidado de Permissões - PGBen

## Visão Geral

Este documento consolida todas as permissões granulares mapeadas para o sistema PGBen, seguindo o esquema de nomenclatura `modulo.recurso.operacao` estabelecido. Este catálogo servirá como referência para a implementação do novo sistema de permissões granulares, substituindo o atual modelo baseado em roles.

## Esquema de Nomenclatura

O esquema de nomenclatura para permissões segue o padrão `modulo.recurso.operacao`, onde:

- **módulo**: representa um dos módulos principais do sistema (cidadao, solicitacao, beneficio, etc.)
- **recurso**: representa uma entidade ou funcionalidade dentro do módulo (perfil, documento, status, etc.)
- **operação**: representa a ação permitida sobre o recurso (ler, criar, atualizar, excluir, etc.)

### Permissões Compostas e Coringas

O sistema também suporta permissões compostas e uso de coringas:

- **Permissões compostas**: Uma permissão pode incluir outras permissões (ex: `cidadao.*` inclui todas as permissões do módulo cidadão)
- **Coringas**: O caractere `*` pode ser usado para representar "qualquer valor" em uma parte do padrão (ex: `*.ler` representaria permissão de leitura em qualquer módulo)

## Permissões por Módulo

### Módulo de Cidadão

| Permissão | Descrição |
|-----------|-----------|
| `cidadao.listar` | Listar cidadãos com filtros e paginação |
| `cidadao.ler` | Obter detalhes de um cidadão específico |
| `cidadao.criar` | Criar cadastro de um novo cidadão |
| `cidadao.atualizar` | Atualizar dados de um cidadão existente |
| `cidadao.excluir` | Remover um cadastro de cidadão |
| `cidadao.composicao.listar` | Listar membros da composição familiar |
| `cidadao.composicao.adicionar` | Adicionar membro à composição familiar |
| `cidadao.composicao.remover` | Remover membro da composição familiar |
| `cidadao.historico.listar` | Listar histórico de alterações do cidadão |
| `cidadao.busca.avancada` | Realizar busca avançada de cidadãos |
| `cidadao.*` | Todas as permissões do módulo de cidadão |

### Módulo de Solicitação

| Permissão | Descrição |
|-----------|-----------|
| `solicitacao.listar` | Listar solicitações com filtros e paginação |
| `solicitacao.ler` | Obter detalhes de uma solicitação específica |
| `solicitacao.criar` | Criar uma nova solicitação de benefício |
| `solicitacao.atualizar` | Atualizar dados de uma solicitação existente |
| `solicitacao.status.submeter` | Submeter uma solicitação para análise |
| `solicitacao.status.avaliar` | Avaliar uma solicitação (aprovar/reprovar) |
| `solicitacao.status.liberar` | Liberar um benefício aprovado |
| `solicitacao.status.cancelar` | Cancelar uma solicitação |
| `solicitacao.historico.ler` | Listar histórico de uma solicitação |
| `solicitacao.pendencia.listar` | Listar pendências de uma solicitação |
| `solicitacao.*` | Todas as permissões do módulo de solicitação |
| `solicitacao.status.*` | Todas as permissões relacionadas a alterações de status |

### Módulo de Benefício

| Permissão | Descrição |
|-----------|-----------|
| `beneficio.listar` | Listar tipos de benefícios disponíveis |
| `beneficio.ler` | Obter detalhes de um tipo de benefício específico |
| `beneficio.criar` | Criar um novo tipo de benefício |
| `beneficio.atualizar` | Atualizar um tipo de benefício existente |
| `beneficio.requisito.listar` | Listar requisitos documentais de um benefício |
| `beneficio.requisito.criar` | Adicionar requisito documental a um benefício |
| `beneficio.requisito.atualizar` | Atualizar requisito documental |
| `beneficio.requisito.excluir` | Remover requisito documental |
| `beneficio.fluxo.configurar` | Configurar fluxo de aprovação de um benefício |
| `beneficio.fluxo.ler` | Visualizar configuração de fluxo |
| `beneficio.*` | Todas as permissões do módulo de benefício |
| `beneficio.requisito.*` | Todas as permissões relacionadas a requisitos |
| `beneficio.fluxo.*` | Todas as permissões relacionadas a fluxos |
| `beneficio.ler.*` | Todas as permissões de leitura do módulo |

### Módulo de Documento

| Permissão | Descrição |
|-----------|-----------|
| `documento.listar` | Listar documentos de uma solicitação |
| `documento.ler` | Obter detalhes de um documento específico |
| `documento.baixar` | Baixar o conteúdo de um documento |
| `documento.visualizar.miniatura` | Obter a miniatura de um documento |
| `documento.criar` | Fazer upload de um novo documento |
| `documento.excluir` | Remover um documento existente |
| `documento.verificacao.validar` | Verificar autenticidade/validade de um documento |
| `documento.seguranca.scan` | Verificar documento em busca de malware |
| `documento.seguranca.administrar` | Gerenciar configurações de segurança relacionadas a documentos |
| `documento.*` | Todas as permissões do módulo de documento |
| `documento.verificacao.*` | Todas as permissões relacionadas à verificação |
| `documento.seguranca.*` | Todas as permissões relacionadas à segurança |
| `documento.ler.*` | Todas as permissões de leitura de documentos |

### Módulo de Auditoria

| Permissão | Descrição |
|-----------|-----------|
| `auditoria.listar` | Buscar logs de auditoria com filtros e paginação |
| `auditoria.ler` | Obter detalhes de um log específico |
| `auditoria.criar` | Criar log de auditoria manualmente |
| `auditoria.listar.por.entidade` | Buscar logs relacionados a uma entidade específica |
| `auditoria.listar.por.usuario` | Buscar logs gerados por um usuário específico |
| `auditoria.exportacao.criar` | Iniciar processo de exportação de logs |
| `auditoria.exportacao.baixar` | Baixar arquivo de exportação |
| `auditoria.exportacao.listar` | Listar arquivos de exportação disponíveis |
| `auditoria.monitoramento.estatisticas` | Obter estatísticas de auditoria |
| `auditoria.monitoramento.saude` | Verificar saúde do sistema de auditoria |
| `auditoria.monitoramento.atualizar` | Forçar atualização de estatísticas |
| `auditoria.relatorio.dados.sensiveis` | Gerar relatório de acessos a dados sensíveis |
| `auditoria.*` | Todas as permissões do módulo de auditoria |
| `auditoria.exportacao.*` | Todas as permissões relacionadas à exportação |
| `auditoria.monitoramento.*` | Todas as permissões relacionadas ao monitoramento |
| `auditoria.relatorio.*` | Todas as permissões relacionadas a relatórios |
| `auditoria.ler.*` | Todas as permissões de leitura de auditoria |

### Módulo de Usuários

| Permissão | Descrição |
|-----------|-----------|
| `usuario.listar` | Listar usuários com filtros e paginação |
| `usuario.ler` | Obter detalhes de um usuário específico |
| `usuario.criar` | Criar um novo usuário no sistema |
| `usuario.atualizar` | Atualizar dados de um usuário existente |
| `usuario.status.atualizar` | Ativar ou desativar um usuário |
| `usuario.senha.alterar` | Alterar senha do próprio usuário |
| `usuario.senha.alterar.outro` | Alterar senha de outro usuário |
| `usuario.senha.resetar` | Forçar reset de senha de um usuário |
| `usuario.perfil.ler` | Obter perfil do usuário autenticado |
| `usuario.perfil.atualizar` | Atualizar próprio perfil |
| `usuario.permissao.atribuir` | Atribuir permissões a um usuário |
| `usuario.permissao.revogar` | Revogar permissões de um usuário |
| `usuario.permissao.listar` | Listar permissões de um usuário |
| `usuario.*` | Todas as permissões do módulo de usuário |
| `usuario.status.*` | Todas as permissões relacionadas a status |
| `usuario.senha.*` | Todas as permissões relacionadas a senhas |
| `usuario.perfil.*` | Todas as permissões relacionadas a perfil |
| `usuario.permissao.*` | Todas as permissões relacionadas a gestão de permissões |
| `usuario.ler.*` | Todas as permissões de leitura de usuários |

### Módulo de Unidades

| Permissão | Descrição |
|-----------|-----------|
| `unidade.listar` | Listar unidades com filtros e paginação |
| `unidade.ler` | Obter detalhes de uma unidade específica |
| `unidade.criar` | Criar uma nova unidade no sistema |
| `unidade.atualizar` | Atualizar dados de uma unidade existente |
| `unidade.status.atualizar` | Ativar ou desativar uma unidade |
| `unidade.setor.listar` | Listar setores de uma unidade específica |
| `setor.criar` | Criar um novo setor |
| `setor.atualizar` | Atualizar um setor existente |
| `setor.ler` | Obter detalhes de um setor específico |
| `unidade.*` | Todas as permissões do módulo de unidade |
| `setor.*` | Todas as permissões do módulo de setor |
| `unidade.status.*` | Todas as permissões relacionadas a status |
| `unidade.ler.*` | Todas as permissões de leitura de unidades |

### Módulo de Relatórios

| Permissão | Descrição |
|-----------|-----------|
| `relatorio.beneficio.concedidos` | Gerar relatório de benefícios concedidos |
| `relatorio.solicitacao.por.status` | Gerar relatório de solicitações por status |
| `relatorio.atendimento.por.unidade` | Gerar relatório de atendimentos por unidade |
| `relatorio.exportacao.pdf` | Exportar relatórios em formato PDF |
| `relatorio.exportacao.excel` | Exportar relatórios em formato Excel |
| `relatorio.exportacao.csv` | Exportar relatórios em formato CSV |
| `relatorio.*` | Todas as permissões do módulo de relatórios |
| `relatorio.beneficio.*` | Todas as permissões de relatórios de benefícios |
| `relatorio.solicitacao.*` | Todas as permissões de relatórios de solicitações |
| `relatorio.atendimento.*` | Todas as permissões de relatórios de atendimentos |
| `relatorio.exportacao.*` | Todas as permissões de exportação |

### Módulo de Configurações

| Permissão | Descrição |
|-----------|-----------|
| `configuracao.parametro.listar` | Listar todos os parâmetros do sistema |
| `configuracao.parametro.ler` | Obter detalhes de um parâmetro específico |
| `configuracao.parametro.criar` | Criar um novo parâmetro no sistema |
| `configuracao.parametro.atualizar` | Atualizar um parâmetro existente |
| `configuracao.parametro.excluir` | Remover um parâmetro do sistema |
| `configuracao.parametro.cache.limpar` | Limpar o cache de parâmetros |
| `configuracao.integracao.listar` | Listar todas as configurações de integração |
| `configuracao.integracao.ler` | Obter detalhes de uma integração específica |
| `configuracao.integracao.ler.ativa` | Obter configuração ativa por tipo |
| `configuracao.integracao.atualizar` | Criar ou atualizar uma configuração de integração |
| `configuracao.integracao.excluir` | Remover uma configuração de integração |
| `configuracao.integracao.testar` | Testar uma configuração de integração |
| `configuracao.integracao.status.atualizar` | Ativar/desativar uma configuração de integração |
| `configuracao.template.listar` | Listar todos os templates |
| `configuracao.template.listar.por.tipo` | Listar templates por tipo |
| `configuracao.template.ler` | Obter detalhes de um template específico |
| `configuracao.template.criar` | Criar um novo template |
| `configuracao.template.atualizar` | Atualizar um template existente |
| `configuracao.template.excluir` | Remover um template |
| `configuracao.template.testar` | Testar a renderização de um template |
| `configuracao.template.status.atualizar` | Ativar/desativar um template |
| `configuracao.workflow.listar` | Listar todos os workflows |
| `configuracao.workflow.ler` | Obter workflow para um tipo de benefício |
| `configuracao.workflow.atualizar` | Criar ou atualizar um workflow |
| `configuracao.workflow.excluir` | Remover um workflow |
| `configuracao.workflow.status.atualizar` | Ativar/desativar um workflow |
| `configuracao.*` | Todas as permissões do módulo de configuração |
| `configuracao.parametro.*` | Todas as permissões de parâmetros |
| `configuracao.integracao.*` | Todas as permissões de integrações |
| `configuracao.template.*` | Todas as permissões de templates |
| `configuracao.workflow.*` | Todas as permissões de workflows |
| `configuracao.ler.*` | Todas as permissões de leitura de configurações |

## Mapeamento de Roles para Permissões

Para facilitar a transição do modelo baseado em roles para o novo modelo baseado em permissões granulares, a tabela abaixo mostra uma sugestão de mapeamento inicial das roles existentes para as novas permissões:

| Role | Permissões Correspondentes |
|------|---------------------------|
| ADMIN | `*.*` (todas as permissões) |
| GESTOR | Todas as permissões de leitura (`*.ler`, `*.listar`) + Permissões administrativas de sua unidade e unidades subordinadas |
| COORDENADOR | Permissões de leitura + Gerenciamento de solicitações de benefício + Verificação de documentos de sua unidade |
| TECNICO | Permissões de leitura + Criação e atualização de cidadãos + Criação e acompanhamento de solicitações de sua unidade |
| CIDADAO | Permissões limitadas ao próprio perfil e às próprias solicitações |

## Considerações de Segurança e LGPD

O sistema de permissões granulares implementa os seguintes controles para compliance com LGPD e segurança:

1. **Auditoria Completa**: Todas as operações sensíveis são registradas pelo middleware de auditoria existente, com rastreabilidade completa de quem acessou, modificou ou excluiu dados pessoais.

2. **Minimização de Dados**: As permissões são estruturadas para garantir que os usuários só tenham acesso aos dados mínimos necessários para executar suas funções.

3. **Escopo de Acesso**: O sistema implementa controle de acesso baseado em unidades, garantindo que usuários só possam acessar dados relevantes à sua unidade organizacional.

4. **Criptografia**: Documentos sensíveis continuam sendo armazenados com criptografia AES-256-GCM, conforme já implementado.

5. **Anonimização**: Para operações estatísticas e de relatórios, a exportação de dados pode ser configurada para anonimizar informações pessoais quando apropriado.

6. **Verificações de Segurança**: Integração com verificação anti-malware para documentos e auditoria de segurança para acessos a dados sensíveis.

7. **Monitoramento e Observabilidade**: Integração do sistema de permissões com o sistema de monitoramento e métricas do PGBen para detectar anomalias de acesso.

## Próximos Passos

Após a consolidação deste catálogo, os próximos passos na implementação do sistema de permissões granulares são:

1. **Modelagem de Dados**: Criar as estruturas de banco de dados para armazenar permissões e suas atribuições.

2. **Implementação do PermissionGuard**: Desenvolver e implementar o guard que substituirá o RolesGuard, verificando permissões granulares.

3. **Migração Gradual**: Implementar a estratégia de migração gradual dos controladores, mantendo compatibilidade com o sistema atual durante a transição.

4. **Testes de Segurança**: Realizar testes de segurança específicos para validar a eficácia do novo sistema de permissões.

5. **Treinamento**: Preparar documentação e treinamento para administradores do sistema sobre o novo modelo de permissões.
