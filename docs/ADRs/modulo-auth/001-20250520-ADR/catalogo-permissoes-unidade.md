# Catálogo de Permissões - Módulo de Unidades

## Visão Geral

Este documento define as permissões granulares para o módulo de Unidades, seguindo o esquema de nomenclatura `modulo.recurso.operacao` estabelecido. O módulo de Unidades é crucial para o sistema PGBen, pois gerencia a estrutura organizacional e será fundamental para implementar as regras de escopo no novo sistema de permissões granulares.

## Recursos Identificados

No módulo de Unidades, identificamos os seguintes recursos principais:

1. **unidade** - Operações básicas para gerenciamento de unidades
2. **unidade.status** - Operações relacionadas ao status de ativação da unidade
3. **setor** - Operações para gerenciamento de setores dentro de unidades

## Permissões Detalhadas

### Unidade (Base)

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `unidade.listar` | Listar unidades com filtros e paginação | GET /v1/unidade |
| `unidade.ler` | Obter detalhes de uma unidade específica | GET /v1/unidade/:id |
| `unidade.criar` | Criar uma nova unidade no sistema | POST /v1/unidade |
| `unidade.atualizar` | Atualizar dados de uma unidade existente | PUT /v1/unidade/:id |

### Status da Unidade

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `unidade.status.atualizar` | Ativar ou desativar uma unidade | PATCH /v1/unidade/:id/status |

### Setores

| Permissão | Descrição | Endpoint Relacionado |
|-----------|-----------|----------------------|
| `unidade.setor.listar` | Listar setores de uma unidade específica | GET /v1/unidade/:id/setor |
| `setor.criar` | Criar um novo setor | POST /v1/setor |
| `setor.atualizar` | Atualizar um setor existente | PUT /v1/setor/:id |
| `setor.ler` | Obter detalhes de um setor específico | (Implícito no listar setores) |

## Permissões Compostas

Além das permissões individuais, definimos também algumas permissões compostas:

| Permissão | Descrição | Permissões Incluídas |
|-----------|-----------|----------------------|
| `unidade.*` | Todas as permissões do módulo de unidade | Todas as permissões de unidade |
| `setor.*` | Todas as permissões do módulo de setor | Todas as permissões de setor |
| `unidade.status.*` | Todas as permissões relacionadas a status | `unidade.status.atualizar` |
| `unidade.ler.*` | Todas as permissões de leitura de unidades | `unidade.listar`, `unidade.ler`, `unidade.setor.listar` |

## Considerações de Segurança

1. **Escopo Hierárquico**: O sistema de permissões deve respeitar a hierarquia organizacional:
   - Administradores podem ver e gerenciar todas as unidades
   - Gestores podem gerenciar apenas suas próprias unidades e as subordinadas
   - Técnicos podem ver apenas informações da própria unidade

2. **Restrições por Escopo**: As unidades são fundamentais para implementar o escopo de acesso a recursos como:
   - Solicitações de benefício
   - Cidadãos
   - Documentos
   - Usuários da unidade

3. **Auditoria**: Todas as operações sensíveis neste módulo devem ser registradas pelo middleware de auditoria, especialmente:
   - Criação e atualização de unidades
   - Ativação/desativação de unidades
   - Criação e atualização de setores

4. **Integração com Outros Módulos**: As permissões deste módulo interagem diretamente com outros módulos:
   - Gerenciamento de usuários (associação de usuários a unidades)
   - Solicitações (filtro por unidade)
   - Relatórios (escopo por unidade)

5. **Segurança de Dados**: Garantir que informações sensíveis da unidade (como endereços específicos de abrigos) sejam adequadamente protegidas e criptografadas quando necessário.

## Implementação das Regras de Escopo

O novo sistema de permissões granulares deve incluir regras de escopo baseadas em unidades:

1. **Modificação dos Guards**: Implementar lógica nos guards para verificar não apenas a permissão, mas também o escopo da permissão:
   ```typescript
   // Exemplo de guard modificado
   canActivate(context: ExecutionContext): boolean {
     const user = this.getUser(context);
     const resource = this.getResource(context);
     
     // Verificar permissão base
     if (!this.permissionService.hasPermission(user, 'solicitacao.ler')) {
       return false;
     }
     
     // Verificar escopo da unidade
     if (!this.scopeService.isInScope(user, resource.unidadeId)) {
       return false;
     }
     
     return true;
   }
   ```

2. **Implementação do ScopeService**: Desenvolver serviço dedicado para verificação de escopo:
   - Verificar se um recurso está no escopo de unidades do usuário
   - Implementar cache para melhorar performance
   - Suportar relações hierárquicas entre unidades

3. **Metadados de Escopo nas Permissões**: Possibilidade de adicionar metadados de escopo às permissões:
   ```typescript
   // Exemplo de definição com escopo
   const permission = {
     name: 'solicitacao.ler',
     scope: 'UNIT', // Escopo por unidade
   };
   ```

A implementação correta das regras de escopo baseadas em unidades é fundamental para garantir a segregação adequada de dados em um sistema multi-unidade como o PGBen.
