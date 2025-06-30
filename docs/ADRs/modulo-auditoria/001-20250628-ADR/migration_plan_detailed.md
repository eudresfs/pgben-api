# Plano de Migração - Módulo de Auditoria Event-Driven

## 📋 Contexto e Objetivos

### Situação Atual
- Módulo de auditoria com dependências circulares
- Performance degradada (~200ms por operação)
- Arquitetura monolítica com responsabilidades misturadas
- Uso atual do Bull para processamento de filas

### Objetivo da Migração
- Implementar arquitetura híbrida EventEmitter + BullMQ
- Eliminar dependências circulares
- Melhorar performance para <50ms por operação
- Manter 100% compliance LGPD
- Modularizar responsabilidades

---

## 🎯 Estratégia de Migração

### Abordagem: Big Bang Controlado
- **Não haverá sistema dual** (fallback removido)
- **Migração completa em uma versão**
- **Testes extensivos antes do deploy**
- **Rollback plan bem definido**

### Arquitetura Alvo
```
EventEmitter (comunicação rápida) → BullMQ (persistência confiável) → Database
```

---

## 📅 Cronograma Detalhado

### **Fase 1: Fundação (Sprint 1 - 2 semanas)**

#### **Semana 1: Infraestrutura de Eventos**

**Dia 1-2: Setup EventEmitter**
```bash
# Instalar dependência
npm install @nestjs/event-emitter

# Estrutura de arquivos a criar:
src/modules/auditoria/
├── events/
│   ├── types/
│   │   ├── audit-event.types.ts
│   │   ├── entity-events.ts
│   │   └── system-events.ts
│   ├── emitters/
│   │   ├── audit-event-emitter.service.ts
│   │   └── audit-event-emitter.interface.ts
│   └── audit-events.module.ts
```

**Tarefas específicas:**
1. Criar interfaces de eventos padronizadas
2. Implementar AuditEventEmitter service
3. Configurar EventEmitterModule como Global
4. Criar testes unitários para eventos
5. Documentar todos os tipos de eventos

**Dia 3-4: BullMQ Integration**
```bash
# Estrutura de filas a criar:
src/modules/auditoria/
├── queues/
│   ├── processors/
│   │   ├── audit.processor.ts
│   │   ├── sensitive-data.processor.ts
│   │   └── export.processor.ts
│   ├── jobs/
│   │   ├── audit-job.types.ts
│   │   └── job-priority.enum.ts
│   └── audit-queue.module.ts
```

**Tarefas específicas:**
1. Configurar BullMQ com Redis existente
2. Criar processadores específicos para cada tipo de evento
3. Definir prioridades e configurações de retry
4. Implementar dead letter queue para falhas
5. Configurar métricas e monitoramento

**Dia 5: Testes de Integração**
1. Testar EventEmitter → BullMQ → Database
2. Validar performance dos processadores
3. Testar cenários de falha e recuperação
4. Benchmark de throughput

#### **Semana 2: Core Refatorado**

**Dia 1-3: Extrair Audit Core**
```bash
# Nova estrutura do core:
src/modules/auditoria/
├── core/
│   ├── entities/
│   │   └── log-auditoria.entity.ts (movido)
│   ├── repositories/
│   │   └── log-auditoria.repository.ts (refatorado)
│   ├── services/
│   │   ├── audit-persistence.service.ts (novo)
│   │   └── audit-compression.service.ts (extraído)
│   └── audit-core.module.ts
```

**Tarefas específicas:**
1. Mover entities para core sem dependências externas
2. Refatorar LogAuditoriaRepository para ser stateless
3. Extrair lógica de compressão em service separado
4. Criar AuditPersistenceService para operações CRUD
5. Remover todas as dependências de outros módulos

**Dia 4-5: Event Listeners**
```bash
# Listeners para processar eventos:
src/modules/auditoria/
├── listeners/
│   ├── entity-audit.listener.ts
│   ├── sensitive-data.listener.ts
│   ├── auth-audit.listener.ts
│   └── system-audit.listener.ts
```

**Tarefas específicas:**
1. Implementar listeners para cada categoria de evento
2. Conectar listeners com BullMQ processors
3. Implementar error handling e retry logic
4. Adicionar logging estruturado
5. Criar testes de integração para cada listener

### **Fase 2: Features Modulares (Sprint 2 - 2 semanas)**

#### **Semana 1: Separação de Responsabilidades**

**Dia 1-2: Export Module**
```bash
src/modules/auditoria/
├── features/
│   ├── export/
│   │   ├── services/
│   │   │   ├── audit-export.service.ts (refatorado)
│   │   │   └── export-compression.service.ts
│   │   ├── controllers/
│   │   │   └── audit-export.controller.ts (refatorado)
│   │   ├── dto/
│   │   │   └── export-request.dto.ts
│   │   └── audit-export.module.ts
```

