# Modelo de Dados - Sistema de Permissões Granulares

## Visão Geral

Este documento descreve o modelo de dados proposto para o sistema de permissões granulares do PGBen. O modelo foi projetado para suportar todas as funcionalidades identificadas na fase de análise, incluindo permissões compostas, regras de escopo e integração com o middleware de auditoria existente.

## Entidades Principais

### 1. Permissão (`permission`)

Representa uma permissão individual no sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único da permissão |
| `name` | VARCHAR(100) | Nome da permissão no formato `modulo.recurso.operacao` |
| `description` | VARCHAR(255) | Descrição da permissão |
| `is_composite` | BOOLEAN | Indica se é uma permissão composta (ex: `modulo.*`) |
| `parent_id` | UUID | Referência à permissão pai (para permissões compostas) |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de última atualização |
| `created_by` | UUID | Usuário que criou a permissão |
| `updated_by` | UUID | Usuário que atualizou a permissão por último |

**Índices:**
- Primário: `id`
- Único: `name`
- Índice: `parent_id`

### 2. Grupo de Permissões (`permission_group`)

Representa um agrupamento lógico de permissões (ex: "Gerenciamento de Cidadãos").

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único do grupo |
| `name` | VARCHAR(100) | Nome do grupo |
| `description` | VARCHAR(255) | Descrição do grupo |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de última atualização |
| `created_by` | UUID | Usuário que criou o grupo |
| `updated_by` | UUID | Usuário que atualizou o grupo por último |

**Índices:**
- Primário: `id`
- Único: `name`

### 3. Permissão-Grupo (`permission_group_mapping`)

Relacionamento muitos-para-muitos entre permissões e grupos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único do mapeamento |
| `permission_id` | UUID | Referência à permissão |
| `group_id` | UUID | Referência ao grupo |
| `created_at` | TIMESTAMP | Data de criação |
| `created_by` | UUID | Usuário que criou o mapeamento |

**Índices:**
- Primário: `id`
- Índice composto: `(permission_id, group_id)`

### 4. Role (`role`)

Representa os papéis existentes no sistema (Administrador, Gestor, etc.).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único da role |
| `name` | VARCHAR(50) | Nome da role |
| `description` | VARCHAR(255) | Descrição da role |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de última atualização |
| `created_by` | UUID | Usuário que criou a role |
| `updated_by` | UUID | Usuário que atualizou a role por último |

**Índices:**
- Primário: `id`
- Único: `name`

### 5. Role-Permissão (`role_permission`)

Relacionamento muitos-para-muitos entre roles e permissões.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único do mapeamento |
| `role_id` | UUID | Referência à role |
| `permission_id` | UUID | Referência à permissão |
| `created_at` | TIMESTAMP | Data de criação |
| `created_by` | UUID | Usuário que criou o mapeamento |

**Índices:**
- Primário: `id`
- Índice composto: `(role_id, permission_id)`

### 6. Usuário-Permissão (`user_permission`)

Permissões atribuídas diretamente a usuários (sobrepõe-se às permissões da role).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único do mapeamento |
| `user_id` | UUID | Referência ao usuário |
| `permission_id` | UUID | Referência à permissão |
| `granted` | BOOLEAN | Se a permissão é concedida (true) ou revogada (false) |
| `scope_type` | VARCHAR(20) | Tipo de escopo (GLOBAL, UNIT, SELF) |
| `scope_id` | UUID | ID do escopo (ex: ID da unidade) |
| `valid_until` | TIMESTAMP | Data de validade (para permissões temporárias) |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de última atualização |
| `created_by` | UUID | Usuário que criou o mapeamento |
| `updated_by` | UUID | Usuário que atualizou o mapeamento por último |

**Índices:**
- Primário: `id`
- Índice composto: `(user_id, permission_id, scope_type, scope_id)`
- Índice: `valid_until`

### 7. Permissão-Escopo (`escopo_permissao`)

