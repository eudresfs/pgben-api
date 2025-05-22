# Matriz de Acesso - PGBen

## Visão Geral

Este documento define a matriz de acesso que relaciona as roles existentes no sistema PGBen (Administrador, Gestor, Coordenador, Técnico e Assistente Social) com as permissões granulares definidas no catálogo de permissões. Esta matriz servirá como base para a implementação do novo sistema de permissões e para a migração gradual do modelo atual baseado em roles.

## Princípios de Acesso

A matriz de acesso foi construída seguindo os seguintes princípios:

1. **Princípio do Menor Privilégio**: Cada role recebe apenas as permissões mínimas necessárias para realizar suas funções.

2. **Escopo Hierárquico**: As permissões respeitam a hierarquia organizacional:
   - Administradores têm acesso global
   - Gestores têm acesso à sua unidade e unidades subordinadas
   - Coordenadores e Técnicos têm acesso apenas à sua unidade

3. **Separação de Responsabilidades**: Operações críticas (como aprovação de benefícios) exigem diferentes níveis de autorização.

4. **Auditabilidade**: Todas as operações sensíveis são auditadas, independentemente da role do usuário.

## Matriz de Acesso por Role

### Role: Administrador

| Categoria | Permissões | Escopo |
|-----------|------------|--------|
| **Cidadão** | `cidadao.*` | Global |
| **Solicitação** | `solicitacao.*` | Global |
| **Benefício** | `beneficio.*` | Global |
| **Documento** | `documento.*` | Global |
| **Auditoria** | `auditoria.*` | Global |
| **Usuários** | `usuario.*` | Global |
| **Unidades** | `unidade.*`, `setor.*` | Global |
| **Relatórios** | `relatorio.*` | Global |
| **Configurações** | `configuracao.*` | Global |

**Observações**:
- O Administrador tem acesso completo a todas as funcionalidades do sistema
- Pode gerenciar todos os aspectos de configuração e parametrização
- Pode acessar e modificar dados de qualquer unidade
- Tem acesso a relatórios e logs de auditoria completos

### Role: Gestor

| Categoria | Permissões | Escopo |
|-----------|------------|--------|
| **Cidadão** | `cidadao.listar`, `cidadao.ler`, `cidadao.criar`, `cidadao.atualizar`, `cidadao.composicao.*`, `cidadao.historico.listar`, `cidadao.busca.avancada` | Unidade e subordinadas |
| **Solicitação** | `solicitacao.listar`, `solicitacao.ler`, `solicitacao.criar`, `solicitacao.atualizar`, `solicitacao.status.*`, `solicitacao.historico.ler`, `solicitacao.pendencia.listar` | Unidade e subordinadas |
| **Benefício** | `beneficio.listar`, `beneficio.ler`, `beneficio.criar`, `beneficio.atualizar`, `beneficio.requisito.*`, `beneficio.fluxo.*` | Global |
| **Documento** | `documento.listar`, `documento.ler`, `documento.baixar`, `documento.visualizar.miniatura`, `documento.criar`, `documento.excluir`, `documento.verificacao.validar`, `documento.seguranca.scan` | Unidade e subordinadas |
| **Auditoria** | `auditoria.listar`, `auditoria.ler`, `auditoria.listar.por.entidade`, `auditoria.listar.por.usuario`, `auditoria.exportacao.*`, `auditoria.monitoramento.*` | Unidade e subordinadas |
| **Usuários** | `usuario.listar`, `usuario.ler`, `usuario.criar`, `usuario.atualizar`, `usuario.status.atualizar`, `usuario.senha.alterar`, `usuario.senha.alterar.outro`, `usuario.senha.resetar`, `usuario.perfil.*` | Unidade e subordinadas |
| **Unidades** | `unidade.listar`, `unidade.ler`, `unidade.criar`, `unidade.atualizar`, `unidade.status.atualizar`, `unidade.setor.listar`, `setor.*` | Unidade e subordinadas |
| **Relatórios** | `relatorio.*` | Unidade e subordinadas |
| **Configurações** | `configuracao.*.listar`, `configuracao.*.ler` | Global |

