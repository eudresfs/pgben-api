# Plano de Ação - Refatoração CRUD Dados de Benefício

## Visão Geral
Refatoração para simplificar arquitetura complexa do sistema de benefícios, eliminando redundâncias e separando responsabilidades adequadamente.

---

## 📋 FASE 1: PREPARAÇÃO E INFRAESTRUTURA ✅

### 1.1 Backup e Testes Base
- [x] **Criar branch para refatoração**
  - [x] `git checkout -b refactor/simplify-dados-beneficio-crud`
  - [x] Confirmar que todos os testes passam no estado atual
  - [x] Documentar endpoints funcionais atuais

- [x] **Executar testes de integração completos**
  - [x] Rodar suite de testes existente
  - [x] Testar todos os endpoints manualmente se necessário
  - [x] Documentar comportamentos esperados
  - [x] Criar testes adicionais se gaps identificados

### 1.2 Criar Novos Componentes de Infraestrutura
- [x] **Criar Custom Validator para Tipo de Benefício**
  - [x] Arquivo: `src/shared/validators/tipo-beneficio.validator.ts`
  - [x] Implementar `TipoBeneficioValidator` classe
  - [x] Implementar decorator `@ValidateTipoBeneficio(codigo: string)`
  - [x] Adicionar testes unitários para validator

- [x] **Criar Workflow Interceptor**
  - [x] Arquivo: `src/interceptors/workflow.interceptor.ts`
  - [x] Implementar `WorkflowInterceptor` que atualiza status após create
  - [x] Configurar para acionar apenas em métodos create
  - [x] Adicionar error handling se workflow falhar

- [x] **Criar Cache Interceptor**
  - [x] Arquivo: `src/interceptors/cache.interceptor.ts`
  - [x] Implementar `CacheInterceptor` genérico para CRUD
  - [x] Configurar cache keys automáticas
  - [x] Implementar invalidação automática

- [x] **Criar Error Context Interceptor**
  - [x] Arquivo: `src/interceptors/error-context.interceptor.ts`
  - [x] Implementar captura automática de contexto (user, IP, timestamp)
  - [x] Integrar com sistema de errors existente
  - [x] Garantir propagação correta do contexto

---

## 📋 FASE 2: REFATORAÇÃO DOS DTOs ✅

### 2.1 Atualizar DTOs de Create
- [x] **CreateDadosAluguelSocialDto**
  - [x] Adicionar `@ValidateTipoBeneficio('aluguel-social')` no campo `solicitacao_id`
  - [x] Verificar se outras validações class-validator estão corretas
  - [x] Rodar testes do DTO

- [x] **CreateDadosCestaBasicaDto**
  - [x] Adicionar `@ValidateTipoBeneficio('cesta-basica')` no campo `solicitacao_id`
  - [x] Verificar validações existentes
  - [x] Rodar testes do DTO

- [x] **CreateDadosFuneralDto**
  - [x] Adicionar `@ValidateTipoBeneficio('funeral')` no campo `solicitacao_id`
  - [x] Verificar validações existentes
  - [x] Rodar testes do DTO

- [x] **CreateDadosNatalidadeDto**
  - [x] Adicionar `@ValidateTipoBeneficio('natalidade')` no campo `solicitacao_id`
  - [x] Verificar validações existentes
  - [x] Rodar testes do DTO

### 2.2 Testar Validações dos DTOs
- [x] **Testar validação positiva**
  - [x] Criar solicitação do tipo correto
  - [x] Verificar que DTO passa na validação
  
- [x] **Testar validação negativa**
  - [x] Tentar usar solicitação de tipo diferente
  - [x] Verificar que DTO falha na validação com mensagem correta

---

## 📋 FASE 3: SIMPLIFICAÇÃO DO ABSTRACT SERVICE ✅

### 3.1 Refatorar AbstractDadosBeneficioService
- [x] **Remover complexidades desnecessárias**
  - [x] Remover cache manual (substituído por interceptor)
  - [x] Remover logging detalhado (manter apenas básico)
  - [x] Simplificar error handling (apenas try/catch + constraint errors)
  - [x] Remover verificações duplicadas de existência

