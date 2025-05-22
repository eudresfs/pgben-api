# Guia de Migração para o Sistema de Permissões Granulares

Este guia fornece instruções detalhadas sobre como migrar os controladores existentes para o novo sistema de permissões granulares do PGBen.

## Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Passo a Passo da Migração](#passo-a-passo-da-migração)
4. [Exemplos](#exemplos)
5. [Considerações de Escopo](#considerações-de-escopo)
6. [Tratamento de Erros](#tratamento-de-erros)
7. [Testes](#testes)
8. [Perguntas Frequentes](#perguntas-frequentes)

## Visão Geral

O novo sistema de permissões granulares substitui o modelo baseado em roles por um modelo mais detalhado, onde cada operação específica requer uma permissão dedicada. Isso proporciona um controle de acesso mais preciso e seguro.

As permissões seguem o formato `modulo.recurso.operacao` e podem ser atribuídas diretamente a usuários ou a roles. Além disso, as permissões podem ter diferentes escopos (GLOBAL, UNIT, SELF), permitindo um controle de acesso ainda mais refinado.

## Pré-requisitos

Antes de iniciar a migração, certifique-se de que:

1. O módulo `PermissionModule` está importado no módulo principal da aplicação.
2. As migrações do banco de dados foram executadas.
3. Os scripts de seed foram executados para popular o banco de dados com as permissões necessárias.
4. O serviço de autenticação está configurado para incluir o ID do usuário no objeto `request.user`.

## Passo a Passo da Migração

### 1. Importar os componentes necessários

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequiresPermission } from '../../auth/decorators/requires-permission.decorator';
import { ScopeType } from '../../auth/entities/user-permission.entity';
```

### 2. Aplicar os guards no controlador

```typescript
@Controller('recurso')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RecursoController {
  // ...
}
```

### 3. Aplicar o decorador RequiresPermission nos métodos

```typescript
@Get()
@RequiresPermission({ permissionName: 'modulo.recurso.listar' })
findAll() {
  // ...
}
```

### 4. Configurar o escopo da permissão, se necessário

```typescript
@Get(':id')
@RequiresPermission({
  permissionName: 'modulo.recurso.visualizar',
  scopeType: ScopeType.UNIT,
  scopeIdExpression: 'params.unidadeId',
})
findOne(@Param('id') id: string) {
  // ...
}
```

## Exemplos

### Exemplo 1: Permissão Global

```typescript
@Get()
@RequiresPermission({ permissionName: 'configuracao.parametro.listar' })
findAllParametros() {
  // ...
}
```

### Exemplo 2: Permissão com Escopo de Unidade

```typescript
@Get('unidade/:unidadeId/usuarios')
@RequiresPermission({
  permissionName: 'usuario.listar',
  scopeType: ScopeType.UNIT,
  scopeIdExpression: 'params.unidadeId',
})
findUsuariosByUnidade(@Param('unidadeId') unidadeId: string) {
  // ...
}
```

### Exemplo 3: Permissão com Escopo Próprio

```typescript
@Patch('usuarios/:id/senha')
@RequiresPermission({
  permissionName: 'usuario.alterar_senha',
  scopeType: ScopeType.SELF,
})
alterarSenha(@Param('id') id: string, @Body() dto: AlterarSenhaDto, @Req() req: any) {
  // Verifica se o usuário está tentando alterar a própria senha
  if (id !== req.user.id) {
    throw new ForbiddenException('Você só pode alterar sua própria senha');
  }
  // ...
}
```

### Exemplo 4: Múltiplas Permissões

```typescript
@Post('solicitacoes/:id/aprovar')
@RequiresPermission({ permissionName: 'solicitacao.visualizar' })
@RequiresPermission({ permissionName: 'solicitacao.status.transicao.EM_ANALISE.APROVADA' })
aprovarSolicitacao(@Param('id') id: string) {
  // ...
}
```

## Considerações de Escopo

### Expressões de Escopo

A propriedade `scopeIdExpression` permite especificar uma expressão para obter o ID do escopo a partir dos parâmetros da requisição. A expressão é avaliada em tempo de execução pelo `PermissionGuard`.

Exemplos de expressões:

- `'params.unidadeId'`: Obtém o ID da unidade dos parâmetros da rota.
- `'query.unidadeId'`: Obtém o ID da unidade dos parâmetros de consulta.
- `'body.unidadeId'`: Obtém o ID da unidade do corpo da requisição.
- `'entidade.unidadeId'`: Obtém o ID da unidade de uma entidade buscada no banco de dados.

### Escopo Próprio (SELF)

O escopo `SELF` é usado para operações que o usuário pode realizar apenas em seus próprios recursos. Nesse caso, o `PermissionGuard` não verifica o escopo, mas o controlador deve verificar se o usuário está acessando seus próprios recursos.

## Tratamento de Erros

O `PermissionGuard` retorna um erro `403 Forbidden` quando o usuário não tem a permissão necessária. É recomendável adicionar tratamento de erros adequado nos controladores para fornecer mensagens de erro mais específicas.

```typescript
try {
  // Operação que requer permissão
} catch (error) {
  if (error instanceof ForbiddenException) {
    // Tratamento específico para erro de permissão
  }
  throw error;
}
```

## Testes

### Testes Unitários

Para testar controladores que utilizam o sistema de permissões granulares, é necessário mockar o `PermissionGuard` e o `PermissionService`.

```typescript
// Mock do PermissionGuard
const mockPermissionGuard = {
  canActivate: jest.fn().mockImplementation(() => true),
};

// Mock do PermissionService
const mockPermissionService = {
  hasPermission: jest.fn().mockImplementation(() => Promise.resolve(true)),
};

// Configuração do módulo de teste
beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [RecursoController],
    providers: [
      RecursoService,
      { provide: PermissionService, useValue: mockPermissionService },
    ],
  })
    .overrideGuard(PermissionGuard)
    .useValue(mockPermissionGuard)
    .compile();

  controller = module.get<RecursoController>(RecursoController);
  service = module.get<RecursoService>(RecursoService);
});
```

### Testes de Integração

Para testes de integração, é recomendável usar um banco de dados de teste com as permissões necessárias já populadas.

## Perguntas Frequentes

### Como lidar com permissões compostas?

As permissões compostas (como `modulo.*`) são verificadas automaticamente pelo `PermissionService`. Se um usuário tem a permissão `modulo.*`, ele terá acesso a todas as operações do módulo.

### Como lidar com permissões temporárias?

As permissões temporárias (com data de validade) são verificadas automaticamente pelo `PermissionService`. Não é necessário fazer nenhuma modificação nos controladores.

### Como lidar com permissões de role?

As permissões atribuídas a roles são verificadas automaticamente pelo `PermissionService`. Não é necessário fazer nenhuma modificação nos controladores.

### Como depurar problemas de permissão?

O `PermissionService` e o `PermissionGuard` registram logs detalhados sobre as verificações de permissão. Verifique os logs da aplicação para identificar problemas.

Além disso, o endpoint `GET /permissions/check` pode ser usado para verificar se um usuário tem uma permissão específica.

---

## Próximos Passos

1. Identifique os controladores que precisam ser migrados.
2. Priorize os controladores com maior risco de segurança.
3. Aplique as modificações seguindo este guia.
4. Teste as modificações para garantir que o controle de acesso está funcionando corretamente.
5. Documente as permissões necessárias para cada endpoint na documentação da API.

Para mais informações, consulte a documentação completa do sistema de permissões granulares.