Define regras de escopo padrão para permissões.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único do mapeamento |
| `permission_id` | UUID | Referência à permissão |
| `default_scope_type` | VARCHAR(20) | Tipo de escopo padrão (GLOBAL, UNIT, SELF) |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de última atualização |
| `created_by` | UUID | Usuário que criou o mapeamento |
| `updated_by` | UUID | Usuário que atualizou o mapeamento por último |

**Índices:**
- Primário: `id`
- Único: `permission_id`

## Diagrama de Relacionamento de Entidades (ERD)

```
+---------------+       +-------------------+       +----------------+
|               |       |                   |       |                |
|  permission   +-------+ permission_group_ +-------+  permission_   |
|               |       | mapping           |       |  group         |
+---------------+       +-------------------+       +----------------+
        |
        |
        |                +----------------+
        |                |                |
        +----------------+ role_permission+----------+
        |                |                |          |
        |                +----------------+          |
        |                                            |
        |                                            |
        |                                      +-----+------+
        |                                      |            |
        |                                      |    role    |
        |                                      |            |
        |                                      +------------+
        |
        |
        |                +----------------+
        |                |                |
        +----------------+ user_permission+----------+
        |                |                |          |
        |                +----------------+          |
        |                                            |
        |                                            |
        |                                      +-----+------+
        |                                      |            |
        |                                      |    user    |
        |                                      |            |
        |                                      +------------+
        |
        |
        |                +----------------+
        |                |                |
        +----------------+ permission_    |
                         | scope          |
                         |                |
                         +----------------+
```

## Considerações de Implementação

### 1. Compatibilidade com o Sistema Atual

Durante a fase de transição, o novo sistema de permissões coexistirá com o sistema baseado em roles. Para garantir compatibilidade:

- A tabela `role` manterá os mesmos valores do enum `Role` atual
- As permissões serão mapeadas automaticamente para roles existentes
- O serviço de permissões verificará tanto permissões granulares quanto roles

### 2. Auditoria

Todas as operações nas tabelas acima serão auditadas pelo middleware de auditoria existente:

- Criação, modificação e exclusão de permissões
- Atribuição e revogação de permissões a usuários
- Modificações em grupos de permissões

### 3. Caching

Para otimizar o desempenho, o sistema implementará estratégias de cache:

- Cache de permissões por usuário
- Invalidação de cache quando permissões são modificadas
- TTL (Time-to-Live) configurável para entradas de cache

### 4. Migração de Dados

A migração para o novo sistema seguirá estas etapas:

1. Criar as novas tabelas sem afetar as existentes
2. Popular as tabelas com dados iniciais (permissões, grupos, mapeamentos)
3. Implementar o novo serviço de permissões
4. Migrar gradualmente os controladores para usar o novo sistema
5. Após a migração completa, remover o código legado

## Exemplos de Dados

### Exemplo de Permissões

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "cidadao.listar",
    "description": "Listar cidadãos com filtros e paginação",
    "is_composite": false,
    "parent_id": null
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "cidadao.*",
    "description": "Todas as permissões do módulo de cidadão",
    "is_composite": true,
    "parent_id": null
  }
]
```

### Exemplo de Mapeamento Role-Permissão

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440100",
    "role_id": "550e8400-e29b-41d4-a716-446655440200", // ADMIN
    "permission_id": "550e8400-e29b-41d4-a716-446655440001" // cidadao.*
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440101",
    "role_id": "550e8400-e29b-41d4-a716-446655440201", // GESTOR
    "permission_id": "550e8400-e29b-41d4-a716-446655440000" // cidadao.listar
  }
]
```

### Exemplo de Permissão com Escopo

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440300",
  "user_id": "550e8400-e29b-41d4-a716-446655440400",
  "permission_id": "550e8400-e29b-41d4-a716-446655440000", // cidadao.listar
  "granted": true,
  "scope_type": "UNIT",
  "scope_id": "550e8400-e29b-41d4-a716-446655440500", // ID da unidade
  "valid_until": null
}
```

## Próximos Passos

1. Implementar as migrations para criar as tabelas descritas acima
2. Desenvolver os modelos TypeORM correspondentes
3. Implementar o serviço de permissões
4. Criar scripts de seed para popular as tabelas com dados iniciais
