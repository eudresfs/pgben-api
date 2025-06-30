# ADR-001: Migração para Arquitetura Event-Driven de Auditoria

## Status
**APROVADO** - Data: 2025-01-15  
**Autor**: Equipe de Arquitetura  
**Revisores**: Tech Lead, Product Owner, Compliance Officer  

## Contexto

### Situação Atual
O módulo de auditoria da aplicação apresenta problemas críticos que impactam o desenvolvimento e a operação:

1. **Dependências Circulares**: O módulo de auditoria importa outros módulos (AuthModule, UsersModule) que, por sua vez, dependem da auditoria, criando ciclos de dependência complexos.

2. **Performance Degradada**: Operações que deveriam ser rápidas (<50ms) estão levando em média 200ms devido ao processamento síncrono de auditoria.

3. **Acoplamento Forte**: Mudanças no módulo de auditoria requerem alterações em múltiplos módulos de domínio.

4. **Responsabilidades Misturadas**: Um único módulo trata de persistência, exportação, monitoramento, assinatura digital e middleware HTTP.

5. **Dificuldade de Testes**: Dependências circulares tornam os testes complexos e instáveis.

### Requisitos de Negócio
- **Compliance LGPD**: 100% das operações com dados pessoais devem ser auditadas
- **Performance**: Operações principais não podem ser impactadas pela auditoria
- **Confiabilidade**: Zero perda de logs de auditoria
- **Escalabilidade**: Sistema deve suportar crescimento de 3x no volume

### Contexto Técnico
- **Stack**: NestJS, TypeORM, PostgreSQL, Redis, Bull
- **Ambiente**: Kubernetes, múltiplas instâncias
- **Volume**: ~10.000 operações auditadas/dia atualmente

## Decisão

**Migraremos o módulo de auditoria para uma arquitetura event-driven híbrida utilizando EventEmitter + BullMQ.**

### Arquitetura Alvo

```
┌─────────────────┐    Eventos     ┌──────────────────┐
│   Módulos de    │ ──────────────▶│  AuditEventsModule │
│    Domínio      │   (Síncronos)  │    (Global)       │
│ (Users, Auth,   │                └──────────────────┘
│  Citizens, etc) │                         │
└─────────────────┘                         ▼
                                   ┌──────────────────┐
                                   │    BullMQ        │
                                   │  (Assíncrono)    │
                                   └──────────────────┘
                                            │
                                            ▼
                                   ┌──────────────────┐
                                   │  AuditCoreModule │
                                   │  (Persistência)  │
                                   └──────────────────┘
```

### Componentes Principais

1. **AuditEventsModule (Global)**
   - EventEmitter para comunicação interna rápida
   - AuditEventEmitter service para emissão padronizada
   - Interfaces de eventos tipadas

2. **AuditCoreModule (Isolado)**
   - Event listeners conectados ao BullMQ
   - Processadores de auditoria especializados
   - Repository isolado sem dependências externas

3. **Feature Modules (Independentes)**
   - Export, Monitoring, Signature como módulos separados
   - Cada feature pode ser desenvolvida/deployada independentemente

### Estratégia de Implementação

**Híbrida EventEmitter + BullMQ**:
- **EventEmitter**: Comunicação síncrona interna (~1ms latência)
- **BullMQ**: Processamento assíncrono confiável com retry automático
- **Sem fallback**: Migração completa, sem manter sistema dual

## Alternativas Consideradas

### Alternativa 1: Refactoring Incremental
**Descrição**: Manter arquitetura atual, apenas removendo dependências circulares.

**Prós**:
- Menor risco de migração
- Mudanças incrementais
- Conhecimento existente da equipe

**Contras**:
- Performance continua degradada
- Problema de acoplamento persiste
- Não resolve escalabilidade
- Manutenibilidade continua baixa

**Decisão**: ❌ Rejeitada - Não resolve problemas fundamentais

### Alternativa 2: Apenas EventEmitter (Sem BullMQ)
**Descrição**: Usar apenas EventEmitter para toda comunicação de auditoria.

**Prós**:
- Simplicidade de implementação
- Latência ultra-baixa
- Sem dependência adicional de Redis

