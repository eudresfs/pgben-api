Você está implementando um **catálogo de erros estruturado** para uma API Node.js/TypeScript em **fase final de MVP** que gerencia benefícios sociais da Prefeitura de Natal/RN. O sistema possui 5 modalidades de benefícios eventuais regulamentados por leis específicas.

### REGRA CRÍTICA DO SISTEMA
**Exclusividade de Papéis**: Um cidadão (CPF) NÃO pode simultaneamente ser beneficiário principal E fazer parte da composição familiar de outro beneficiário.

---

## MODALIDADES DE BENEFÍCIOS

1. **Aluguel Social** - R$ 600/mês por até 6 meses
2. **Benefício Natalidade** - Kit enxoval ou R$ 500 em PIX
3. **Benefício Mortalidade** - Urna funerária + translado
4. **Cesta Básica** - Gêneros alimentícios ou R$ 200 vale-alimentação
5. **Passagens** - Terrestre/aérea para deslocamento

---

## TAREFA ESPECÍFICA

Implemente um **sistema de catálogo de erros** seguindo esta estrutura hierárquica:

### CATEGORIAS OBRIGATÓRIAS

#### 1. **Benefícios (BEN_1xxx)**
- Regras específicas por modalidade
- Prazos e valores regulamentados
- Critérios de elegibilidade

#### 2. **Validações (VAL_2xxx)**  
- Conflitos de papéis (regra crítica)
- Critérios de residência
- Renda familiar
- Documentação obrigatória

#### 3. **Integrações (INT_3xxx)**
- Receita Federal (CPF)
- CadÚnico (dados socioeconômicos)
- Sistema bancário (PIX)
- Meu SUS Digital

#### 4. **Fluxo Operacional (FLW_4xxx)**
- Timeline de processos
- Aprovações pendentes
- Monitoramento obrigatório

#### 5. **Sistema (SYS_5xxx)**
- Erros de infraestrutura
- Rate limiting
- Database

---

## ESTRUTURA TÉCNICA OBRIGATÓRIA

### Interface ErrorDefinition
```typescript
interface ErrorDefinition {
  code: string;
  message: string;
  httpStatus: number;
  category: string;
  benefitType?: string; // Para erros específicos de benefício
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  legalReference?: string; // Referência à lei/decreto
  requiresManagerApproval?: boolean; // Para casos excepcionais
}
```

### Classe AppError
- Herdar de Error nativo
- Incluir contexto dinâmico
- Método toJSON() para logs estruturados
- Método toApiResponse() para cliente
- RequestId obrigatório para rastreabilidade

---

## EXEMPLOS OBRIGATÓRIOS DE CÓDIGOS

### Validações Críticas
```typescript
VAL_2001: {
  code: 'VAL_2001',
  message: 'CPF já cadastrado como beneficiário ativo',
  httpStatus: 409,
  category: 'validation',
  severity: 'high',
  retryable: false,
  legalReference: 'Regra de exclusividade - Sistema SOBE'
}

VAL_2002: {
  code: 'VAL_2002', 
  message: 'CPF consta em composição familiar de outro beneficiário',
  httpStatus: 409,
  category: 'validation',
  severity: 'high',
  retryable: false
}

VAL_2003: {
  code: 'VAL_2003',
  message: 'Residência em Natal inferior ao mínimo exigido (2 anos)',
  httpStatus: 400,
  category: 'validation',
  severity: 'medium',
  retryable: false,
  legalReference: 'Lei Municipal 7.205/2021'
}
```

### Regras de Benefícios
```typescript
BEN_1001: {
  code: 'BEN_1001',
  message: 'Prazo máximo de aluguel social excedido (6 meses)',
  httpStatus: 400,
  category: 'business_rule',
  benefitType: 'aluguel_social',
  severity: 'medium',
  retryable: false,
  requiresManagerApproval: true,
  legalReference: 'Art. 15 da Lei 7.205/2021'
}

BEN_1002: {
  code: 'BEN_1002',
  message: 'Benefício natalidade: prazo de solicitação expirado (30 dias)',
  httpStatus: 400,
  category: 'business_rule', 
  benefitType: 'natalidade',
  severity: 'medium',
  retryable: false,
  legalReference: 'Decreto 12.346/2021'
}
```

