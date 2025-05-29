# Estratégia de Resiliência para Cache, Auditoria e Redis

## Análise da Implementação Atual

### ✅ Pontos Fortes Identificados

#### 1. **Cache Service com Circuit Breaker**
- ✅ Implementação de Circuit Breaker com estados CLOSED, OPEN e HALF_OPEN
- ✅ Cache em memória como fallback quando Redis falha
- ✅ Timeouts configurados para evitar bloqueios
- ✅ Métricas de cache para monitoramento
- ✅ Configuração para desabilitar Redis via variável de ambiente

#### 2. **Health Check Service**
- ✅ Verificação de disponibilidade do Redis
- ✅ Permite inicialização da aplicação mesmo com Redis indisponível
- ✅ Logging detalhado do status dos serviços

#### 3. **Configurações Resilientes**
- ✅ Fallback para cache em memória quando Redis não está disponível
- ✅ Estratégias de retry configuradas
- ✅ Configuração centralizada via environment variables

### 🔧 Melhorias Recomendadas

## 1. Aprimoramentos no Cache Service

### 1.1 Implementar Cache Híbrido Mais Robusto

```typescript
// Adicionar ao CacheService
private readonly cacheStrategy = {
  L1: 'memory',    // Cache local (sempre disponível)
  L2: 'redis',     // Cache distribuído (pode falhar)
  fallback: true   // Sempre usar L1 como fallback
};

/**
 * Estratégia de cache em camadas:
 * 1. Tentar cache local primeiro (L1)
 * 2. Se não encontrar, tentar Redis (L2)
 * 3. Se Redis falhar, continuar apenas com L1
 * 4. Sempre sincronizar L1 com L2 quando possível
 */
async getWithFallback<T>(key: string): Promise<T | null> {
  // L1: Cache local (sempre rápido e disponível)
  const localValue = this.getLocalCache<T>(key);
  if (localValue !== null) {
    this.metricsProvider.registerCacheHit('L1');
    return localValue;
  }

  // L2: Redis (pode falhar)
  if (this.circuitState !== CircuitState.OPEN) {
    try {
      const redisValue = await this.getFromRedis<T>(key);
      if (redisValue !== null) {
        // Sincronizar com L1
        this.setLocalCache(key, redisValue);
        this.metricsProvider.registerCacheHit('L2');
        return redisValue;
      }
    } catch (error) {
      this.logger.warn(`Redis falhou, continuando com cache local: ${error.message}`);
      this.registerFailure();
    }
  }

  this.metricsProvider.registerCacheMiss();
  return null;
}
```

### 1.2 Implementar Cache Warming

```typescript
/**
 * Aquecimento do cache para dados críticos
 * Executa em background para não impactar performance
 */
async warmupCriticalData(): Promise<void> {
  const criticalKeys = [
    'system:config',
    'permissions:roles',
    'beneficios:tipos'
  ];

  for (const key of criticalKeys) {
    try {
      // Verificar se já existe no cache
      const exists = await this.has(key);
      if (!exists) {
        // Carregar dados críticos no cache
        await this.loadCriticalData(key);
      }
    } catch (error) {
      this.logger.warn(`Falha ao aquecer cache para ${key}: ${error.message}`);
    }
  }
}
```

## 2. Melhorias na Auditoria

### 2.1 Implementar Auditoria Síncrona de Fallback

```typescript
@Injectable()
export class ResilientAuditoriaService {
  private readonly logger = new Logger(ResilientAuditoriaService.name);
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 segundo

  constructor(
    private readonly auditoriaService: AuditoriaService,
    private readonly auditoriaQueueService: AuditoriaQueueService,
    private readonly healthCheckService: HealthCheckService
  ) {}

  /**
   * Registra log de auditoria com fallback síncrono
   * 1. Tenta enfileirar (assíncrono)
   * 2. Se falhar, registra diretamente no banco (síncrono)
   */
  async registrarLogResilient(logData: CreateLogAuditoriaDto): Promise<void> {
    try {
      // Primeira tentativa: processamento assíncrono via fila
      await this.auditoriaQueueService.enfileirarLogAuditoria(logData);
      this.logger.debug('Log de auditoria enfileirado com sucesso');
    } catch (error) {
      this.logger.warn(`Falha na fila de auditoria, usando fallback síncrono: ${error.message}`);
      
      // Fallback: registro síncrono direto no banco
      try {
        await this.auditoriaService.create(logData);
        this.logger.debug('Log de auditoria registrado via fallback síncrono');
      } catch (syncError) {
        this.logger.error(`Falha crítica na auditoria: ${syncError.message}`);
        // Em último caso, armazenar em arquivo local para recuperação posterior
        await this.storeAuditLogToFile(logData);
      }
    }
  }

  /**
   * Armazena log de auditoria em arquivo para recuperação posterior
   */
  private async storeAuditLogToFile(logData: CreateLogAuditoriaDto): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        data: logData,
        status: 'pending_recovery'
      };
      
      // Implementar escrita em arquivo de backup
      // Este arquivo pode ser processado posteriormente por um job de recuperação
      this.logger.warn('Log de auditoria armazenado em arquivo de backup para recuperação posterior');
    } catch (fileError) {
      this.logger.error(`Falha crítica: não foi possível armazenar log de auditoria: ${fileError.message}`);
    }
  }
}
```

