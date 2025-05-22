# Catálogo de Permissões - Módulo de Cidadão

## Visão Geral

Este documento define as permissões granulares para o módulo de Cidadão, seguindo o esquema de nomenclatura `modulo.recurso.operacao` estabelecido.

## Recursos Identificados

No módulo de Cidadão, identificamos os seguintes recursos principais:

1. **cidadao** - Operações relacionadas a cadastro e gestão de cidadãos
2. **cidadao.composicao** - Operações relacionadas à composição familiar do cidadão
3. **cidadao.papel** - Operações relacionadas aos papéis que um cidadão pode assumir (vulnerável, responsável familiar, etc.)
4. **cidadao.solicitacao** - Operações relacionadas ao histórico de solicitações de um cidadão

## Permissões Detalhadas

### Cidadão (Base)

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `cidadao.listar` | Listar cidadãos com filtros e paginação | GET /v1/cidadao |
| `cidadao.ler` | Obter detalhes de um cidadão específico | GET /v1/cidadao/:id |
| `cidadao.criar` | Criar um novo cadastro de cidadão | POST /v1/cidadao |
| `cidadao.atualizar` | Atualizar dados de um cidadão existente | PUT /v1/cidadao/:id |
| `cidadao.buscar.cpf` | Buscar cidadão pelo número de CPF | GET /v1/cidadao/cpf/:cpf |
| `cidadao.buscar.nis` | Buscar cidadão pelo número de NIS | GET /v1/cidadao/nis/:nis |

### Composição Familiar

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `cidadao.composicao.criar` | Adicionar membro à composição familiar | POST /v1/cidadao/:id/composicao |
| `cidadao.composicao.ler` | Visualizar membros da composição familiar (parte de visualizar cidadão) | GET /v1/cidadao/:id |
| `cidadao.composicao.atualizar` | Atualizar vínculo ou dados de composição familiar | Não mapeado no inventário atual |
| `cidadao.composicao.excluir` | Remover membro da composição familiar | Não mapeado no inventário atual |

### Papel de Cidadão

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `cidadao.papel.criar` | Criar novo papel para um cidadão | POST /v1/cidadao/papel |
| `cidadao.papel.listar` | Listar papéis de um cidadão específico | GET /v1/cidadao/papel/cidadao/:cidadaoId |
| `cidadao.papel.buscar.tipo` | Buscar cidadãos por tipo de papel | GET /v1/cidadao/papel/tipo/:tipoPapel |
| `cidadao.papel.verificar` | Verificar se um cidadão possui um determinado papel | GET /v1/cidadao/papel/verificar/:cidadaoId/:tipoPapel |
| `cidadao.papel.excluir` | Desativar papel de um cidadão | DELETE /v1/cidadao/papel/:id |

### Histórico de Solicitações

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `cidadao.solicitacao.listar` | Obter histórico de solicitações de um cidadão | GET /v1/cidadao/:id/solicitacao |

## Permissões Compostas

Além das permissões individuais, definimos também algumas permissões compostas:

| Permissão | Descrição | Permissões Incluídas |
|-----------|-----------|----------------------|
| `cidadao.*` | Todas as permissões do módulo de cidadão | Todas listadas acima |
| `cidadao.papel.*` | Todas as permissões relacionadas a papéis | `cidadao.papel.criar`, `cidadao.papel.listar`, `cidadao.papel.buscar.tipo`, `cidadao.papel.verificar`, `cidadao.papel.excluir` |
| `cidadao.composicao.*` | Todas as permissões relacionadas à composição familiar | `cidadao.composicao.criar`, `cidadao.composicao.ler`, `cidadao.composicao.atualizar`, `cidadao.composicao.excluir` |

## Considerações de Segurança

1. **Escopo de Unidade**: As permissões `cidadao.listar`, `cidadao.buscar.cpf` e `cidadao.buscar.nis` devem respeitar o escopo da unidade do usuário. Um técnico de unidade só deve poder listar/buscar cidadãos vinculados à sua unidade.

2. **Dados Sensíveis**: O acesso a dados sensíveis dos cidadãos (como CPF, NIS, dados de renda) deve ser registrado em logs de auditoria.

3. **Permissões de Criação/Edição**: Por padrão, apenas usuários com papel GESTOR ou ADMIN deveriam ter permissão para criar novos cidadãos ou alterar dados críticos.

4. **Papéis de Cidadão**: A atribuição de papéis como "vulnerável" ou "responsável familiar" pode ter implicações legais e de processo, portanto as permissões de criação e exclusão de papéis devem ser concedidas com cautela.