- [x] **Manter apenas CRUD essencial**
  - [x] Método `create()` simplificado
  - [x] Método `update()` simplificado 
  - [x] Método `delete()` com soft delete
  - [x] Método `findOne()` básico
  - [x] Método `findBySolicitacao()` básico
  - [x] Método `findAll()` com paginação

- [x] **Manter validações de negócio**
  - [x] Manter métodos abstratos `validateCreateData()` e `validateUpdateData()`
  - [x] Garantir que implementações específicas ainda funcionam

### 3.2 Testar Abstract Service Refatorado
- [x] **Executar testes unitários**
  - [x] Verificar todos os métodos CRUD
  - [x] Testar error handling básico
  - [x] Verificar soft delete funciona

- [x] **Testar com serviços específicos**
  - [x] Verificar que herança ainda funciona
  - [x] Confirmar validações específicas executam

---

## 📋 FASE 4: SIMPLIFICAÇÃO DO FACTORY SERVICE ✅

### 4.1 Refatorar DadosBeneficioFactoryService
- [x] **Criar mapeamento simples**
  - [x] Implementar Map código → serviço direto
  - [x] Remover enum intermediário `TipoDadosBeneficio`
  - [x] Remover conversões código→ID→tipo

- [x] **Simplificar todos os métodos**
  - [x] `create()`: getService + delegate
  - [x] `update()`: getService + delegate  
  - [x] `delete()`: getService + delegate
  - [x] `findOne()`: getService + delegate
  - [x] `findBySolicitacao()`: getService + delegate

- [x] **Remover funcionalidades movidas**
  - [x] Remover schema validation (mover para endpoint separado)
  - [x] Remover verificação de duplicatas (banco resolve)
  - [x] Remover workflow updates (interceptor resolve)
  - [x] Remover validação de tipos (DTO resolve)

- [x] **Manter apenas error handling básico**
  - [x] NotFound quando código não existe
  - [x] Propagação de erros dos serviços

### 4.2 Criar Schema Validation Service
- [x] **Novo arquivo**: `src/services/schema-validation.service.ts`
  - [x] Implementar lógica de validação de schema removida do factory
  - [x] Manter funcionalidade `validateAndGetMissingFields()`
  - [x] Adicionar testes específicos

### 4.3 Testar Factory Simplificado
- [x] **Testar mapeamento básico**
  - [x] Verificar resolução correta de serviços
  - [x] Testar error quando código inválido

- [x] **Testar delegação**
  - [x] Verificar que métodos delegam corretamente
  - [x] Confirmar que parâmetros são passados integralmente

---

## 📋 FASE 5: ATUALIZAÇÃO DOS SERVIÇOS ESPECÍFICOS ✅

### 5.1 Adicionar Decorators aos Serviços
- [x] **DadosAluguelSocialService**
  - [x] Adicionar `@UseInterceptors(WorkflowInterceptor, CacheInterceptor)`
  - [x] Verificar se validações específicas ainda funcionam
  - [x] Rodar testes do serviço

- [x] **DadosCestaBasicaService**
  - [x] Adicionar interceptors
  - [x] Verificar cálculos de quantidade recomendada
  - [x] Rodar testes do serviço

- [x] **DadosFuneralService**
  - [x] Adicionar interceptors
  - [x] Verificar validações de datas e prazos
  - [x] Rodar testes do serviço

- [x] **DadosNatalidadeService**
  - [x] Adicionar interceptors
  - [x] Verificar validações de gestação
  - [x] Rodar testes do serviço

### 5.2 Verificar Compatibilidade
- [x] **Confirmar herança funciona**
  - [x] Verificar métodos abstratos implementados
  - [x] Testar validações específicas

- [x] **Testar com interceptors**
  - [x] Verificar cache automático funciona
  - [x] Confirmar workflow é acionado após create

---

## 📋 FASE 6: ATUALIZAÇÃO DO CONTROLLER ✅

### 6.1 Limpar Controller
- [x] **Remover lógica desnecessária**
  - [x] Manter apenas delegação para factory
  - [x] Remover validações duplicadas
  - [x] Simplificar error handling

- [x] **Adicionar endpoint de validação de schema**
  - [x] Novo endpoint `POST /:codigo/validate`
  - [x] Integrar com `SchemaValidationService`
  - [x] Documentar no Swagger