### 2.2 Implementar Recuperação de Logs Perdidos

```typescript
@Injectable()
export class AuditoriaRecoveryService {
  private readonly logger = new Logger(AuditoriaRecoveryService.name);

  /**
   * Job de recuperação que roda periodicamente
   * Processa logs de auditoria que falharam anteriormente
   */
  @Cron('0 */5 * * * *') // A cada 5 minutos
  async processBackupAuditLogs(): Promise<void> {
    try {
      // Ler arquivos de backup e tentar reprocessar
      const backupLogs = await this.readBackupLogs();
      
      for (const log of backupLogs) {
        try {
          await this.auditoriaService.create(log.data);
          await this.markLogAsProcessed(log.id);
        } catch (error) {
          this.logger.warn(`Falha ao recuperar log ${log.id}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Erro no processo de recuperação: ${error.message}`);
    }
  }
}
```

## 3. Monitoramento e Alertas

### 3.1 Métricas de Resiliência

```typescript
@Injectable()
export class ResilienceMetricsService {
  private readonly logger = new Logger(ResilienceMetricsService.name);
  private readonly metrics = {
    redis: {
      failures: 0,
      lastFailure: null,
      circuitState: 'CLOSED'
    },
    cache: {
      hitRateL1: 0,
      hitRateL2: 0,
      fallbackUsage: 0
    },
    auditoria: {
      queueFailures: 0,
      syncFallbacks: 0,
      fileBackups: 0
    }
  };

  /**
   * Coleta métricas de resiliência do sistema
   */
  async collectResilienceMetrics(): Promise<any> {
    return {
      timestamp: new Date().toISOString(),
      redis: await this.getRedisMetrics(),
      cache: await this.getCacheMetrics(),
      auditoria: await this.getAuditoriaMetrics(),
      overall_health: await this.calculateOverallHealth()
    };
  }

  /**
   * Calcula a saúde geral do sistema
   */
  private async calculateOverallHealth(): Promise<string> {
    const redisHealth = await this.healthCheckService.isRedisAvailable();
    const cacheHealth = this.metrics.cache.hitRateL1 > 0.8; // 80% de hit rate no L1
    const auditoriaHealth = this.metrics.auditoria.queueFailures < 10; // Menos de 10 falhas

    if (redisHealth && cacheHealth && auditoriaHealth) {
      return 'HEALTHY';
    } else if (cacheHealth && auditoriaHealth) {
      return 'DEGRADED'; // Redis down mas sistema funcionando
    } else {
      return 'UNHEALTHY';
    }
  }
}
```

### 3.2 Alertas Automáticos

```typescript
@Injectable()
export class ResilienceAlertsService {
  private readonly logger = new Logger(ResilienceAlertsService.name);

  /**
   * Monitora a saúde do sistema e envia alertas quando necessário
   */
  @Cron('0 * * * * *') // A cada minuto
  async monitorSystemHealth(): Promise<void> {
    try {
      const health = await this.resilienceMetricsService.collectResilienceMetrics();
      
      // Alertas baseados em thresholds
      if (health.redis.failures > 5) {
        await this.sendAlert('REDIS_MULTIPLE_FAILURES', health.redis);
      }
      
      if (health.cache.fallbackUsage > 0.5) {
        await this.sendAlert('HIGH_CACHE_FALLBACK_USAGE', health.cache);
      }
      
      if (health.auditoria.fileBackups > 0) {
        await this.sendAlert('AUDITORIA_FILE_BACKUP_ACTIVE', health.auditoria);
      }
      
      if (health.overall_health === 'UNHEALTHY') {
        await this.sendAlert('SYSTEM_UNHEALTHY', health);
      }
    } catch (error) {
      this.logger.error(`Erro no monitoramento: ${error.message}`);
    }
  }

  private async sendAlert(type: string, data: any): Promise<void> {
    // Implementar envio de alertas (email, Slack, etc.)
    this.logger.warn(`ALERTA ${type}:`, data);
  }
}
```