**Tarefas específicas:**
1. Extrair AuditoriaExportacaoService para módulo independente
2. Remover dependências do módulo principal
3. Criar interface clara entre core e export
4. Refatorar controller para usar apenas export module
5. Implementar testes isolados

**Dia 3-4: Monitoring Module**
```bash
src/modules/auditoria/
├── features/
│   ├── monitoring/
│   │   ├── services/
│   │   │   ├── audit-monitoring.service.ts (refatorado)
│   │   │   └── metrics-collector.service.ts (novo)
│   │   ├── controllers/
│   │   │   └── audit-monitoring.controller.ts (refatorado)
│   │   └── audit-monitoring.module.ts
```

**Tarefas específicas:**
1. Extrair AuditoriaMonitoramentoService
2. Criar MetricsCollectorService para estatísticas
3. Implementar health checks específicos
4. Refatorar controller para usar apenas monitoring module
5. Adicionar alertas automáticos

**Dia 5: Signature Module**
```bash
src/modules/auditoria/
├── features/
│   ├── signature/
│   │   ├── services/
│   │   │   ├── audit-signature.service.ts (refatorado)
│   │   │   └── signature-validation.service.ts (novo)
│   │   └── audit-signature.module.ts
```

**Tarefas específicas:**
1. Extrair AuditoriaSignatureService
2. Criar SignatureValidationService
3. Implementar assinatura automática via eventos
4. Criar testes de segurança
5. Documentar processo de validação

#### **Semana 2: Decorators e Interceptors**

**Dia 1-3: Sistema de Decorators**
```bash
src/modules/auditoria/
├── decorators/
│   ├── auto-audit.decorator.ts
│   ├── sensitive-data.decorator.ts
│   ├── audit-export.decorator.ts
│   └── audit-config.interface.ts
├── interceptors/
│   ├── audit-emit.interceptor.ts
│   ├── sensitive-data.interceptor.ts
│   └── performance.interceptor.ts
```

**Tarefas específicas:**
1. Criar @AutoAudit decorator para auditoria automática
2. Implementar @SensitiveData para campos LGPD
3. Criar interceptors para captura automática
4. Implementar PerformanceInterceptor para métricas
5. Criar documentação de uso

**Dia 4-5: Middleware Otimizado**
```bash
src/modules/auditoria/
├── middleware/
│   ├── audit-request.middleware.ts (novo, leve)
│   └── middleware-config.service.ts
```

**Tarefas específicas:**
1. Criar middleware leve apenas para emissão de eventos
2. Remover processamento pesado do middleware atual
3. Implementar filtering inteligente de requisições
4. Adicionar configuração dinâmica
5. Testar performance comparativa

### **Fase 3: Migração Completa (Sprint 3 - 2 semanas)**

#### **Semana 1: Remoção do Sistema Atual**

**Dia 1-2: Backup e Preparação**
1. Criar backup completo do módulo atual
2. Documentar todos os pontos de integração
3. Preparar scripts de rollback
4. Criar testes de regressão completos
5. Validar ambiente de staging

**Dia 3-5: Substituição Gradual**
1. Substituir AuditoriaService por EventEmitter em serviços core
2. Remover AuditoriaQueueService antigo
3. Migrar todos os controllers para nova arquitetura
4. Atualizar middleware para usar apenas eventos
5. Remover código morto e dependências não utilizadas

#### **Semana 2: Validação e Otimização**

**Dia 1-2: Testes Intensivos**
1. Executar suite completa de testes automatizados
2. Realizar testes de carga com dados reais
3. Validar compliance LGPD em todos os cenários
4. Testar cenários de falha e recuperação
5. Verificar integridade de dados históricos

**Dia 3-4: Performance Tuning**
1. Otimizar configurações do BullMQ
2. Ajustar tamanhos de batch e concorrência
3. Implementar cache onde apropriado
4. Otimizar queries do repositório
5. Configurar monitoring detalhado

**Dia 5: Deploy e Monitoramento**
1. Deploy em ambiente de staging
2. Execução de smoke tests
3. Monitoramento de métricas em tempo real
4. Validação com equipe de QA
5. Preparação para produção

---

## 🔧 Configurações Técnicas