**Contras**:
- Risco de perda de eventos em falhas
- Sem persistência garantida
- Compliance LGPD comprometido
- Sem retry automático

**Decisão**: ❌ Rejeitada - Risco inaceitável para compliance

### Alternativa 3: Apenas BullMQ (Sem EventEmitter)
**Descrição**: Usar apenas BullMQ para toda comunicação.

**Prós**:
- Máxima confiabilidade
- Retry automático nativo
- Monitoramento avançado
- Escalabilidade horizontal

**Contras**:
- Latência maior (~20-50ms por evento)
- Complexidade operacional
- Overhead desnecessário para eventos internos
- Dependência forte do Redis

**Decisão**: ❌ Rejeitada - Overhead excessivo para comunicação interna

### Alternativa 4: Message Broker Externo (RabbitMQ/Kafka)
**Descrição**: Implementar message broker dedicado para eventos.

**Prós**:
- Máxima escalabilidade
- Separação completa de responsabilidades
- Suporte a múltiplas aplicações

**Contras**:
- Complexidade operacional significativa
- Nova dependência de infraestrutura
- Overkill para escopo atual
- Tempo de implementação maior

**Decisão**: ❌ Rejeitada - Overengineering para contexto atual

## Consequências

### Positivas

#### Técnicas
- **Eliminação de dependências circulares**: Módulos de domínio dependem apenas do EventsModule
- **Performance otimizada**: Operações principais reduzidas de 200ms para <50ms
- **Escalabilidade**: Processamento horizontal via BullMQ workers
- **Testabilidade**: Componentes isolados, fácil mock de eventos
- **Manutenibilidade**: Responsabilidades claras e separadas

#### Operacionais
- **Confiabilidade**: Retry automático e dead letter queue
- **Monitoramento**: Métricas granulares por tipo de evento
- **Deploy independente**: Features podem ser deployadas separadamente
- **Rollback seguro**: Possibilidade de rollback por componente

#### Desenvolvimento
- **Onboarding simplificado**: Novos desenvolvedores compreendem componentes isolados
- **Debugging facilitado**: Logs estruturados e correlation IDs
- **Extensibilidade**: Novos tipos de eventos facilmente adicionados

### Negativas

#### Complexidade Inicial
- **Curva de aprendizado**: Equipe precisa aprender padrões event-driven
- **Debugging distribuído**: Falhas podem ocorrer em múltiplos componentes
- **Configuração**: Mais configurações de ambiente necessárias

#### Dependências
- **Redis crítico**: BullMQ depende do Redis para confiabilidade
- **Eventual consistency**: Pequeno lag entre operação e auditoria (aceitável para compliance)

#### Operacional
- **Monitoramento adicional**: Necessidade de monitorar filas e eventos
- **Complexidade de deploy**: Coordenação entre múltiplos componentes

### Mitigações

#### Para Complexidade
- **Documentação abrangente**: ADR, guias e exemplos de código
- **Training da equipe**: Workshops sobre event-driven patterns
- **Ferramentas de debug**: Correlation IDs e logging estruturado

#### Para Dependências
- **Monitoring robusto**: Alertas para Redis e filas
- **Backup strategy**: Backup automático de configurações Redis
- **Health checks**: Verificação contínua da saúde dos componentes

#### Para Operação
- **Automation**: Scripts automatizados para deploy
- **Rollback plans**: Procedimentos claros para rollback
- **Runbooks**: Documentação operacional completa

## Decisões de Design

### Event Schema
```typescript
interface BaseAuditEvent {
  eventType: AuditEventType;
  entityName: string;
  entityId?: string;
  userId?: string;
  timestamp: Date;
  correlationId: string;  // Para tracing
  metadata?: Record<string, any>;
}
```

### Queue Configuration
```typescript
{
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 100,
    attempts: 3,
    backoff: 'exponential',
  },
  processors: {
    'audit-create': { concurrency: 5 },
    'audit-update': { concurrency: 5 },
    'sensitive-access': { concurrency: 10 }, // Prioridade alta
  }
}
```

