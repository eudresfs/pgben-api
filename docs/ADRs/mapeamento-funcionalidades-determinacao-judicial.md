# Mapeamento de Funcionalidades - Determinação Judicial

## 📋 Análise Comparativa dos Serviços

### Módulo Judicial - DeterminacaoJudicialService

**Localização**: `src/modules/judicial/services/determinacao-judicial.service.ts`

**Dependências**:
- `@InjectRepository(DeterminacaoJudicial)`
- `ProcessoJudicialService`

**Métodos Identificados**:
1. `create(data: Partial<DeterminacaoJudicial>, usuarioId: string)`
2. Outros métodos (necessário análise completa)

**Características**:
- Foco em gestão completa de determinações judiciais
- Validação obrigatória de `processo_judicial_id`
- Integração com `ProcessoJudicialService`
- Logging básico

### Módulo Solicitação - DeterminacaoJudicialService

**Localização**: `src/modules/solicitacao/services/determinacao-judicial.service.ts`

**Dependências**:
- `@InjectRepository(DeterminacaoJudicial)`
- `@InjectRepository(Solicitacao)`
- `DataSource` (para transações)

**Métodos Identificados**:
1. `create(createDeterminacaoDto: SolicitacaoCreateDeterminacaoJudicialDto, usuarioId: string)`
2. Outros métodos (necessário análise completa)

**Características**:
- Foco em determinações relacionadas a solicitações
- Validação obrigatória de `solicitacao_id`
- Verificação de duplicação por número de processo
- Uso de transações de banco
- Integração com entidade `Solicitacao`

## 🔍 Diferenças Principais Identificadas

| Aspecto | Módulo Judicial | Módulo Solicitação |
|---------|----------------|--------------------|
| **Validação Principal** | `processo_judicial_id` obrigatório | `solicitacao_id` obrigatório |
| **Transações** | Não utiliza | Utiliza `QueryRunner` |
| **Verificação Duplicação** | Não implementada | Verifica por número processo + solicitação |
| **Dependências** | `ProcessoJudicialService` | `Solicitacao` repository |
| **DTO** | `Partial<DeterminacaoJudicial>` | `SolicitacaoCreateDeterminacaoJudicialDto` |
| **Contexto** | Gestão judicial completa | Específico para solicitações |

## 📋 Mapeamento Completo dos Métodos

### Módulo Judicial - Métodos Identificados

| Método | Parâmetros | Retorno | Descrição |
|--------|------------|---------|----------|
| `create` | `data: Partial<DeterminacaoJudicial>, usuarioId: string` | `Promise<DeterminacaoJudicial>` | Cria nova determinação |
| `findById` | `id: string` | `Promise<DeterminacaoJudicial>` | Busca por ID |
| `findAll` | `options: FindAllOptions` | `Promise<PaginatedResult<DeterminacaoJudicial>>` | Lista com paginação e filtros |
| `findByProcessoJudicial` | `processoJudicialId: string` | `Promise<DeterminacaoJudicial[]>` | Busca por processo judicial |
| `findBySolicitacao` | `solicitacaoId: string` | `Promise<DeterminacaoJudicial[]>` | Busca por solicitação |
| `findByCidadao` | `cidadaoId: string` | `Promise<DeterminacaoJudicial[]>` | Busca por cidadão |
| `update` | `id: string, data: Partial<DeterminacaoJudicial>, usuarioId: string` | `Promise<DeterminacaoJudicial>` | Atualiza determinação |
| `marcarComoCumprida` | `id: string, observacao: string, usuarioId: string` | `Promise<DeterminacaoJudicial>` | Marca como cumprida |
| `desativar` | `id: string, usuarioId: string` | `Promise<boolean>` | Soft delete |
| `findDeterminacoesComPrazoProximo` | `diasAviso: number = 7` | `Promise<DeterminacaoJudicial[]>` | Busca por prazo próximo |
| `findDeterminacoesComPrazoExpirado` | - | `Promise<DeterminacaoJudicial[]>` | Busca por prazo expirado |

### Módulo Solicitação - Métodos Identificados

| Método | Parâmetros | Retorno | Descrição |
|--------|------------|---------|----------|
| `create` | `createDeterminacaoDto: SolicitacaoCreateDeterminacaoJudicialDto, usuarioId: string` | `Promise<DeterminacaoJudicial>` | Cria nova determinação |
| `findBySolicitacaoId` | `solicitacaoId: string` | `Promise<DeterminacaoJudicial[]>` | Busca por solicitação |
| `findById` | `id: string` | `Promise<DeterminacaoJudicial>` | Busca por ID |
| `update` | `id: string, updateDeterminacaoDto: SolicitacaoUpdateDeterminacaoJudicialDto` | `Promise<DeterminacaoJudicial>` | Atualiza determinação |
| `registrarCumprimento` | `id: string, observacoes?: string` | `Promise<DeterminacaoJudicial>` | Registra cumprimento |
| `remove` | `id: string` | `Promise<void>` | Remove determinação |

## 🔍 Análise Detalhada das Diferenças

### Funcionalidades Exclusivas do Módulo Judicial

