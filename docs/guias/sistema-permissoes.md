# Guia do Sistema de Permissões Granulares do PGBen

## Introdução

O sistema de permissões granulares do PGBen foi projetado para fornecer um controle de acesso flexível e detalhado para todas as funcionalidades da aplicação. Este guia explica como o sistema funciona e como utilizá-lo no desenvolvimento de novos recursos.

## Conceitos Básicos

### Permissões

Uma permissão é uma autorização para realizar uma operação específica em um recurso. As permissões são identificadas por um nome no formato:

```
modulo.recurso.operacao
```

Exemplos:
- `usuario.visualizar` - Permissão para visualizar usuários
- `beneficio.aprovar` - Permissão para aprovar benefícios
- `documento.excluir` - Permissão para excluir documentos

### Escopos de Permissão

Cada permissão pode ser aplicada em um dos seguintes escopos:

- **GLOBAL**: A permissão se aplica a todos os recursos do tipo especificado
- **UNIT**: A permissão se aplica apenas a um recurso específico, identificado por um ID
- **GROUP**: A permissão se aplica a um grupo de recursos

### Permissões Compostas

O sistema suporta permissões compostas usando wildcards:

- `usuario.*` - Todas as operações em usuários
- `*.visualizar` - Visualização de qualquer recurso
- `*.*` - Todas as operações em todos os recursos (super admin)

## Arquitetura do Sistema

### Entidades Principais

1. **Permission**: Define uma permissão no sistema
2. **UserPermission**: Associa uma permissão a um usuário com um escopo específico
3. **RolePermission**: Associa uma permissão a uma role
4. **PermissionGroup**: Define um grupo de permissões
5. **PermissionGroupMapping**: Mapeia permissões para grupos

### Fluxo de Autorização

1. O usuário se autentica e recebe um token JWT contendo suas permissões
2. Ao acessar um endpoint protegido, o `PermissionGuard` verifica se o usuário possui a permissão necessária
3. O `PermissionService` consulta o banco de dados ou o cache para verificar a permissão
4. Se o usuário possuir a permissão, o acesso é concedido; caso contrário, é negado

## Como Utilizar

### Protegendo Endpoints

Para proteger um endpoint com uma permissão específica, utilize o decorator `@RequiresPermission`:

```typescript
@Get()
@RequiresPermission({
  permissionName: 'usuario.listar',
  scopeType: ScopeType.GLOBAL,
})
async findAll() {
  // Implementação
}
```

Para permissões com escopo UNIT, especifique o parâmetro que contém o ID do recurso:

```typescript
@Get(':id')
@RequiresPermission({
  permissionName: 'usuario.visualizar',
  scopeType: ScopeType.UNIT,
  scopeIdParam: 'id',
})
async findOne(@Param('id') id: string) {
  // Implementação
}
```

### Verificando Permissões Programaticamente

Para verificar permissões no código, injete o `PermissionService` e utilize o método `hasPermission`:

```typescript
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

### Verificações Complexas de Autorização

Para verificações mais complexas, utilize o `AuthorizationService`:

```typescript
@Injectable()
export class MeuServico {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async realizarOperacaoCompleta(userId: string, recursoId: string, data: any) {
    const autorizado = await this.authorizationService.isAuthorized({
      userId,
      roles: ['admin', 'gerente'],
      permissionName: 'recurso.operacao',
      scopeType: ScopeType.UNIT,
      scopeId: recursoId,
      operator: 'OR', // Usuário precisa ter a role OU a permissão
      dataCheck: (dados) => dados.status === 'ativo', // Verificação adicional baseada em dados
      data,
    });

    if (!autorizado) {
      throw new UnauthorizedException('Usuário não autorizado para esta operação');
    }

    // Implementação
  }
}
```

## Melhores Práticas

### Nomenclatura de Permissões

- Use nomes em minúsculas, separados por pontos
- Siga o padrão `modulo.recurso.operacao`
- Use verbos claros para operações (visualizar, criar, editar, excluir, etc.)
- Evite nomes muito genéricos ou muito específicos

### Escopos de Permissão

- Use GLOBAL para operações que se aplicam a todos os recursos do tipo
- Use UNIT para operações que se aplicam a um recurso específico
- Use GROUP para operações que se aplicam a um grupo de recursos

### Cache de Permissões

O sistema utiliza cache para otimizar as verificações de permissão. O cache é invalidado automaticamente quando:

- Uma permissão é concedida a um usuário
- Uma permissão é revogada de um usuário
- Uma role é atribuída ou removida de um usuário

### Testes

Ao implementar novos recursos, sempre teste as permissões:

- Teste com usuários que possuem a permissão
- Teste com usuários que não possuem a permissão
- Teste com escopos diferentes (GLOBAL, UNIT, GROUP)
- Teste com permissões compostas (wildcards)

## Exemplos de Uso

### Exemplo 1: Listagem de Usuários

```typescript
@Controller('v1/users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequiresPermission({
    permissionName: 'usuario.listar',
    scopeType: ScopeType.GLOBAL,
  })
  async findAll() {
    return this.userService.findAll();
  }
}
```

### Exemplo 2: Edição de Usuário

```typescript
@Controller('v1/users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Put(':id')
  @RequiresPermission({
    permissionName: 'usuario.editar',
    scopeType: ScopeType.UNIT,
    scopeIdParam: 'id',
  })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }
}
```

### Exemplo 3: Aprovação de Benefício

```typescript
@Controller('v1/beneficios')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class BeneficioController {
  constructor(
    private readonly beneficioService: BeneficioService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  @Post(':id/aprovar')
  @RequiresPermission({
    permissionName: 'beneficio.aprovar',
    scopeType: ScopeType.UNIT,
    scopeIdParam: 'id',
  })
  async aprovar(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const beneficio = await this.beneficioService.findOne(id);
    
    // Verificação adicional baseada em dados
    const autorizado = await this.authorizationService.isAuthorized({
      userId,
      permissionName: 'beneficio.aprovar',
      scopeType: ScopeType.UNIT,
      scopeId: id,
      dataCheck: (data) => {
        // Verificar se o benefício não foi criado pelo próprio usuário
        return data.criadoPor !== userId;
      },
      data: beneficio,
    });
    
    if (!autorizado) {
      throw new UnauthorizedException('Você não pode aprovar um benefício que você mesmo criou');
    }
    
    return this.beneficioService.aprovar(id, userId);
  }
}
```

## Solução de Problemas

### Permissão Negada Inesperadamente

1. Verifique se o usuário possui a permissão necessária
2. Verifique se o escopo da permissão está correto
3. Verifique se o token JWT contém as permissões do usuário
4. Limpe o cache de permissões e tente novamente

### Erros de Autorização

1. Verifique se o `PermissionGuard` está sendo aplicado ao controlador
2. Verifique se o decorator `@RequiresPermission` está configurado corretamente
3. Verifique se o parâmetro `scopeIdParam` está correto para permissões com escopo UNIT

### Problemas de Performance

1. Verifique se o cache de permissões está funcionando corretamente
2. Otimize as consultas de banco de dados para permissões
3. Considere reduzir o tamanho do payload do JWT

## Referências

- [Documentação da API](/api/docs)
- [Código-fonte do módulo de autenticação](/src/auth)
- [Testes do sistema de permissões](/test/auth)

## Suporte

Para dúvidas ou problemas relacionados ao sistema de permissões, entre em contato com a equipe de desenvolvimento.