**Observações**:
- O Gestor tem acesso amplo, mas limitado à sua unidade e unidades subordinadas
- Pode criar e gerenciar tipos de benefícios, mas não pode modificar configurações globais do sistema
- Pode gerenciar usuários, setores e unidades dentro de seu escopo
- Tem acesso a relatórios e logs de auditoria dentro de seu escopo

### Role: Coordenador

| Categoria | Permissões | Escopo |
|-----------|------------|--------|
| **Cidadão** | `cidadao.listar`, `cidadao.ler`, `cidadao.criar`, `cidadao.atualizar`, `cidadao.composicao.*`, `cidadao.historico.listar`, `cidadao.busca.avancada` | Unidade |
| **Solicitação** | `solicitacao.listar`, `solicitacao.ler`, `solicitacao.criar`, `solicitacao.atualizar`, `solicitacao.status.submeter`, `solicitacao.status.avaliar`, `solicitacao.status.cancelar`, `solicitacao.historico.ler`, `solicitacao.pendencia.listar` | Unidade |
| **Benefício** | `beneficio.listar`, `beneficio.ler`, `beneficio.requisito.listar`, `beneficio.fluxo.ler` | Global |
| **Documento** | `documento.listar`, `documento.ler`, `documento.baixar`, `documento.visualizar.miniatura`, `documento.criar`, `documento.verificacao.validar` | Unidade |
| **Auditoria** | `auditoria.listar.por.entidade` | Unidade |
| **Usuários** | `usuario.listar`, `usuario.ler`, `usuario.perfil.*` | Unidade |
| **Unidades** | `unidade.listar`, `unidade.ler`, `unidade.setor.listar`, `setor.ler` | Unidade |
| **Relatórios** | `relatorio.beneficio.concedidos`, `relatorio.solicitacao.por.status`, `relatorio.exportacao.*` | Unidade |
| **Configurações** | `configuracao.parametro.listar`, `configuracao.parametro.ler` | Global |

**Observações**:
- O Coordenador tem acesso focado na gestão operacional de sua unidade
- Pode avaliar solicitações, mas não pode liberar benefícios (essa é uma responsabilidade do Gestor)
- Pode coordenar o trabalho dos técnicos, verificando e validando documentos
- Tem acesso a relatórios específicos de sua unidade

### Role: Técnico

| Categoria | Permissões | Escopo |
|-----------|------------|--------|
| **Cidadão** | `cidadao.listar`, `cidadao.ler`, `cidadao.criar`, `cidadao.atualizar`, `cidadao.composicao.*`, `cidadao.historico.listar` | Unidade |
| **Solicitação** | `solicitacao.listar`, `solicitacao.ler`, `solicitacao.criar`, `solicitacao.atualizar`, `solicitacao.status.submeter`, `solicitacao.historico.ler`, `solicitacao.pendencia.listar` | Unidade |
| **Benefício** | `beneficio.listar`, `beneficio.ler`, `beneficio.requisito.listar` | Global |
| **Documento** | `documento.listar`, `documento.ler`, `documento.baixar`, `documento.visualizar.miniatura`, `documento.criar` | Unidade |
| **Auditoria** | - | - |
| **Usuários** | `usuario.perfil.*` | Próprio usuário |
| **Unidades** | `unidade.listar`, `unidade.ler`, `unidade.setor.listar`, `setor.ler` | Unidade |
| **Relatórios** | `relatorio.beneficio.concedidos`, `relatorio.solicitacao.por.status`, `relatorio.exportacao.pdf`, `relatorio.exportacao.excel` | Unidade |
| **Configurações** | `configuracao.parametro.ler` | Global |

**Observações**:
- O Técnico tem acesso focado no atendimento aos cidadãos e na criação/submissão de solicitações
- Pode criar e atualizar cadastros de cidadãos e suas composições familiares
- Pode submeter solicitações, mas não pode avaliá-las ou liberá-las
- Tem acesso limitado a relatórios específicos de sua unidade

### Role: Assistente Social

