# Análise Estratégica: Scoped Context
## Sistema de Controle de Visão de Dados Baseado em Contexto de Escopo

---

## 1. Resumo Executivo

O sistema de **scoped context** implementa um mecanismo de isolamento de dados multi-tenant usando `AsyncLocalStorage` para propagação de contexto e `ScopedRepository` para aplicação automática de filtros. Esta análise identifica pontos fortes da arquitetura atual, oportunidades de melhoria e riscos críticos que requerem atenção imediata.

### Principais Descobertas
- ✅ Arquitetura sólida com baixo acoplamento
- ⚠️ Vulnerabilidades de segurança em edge cases
- 🎯 Oportunidades de otimização de performance
- 🔴 Riscos críticos de vazamento de dados se mal configurado

---

## 2. Pontos Fortes da Estratégia

### 2.1 Arquitetura e Design

#### **Isolamento Efetivo por Requisição**
- Uso de `AsyncLocalStorage` garante contexto isolado mesmo em operações assíncronas
- Elimina problemas clássicos de request-scoped providers em alta concorrência
- Suporta nativamente Promise chains e async/await

#### **Transparência para Desenvolvedores**
```typescript
// Desenvolvedor não precisa se preocupar com escopo
const cidadaos = await cidadaoRepository.find();
// Filtros aplicados automaticamente baseado no contexto
```

#### **Reutilização e DRY (Don't Repeat Yourself)**
- Lógica de escopo centralizada no `ScopedRepository`
- Elimina código boilerplate em cada serviço
- Reduz drasticamente possibilidade de erros humanos

#### **Flexibilidade de Tipos de Escopo**
- **GLOBAL**: Acesso total (administradores)
- **UNIDADE**: Acesso restrito à unidade organizacional
- **PROPRIO**: Acesso apenas aos próprios dados
- Fácil extensão para novos tipos de escopo

### 2.2 Segurança

#### **Aplicação Automática de Filtros**
- Filtros SQL aplicados automaticamente em todas as queries
- Proteção em múltiplas camadas (interceptor + repository)
- Validação de contexto antes de cada operação

#### **Auditabilidade**
```typescript
// Contexto sempre disponível para logs
const context = RequestContextHolder.get();
logger.info('Operação realizada', { 
  userId: context.userId, 
  scope: context.scope 
});
```

### 2.3 Performance

#### **Baixo Overhead**
- AsyncLocalStorage tem impacto mínimo (~1-2ms por request)
- Filtros aplicados diretamente no SQL (não em memória)
- Sem round-trips adicionais ao banco

#### **Otimização Automática**
- TypeORM gera queries otimizadas com os filtros
- Possibilidade de cache de contexto por requisição
- Lazy loading de relações respeitando escopo

### 2.4 Manutenibilidade

#### **Código Limpo e Testável**
```typescript
// Testes simples com mock do contexto
beforeEach(() => {
  RequestContextHolder.set({
    userId: 'test-user',
    scope: ScopeType.UNIDADE,
    unidadeId: 'unit-123'
  });
});
```

#### **Documentação Viva**
- Decorators e tipos TypeScript servem como documentação
- Erros explícitos com mensagens claras
- Exemplos de uso em cada módulo

---

## 3. Oportunidades de Melhoria

### 3.1 Melhorias de Segurança

#### **Validação Fail-Fast**
```typescript
// ATUAL - Potencial vazamento
if (!context) {
  return options; // ❌ Perigoso
}

// PROPOSTO - Fail-fast
if (!context) {
  throw new ScopeContextRequiredException(
    'Contexto de escopo é obrigatório para esta operação'
  );
}
```

#### **Modo Strict por Padrão**
```typescript
@Injectable()
export class ScopedRepository<T> {
  constructor(
    private options: ScopedRepositoryOptions = {
      strictMode: true, // Sempre exigir contexto
      allowGlobalScope: false // Desabilitar GLOBAL por padrão
    }
  ) {}
}
```

#### **Validação de Integridade de Dados**
```typescript
// Validar que userId pertence à unidadeId
async validateContextIntegrity(context: ScopeContext): Promise<void> {
  if (context.scope === ScopeType.UNIDADE) {
    const userBelongsToUnit = await this.userRepository
      .existsByIdAndUnidade(context.userId, context.unidadeId);
    
    if (!userBelongsToUnit) {
      throw new ScopeIntegrityViolationException();
    }
  }
}
```