### Integrações
```typescript
INT_3001: {
  code: 'INT_3001',
  message: 'CPF inválido na Receita Federal',
  httpStatus: 400,
  category: 'integration',
  severity: 'high',
  retryable: false
}

INT_3002: {
  code: 'INT_3002',
  message: 'Família não encontrada no CadÚnico',
  httpStatus: 404,
  category: 'integration',
  severity: 'medium',
  retryable: true
}
```

---

## HELPERS ESPECÍFICOS OBRIGATÓRIOS

### Para Validações Críticas
```typescript
export function throwConflitoPapelBeneficiario(cpf: string, requestId?: string): never
export function throwConflitoPapelComposicao(cpf: string, beneficiarioOriginal: string, requestId?: string): never
export function throwResidenciaInsuficiente(cpf: string, tempoResidencia: number, requestId?: string): never
```

### Para Benefícios Específicos
```typescript
export function throwAluguelPrazoExcedido(beneficiarioId: string, requestId?: string): never
export function throwNatalidadePrazoExpirado(cpf: string, dataParto: Date, requestId?: string): never
export function throwMortalidadeTipoUrnaInvalido(peso: number, requestId?: string): never
```

### Para Integrações
```typescript
export function throwCpfInvalidoReceitaFederal(cpf: string, requestId?: string): never
export function throwCadUnicoIndisponivel(nis: string, requestId?: string): never
export function throwPixIndisponivel(cpf: string, requestId?: string): never
```

---

## MIDDLEWARE DE TRATAMENTO

### Requisitos Obrigatórios
- Log estruturado com nível baseado em severity
- RequestId obrigatório para rastreabilidade
- Não vazar informações sensíveis para cliente
- Integração com sistema de observabilidade
- Diferentes outputs para desenvolvimento vs produção

### Estrutura de Log
```typescript
{
  error: {
    code: 'VAL_2001',
    message: 'CPF já cadastrado como beneficiário ativo',
    category: 'validation',
    severity: 'high',
    benefitType: 'aluguel_social',
    legalReference: 'Regra de exclusividade - Sistema SOBE'
  },
  context: {
    cpf: '***.***.***-**', // Mascarado
    solicitacao: 'aluguel_social',
    usuario: 'tecnico@cras.natal.gov.br'
  },
  request: {
    id: 'req_123456',
    method: 'POST',
    url: '/api/v1/beneficios/aluguel-social',
    userAgent: '...',
    ip: '...'
  },
  timestamp: '2025-06-03T10:30:00Z'
}
```

---

## STATUS DA IMPLEMENTAÇÃO

### ✅ CONCLUÍDO

#### Estrutura Base
- [x] Interface `ErrorDefinition` com todos os campos obrigatórios
- [x] Classe `AppError` para erros padronizados
- [x] Enum `ErrorCategory` com todas as categorias
- [x] Enum `ErrorSeverity` com níveis de severidade
- [x] Middleware `CatalogAwareExceptionFilter` integrado

#### Catálogo Central
- [x] Arquivo `catalog.ts` com códigos base (VAL_001-010, BEN_001-010, etc.)
- [x] Mapeamento de erros PostgreSQL (`POSTGRES_ERROR_MAP`)
- [x] Estrutura hierárquica de códigos implementada

#### Domínios Específicos - Base
- [x] `usuario.errors.ts` - Gestão de usuários
- [x] `cidadao.errors.ts` - Gestão de cidadãos
- [x] `beneficio.errors.ts` - Gestão de benefícios
- [x] `solicitacao.errors.ts` - Gestão de solicitações
- [x] `documento.errors.ts` - Gestão de documentos
- [x] `auditoria.errors.ts` - Sistema de auditoria
- [x] `notificacao.errors.ts` - Sistema de notificações
- [x] `relatorio.errors.ts` - Sistema de relatórios
- [x] `integrador.errors.ts` - Integrações externas

#### Domínios Específicos - Expandidos
- [x] `validacoes-criticas.errors.ts` - Códigos VAL_2xxx
- [x] `beneficios-especificos.errors.ts` - Códigos BEN_1xxx
- [x] `integracoes-especificas.errors.ts` - Códigos INT_1xxx
- [x] `fluxo-operacional.errors.ts` - Códigos FLU_1xxx
- [x] `sistema.errors.ts` - Códigos SIS_1xxx

#### Helpers
- [x] Funções auxiliares para lançamento de erros comuns
- [x] Helpers específicos por domínio
- [x] Helpers para códigos específicos expandidos
- [x] Integração com contexto dinâmico