### **Environment Variables**
```env
# Event Emitter Configuration
EVENT_EMITTER_MAX_LISTENERS=20
EVENT_EMITTER_WILDCARD=true
EVENT_EMITTER_DELIMITER=.

# BullMQ Configuration
AUDIT_QUEUE_CONCURRENCY=5
AUDIT_QUEUE_MAX_REPEAT=3
AUDIT_QUEUE_BACKOFF_TYPE=exponential
AUDIT_QUEUE_BACKOFF_DELAY=2000

# Redis Configuration (existente)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1

# Audit Specific
AUDIT_BATCH_SIZE=100
AUDIT_COMPRESSION_THRESHOLD=1024
AUDIT_RETENTION_DAYS=2555  # 7 anos LGPD
```

### **Queue Configuration**
```typescript
// Configuração detalhada do BullMQ
{
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    db: 1, // Separar do cache principal
  },
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
  processors: [
    { name: 'audit-create', concurrency: 5 },
    { name: 'audit-update', concurrency: 5 },
    { name: 'audit-delete', concurrency: 3 },
    { name: 'sensitive-access', concurrency: 10 }, // Alta prioridade
    { name: 'export-data', concurrency: 2 },
  ],
}
```

---

## 🧪 Estratégia de Testes

### **Testes Unitários**
```bash
# Estrutura de testes:
src/modules/auditoria/
├── __tests__/
│   ├── unit/
│   │   ├── events/
│   │   ├── processors/
│   │   ├── listeners/
│   │   └── services/
│   ├── integration/
│   │   ├── event-flow.spec.ts
│   │   ├── queue-processing.spec.ts
│   │   └── performance.spec.ts
│   └── e2e/
│       ├── audit-flow.e2e.spec.ts
│       └── compliance.e2e.spec.ts
```

### **Métricas de Qualidade**
- **Coverage mínimo**: 90%
- **Performance**: <50ms por operação
- **Confiabilidade**: 99.9% eventos processados
- **Compliance**: 100% logs LGPD auditados

---

## 🚨 Plano de Rollback

### **Indicadores para Rollback**
1. **Performance degradada**: >100ms por operação
2. **Perda de eventos**: >0.1% de falha na auditoria
3. **Compliance quebrado**: Falta de logs obrigatórios
4. **Instabilidade**: >5% de erro em APIs principais

### **Processo de Rollback**
1. **Imediato**: Revert do commit principal
2. **Restauração**: Backup do módulo anterior
3. **Validação**: Testes de smoke em <10min
4. **Comunicação**: Alertar equipes afetadas

### **Arquivos de Backup Críticos**
```bash
# Backup obrigatório antes da migração:
backup/
├── audit-module-current/
│   ├── services/
│   ├── controllers/
│   ├── repositories/
│   └── middleware/
├── database-schema/
└── configuration/
```

---

## 📊 Monitoramento e Alertas

### **Métricas Críticas**
```typescript
// Métricas a implementar:
export interface AuditMetrics {
  eventsEmitted: Counter;           // Total eventos emitidos
  eventsProcessed: Counter;         // Total eventos processados
  processingLatency: Histogram;     // Latência de processamento
  queueSize: Gauge;                // Tamanho da fila
  failureRate: Gauge;              // Taxa de falhas
  compressionRatio: Gauge;         // Eficiência compressão
}
```

### **Alertas Obrigatórios**
1. **Fila crescendo**: >1000 jobs pendentes
2. **Latência alta**: >100ms processamento
3. **Taxa falha**: >1% em 5min
4. **Redis down**: Conexão perdida
5. **Compliance risk**: Eventos críticos falhando

---

## ✅ Critérios de Sucesso

### **Técnicos**
- [ ] Zero dependências circulares (validado por madge)
- [ ] Performance <50ms (validado por testes automatizados)
- [ ] 99.9% confiabilidade (validado por métricas)
- [ ] Coverage >90% (validado por jest)

### **Funcionais**
- [ ] 100% dos tipos de evento funcionando
- [ ] Exportação mantida e otimizada
- [ ] Monitoramento completo e preciso
- [ ] Compliance LGPD 100% mantido

### **Operacionais**
- [ ] Deploy sem downtime
- [ ] Rollback testado e funcional
- [ ] Documentação completa
- [ ] Equipe treinada nos novos processos

---

## 📚 Entregáveis

### **Código**
- [ ] Módulo refatorado completamente
- [ ] Testes automatizados (unit + integration + e2e)
- [ ] Scripts de migração de dados
- [ ] Configurações de ambiente

### **Documentação**
- [ ] ADR da decisão arquitetural
- [ ] Guia de desenvolvimento para novos recursos
- [ ] Runbook operacional
- [ ] Documentação de API atualizada

### **Operacional**
- [ ] Playbook de deploy
- [ ] Plano de rollback validado
- [ ] Configuração de alertas
- [ ] Dashboard de monitoramento