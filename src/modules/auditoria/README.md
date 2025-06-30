# Módulo de Auditoria - PGBen Server

## Visão Geral

O Módulo de Auditoria é um sistema abrangente e robusto para rastreamento, monitoramento e conformidade de operações dentro da aplicação PGBen. Implementa uma arquitetura event-driven moderna com processamento síncrono e assíncrono, garantindo alta performance e conformidade com regulamentações como LGPD.

## Características Principais

### 🏗️ Arquitetura Event-Driven
- **Processamento Síncrono**: Para eventos críticos que requerem resposta imediata
- **Processamento Assíncrono**: Para eventos de baixa prioridade usando BullMQ
- **Sistema de Filas**: Múltiplas filas especializadas por tipo de evento e prioridade

### 🔒 Segurança e Conformidade
- **Conformidade LGPD**: Rastreamento de dados pessoais e consentimento
- **Detecção de Dados Sensíveis**: Identificação automática e sanitização
- **Assinatura Digital**: Integridade dos logs de auditoria
- **Níveis de Risco**: Classificação automática baseada em múltiplos fatores

### 🚀 Performance e Escalabilidade
- **Processamento em Lote**: Para operações de alto volume
- **Compressão de Dados**: Otimização de armazenamento
- **Cache Inteligente**: Redução de latência
- **Monitoramento de Performance**: Métricas em tempo real

### 🎯 Facilidade de Uso
- **Decorators**: Auditoria automática com anotações simples
- **Interceptors**: Captura transparente de operações
- **Middleware**: Rastreamento de requisições HTTP
- **Guards**: Controle de acesso com auditoria

## Estrutura do Módulo

```
src/modules/auditoria/
├── config/                 # Configurações centralizadas
│   └── audit-config.ts
├── constants/              # Constantes e enums
│   └── audit.constants.ts
├── core/                   # Serviços core isolados
│   ├── audit-core.repository.ts
│   ├── audit-core.service.ts
│   └── audit-core.module.ts
├── decorators/             # Decorators para auditoria automática
│   └── audit.decorators.ts
├── entities/               # Entidades de banco de dados
│   └── log-auditoria.entity.ts
├── events/                 # Sistema de eventos
│   ├── types/
│   │   └── audit-event.types.ts
│   ├── audit-event.emitter.ts
│   ├── audit-event.listener.ts
│   └── audit-events.module.ts
├── guards/                 # Guards com auditoria
│   └── audit.guard.ts
├── interceptors/           # Interceptors de auditoria
│   └── audit.interceptor.ts
├── middleware/             # Middleware de auditoria
│   └── audit.middleware.ts
├── queues/                 # Sistema de filas
│   ├── jobs/
│   │   └── audit-processing.job.ts
│   ├── audit.processor.ts
│   └── audit-queues.module.ts
├── utils/                  # Utilitários
│   └── audit.utils.ts
├── auditoria.module.ts     # Módulo principal
├── index.ts               # Exports centralizados
└── README.md              # Esta documentação
```

## Instalação e Configuração

### 1. Importar o Módulo

```typescript
import { Module } from '@nestjs/common';
import { AuditoriaModule } from './modules/auditoria';

@Module({
  imports: [
    AuditoriaModule.forRoot({
      enableAsync: true,
      enableGlobalInterceptor: true,
      enableGlobalMiddleware: true,
      config: {
        performance: {
          batchSize: 50,
          syncTimeout: 5000,
        },
        lgpd: {
          enabled: true,
          retentionDays: 2555,
        },
      },
    }),
  ],
})
export class AppModule {}
```

### 2. Configuração de Banco de Dados

Certifique-se de que a entidade `LogAuditoria` está incluída na configuração do TypeORM:

```typescript
TypeOrmModule.forRoot({
  // ... outras configurações
  entities: [LogAuditoria, /* outras entidades */],
  synchronize: false, // Use migrations em produção
})
```

### 3. Configuração do Redis (para filas)

