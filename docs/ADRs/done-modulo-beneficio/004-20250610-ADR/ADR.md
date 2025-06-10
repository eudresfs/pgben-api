# ADR-001: Simplificação da Arquitetura CRUD de Dados de Benefício

**Status:** Proposto  
**Data:** 2025-06-10  
**Deciders:** Equipe de Desenvolvimento  
**Technical Story:** Refatoração do sistema de gerenciamento de dados específicos de benefícios sociais

---

## Contexto e Problema

O sistema atual de gerenciamento de dados específicos de benefícios (Aluguel Social, Cesta Básica, Funeral, Natalidade) apresenta complexidade excessiva que impacta a manutenibilidade e performance:

### Problemas Identificados

1. **Factory Service Sobrecarregado**: `DadosBeneficioFactoryService` viola o princípio de responsabilidade única, executando:
   - Resolução de tipos de benefício
   - Validação de schemas
   - Verificação de duplicatas
   - Controle de workflow
   - Mapeamento complexo código→enum→ID→serviço

2. **Validação Redundante**: Três camadas de validação sobrepostas:
   - Class-validator nos DTOs
   - Validações específicas nos serviços
   - Schema validation no factory

3. **Abstract Service Pesado**: Classe base mistura múltiplas responsabilidades:
   - CRUD básico
   - Cache manual
   - Logging detalhado
   - Error handling complexo
   - Validações de negócio

4. **Mapeamento Complexo**: Conversões desnecessárias entre formatos
5. **Error Context Não Funcional**: Sistema de contexto de erro não captura informações adequadamente
6. **Cross-cutting Concerns Misturados**: Cache, audit, workflow embutidos na lógica de negócio

---

## Decisões

### 1. Factory como Roteador Simples

**Decisão**: Transformar `DadosBeneficioFactoryService` em um roteador puro que apenas mapeia códigos para serviços específicos.

**Racionale**: 
- Princípio de Responsabilidade Única
- Facilita testes e manutenção
- Reduz acoplamento entre componentes

**Implementação**:
```typescript
private readonly serviceMap = new Map([
  ['aluguel-social', this.aluguelSocialService],
  ['cesta-basica', this.cestaBasicaService],
  // ...
]);
```

### 2. Validação Consolidada em Duas Camadas

**Decisão**: Manter apenas class-validator nos DTOs + validações de negócio específicas nos serviços.

**Racionale**:
- Elimina redundância
- Clarifica responsabilidades
- Mantém flexibilidade para regras específicas

**Implementação**:
- DTOs: class-validator + custom decorator `@ValidateTipoBeneficio`
- Serviços: apenas regras de negócio específicas
- Schema validation: endpoint separado para validação prévia

### 3. Abstract Service Minimalista

**Decisão**: Reduzir abstract service apenas ao CRUD essencial com error handling básico.

**Racionale**:
- Separação de responsabilidades
- Facilita compreensão e manutenção
- Permite otimizações específicas por tipo

**Implementação**:
- Manter: CRUD básico, validações de negócio abstratas
- Remover: cache manual, logging detalhado, verificações duplicadas

### 4. Cross-cutting Concerns via Interceptors/Decorators

**Decisão**: Implementar cache, workflow e audit através de interceptors aplicados via decorators.

**Racionale**:
- Separação clara de responsabilidades
- Reutilização entre serviços
- Facilita testing (pode ser desabilitado)
- Segue padrões NestJS

**Implementação**:
```typescript
@UseInterceptors(WorkflowInterceptor, CacheInterceptor, AuditInterceptor)
export class DadosCestaBasicaService extends AbstractDadosBeneficioService {
  // apenas lógica específica
}
```

### 5. Mapeamento Direto Código→Serviço

**Decisão**: Eliminar conversões intermediárias, mapear códigos diretamente para serviços.

**Racionale**:
- Reduz complexidade
- Melhora performance
- Facilita adição de novos tipos

### 6. Error Context via Interceptor

**Decisão**: Capturar contexto de erro automaticamente através de interceptor.

**Racionale**:
- Garante consistência na captura
- Reduz código boilerplate
- Melhora observabilidade

---

## Alternativas Consideradas

### Alternativa 1: Manter Arquitetura Atual com Melhorias Pontuais
**Rejeitada**: Não resolve problemas fundamentais de complexidade e responsabilidades misturadas.

### Alternativa 2: Reestruturação Completa com Microserviços
**Rejeitada**: Over-engineering para o escopo atual, aumentaria complexidade operacional.

### Alternativa 3: Usar Event-Driven Architecture
**Rejeitada**: Adiciona complexidade desnecessária para operações CRUD síncronas.

---

## Consequências

### Positivas

1. **Manutenibilidade**: Código mais simples e focado
2. **Testabilidade**: Responsabilidades isoladas facilitam testes
3. **Performance**: Remoção de verificações desnecessárias
4. **Extensibilidade**: Fácil adição de novos tipos de benefício
5. **Observabilidade**: Context capture automático melhora debugging
6. **Padronização**: Uso consistente de padrões NestJS

### Negativas

1. **Refatoração Extensiva**: Impacto em múltiplos arquivos
2. **Risco de Regressão**: Mudanças podem quebrar funcionalidades existentes
3. **Curva de Aprendizado**: Equipe precisa entender novos padrões
4. **Interceptors Dependency**: Funcionalidades críticas dependem de interceptors

