# Plano de Diagnóstico e Correção - Travamento na Inicialização

## 📋 Resumo Executivo

A aplicação NestJS está travando durante a inicialização após o mapeamento de rotas. Com base na análise do `git diff`, o problema está relacionado às alterações recentes no sistema de permissões granulares.

## 🔍 Análise do Problema

### Sintomas Observados
- ✅ Aplicação compila sem erros
- ✅ Todos os módulos carregam corretamente
- ✅ Todas as rotas são mapeadas com sucesso
- ❌ Servidor nunca executa `app.listen()`
- ❌ Não há mensagem de "Servidor iniciado com sucesso"

### Principais Alterações Identificadas
1. **Sistema de Permissões Granulares** - Substituição completa do sistema de autorização
2. **Mudanças na Ordem dos Módulos** - Alteração no `app.module.ts`
3. **Resolução de Dependências Circulares** - Uso de `forwardRef()`
4. **Middleware de Auditoria** - Refatoração completa

## 🎯 Diagnóstico Estruturado

### Fase 1: Isolamento do Problema (30 minutos)

#### Teste 1.1: Desativar Sistema de Permissões
```bash
# Prioridade: ALTA
# Tempo estimado: 5 minutos
```

**Ação:** Comentar temporariamente o `PermissionGuard` em todos os controllers:

```typescript
// ANTES
@UseGuards(JwtAuthGuard, PermissionGuard)

// DEPOIS (temporário)
@UseGuards(JwtAuthGuard)
```

**Arquivos para modificar:**
- `src/modules/*/controllers/*.controller.ts`
- `src/auth/controllers/*.controller.ts`

**Resultado esperado:** Se o servidor iniciar normalmente, confirma que o problema está no sistema de permissões.

#### Teste 1.2: Remover PermissionModule das Importações
```bash
# Prioridade: ALTA
# Tempo estimado: 5 minutos
```

**Ação:** Comentar importações do `PermissionModule`:

```typescript
// Em todos os módulos
// import { PermissionModule } from '../../auth/permission.module';

@Module({
  imports: [
    // PermissionModule, // ← Comentar temporariamente
    // ...outros imports
  ],
})
```

#### Teste 1.3: Verificar Middleware de Auditoria
```bash
# Prioridade: MÉDIA
# Tempo estimado: 5 minutos
```

**Ação:** Comentar o middleware no `auditoria.module.ts`:

```typescript
configure(consumer: MiddlewareConsumer) {
  // Comentar temporariamente
  /*
  consumer
    .apply(AuditoriaMiddleware)
    .exclude(...)
    .forRoutes({ path: '*', method: RequestMethod.ALL });
  */
}
```

#### Teste 1.4: Reverter Ordem dos Módulos
```bash
# Prioridade: BAIXA
# Tempo estimado: 2 minutos
```

**Ação:** No `app.module.ts`, reverter para a ordem original:

```typescript
imports: [
  // ...outros módulos
  AuthModule,        // ← Mover para cima
  UsuarioModule,     // ← Mover para baixo
  // ...outros módulos
],
```

### Fase 2: Análise Detalhada (45 minutos)

#### Teste 2.1: Análise do PermissionService
```bash
# Se Fase 1 confirmar problema no sistema de permissões
```

**Investigar:**
1. **Queries N+1** no banco de dados
2. **Consultas síncronas** bloqueantes
3. **Dependências circulares** não resolvidas
4. **Cache não implementado** para permissões

**Verificações:**
```typescript
// No PermissionService, adicionar logs de debug
constructor() {
  this.logger.debug('PermissionService iniciando...');
}

async getUserPermissions(userId: string) {
  this.logger.debug(`Buscando permissões para usuário: ${userId}`);
  // ... resto do método
}
```

#### Teste 2.2: Análise de Performance
```bash
# Tempo estimado: 15 minutos
```

**Ação:** Adicionar monitoramento de tempo de inicialização:

```typescript
// No main.ts
console.time('Inicialização');

// Antes de cada etapa importante
console.time('Criação da aplicação');
const app = await NestFactory.create(AppModule);
console.timeEnd('Criação da aplicação');

console.time('Configuração de middleware');
// ... configurações
console.timeEnd('Configuração de middleware');

console.time('Inicialização do servidor');
await app.listen(port);
console.timeEnd('Inicialização do servidor');

console.timeEnd('Inicialização');
```

#### Teste 2.3: Análise de Memória
```bash
# Tempo estimado: 10 minutos
```

**Ação:** Monitorar uso de memória durante inicialização:

```typescript
// Adicionar no main.ts
function logMemoryUsage(label: string) {
  const used = process.memoryUsage();
  console.log(`${label} - Memória:`, {
    rss: Math.round(used.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB',
  });
}

logMemoryUsage('Início');
// ... em pontos estratégicos
logMemoryUsage('Após criação do app');
logMemoryUsage('Após configuração');
```

### Fase 3: Análise de Dependências (30 minutos)

#### Teste 3.1: Verificação de Dependências Circulares
```bash
# Tempo estimado: 15 minutos
```

**Ação:** Usar ferramenta de análise:

```bash
npm install -g madge
madge --circular --format dot src/
```

**Ou verificação manual:**
```typescript
// Mapeamento de dependências
AuthModule → PermissionModule
AuthModule → UsuarioModule (forwardRef)
UsuarioModule → AuthModule (forwardRef)
AuditoriaModule → PermissionModule
```

#### Teste 3.2: Verificação de Provedores Globais
```bash
# Tempo estimado: 15 minutos
```