| Categoria | Permissões | Escopo |
|-----------|------------|--------|
| **Cidadão** | `cidadao.listar`, `cidadao.ler`, `cidadao.criar`, `cidadao.atualizar`, `cidadao.composicao.*`, `cidadao.historico.listar` | Unidade |
| **Solicitação** | `solicitacao.listar`, `solicitacao.ler`, `solicitacao.criar`, `solicitacao.atualizar`, `solicitacao.status.submeter`, `solicitacao.historico.ler`, `solicitacao.pendencia.listar` | Unidade |
| **Benefício** | `beneficio.listar`, `beneficio.ler`, `beneficio.requisito.listar` | Global |
| **Documento** | `documento.listar`, `documento.ler`, `documento.baixar`, `documento.visualizar.miniatura`, `documento.criar` | Unidade |
| **Auditoria** | - | - |
| **Usuários** | `usuario.perfil.*` | Próprio usuário |
| **Unidades** | `unidade.listar`, `unidade.ler`, `unidade.setor.listar`, `setor.ler` | Unidade |
| **Relatórios** | `relatorio.beneficio.concedidos`, `relatorio.solicitacao.por.status`, `relatorio.exportacao.pdf`, `relatorio.exportacao.excel` | Unidade |
| **Configurações** | `configuracao.parametro.ler` | Global |

**Observações**:
- O Assistente Social tem permissões similares ao Técnico, com foco no atendimento social
- Tem acesso específico para realizar avaliações sociais e pareceres técnicos
- Pode criar e atualizar cadastros de cidadãos e suas composições familiares
- Pode submeter solicitações, mas não pode avaliá-las ou liberá-las

## Casos Especiais de Permissões

### Permissões Baseadas em Contexto

Algumas permissões dependem não apenas da role do usuário, mas também do contexto da operação:

1. **Alteração de Senha**:
   - Qualquer usuário pode alterar sua própria senha (`usuario.senha.alterar`)
   - Apenas Administradores e Gestores podem alterar senhas de outros usuários (`usuario.senha.alterar.outro`)

2. **Acesso a Documentos**:
   - O acesso a documentos é restrito por unidade, mas documentos específicos podem ter restrições adicionais baseadas em classificação de sigilo

3. **Transições de Status de Solicitação**:
   - As transições de status seguem regras de negócio específicas (conforme matriz de transições documentada no catálogo de permissões do módulo de solicitação)
   - Algumas transições são permitidas apenas para certas roles e em determinados estados da solicitação

4. **Acesso a Dados de Cidadãos**:
   - O acesso a dados sensíveis de cidadãos (como informações médicas ou socioeconômicas) pode ter restrições adicionais baseadas em classificação de sigilo

### Permissões Temporárias

Em alguns casos, pode ser necessário conceder permissões temporárias:

1. **Substituição de Função**:
   - Durante férias ou afastamentos, um usuário pode receber temporariamente permissões de outro
   - Estas permissões devem ter prazo de validade definido

2. **Operações Especiais**:
   - Em situações de emergência ou operações especiais (como mutirões de atendimento), permissões adicionais podem ser concedidas temporariamente
   - Estas permissões devem ser auditadas com maior rigor

## Implementação e Migração

A implementação desta matriz de acesso seguirá uma abordagem gradual:

1. **Fase Inicial**:
   - Mapeamento automático das roles atuais para conjuntos de permissões granulares
   - Implementação do novo PermissionGuard, mantendo compatibilidade com o RolesGuard atual

2. **Fase de Transição**:
   - Migração gradual dos controladores para o novo sistema de permissões
   - Testes extensivos para garantir que o comportamento do sistema permaneça consistente

3. **Fase Final**:
   - Desativação do sistema baseado em roles
   - Implementação completa do sistema baseado em permissões granulares
   - Adição de interface administrativa para gerenciamento de permissões

## Validação com Stakeholders

Esta matriz de acesso deve ser validada com os seguintes stakeholders antes da implementação:

1. **Equipe de Gestão**: Para confirmar que as permissões atendem às necessidades operacionais
2. **Equipe de Segurança**: Para validar que os controles de acesso são adequados
3. **Usuários-Chave**: Para validar que as permissões permitem a execução eficiente das tarefas diárias
4. **Equipe Jurídica**: Para confirmar compliance com LGPD e outras regulamentações aplicáveis