```typescript
BullModule.forRoot({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
})
```

## Uso Básico

### Decorators de Auditoria

#### @Audit - Auditoria Manual
```typescript
import { Audit } from '@modules/auditoria';

@Controller('users')
export class UsersController {
  @Post()
  @Audit({
    eventType: AuditEventType.ENTITY_CREATE,
    entity: 'User',
    operation: 'create',
    riskLevel: RiskLevel.MEDIUM,
  })
  async createUser(@Body() userData: CreateUserDto) {
    return this.usersService.create(userData);
  }
}
```

#### @AutoAudit - Auditoria Automática
```typescript
@Controller('users')
@AutoAudit({ entity: 'User' })
export class UsersController {
  // Todos os métodos serão auditados automaticamente
  @Post()
  async createUser(@Body() userData: CreateUserDto) {
    return this.usersService.create(userData);
  }
}
```

#### @SensitiveData - Dados Sensíveis
```typescript
@Controller('users')
export class UsersController {
  @Get(':id/profile')
  @SensitiveDataAccess({
    dataTypes: ['personal_info', 'contact'],
    requiresConsent: true,
  })
  async getUserProfile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }
}
```

#### @SecurityAudit - Eventos de Segurança
```typescript
@Controller('auth')
export class AuthController {
  @Post('login')
  @SecurityAudit({
    operation: 'login',
    riskLevel: RiskLevel.MEDIUM,
  })
  async login(@Body() credentials: LoginDto) {
    return this.authService.login(credentials);
  }
}
```

### Emissão Manual de Eventos

```typescript
import { AuditEventEmitter, AuditEventType, RiskLevel } from '@modules/auditoria';

@Injectable()
export class UsersService {
  constructor(
    private readonly auditEmitter: AuditEventEmitter,
  ) {}

  async deleteUser(id: string, userId: string) {
    // Operação de negócio
    await this.userRepository.delete(id);

    // Emitir evento de auditoria
    await this.auditEmitter.emitEntityDeleted({
      entityType: 'User',
      entityId: id,
      userId,
      riskLevel: RiskLevel.HIGH,
      metadata: {
        reason: 'User requested account deletion',
        gdprCompliant: true,
      },
    });
  }
}
```

### Consulta de Logs

```typescript
import { AuditCoreService, AuditFilter } from '@modules/auditoria';

@Injectable()
export class AuditReportsService {
  constructor(
    private readonly auditService: AuditCoreService,
  ) {}

  async getUserAuditTrail(userId: string) {
    const filter: AuditFilter = {
      userId,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias
      page: 1,
      limit: 100,
    };

    return this.auditService.findWithFilters(filter);
  }

  async getSecurityEvents() {
    return this.auditService.findWithFilters({
      eventType: AuditEventType.SECURITY_EVENT,
      riskLevel: RiskLevel.HIGH,
    });
  }

  async getStatistics() {
    return this.auditService.getStatistics();
  }
}
```

## Configuração Avançada

### Configuração Personalizada

```typescript
import { createAuditConfig } from '@modules/auditoria';

const customConfig = createAuditConfig({
  performance: {
    batchSize: 100,
    syncTimeout: 10000,
    asyncThreshold: RiskLevel.LOW,
  },
  queues: {
    processing: {
      concurrency: 10,
      maxRetries: 5,
    },
    critical: {
      concurrency: 5,
      maxRetries: 3,
    },
  },
  lgpd: {
    enabled: true,
    retentionDays: 2555,
    anonymizationDelay: 30,
    consentRequired: true,
  },
  compression: {
    enabled: true,
    threshold: 1024,
    algorithm: 'gzip',
  },
});
```

### Listeners Personalizados

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AUDIT_EVENTS } from '@modules/auditoria';

@Injectable()
export class CustomAuditListener {
  @OnEvent(AUDIT_EVENTS.SECURITY_EVENT)
  async handleSecurityEvent(event: SecurityAuditEvent) {
    // Lógica personalizada para eventos de segurança
    if (event.riskLevel === RiskLevel.CRITICAL) {
      await this.notificationService.sendSecurityAlert(event);
    }
  }

