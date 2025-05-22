# ADR 002: Implementação do Sistema de Permissões Granulares

## Status

Aprovado

## Contexto

O PGBen necessita de um sistema de controle de acesso mais flexível e detalhado que permita:

1. Atribuir permissões específicas a usuários para operações individuais
2. Limitar o acesso a recursos específicos (escopo de permissões)
3. Gerenciar permissões de forma dinâmica sem necessidade de alterações no código
4. Manter compatibilidade com o sistema de roles existente durante a transição

O sistema atual baseado apenas em roles (admin, gerente, operador, etc.) não oferece a granularidade necessária para atender aos requisitos de segurança e flexibilidade do sistema.

## Decisão

Implementaremos um sistema de permissões granulares com as seguintes características:

1. **Estrutura de Permissões**: Formato `modulo.recurso.operacao` (ex: `usuario.visualizar`, `beneficio.aprovar`)
2. **Escopos de Permissão**: GLOBAL (todos os recursos), UNIT (recurso específico), GROUP (grupo de recursos)
3. **Permissões Compostas**: Suporte a wildcards (ex: `usuario.*`, `*.visualizar`, `*.*`)
4. **Armazenamento em JWT**: Inclusão das permissões no token JWT para verificações no cliente
5. **Cache de Permissões**: Implementação de cache para otimizar verificações frequentes
6. **Verificações Baseadas em Dados**: Suporte a verificações adicionais baseadas em dados do recurso

### Modelo de Dados

Implementaremos as seguintes entidades:

1. **Permission**: Define uma permissão no sistema
   - `id`: Identificador único
   - `name`: Nome da permissão no formato `modulo.recurso.operacao`
   - `description`: Descrição da permissão
   - `isComposite`: Indica se é uma permissão composta (com wildcard)

2. **UserPermission**: Associa uma permissão a um usuário
   - `userId`: ID do usuário
   - `permissionId`: ID da permissão
   - `scopeType`: Tipo de escopo (GLOBAL, UNIT, GROUP)
   - `scopeId`: ID do escopo (para UNIT e GROUP)
   - `validUntil`: Data de validade da permissão (opcional)
   - `createdBy`: Usuário que concedeu a permissão
   - `createdAt`: Data de criação
   - `updatedAt`: Data de atualização
   - `deletedAt`: Data de exclusão (soft delete)

3. **RolePermission**: Associa uma permissão a uma role
   - `roleId`: ID da role
   - `permissionId`: ID da permissão
   - `createdAt`: Data de criação
   - `updatedAt`: Data de atualização

4. **PermissionGroup**: Define um grupo de permissões
   - `id`: Identificador único
   - `name`: Nome do grupo
   - `description`: Descrição do grupo

5. **PermissionGroupMapping**: Mapeia permissões para grupos
   - `groupId`: ID do grupo
   - `permissionId`: ID da permissão

### Implementação

1. **Migração do Banco de Dados**: Criação das tabelas necessárias
2. **Serviço de Permissões**: Implementação do `PermissionService` para verificar permissões
3. **Guard de Permissões**: Implementação do `PermissionGuard` para proteger endpoints
4. **Decorator de Permissões**: Implementação do `@RequiresPermission` para declarar permissões necessárias
5. **Adaptador de Usuário**: Atualização para incluir permissões no token JWT
6. **Serviço de Autorização**: Implementação do `AuthorizationService` para verificações complexas
7. **Endpoints de Gestão**: Implementação de endpoints para gerenciar permissões

## Consequências

### Positivas

1. **Controle de Acesso Detalhado**: Permissões específicas para cada operação
2. **Flexibilidade**: Atribuição dinâmica de permissões sem alterações no código
3. **Segurança Aprimorada**: Verificações de acesso mais precisas e baseadas em contexto
4. **Experiência do Usuário**: Interface adaptada às permissões do usuário
5. **Auditoria**: Rastreamento de quem concedeu/revogou permissões e quando
6. **Desempenho**: Cache de permissões para otimizar verificações frequentes