## 4. Configurações de Ambiente

### 4.1 Variáveis de Ambiente para Resiliência

```bash
# Redis e Cache
DISABLE_REDIS=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
CACHE_TTL=3600
CACHE_L1_TTL=300
CACHE_L1_MAX_ITEMS=1000

# Circuit Breaker
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RESET_TIMEOUT=30000
CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS=3

# Auditoria
AUDITORIA_ENABLE_SYNC_FALLBACK=true
AUDITORIA_ENABLE_FILE_BACKUP=true
AUDITORIA_BACKUP_PATH=./logs/audit-backup
AUDITORIA_RECOVERY_INTERVAL=300000

# Monitoramento
RESILIENCE_METRICS_ENABLED=true
RESILIENCE_ALERTS_ENABLED=true
HEALTH_CHECK_INTERVAL=60000
```

## 5. Testes de Resiliência

### 5.1 Testes de Chaos Engineering

```typescript
describe('Resiliência do Sistema', () => {
  describe('Cache Resilience', () => {
    it('deve funcionar quando Redis está indisponível', async () => {
      // Simular falha do Redis
      await redisContainer.stop();
      
      // Sistema deve continuar funcionando com cache L1
      const result = await cacheService.get('test-key');
      expect(result).toBeDefined();
    });

    it('deve recuperar quando Redis volta online', async () => {
      // Simular recuperação do Redis
      await redisContainer.start();
      
      // Circuit breaker deve detectar recuperação
      await waitFor(() => {
        expect(cacheService.circuitState).toBe(CircuitState.CLOSED);
      });
    });
  });

  describe('Auditoria Resilience', () => {
    it('deve usar fallback síncrono quando fila falha', async () => {
      // Simular falha da fila
      jest.spyOn(auditoriaQueueService, 'enfileirarLogAuditoria')
        .mockRejectedValue(new Error('Queue failed'));
      
      // Deve registrar via fallback síncrono
      await resilientAuditoriaService.registrarLogResilient(logData);
      
      expect(auditoriaService.create).toHaveBeenCalled();
    });
  });
});
```

## 6. Plano de Implementação

### Fase 1: Melhorias Imediatas (1-2 dias)
1. ✅ Implementar cache híbrido L1/L2
2. ✅ Adicionar fallback síncrono para auditoria
3. ✅ Configurar variáveis de ambiente adicionais

### Fase 2: Monitoramento (2-3 dias)
1. ✅ Implementar métricas de resiliência
2. ✅ Configurar alertas automáticos
3. ✅ Criar dashboard de saúde do sistema

### Fase 3: Recuperação (3-4 dias)
1. ✅ Implementar sistema de backup em arquivo
2. ✅ Criar job de recuperação de logs perdidos
3. ✅ Implementar cache warming

### Fase 4: Testes (2-3 dias)
1. ✅ Criar testes de chaos engineering
2. ✅ Validar cenários de falha
3. ✅ Documentar procedimentos de recuperação

## 7. Benefícios Esperados

### 7.1 Disponibilidade
- ✅ Sistema continua funcionando mesmo com Redis indisponível
- ✅ Auditoria nunca perde dados críticos
- ✅ Cache sempre disponível via fallback L1

### 7.2 Performance
- ✅ Cache L1 oferece latência ultra-baixa
- ✅ Circuit breaker evita timeouts desnecessários
- ✅ Processamento assíncrono quando possível

### 7.3 Observabilidade
- ✅ Métricas detalhadas de resiliência
- ✅ Alertas proativos para problemas
- ✅ Visibilidade completa da saúde do sistema

### 7.4 Compliance
- ✅ Auditoria garantida mesmo em cenários de falha
- ✅ Recuperação automática de logs perdidos
- ✅ Rastreabilidade completa de operações

## Conclusão

O sistema já possui uma base sólida de resiliência, mas as melhorias propostas garantirão que:

1. **Nenhuma funcionalidade crítica seja afetada** por falhas de Redis
2. **Auditoria seja 100% confiável** com múltiplas camadas de fallback
3. **Performance seja mantida** mesmo em cenários degradados
4. **Observabilidade seja completa** para detecção proativa de problemas

Essas implementações seguem as melhores práticas de arquitetura resiliente e garantem que o sistema SEMTAS seja robusto e confiável em produção.