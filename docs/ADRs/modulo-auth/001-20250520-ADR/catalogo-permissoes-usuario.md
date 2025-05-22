# Catálogo de Permissões - Módulo de Usuários

## Visão Geral

Este documento define as permissões granulares para o módulo de Usuários, seguindo o esquema de nomenclatura `modulo.recurso.operacao` estabelecido. O módulo de Usuários é essencial para o sistema PGBen, pois gerencia todos os aspectos relacionados a usuários, seus perfis e autenticação, sendo a porta de entrada para o novo sistema de permissões granulares.

## Recursos Identificados

No módulo de Usuários, identificamos os seguintes recursos principais:

1. **usuario** - Operações básicas para gerenciamento de usuários
2. **usuario.status** - Operações relacionadas ao status de ativação do usuário
3. **usuario.senha** - Operações relacionadas a senhas
4. **usuario.perfil** - Operações relacionadas ao perfil do usuário
5. **usuario.permissao** - Operações específicas para o novo sistema de permissões granulares

## Permissões Detalhadas

### Usuário (Base)

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `usuario.listar` | Listar usuários com filtros e paginação | GET /v1/usuario |
| `usuario.ler` | Obter detalhes de um usuário específico | GET /v1/usuario/:id |
| `usuario.criar` | Criar um novo usuário no sistema | POST /v1/usuario |
| `usuario.atualizar` | Atualizar dados de um usuário existente | PUT /v1/usuario/:id |

### Status do Usuário

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `usuario.status.atualizar` | Ativar ou desativar um usuário | PATCH /v1/usuario/:id/status |

### Senhas

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `usuario.senha.alterar` | Alterar senha do próprio usuário | PUT /v1/usuario/:id/senha (próprio usuário) |
| `usuario.senha.alterar.outro` | Alterar senha de outro usuário | PUT /v1/usuario/:id/senha (outro usuário) |
| `usuario.senha.resetar` | Forçar reset de senha de um usuário | (Endpoint não mapeado) |

### Perfil

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `usuario.perfil.ler` | Obter perfil do usuário autenticado | GET /v1/usuario/me |
| `usuario.perfil.atualizar` | Atualizar próprio perfil | (Parte do endpoint PUT /v1/usuario/:id) |

### Permissões (Novas)

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `usuario.permissao.atribuir` | Atribuir permissões a um usuário | (Novo endpoint a ser implementado) |
| `usuario.permissao.revogar` | Revogar permissões de um usuário | (Novo endpoint a ser implementado) |
| `usuario.permissao.listar` | Listar permissões de um usuário | (Novo endpoint a ser implementado) |

## Permissões Compostas

Além das permissões individuais, definimos também algumas permissões compostas:

| Permissão | Descrição | Permissões Incluídas |
|-----------|-----------|----------------------|
| `usuario.*` | Todas as permissões do módulo de usuário | Todas listadas acima |
| `usuario.status.*` | Todas as permissões relacionadas a status | `usuario.status.atualizar` |
| `usuario.senha.*` | Todas as permissões relacionadas a senhas | `usuario.senha.alterar`, `usuario.senha.alterar.outro`, `usuario.senha.resetar` |
| `usuario.perfil.*` | Todas as permissões relacionadas a perfil | `usuario.perfil.ler`, `usuario.perfil.atualizar` |
| `usuario.permissao.*` | Todas as permissões relacionadas a gestão de permissões | `usuario.permissao.atribuir`, `usuario.permissao.revogar`, `usuario.permissao.listar` |
| `usuario.ler.*` | Todas as permissões de leitura | `usuario.listar`, `usuario.ler`, `usuario.perfil.ler`, `usuario.permissao.listar` |

## Considerações de Segurança

1. **Separação de Papéis**: A permissão para gerenciar usuários (`usuario.criar`, `usuario.atualizar`, `usuario.status.atualizar`) deve ser distinta da permissão para gerenciar permissões (`usuario.permissao.*`). Isso permite melhor separação de papéis em organizações maiores.

2. **Alteração de Senhas**: O sistema deve diferenciar claramente entre um usuário alterando sua própria senha (`usuario.senha.alterar`) e um administrador alterando a senha de outro usuário (`usuario.senha.alterar.outro`), com níveis diferentes de autorização e auditoria.

3. **Auditoria**: Todas as operações sensíveis neste módulo devem ser registradas pelo middleware de auditoria, especialmente:
   - Criação, atualização e ativação/desativação de usuários
   - Alterações de senhas (sem armazenar a senha em si)
   - Atribuição ou revogação de permissões

4. **Autenticação Forte**: Além do controle de acesso baseado em permissões, manter ou implementar:
   - Políticas de senha fortes
   - Bloqueio temporário após tentativas de login mal-sucedidas
   - Autenticação de dois fatores para usuários com permissões administrativas

5. **Auto-Proteção do Sistema**: Garantir que o último usuário com permissões administrativas não possa:
   - Remover suas próprias permissões administrativas
   - Desativar sua própria conta
   - Isso evita que o sistema fique sem administradores

## Implementação do Novo Sistema de Permissões

A transição do modelo baseado em roles para permissões granulares requer:

1. **Novos Endpoints de Administração**: Implementar endpoints para:
   - Atribuir permissões a usuários
   - Revogar permissões de usuários
   - Listar permissões disponíveis no sistema
   - Listar permissões de um usuário específico

2. **Integração com Guards Existentes**: Modificar os guards existentes (JwtAuthGuard, RolesGuard) para:
   - Verificar permissões granulares em vez de roles
   - Suportar permissões compostas e coringas
   - Respeitar regras de escopo (usuário só pode ver/modificar dados de sua unidade)

3. **Migração Gradual**: Implementar um período de transição onde:
   - As roles tradicionais são mapeadas automaticamente para conjuntos de permissões granulares
   - Os dois sistemas funcionam em paralelo até que todos os componentes sejam migrados
   - Cada componente migrado passa a utilizar apenas permissões granulares