### Negativas

1. **Complexidade**: Sistema mais complexo que o anterior baseado apenas em roles
2. **Tamanho do JWT**: Aumento no tamanho do token JWT devido à inclusão das permissões
3. **Curva de Aprendizado**: Desenvolvedores precisarão aprender a usar o novo sistema
4. **Manutenção**: Mais entidades para manter e sincronizar

### Mitigações

1. **Documentação**: Criação de guias detalhados para desenvolvedores e equipe de frontend
2. **Testes**: Implementação de testes unitários e de integração abrangentes
3. **Otimização**: Cache de permissões e otimização de consultas de banco de dados
4. **Transição Gradual**: Manutenção do sistema de roles durante a transição

## Alternativas Consideradas

### 1. Manter o Sistema de Roles Existente

**Prós**:
- Simplicidade
- Familiaridade da equipe
- Menor impacto no código existente

**Contras**:
- Falta de granularidade
- Dificuldade em atribuir permissões específicas
- Necessidade de criar novas roles para cada combinação de permissões

### 2. Utilizar um Sistema de Permissões de Terceiros

**Prós**:
- Menos código para manter
- Potencialmente mais testado e maduro

**Contras**:
- Dependência externa
- Possível incompatibilidade com a arquitetura existente
- Curva de aprendizado para a equipe

### 3. Implementar um Sistema de Atributos (ABAC - Attribute-Based Access Control)

**Prós**:
- Ainda mais flexível que o sistema de permissões granulares
- Decisões de acesso baseadas em múltiplos atributos

**Contras**:
- Complexidade significativamente maior
- Desempenho potencialmente inferior
- Curva de aprendizado mais íngreme

## Implementação

### Fase 1: Migração do Banco de Dados

Criação das tabelas necessárias:
- `permission`
- `user_permission`
- `role_permission`
- `permission_group`
- `permission_group_mapping`

### Fase 2: Implementação do Core

- Serviço de permissões
- Guard de permissões
- Decorator de permissões
- Adaptador de usuário
- Serviço de autorização

### Fase 3: Endpoints de Gestão

- Listar permissões
- Atribuir permissões a usuários
- Revogar permissões de usuários
- Testar permissões

### Fase 4: Testes e Documentação

- Testes unitários
- Testes de integração
- Testes de carga e performance
- Documentação para desenvolvedores
- Documentação para equipe de frontend

## Referências

- [Role-Based Access Control (RBAC)](https://en.wikipedia.org/wiki/Role-based_access_control)
- [Attribute-Based Access Control (ABAC)](https://en.wikipedia.org/wiki/Attribute-based_access_control)
- [JWT (JSON Web Tokens)](https://jwt.io/)
- [NestJS Guards](https://docs.nestjs.com/guards)
- [TypeORM](https://typeorm.io/)

## Apêndice

### Exemplo de Verificação de Permissão

```typescript
// Controlador protegido por permissão
@Controller('v1/users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UserController {
  @Get()
  @RequiresPermission({
    permissionName: 'usuario.listar',
    scopeType: ScopeType.GLOBAL,
  })
  async findAll() {
    // Implementação
  }
  
  @Get(':id')
  @RequiresPermission({
    permissionName: 'usuario.visualizar',
    scopeType: ScopeType.UNIT,
    scopeIdParam: 'id',
  })
  async findOne(@Param('id') id: string) {
    // Implementação
  }
}
```

### Exemplo de Verificação Programática

```typescript
// Verificação programática de permissão
@Injectable()
export class MeuServico {
  constructor(private readonly permissionService: PermissionService) {}
  
  async realizarOperacao(userId: string, recursoId: string) {
    const temPermissao = await this.permissionService.hasPermission({
      userId,
      permissionName: 'recurso.operacao',
      scopeType: ScopeType.UNIT,
      scopeId: recursoId,
    });
    
    if (!temPermissao) {
      throw new UnauthorizedException('Usuário não possui permissão para esta operação');
    }
    
    // Implementação
  }
}
```