  @OnEvent(AUDIT_EVENTS.SENSITIVE_DATA_ACCESS)
  async handleSensitiveDataAccess(event: SensitiveDataAuditEvent) {
    // Verificar conformidade LGPD
    await this.lgpdService.validateDataAccess(event);
  }
}
```

## Monitoramento e Métricas

### Health Check

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private readonly auditService: AuditCoreService,
  ) {}

  @Get('audit')
  async checkAuditHealth() {
    const stats = await this.auditService.getStatistics();
    
    return {
      status: stats.errorRate < 0.05 ? 'healthy' : 'degraded',
      metrics: {
        totalEvents: stats.totalEvents,
        errorRate: stats.errorRate,
        averageProcessingTime: stats.performanceMetrics.averageProcessingTime,
      },
    };
  }
}
```

### Métricas Prometheus (exemplo)

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class AuditMetricsService {
  private readonly eventCounter = new Counter({
    name: 'audit_events_total',
    help: 'Total number of audit events',
    labelNames: ['event_type', 'risk_level'],
  });

  private readonly processingDuration = new Histogram({
    name: 'audit_processing_duration_seconds',
    help: 'Duration of audit event processing',
    labelNames: ['event_type'],
  });

  @OnEvent('audit.**')
  recordEvent(event: BaseAuditEvent) {
    this.eventCounter.inc({
      event_type: event.eventType,
      risk_level: event.riskLevel,
    });
  }
}
```

## Conformidade LGPD

### Configuração LGPD

```typescript
const lgpdConfig = {
  enabled: true,
  retentionDays: 2555, // ~7 anos para dados fiscais
  anonymizationDelay: 30, // dias
  consentRequired: true,
  dataSubjectRights: [
    'access',
    'rectification', 
    'erasure',
    'portability',
    'restriction',
    'objection',
  ],
};
```

### Relatórios LGPD

```typescript
@Injectable()
export class LgpdReportsService {
  constructor(
    private readonly auditService: AuditCoreService,
  ) {}

  async getDataSubjectReport(userId: string) {
    // Todos os logs relacionados ao titular dos dados
    return this.auditService.findLgpdRelevant(userId);
  }

  async scheduleDataAnonymization(userId: string) {
    // Agendar anonimização após período de retenção
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() + 30);
    
    // Implementar lógica de agendamento
  }
}
```

## Troubleshooting

### Problemas Comuns

1. **Eventos não sendo processados**
   - Verificar configuração do Redis
   - Verificar se as filas estão ativas
   - Verificar logs de erro

2. **Performance degradada**
   - Ajustar `batchSize` na configuração
   - Verificar uso de memória
   - Considerar processamento assíncrono

3. **Dados sensíveis não sendo detectados**
   - Verificar configuração de `sensitiveFields`
   - Adicionar padrões regex personalizados
   - Usar decorator `@SensitiveData`

### Logs de Debug

```typescript
// Habilitar logs verbosos
process.env.AUDIT_VERBOSE = 'true';
process.env.AUDIT_LOG_LEVEL = 'debug';
```

## Roadmap

- [ ] Integração com Elasticsearch para busca avançada
- [ ] Dashboard web para visualização de métricas
- [ ] Exportação de relatórios em PDF/Excel
- [ ] Integração com sistemas de SIEM
- [ ] Suporte a múltiplos bancos de dados
- [ ] Criptografia de dados em repouso
- [ ] Auditoria de mudanças de schema
- [ ] Alertas em tempo real via webhook

## Contribuição

Para contribuir com o módulo de auditoria:

1. Siga os padrões de código estabelecidos
2. Adicione testes para novas funcionalidades
3. Atualize a documentação
4. Considere impacto na performance
5. Mantenha compatibilidade com LGPD

## Licença

Este módulo é parte do projeto PGBen e segue a mesma licença do projeto principal.