### 6.2 Testar Controller Atualizado
- [x] **Testar todos os endpoints**
  - [x] GET, POST, PUT, DELETE funcionam
  - [x] Novo endpoint de validação funciona
  - [x] Swagger documentation está correta

---

## 📋 FASE 7: TESTES E VALIDAÇÃO ✅

### 7.1 Testes Unitários
- [x] **Testar Abstract Service**
  - [x] Métodos CRUD básicos
  - [x] Validações abstratas
  - [x] Error handling

- [x] **Testar Factory Service**
  - [x] Roteamento correto por tipo
  - [x] Error handling para tipos inválidos
  - [x] Performance com cache

- [x] **Testar Serviços Específicos**
  - [x] Validações específicas funcionam
  - [x] Interceptors são aplicados
  - [x] Herança funciona corretamente

### 7.2 Testes de Integração
- [x] **Testar endpoints completos**
  - [x] Create com validação automática
  - [x] Update mantém comportamento
  - [x] Delete funciona
  - [x] FindAll com paginação

- [x] **Testar novo endpoint de validação**
  - [x] Retorna campos faltantes corretamente
  - [x] Valida dados corretamente
  - [x] Error handling adequado

### 7.3 Testes de Performance
- [x] **Benchmarks**
  - [x] Comparar performance antes/depois
  - [x] Verificar cache está funcionando
  - [x] Medir tempo de resposta

### 7.4 Testes de Compatibilidade
- [x] **Verificar integrações**
  - [x] Frontend ainda funciona
  - [x] Outros módulos não quebrados
  - [x] Migrations funcionam

---

## 📋 FASE 8: DOCUMENTAÇÃO E FINALIZAÇÃO

### 8.1 Atualizar Documentação
- [ ] **README técnico**
  - [ ] Documentar nova arquitetura
  - [ ] Explicar padrões de interceptors
  - [ ] Guia de como adicionar novos tipos de benefício

- [ ] **Swagger/OpenAPI**
  - [ ] Verificar documentação está correta
  - [ ] Adicionar examples para novo endpoint
  - [ ] Atualizar descriptions se necessário

### 8.2 Limpeza
- [ ] **Remover código não utilizado**
  - [ ] Enums desnecessários
  - [ ] Imports não utilizados
  - [ ] Comentários obsoletos

- [ ] **Organizar estrutura de arquivos**
  - [ ] Mover interceptors para pasta adequada
  - [ ] Organizar validators
  - [ ] Verificar structure faz sentido

### 8.3 Review e Merge
- [ ] **Code review interno**
  - [ ] Verificar padrões de código
  - [ ] Confirmar best practices
  - [ ] Checar se objetivos foram atingidos

- [ ] **Merge preparation**
  - [ ] Squash commits se necessário
  - [ ] Escrever changelog
  - [ ] Preparar deployment plan

---

## 🎯 Critérios de Sucesso

### Funcionalidade
- [ ] Todos os endpoints mantêm comportamento idêntico
- [ ] Performance igual ou melhor que antes
- [ ] Todos os testes passam
- [ ] Integrações não quebradas

### Arquitetura
- [ ] Factory é apenas roteador (< 100 linhas)
- [ ] Abstract service tem apenas CRUD básico
- [ ] Cross-cutting concerns via interceptors
- [ ] DTOs validam tipo automaticamente

### Manutenibilidade
- [ ] Código mais legível e simples
- [ ] Responsabilidades bem separadas
- [ ] Fácil adicionar novos tipos de benefício
- [ ] Documentação atualizada

---

## ⚠️ Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Quebrar integrações existentes | Média | Alto | Testes extensivos, deploy gradual |
| Performance degradada | Baixa | Médio | Benchmarks antes/depois |
| Interceptors não funcionarem | Média | Médio | Testes dedicados, fallback plans |
| Validações falharem | Baixa | Alto | Testes unitários robustos |

---

## 📝 Notas de Implementação

- **Manter compatibilidade**: Endpoints devem funcionar exatamente igual
- **Deploy gradual**: Considerar feature flags se possível
- **Rollback plan**: Manter branch anterior disponível
- **Monitoring**: Observar logs e métricas pós-deploy