1. **Busca Avançada com Paginação** (`findAll`)
   - Filtros por múltiplos campos
   - Busca por texto livre
   - Paginação completa
   - Ordenação configurável

2. **Buscas Específicas por Contexto**
   - `findByProcessoJudicial`: Foco em processos judiciais
   - `findByCidadao`: Busca por cidadão específico

3. **Gestão de Prazos**
   - `findDeterminacoesComPrazoProximo`: Alertas de prazo
   - `findDeterminacoesComPrazoExpirado`: Controle de vencimentos

4. **Soft Delete** (`desativar`)
   - Preserva histórico
   - Mantém integridade referencial

### Funcionalidades Exclusivas do Módulo Solicitação

1. **Integração com Solicitações**
   - Atualiza `determinacao_judicial_flag` na solicitação
   - Gerencia `determinacao_judicial_id` principal
   - Verificação de duplicação por número de processo

2. **Transações Complexas**
   - Uso de `QueryRunner` para operações atômicas
   - Rollback automático em caso de erro

3. **Remoção Inteligente** (`remove`)
   - Remove fisicamente do banco
   - Reorganiza determinação principal da solicitação
   - Atualiza flags da solicitação

### Diferenças na Implementação de Métodos Similares

| Funcionalidade | Módulo Judicial | Módulo Solicitação |
|----------------|-----------------|--------------------|
| **Create** | Validação de `processo_judicial_id` | Validação de `solicitacao_id` + verificação duplicação |
| **FindById** | Relations: `['processo_judicial']` | Relations: `['solicitacao']` |
| **Update** | Merge + save direto | Update + findById para retorno |
| **Cumprimento** | `marcarComoCumprida` com validação | `registrarCumprimento` simples |
| **Remoção** | Soft delete (`desativar`) | Hard delete (`remove`) com lógica complexa |

## 📝 Próximas Ações para Mapeamento Completo

### 1. Análise Completa dos Métodos
- [x] Listar todos os métodos do serviço judicial
- [x] Listar todos os métodos do serviço de solicitação
- [x] Identificar sobreposições e diferenças

### 2. Análise dos DTOs
- [ ] Comparar `CreateDeterminacaoJudicialDto` vs `SolicitacaoCreateDeterminacaoJudicialDto`
- [ ] Identificar campos específicos de cada contexto
- [ ] Mapear validações diferentes

### 3. Análise dos Controllers
- [ ] Mapear endpoints de cada controller
- [ ] Identificar permissões específicas
- [ ] Verificar diferenças nas rotas

### 4. Análise de Testes
- [ ] Verificar testes existentes para cada serviço
- [ ] Identificar cenários de teste únicos
- [ ] Mapear cobertura de testes

## 🎯 Estratégia de Consolidação Refinada

Com base na análise inicial, a estratégia de consolidação deve:

1. **Preservar Validações Específicas**: Cada contexto tem validações importantes
2. **Unificar Lógica de Transação**: Implementar transações no serviço consolidado
3. **Manter Verificações de Duplicação**: Importante para integridade dos dados
4. **Criar Métodos Específicos por Contexto**: Para manter a separação de responsabilidades

## 🎯 Estratégia de Consolidação Refinada

Com base na análise completa, a estratégia de consolidação deve:

### 1. Arquitetura Proposta

```typescript
// Serviço consolidado no módulo judicial
class DeterminacaoJudicialService {
  // Métodos base (mantidos do módulo judicial)
  create()
  findById()
  findAll()
  update()
  desativar()
  
  // Métodos específicos por contexto
  createForSolicitacao() // Lógica do módulo solicitação
  removeFromSolicitacao() // Lógica complexa de remoção
  
  // Métodos de busca especializados
  findByProcessoJudicial()
  findBySolicitacao()
  findByCidadao()
  
  // Métodos de gestão de prazos
  findDeterminacoesComPrazoProximo()
  findDeterminacoesComPrazoExpirado()
  
  // Métodos de cumprimento
  marcarComoCumprida()
  registrarCumprimento() // Alias para marcarComoCumprida
}
```

### 2. Pontos Críticos para Preservar

1. **Transações**: Implementar no serviço consolidado
2. **Validações Específicas**: Manter validações de cada contexto
3. **Integração com Solicitações**: Preservar lógica de flags
4. **Gestão de Prazos**: Manter funcionalidades do módulo judicial
5. **Soft vs Hard Delete**: Implementar ambas as estratégias

### 3. Migração Gradual

**Fase 1**: Consolidar serviço no módulo judicial
**Fase 2**: Criar adaptadores no módulo solicitação
**Fase 3**: Migrar controllers
**Fase 4**: Remover duplicações

## 📊 Status do Mapeamento

- [x] Análise inicial dos serviços
- [x] Identificação de diferenças principais
- [x] Mapeamento completo de métodos
- [x] Análise de funcionalidades específicas
- [ ] Análise de DTOs
- [ ] Análise de controllers
- [ ] Análise de testes
- [ ] Definição da arquitetura consolidada detalhada

---

**Próximo Passo**: Analisar DTOs e controllers para finalizar a estratégia de consolidação e iniciar a implementação.