### Riscos Mitigados

1. **Compatibilidade**: Manter interface pública idêntica dos endpoints
2. **Performance**: Benchmarks antes/depois da refatoração
3. **Funcionalidade**: Suite de testes abrangente
4. **Rollback**: Branch anterior mantida para rollback rápido

---

## Plano de Implementação

### Fase 1: Infraestrutura (1-2 dias)
- Criar interceptors (Workflow, Cache, Error Context)
- Implementar custom validator `@ValidateTipoBeneficio`
- Criar `SchemaValidationService`

### Fase 2: DTOs e Validação (1 dia)
- Adicionar validator nos DTOs
- Testar validações end-to-end

### Fase 3: Abstract Service (1-2 dias)
- Simplificar classe base
- Remover complexidades desnecessárias
- Manter apenas CRUD essencial

### Fase 4: Factory Service (1-2 dias)
- Implementar mapeamento direto
- Remover lógicas transferidas
- Criar endpoint de validação de schema

### Fase 5: Serviços Específicos (1 dia)
- Adicionar decorators/interceptors
- Verificar compatibilidade

### Fase 6: Controller e Testes (1-2 dias)
- Atualizar controller
- Executar testes completos
- Verificar performance

**Total Estimado**: 7-10 dias

---

## Critérios de Aceitação

### Funcionais
- [ ] Todos os endpoints mantêm comportamento idêntico
- [ ] Validações de negócio funcionam corretamente
- [ ] Cache automático funciona
- [ ] Workflow é atualizado após criação
- [ ] Error context é capturado adequadamente

### Não-Funcionais
- [ ] Performance igual ou superior
- [ ] Código reduzido em pelo menos 30%
- [ ] Coverage de testes mantido
- [ ] Documentação atualizada

### Técnicos
- [ ] Factory service < 100 linhas
- [ ] Abstract service focado apenas em CRUD
- [ ] Interceptors implementados corretamente
- [ ] DTOs validam tipo automaticamente

---

## Indicadores de Sucesso

### Métricas de Qualidade
- **Complexidade Ciclomática**: Redução de 40%
- **Linhas de Código**: Redução de 30%
- **Acoplamento**: Redução de classes dependentes
- **Coesão**: Aumento da responsabilidade única

### Métricas de Performance
- **Tempo de Resposta**: Manter ou melhorar
- **Throughput**: Manter ou melhorar
- **Uso de Memória**: Redução esperada

### Métricas de Manutenibilidade
- **Tempo para Adicionar Novo Tipo**: < 2 horas
- **Tempo para Debug**: Redução devido a melhor observabilidade
- **Onboarding de Desenvolvedores**: Facilita compreensão

---

## Monitoramento Pós-Implementação

### Logs a Observar
- Erros de validação de tipo de benefício
- Performance dos interceptors
- Cache hit/miss rates
- Workflow transition failures

### Métricas a Acompanhar
- Latência dos endpoints
- Taxa de erro
- Uso de recursos
- User experience metrics

### Alertas Configurar
- Aumento de latência > 20%
- Taxa de erro > 1%
- Falhas de workflow
- Cache miss rate > 30%

---

## Rollback Plan

### Triggers para Rollback
- Taxa de erro > 5%
- Latência aumenta > 50%
- Funcionalidade crítica quebrada
- Integrações externas falhando

### Procedimento de Rollback
1. Reverter para branch anterior
2. Deploy da versão estável
3. Validar funcionalidades críticas
4. Comunicar stakeholders
5. Investigar problemas

### Recovery Plan
- Análise de root cause
- Correções incrementais
- Re-deploy gradual com monitoring
- Documentação de lessons learned

---

## Compliance e Governança

### Standards Atendidos
- **Clean Code**: Responsabilidades únicas
- **SOLID Principles**: Especialmente SRP e OCP
- **NestJS Best Practices**: Uso adequado de interceptors e decorators
- **TypeScript Standards**: Type safety mantido

### Security Considerations
- Validações mantidas ou melhoradas
- Error handling não expõe dados sensíveis
- Audit trail preservado via interceptors
- Access control não impactado

### Regulatory Compliance
- Auditoria mantida através de interceptors
- Data integrity preservada
- Soft delete mantido para compliance

---

## Documentação Requerida

### Technical Documentation
- [ ] Arquitetura pós-refatoração
- [ ] Guia de implementação de interceptors
- [ ] Como adicionar novos tipos de benefício
- [ ] Troubleshooting guide

### User Documentation
- [ ] API documentation atualizada
- [ ] Migration guide para desenvolvedores
- [ ] Performance characteristics
- [ ] Error handling guide

---

## Aprovações Necessárias

### Technical Approval
- [ ] Tech Lead
- [ ] Senior Developer
- [ ] QA Lead

### Business Approval
- [ ] Product Owner
- [ ] Security Team
- [ ] DevOps Team

---

## Referencias

- [NestJS Interceptors Documentation](https://docs.nestjs.com/interceptors)
- [Clean Architecture Principles](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Refactoring: Improving the Design of Existing Code](https://martinfowler.com/books/refactoring.html)

---

**Última Atualização**: 2024-01-15  
**Próxima Revisão**: Após implementação completa  
**Status**: Aguardando aprovação para início da implementação