### Error Handling
- **Eventos críticos**: Retry até 3x com backoff exponencial
- **Dead Letter Queue**: Para eventos que falharam definitivamente
- **Alertas**: Notificação imediata para falhas de compliance

### Performance Targets
- **Emissão de eventos**: <5ms
- **Processamento de eventos**: <100ms
- **Throughput**: >1000 eventos/segundo
- **Disponibilidade**: 99.9%

## Métricas de Sucesso

### Técnicas
- [ ] **Zero dependências circulares** (validado por análise estática)
- [ ] **Latência <50ms** para operações principais
- [ ] **99.9% confiabilidade** de processamento de eventos
- [ ] **Coverage >90%** em testes automatizados

### Negócio
- [ ] **100% compliance LGPD** mantido durante migração
- [ ] **Zero downtime** durante deploy
- [ ] **Performance 3x melhor** que sistema atual
- [ ] **Capacity 5x maior** para crescimento futuro

### Operacionais
- [ ] **Deploy independente** de features funcionando
- [ ] **Monitoring completo** implementado
- [ ] **Rollback em <5min** validado
- [ ] **Equipe treinada** nos novos processos

## Cronograma

### Sprint 1 (2 semanas)
- Infraestrutura base (EventEmitter + BullMQ)
- Core refatorado sem dependências

### Sprint 2-3 (4 semanas)  
- Features modulares separadas
- Migração completa do módulo principal

### Sprint 4-6 (6 semanas)
- Migração gradual de módulos de domínio
- Testes e validação em produção

**Total estimado**: 12 semanas

## Risks e Contingências

### Alto Risco
**Perda de eventos durante migração**
- *Probabilidade*: Baixa
- *Impacto*: Alto (compliance)
- *Mitigação*: Testes extensivos, deploy gradual

### Médio Risco
**Performance pior que esperada**
- *Probabilidade*: Média  
- *Impacto*: Médio
- *Mitigação*: Benchmarks antes/depois, otimização contínua

### Baixo Risco
**Resistência da equipe à mudança**
- *Probabilidade*: Baixa
- *Impacto*: Baixo
- *Mitigação*: Training, documentação, suporte

## Aprovação

### Stakeholders
- [x] **Tech Lead**: João Silva - Aprovado em 2025-01-10
- [x] **Product Owner**: Maria Santos - Aprovado em 2025-01-12  
- [x] **Compliance Officer**: Pedro Lima - Aprovado em 2025-01-14
- [x] **DevOps Lead**: Ana Costa - Aprovado em 2025-01-15

### Conditions for Approval
- [x] **Plano de rollback** documentado e validado
- [x] **Métricas de monitoramento** definidas
- [x] **Training plan** para equipe aprovado
- [x] **Compliance review** completo

## Próximos Passos

1. **Comunicação**: Anunciar decisão para toda equipe
2. **Setup**: Criar repositório e estrutura inicial
3. **Training**: Agendar sessões sobre event-driven patterns
4. **Implementation**: Iniciar Sprint 1 conforme cronograma
5. **Monitoring**: Configurar dashboards de acompanhamento

## Revisões

### Revisão 1 - Sprint 1 End
- **Data**: A definir
- **Objetivo**: Validar infraestrutura base
- **Métricas**: Performance inicial, eventos funcionando

### Revisão 2 - Sprint 3 End  
- **Data**: A definir
- **Objetivo**: Validar migração completa do módulo
- **Métricas**: Dependências circulares eliminadas

### Revisão Final - Sprint 6 End
- **Data**: A definir
- **Objetivo**: Avaliar sucesso geral da migração
- **Métricas**: Todas as métricas de sucesso atingidas

## Referências

- [Event-Driven Architecture Patterns](https://microservices.io/patterns/data/event-driven-architecture.html)
- [NestJS Event Emitter Documentation](https://docs.nestjs.com/techniques/events)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [LGPD Compliance Guidelines](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)
- [Audit Logging Best Practices](https://owasp.org/www-community/controls/Logging_and_Monitoring)

---

**Documento versionado**: v1.0  
**Última atualização**: 2025-01-15  
**Próxima revisão**: Sprint 1 End