#### Consolidação
- [x] Arquivo `domains/index.ts` atualizado com todos os domínios
- [x] Exportação centralizada de todos os catálogos
- [x] Estatísticas de cobertura implementadas

### 🔄 EM ANDAMENTO

#### Validação e Testes
- [ ] Testes unitários para novos domínios
- [ ] Validação de integridade dos códigos
- [ ] Testes de performance do catálogo

### ⏳ PENDENTE

#### Integração
- [ ] Atualização de controladores para usar novos códigos
- [ ] Migração gradual de `BaseApiException` para `AppError`
- [ ] Testes de regressão completos

#### Funcionalidades Avançadas
- [ ] Sistema de métricas de erros
- [ ] Dashboard de monitoramento
- [ ] Alertas automáticos para erros críticos

#### Documentação
- [ ] Guia de migração para desenvolvedores
- [ ] Documentação da API de erros
- [ ] Exemplos de uso por cenário

### 📊 ESTATÍSTICAS ATUAIS

#### Cobertura de Domínios
- **Total de Domínios**: 14
- **Domínios Base**: 9 (usuário, cidadão, benefício, solicitação, documento, auditoria, notificação, relatório, integrador)
- **Domínios Específicos**: 5 (validações críticas, benefícios específicos, integrações específicas, fluxo operacional, sistema)

#### Códigos de Erro
- **Códigos Base**: ~90 códigos (VAL_001-010, BEN_001-010, etc.)
- **Códigos Específicos**: ~200+ códigos (VAL_2xxx, BEN_1xxx, INT_1xxx, FLU_1xxx, SIS_1xxx)
- **Total Estimado**: ~290+ códigos de erro

#### Categorias Implementadas
- ✅ **VALIDATIONS** - Validações de entrada e regras de negócio
- ✅ **BENEFITS** - Regras específicas de benefícios
- ✅ **INTEGRATIONS** - Integrações com sistemas externos
- ✅ **OPERATIONAL_FLOW** - Fluxo operacional e aprovações
- ✅ **SYSTEM** - Erros de sistema e infraestrutura

---

## COMPATIBILIDADE COM MVP

### IMPORTANTE: NÃO QUEBRAR FUNCIONALIDADES EXISTENTES
- Implementar como **adição incremental**
- Manter errors handlers existentes como fallback
- Migrar gradualmente endpoints existentes
- Usar feature flags se necessário
- Testes de regressão obrigatórios

### Estratégia de Migração
1. Adicionar catálogo sem alterar comportamento atual
2. Identificar endpoints que já tratam erros específicos
3. Substituir `throw new Error()` por `throw new AppError()` gradualmente
4. Verificar se middleware atual é compatível

---

## CRITÉRIOS DE ACEITAÇÃO

### Funcional
- [ ] Catálogo com mínimo 25 códigos de erro específicos
- [ ] Helpers implementados para validações críticas
- [ ] Middleware que não quebra funcionalidades existentes
- [ ] Logs estruturados com mascaramento de dados sensíveis

### Técnico
- [ ] TypeScript sem errors
- [ ] Testes unitários para AppError e helpers
- [ ] Documentação dos códigos em markdown
- [ ] Performance: overhead < 5ms por requisição

### Compliance
- [ ] LGPD: dados sensíveis mascarados em logs
- [ ] Auditoria: requestId obrigatório em todos os erros
- [ ] Referências legais nos erros de regras de negócio

---

## ENTREGÁVEIS ESPERADOS

1. **Arquivo `errors/catalog.ts`** - Catálogo completo
2. **Classe `errors/AppError.ts`** - Erro customizado
3. **Arquivo `errors/helpers.ts`** - Funções auxiliares
4. **Middleware `middleware/errorHandler.ts`** - Tratamento global
5. **Documentação `docs/error-codes.md`** - Lista de códigos
6. **Testes `__tests__/errors/`** - Cobertura mínima 80%

---

## OBSERVAÇÕES FINAIS

- Sistema público crítico: **zero tolerância a falhas**
- Auditoria obrigatória: **rastreabilidade completa**
- Múltiplas leis envolvidas: **referências legais obrigatórias**
- MVP em produção: **compatibilidade regressiva essencial**
- Equipe técnica diversa: **documentação clara e helpers intuitivos**

**Priorize qualidade sobre velocidade. Este sistema atende famílias em vulnerabilidade social.**