### 3.2 Otimizações de Performance

#### **Cache de Metadados**
```typescript
// Cache de verificação de colunas
private static columnCache = new Map<string, Set<string>>();

hasColumn(entity: Function, column: string): boolean {
  const cacheKey = `${entity.name}:columns`;
  
  if (!this.columnCache.has(cacheKey)) {
    const columns = this.extractColumns(entity);
    this.columnCache.set(cacheKey, columns);
  }
  
  return this.columnCache.get(cacheKey).has(column);
}
```

#### **Query Hints para JOINs Complexos**
```typescript
// Otimizar queries com hints
queryBuilder
  .setHint('optimizer.join_order', 'cidadao,solicitacao,concessao')
  .setHint('optimizer.use_index', 'idx_unidade_id');
```

#### **Índices Compostos Específicos**
```sql
-- Índices otimizados para queries com escopo
CREATE INDEX idx_cidadao_unidade_user 
  ON cidadao(unidade_id, user_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_solicitacao_beneficiario_unidade 
  ON solicitacao(beneficiario_id) 
  INCLUDE (unidade_id);
```

### 3.3 Melhorias de Developer Experience

#### **Decorators Auxiliares**
```typescript
// Marcar métodos que devem ignorar escopo
@NoScope()
async countTotal(): Promise<number> {
  return this.repository.count();
}

// Forçar escopo específico
@RequireScope(ScopeType.UNIDADE)
async getUnidadeReport(): Promise<Report> {
  // ...
}
```

#### **Tipos Mais Expressivos**
```typescript
// Tipos que expressam intenção
type ScopedResult<T> = T & { _scopeApplied: true };
type UnscopedResult<T> = T & { _warning: 'unscoped_data' };

// No repository
find(): Promise<ScopedResult<T[]>>;
findUnscoped(): Promise<UnscopedResult<T[]>>;
```

#### **Developer Tools**
```typescript
// Modo debug para visualizar queries com escopo
if (process.env.DEBUG_SCOPE) {
  queryBuilder.printSql();
  console.log('Applied scope:', context);
}
```

### 3.4 Melhorias Arquiteturais

#### **Padrão Chain of Responsibility para Filtros**
```typescript
interface ScopeFilter {
  apply(query: SelectQueryBuilder, context: ScopeContext): void;
  canHandle(context: ScopeContext): boolean;
}

class UnidadeScopeFilter implements ScopeFilter {
  canHandle(context: ScopeContext): boolean {
    return context.scope === ScopeType.UNIDADE;
  }
  
  apply(query: SelectQueryBuilder, context: ScopeContext): void {
    query.andWhere('entity.unidade_id = :unidadeId', {
      unidadeId: context.unidadeId
    });
  }
}
```

#### **Event-Driven para Auditoria**
```typescript
// Emitir eventos para cada operação com escopo
@Injectable()
export class ScopedRepository<T> {
  async find(options?: FindManyOptions<T>): Promise<T[]> {
    const result = await super.find(this.applyScopeToOptions(options));
    
    this.eventEmitter.emit('scoped-query.executed', {
      entity: this.metadata.name,
      scope: this.context,
      resultCount: result.length,
      timestamp: new Date()
    });
    
    return result;
  }
}
```

---

## 4. Pontos Críticos e Riscos

### 4.1 🔴 Vulnerabilidades de Segurança Críticas

#### **Vazamento Silencioso de Dados**
```typescript
// RISCO CRÍTICO - Código atual
if (!context) {
  return options; // ❌ Retorna TODOS os dados!
}

// Cenário de exploit:
// 1. Falha no interceptor por erro de configuração
// 2. Context não é definido
// 3. Query executa sem filtros
// 4. Dados de todas as unidades são expostos
```

**Mitigação Urgente:**
```typescript
if (!context) {
  // Opção 1: Lançar exceção
  throw new SecurityException('Contexto obrigatório ausente');
  
  // Opção 2: Retornar conjunto vazio (mais seguro)
  return { where: { id: IsNull() } }; // Força resultado vazio
}
```

