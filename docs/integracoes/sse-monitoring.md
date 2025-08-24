# ⚠️ MIGRADO: Monitoramento SSE → Ably

## IMPORTANTE - SISTEMA DESCONTINUADO

> **Este documento é mantido apenas para referência histórica. O sistema SSE foi completamente substituído pelo Ably.**
> 
> **📋 Para monitoramento do Ably, consulte a documentação oficial:** [Ably Monitoring](https://ably.com/docs/general/statistics)

## ~~Visão Geral~~

~~Este documento descreve as estratégias de monitoramento, métricas e observabilidade para o sistema de notificações SSE (Server-Sent Events) do SEMTAS.~~

**MIGRAÇÃO CONCLUÍDA**: O monitoramento agora é feito através do dashboard do Ably, que oferece:
- ✅ Métricas em tempo real
- ✅ Alertas automáticos
- ✅ Histórico de conexões
- ✅ Análise de performance
- ✅ Logs detalhados

## Métricas Principais

### 1. Métricas de Conexão

```typescript
// Métricas básicas disponíveis via endpoint /v1/notificacao/sse/stats
{
  "totalConnections": 150,
  "activeUsers": 89,
  "connectionsPerUser": {
    "user-123": 2,
    "user-456": 1
  },
  "uptime": 3600000,
  "averageConnectionDuration": 1800000,
  "connectionRate": {
    "last1min": 5,
    "last5min": 23,
    "last15min": 67
  }
}
```

### 2. Métricas de Performance

- **Latência de Entrega**: Tempo entre criação da notificação e entrega via SSE
- **Taxa de Sucesso**: Percentual de notificações entregues com sucesso
- **Throughput**: Número de notificações enviadas por segundo
- **Uso de Memória**: Consumo de memória pelas conexões SSE

### 3. Métricas de Negócio

- **Notificações por Tipo**: Distribuição por categoria (info, warning, error, success)
- **Taxa de Leitura**: Percentual de notificações lidas pelos usuários
- **Tempo Médio de Leitura**: Tempo entre entrega e leitura da notificação
- **Usuários Ativos**: Número de usuários com conexões SSE ativas

## Configuração de Monitoramento

### 1. Application Insights (Azure)

```typescript
// src/config/monitoring.config.ts
import { ApplicationInsights } from '@azure/applicationinsights-web';

export const monitoringConfig = {
  applicationInsights: {
    instrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
    enableAutoRouteTracking: true,
    enableCorsCorrelation: true,
    enableRequestHeaderTracking: true,
    enableResponseHeaderTracking: true,
  },
  customMetrics: {
    sseConnections: 'sse_active_connections',
    notificationLatency: 'notification_delivery_latency',
    notificationThroughput: 'notification_throughput',
    connectionDuration: 'sse_connection_duration',
  },
};
```

### 2. Métricas Customizadas

```typescript
// src/modules/notificacao/services/monitoring.service.ts
import { Injectable } from '@nestjs/common';
import { TelemetryClient } from 'applicationinsights';

@Injectable()
export class MonitoringService {
  constructor(private telemetryClient: TelemetryClient) {}

  // Métricas de conexão SSE
  trackSSEConnection(userId: string, connectionId: string) {
    this.telemetryClient.trackEvent({
      name: 'SSE_Connection_Established',
      properties: {
        userId,
        connectionId,
        timestamp: new Date().toISOString(),
      },
    });

    this.telemetryClient.trackMetric({
      name: 'sse_active_connections',
      value: this.getActiveConnectionCount(),
    });
  }

  // Métricas de notificação
  trackNotificationDelivery(
    notificationId: string,
    userId: string,
    deliveryTime: number,
    success: boolean,
  ) {
    this.telemetryClient.trackEvent({
      name: 'Notification_Delivered',
      properties: {
        notificationId,
        userId,
        success: success.toString(),
        deliveryTime: deliveryTime.toString(),
      },
    });

    this.telemetryClient.trackMetric({
      name: 'notification_delivery_latency',
      value: deliveryTime,
    });
  }

  // Métricas de performance
  trackPerformanceMetrics() {
    const memoryUsage = process.memoryUsage();
    
    this.telemetryClient.trackMetric({
      name: 'memory_heap_used',
      value: memoryUsage.heapUsed,
    });

    this.telemetryClient.trackMetric({
      name: 'memory_heap_total',
      value: memoryUsage.heapTotal,
    });
  }

  // Alertas customizados
  trackAlert(alertType: string, message: string, severity: 'low' | 'medium' | 'high') {
    this.telemetryClient.trackTrace({
      message: `[${alertType}] ${message}`,
      severityLevel: this.getSeverityLevel(severity),
      properties: {
        alertType,
        severity,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private getSeverityLevel(severity: string) {
    const levels = {
      low: 1,
      medium: 2,
      high: 3,
    };
    return levels[severity] || 1;
  }
}
```

### 3. Health Checks

```typescript
// src/modules/notificacao/health/sse.health.ts
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { SseService } from '../services/sse.service';

@Injectable()
export class SseHealthIndicator extends HealthIndicator {
  constructor(private sseService: SseService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const stats = this.sseService.getConnectionStats();
      const isHealthy = this.checkSSEHealth(stats);

      if (isHealthy) {
        return this.getStatus(key, true, {
          totalConnections: stats.totalConnections,
          activeUsers: stats.activeUsers,
          uptime: stats.uptime,
        });
      }

      throw new HealthCheckError('SSE service is unhealthy', {
        totalConnections: stats.totalConnections,
        activeUsers: stats.activeUsers,
      });
    } catch (error) {
      throw new HealthCheckError('SSE service check failed', {
        error: error.message,
      });
    }
  }

  private checkSSEHealth(stats: any): boolean {
    // Verificações de saúde
    const maxConnections = 1000;
    const maxMemoryUsage = 500 * 1024 * 1024; // 500MB
    
    if (stats.totalConnections > maxConnections) {
      return false;
    }

    const memoryUsage = process.memoryUsage().heapUsed;
    if (memoryUsage > maxMemoryUsage) {
      return false;
    }

    return true;
  }
}
```

## Dashboards e Visualizações

### 1. Dashboard Principal

**Métricas em Tempo Real:**
- Conexões SSE ativas
- Usuários conectados
- Taxa de notificações por minuto
- Latência média de entrega
- Status de saúde do sistema

**Gráficos Recomendados:**
- Linha temporal de conexões ativas
- Distribuição de notificações por tipo
- Heatmap de atividade por hora
- Gráfico de latência (percentis 50, 95, 99)

### 2. Dashboard de Performance

**Métricas de Sistema:**
- Uso de CPU
- Uso de memória
- Latência de rede
- Taxa de erro

**Métricas de Aplicação:**
- Tempo de resposta da API
- Throughput de notificações
- Taxa de sucesso de entrega
- Duração média de conexões

### 3. Dashboard de Negócio

**Métricas de Usuário:**
- Usuários ativos por período
- Taxa de engajamento com notificações
- Padrões de uso por horário
- Efetividade das notificações

## Alertas e Notificações

### 1. Alertas Críticos

```yaml
# Configuração de alertas (Azure Monitor)
alerts:
  - name: "SSE High Connection Count"
    condition: "sse_active_connections > 800"
    severity: "High"
    action: "Email + SMS"
    
  - name: "SSE Service Down"
    condition: "sse_health_check == false"
    severity: "Critical"
    action: "Email + SMS + PagerDuty"
    
  - name: "High Notification Latency"
    condition: "notification_delivery_latency > 5000"
    severity: "Medium"
    action: "Email"
    
  - name: "Memory Usage High"
    condition: "memory_heap_used > 400MB"
    severity: "Medium"
    action: "Email"
```

### 2. Alertas de Negócio

```yaml
alerts:
  - name: "Low Notification Read Rate"
    condition: "notification_read_rate < 0.6"
    severity: "Low"
    action: "Email"
    
  - name: "Unusual Activity Pattern"
    condition: "connection_rate_change > 200%"
    severity: "Medium"
    action: "Email"
```

## Logs e Auditoria

### 1. Estrutura de Logs

```typescript
// Exemplo de log estruturado
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "service": "sse-service",
  "event": "connection_established",
  "userId": "user-123",
  "connectionId": "conn-456",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.100",
    "sessionId": "session-789"
  },
  "performance": {
    "connectionTime": 150,
    "memoryUsage": 45678912
  }
}
```

### 2. Auditoria LGPD

```typescript
// Logs específicos para compliance LGPD
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "event": "notification_sent",
  "userId": "user-123",
  "notificationId": "notif-456",
  "dataProcessing": {
    "purpose": "benefit_notification",
    "legalBasis": "legitimate_interest",
    "dataTypes": ["user_id", "notification_content"],
    "retention": "30_days"
  },
  "consent": {
    "given": true,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Ferramentas de Monitoramento

### 1. Azure Application Insights

**Configuração:**
```typescript
// app.module.ts
import { ApplicationInsightsModule } from '@azure/applicationinsights-web';

@Module({
  imports: [
    ApplicationInsightsModule.forRoot({
      instrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
      enableAutoRouteTracking: true,
    }),
  ],
})
export class AppModule {}
```

### 2. Prometheus + Grafana (Alternativa)

**Métricas Prometheus:**
```typescript
// src/modules/notificacao/metrics/prometheus.service.ts
import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class PrometheusService {
  private sseConnectionsGauge = new Gauge({
    name: 'sse_active_connections',
    help: 'Number of active SSE connections',
  });

  private notificationCounter = new Counter({
    name: 'notifications_sent_total',
    help: 'Total number of notifications sent',
    labelNames: ['type', 'status'],
  });

  private notificationLatencyHistogram = new Histogram({
    name: 'notification_delivery_duration_seconds',
    help: 'Notification delivery latency',
    buckets: [0.1, 0.5, 1, 2, 5],
  });

  updateSSEConnections(count: number) {
    this.sseConnectionsGauge.set(count);
  }

  incrementNotificationCounter(type: string, status: string) {
    this.notificationCounter.inc({ type, status });
  }

  observeNotificationLatency(duration: number) {
    this.notificationLatencyHistogram.observe(duration);
  }

  getMetrics() {
    return register.metrics();
  }
}
```

## Troubleshooting

### 1. Problemas Comuns

**Alta Latência:**
- Verificar carga do servidor
- Analisar queries do banco de dados
- Verificar conectividade de rede

**Conexões Perdidas:**
- Verificar configuração de proxy/load balancer
- Analisar logs de erro
- Verificar timeouts de rede

**Alto Uso de Memória:**
- Verificar limpeza de conexões inativas
- Analisar vazamentos de memória
- Verificar configuração de limits

### 2. Comandos de Diagnóstico

```bash
# Verificar status das conexões SSE
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/v1/notificacao/sse/stats

# Verificar health check
curl http://localhost:3000/v1/health

# Verificar métricas Prometheus
curl http://localhost:3000/metrics

# Logs em tempo real
docker logs -f pgben-server
```

## Melhores Práticas

### 1. Monitoramento Proativo

- Configure alertas antes dos problemas se tornarem críticos
- Monitore tendências, não apenas valores absolutos
- Use percentis para métricas de latência
- Implemente health checks abrangentes

### 2. Observabilidade

- Use logs estruturados com contexto adequado
- Implemente tracing distribuído para requests complexos
- Mantenha dashboards atualizados e relevantes
- Documente runbooks para cenários de incidente

### 3. Performance

- Monitore uso de recursos continuamente
- Implemente rate limiting adequado
- Use cache quando apropriado
- Otimize queries de banco de dados

### 4. Segurança

- Monitore tentativas de acesso não autorizado
- Implemente auditoria completa
- Use logs para compliance LGPD
- Monitore padrões anômalos de uso

## Conclusão

O monitoramento efetivo do sistema SSE é crucial para:

- **Disponibilidade**: Garantir que o serviço esteja sempre funcionando
- **Performance**: Manter latência baixa e throughput alto
- **Segurança**: Detectar e responder a ameaças
- **Compliance**: Atender requisitos LGPD e auditoria
- **Experiência do Usuário**: Garantir entrega confiável de notificações

Implemente as práticas descritas neste documento de forma incremental, priorizando as métricas mais críticas para o negócio.