**Investigar:**
- Serviços marcados como `@Global()`
- Providers duplicados
- Interceptors globais
- Guards globais

## 🔧 Plano de Correção

### Correção 1: Otimização do Sistema de Permissões

#### 1.1 Implementar Cache para Permissões
```typescript
// permission.service.ts
@Injectable()
export class PermissionService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getUserPermissions(userId: string) {
    const cacheKey = `permissions:${userId}`;
    let permissions = await this.cacheManager.get(cacheKey);
    
    if (!permissions) {
      permissions = await this.loadUserPermissions(userId);
      await this.cacheManager.set(cacheKey, permissions, 300); // 5 min
    }
    
    return permissions;
  }
}
```

#### 1.2 Lazy Loading de Permissões
```typescript
// permission.guard.ts
@Injectable()
export class PermissionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verificar se realmente precisa carregar permissões
    const requiredPermission = this.getRequiredPermission(context);
    
    if (!requiredPermission) {
      return true; // Sem permissão requerida
    }
    
    // Só então carregar permissões
    const permissions = await this.permissionService.getUserPermissions(userId);
    return this.hasPermission(permissions, requiredPermission);
  }
}
```

#### 1.3 Otimização de Queries
```typescript
// permission.repository.ts
async getUserPermissions(userId: string): Promise<Permission[]> {
  // Uma única query com JOIN em vez de múltiplas queries
  return this.createQueryBuilder('permission')
    .leftJoinAndSelect('permission.userPermissions', 'up')
    .leftJoinAndSelect('permission.rolePermissions', 'rp')
    .leftJoinAndSelect('rp.role', 'role')
    .leftJoinAndSelect('role.userRoles', 'ur')
    .where('up.userId = :userId OR ur.userId = :userId', { userId })
    .getMany();
}
```

### Correção 2: Middleware de Auditoria Simplificado

#### 2.1 Versão Simplificada
```typescript
// auditoria.middleware.ts
@Injectable()
export class AuditoriaMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (!this.shouldAudit(req)) {
      return next();
    }

    // Processamento mínimo e assíncrono
    setImmediate(() => {
      this.processAudit(req, res).catch(error => {
        this.logger.error('Erro na auditoria:', error);
      });
    });

    next(); // Continuar imediatamente
  }
}
```

### Correção 3: Otimização de Módulos

#### 3.1 Ordem Otimizada
```typescript
// app.module.ts
@Module({
  imports: [
    // Módulos base primeiro
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig),
    
    // Módulos de infraestrutura
    SharedModule,
    
    // Módulos de autenticação
    AuthModule,
    
    // Módulos de negócio
    UsuarioModule,
    UnidadeModule,
    CidadaoModule,
    BeneficioModule,
    SolicitacaoModule,
    DocumentoModule,
    RelatoriosUnificadoModule,
    NotificacaoModule,
    
    // Módulos de observabilidade (por último)
    AuditoriaModule,
    MetricasModule,
  ],
})
```

## ✅ Checklist de Validação

### Validação Funcional
- [ ] Servidor inicia sem erros
- [ ] Todas as rotas respondem corretamente
- [ ] Autenticação funciona
- [ ] Autorização funciona (se aplicável)
- [ ] Auditoria registra eventos
- [ ] Performance aceitável (<5s para inicialização)

### Validação de Performance
- [ ] Tempo de inicialização < 5 segundos
- [ ] Uso de memória < 200MB na inicialização
- [ ] Sem vazamentos de memória
- [ ] Queries otimizadas (logs de SQL)

### Validação de Arquitetura
- [ ] Sem dependências circulares
- [ ] Módulos bem organizados
- [ ] Separation of concerns mantida
- [ ] Código limpo e manutenível

## 📊 Métricas de Sucesso

### Antes (Problema)
- ⏱️ Tempo de inicialização: ∞ (trava)
- 💾 Uso de memória: N/A
- 🔄 Status: Aplicação não inicia

### Depois (Meta)
- ⏱️ Tempo de inicialização: < 5 segundos
- 💾 Uso de memória: < 200MB
- 🔄 Status: Aplicação funcionando normalmente
- 🚀 Performance: Responsiva

## 🔄 Processo de Rollback

### Se correções não funcionarem:
1. **Rollback completo** - reverter para commit anterior funcionando
2. **Rollback parcial** - reverter apenas sistema de permissões
3. **Rollback seletivo** - reverter apenas componentes problemáticos

### Comandos de Rollback:
```bash
# Rollback completo
git reset --hard HEAD~1

# Rollback parcial (apenas permissões)
git checkout HEAD~1 -- src/auth/permission.module.ts
git checkout HEAD~1 -- src/auth/guards/permission.guard.ts
git checkout HEAD~1 -- src/auth/services/permission.service.ts

# Rollback seletivo (apenas controllers)
git checkout HEAD~1 -- src/modules/*/controllers/*.controller.ts
```

## 📝 Documentação de Resolução

### Registro de Problemas Encontrados
- [ ] Causa raiz identificada
- [ ] Solução implementada
- [ ] Teste de regressão executado
- [ ] Documentação atualizada

### Melhorias Futuras
- [ ] Implementar testes de performance
- [ ] Adicionar monitoramento de inicialização
- [ ] Criar alertas para problemas similares
- [ ] Documentar melhores práticas

## 🎯 Conclusão

Este plano fornece uma abordagem estruturada para diagnosticar e corrigir o problema de travamento na inicialização. A execução sistemática dos testes deve revelar a causa raiz e permitir uma correção eficaz.

**Próximo passo:** Executar a Fase 1 de diagnóstico para confirmar se o problema está no sistema de permissões granulares.