#### **Bypass via Query Builder Direto**
```typescript
// RISCO: Desenvolvedor pode burlar proteções
const data = await this.entityManager
  .createQueryBuilder(Cidadao, 'c')
  .getMany(); // ❌ Sem filtros de escopo!
```

**Mitigação:**
- Code review rigoroso
- Linting rules customizadas
- Testes de segurança automatizados

#### **Falha em Operações Bulk**
```typescript
// RISCO: Updates e deletes em massa sem filtro
await this.repository.update({}, { status: 'INATIVO' });
// Pode afetar dados de outras unidades!
```

### 4.2 ⚠️ Riscos de Performance

#### **JOINs Desnecessários**
```typescript
// Problema: JOIN sempre executado mesmo quando não necessário
queryBuilder
  .leftJoin('entity.cidadao', 'cidadao')
  .leftJoin('cidadao.unidade', 'unidade')
  .where('unidade.id = :unidadeId');
```

**Impacto:** 
- Queries 3-5x mais lentas em tabelas grandes
- Consumo excessivo de memória
- Possível timeout em relatórios

#### **Crescimento Exponencial de Complexidade**
- Cada novo tipo de escopo adiciona complexidade
- JOINs aninhados podem criar queries monstruosas
- Difícil otimização pelo DBA

### 4.3 ⚠️ Riscos de Manutenção

#### **Acoplamento Implícito ao Schema**
```typescript
// Assume estrutura específica
hasColumn(entity, 'unidade_id'); // E se mudar para 'unit_id'?
```

#### **Dificuldade de Debug**
- Contexto "invisível" dificulta troubleshooting
- Queries geradas podem ser complexas
- Erros podem ser silenciosos

#### **Dependência de Configuração Correta**
- Se interceptor não for registrado, sistema falha silenciosamente
- Ordem de middleware/interceptors é crítica
- Fácil quebrar em refatorações

---

## 5. Matriz de Decisão

| Critério | Manter Como Está | Refatorar Incremental | Reescrever Total |
|----------|------------------|----------------------|------------------|
| **Custo** | Baixo ✅ | Médio | Alto ❌ |
| **Risco** | Alto ❌ | Baixo ✅ | Médio |
| **Benefício** | Médio | Alto ✅ | Alto |
| **Tempo** | 0 | 2-4 semanas | 2-3 meses |
| **ROI** | Negativo | Positivo ✅ | Incerto |

### Recomendação: **Refatorar Incremental** ✅

---

## 6. Plano de Ação Prioritizado

### Fase 1: Correções Críticas (1 semana)
1. **Implementar fail-fast** para contexto ausente
2. **Adicionar validação** de integridade user-unidade
3. **Criar testes** de segurança para edge cases
4. **Documentar** comportamentos esperados

### Fase 2: Melhorias de Segurança (1 semana)
1. **Implementar strict mode** por padrão
2. **Adicionar auditoria** de operações
3. **Criar lint rules** para prevenir bypass
4. **Configurar alertas** para anomalias

### Fase 3: Otimizações (2 semanas)
1. **Implementar cache** de metadados
2. **Criar índices** específicos
3. **Otimizar JOINs** complexos
4. **Adicionar métricas** de performance

### Fase 4: Developer Experience (Contínuo)
1. **Melhorar documentação** com exemplos
2. **Criar snippets** e templates
3. **Adicionar tooling** para debug
4. **Treinar equipe** em boas práticas

---

## 7. Métricas de Sucesso

### Segurança
- Zero vazamentos de dados em produção
- 100% das queries com escopo aplicado
- Tempo de detecção de violação < 1 minuto

### Performance
- P95 latência de queries < 100ms
- Zero timeouts em relatórios
- Redução de 50% no uso de CPU do banco

### Qualidade
- Cobertura de testes > 95%
- Zero bugs críticos em produção
- Satisfação do desenvolvedor > 8/10

### Negócio
- Conformidade com LGPD/GDPR
- Redução de 90% em incidentes de segurança
- Aumento de confiança dos clientes

---

## 8. Conclusão

A estratégia de scoped context é fundamentalmente sólida, mas requer atenção urgente em aspectos de segurança. As melhorias propostas manterão os pontos fortes enquanto eliminam riscos críticos. O investimento em refatoração incremental trará retorno positivo em segurança, performance e manutenibilidade, essenciais para um sistema multi-tenant robusto.