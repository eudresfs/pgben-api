import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SseHealthCheckService } from './sse-health-check.service';
import { SseCircuitBreakerService } from './sse-circuit-breaker.service';
import { SseStructuredLoggingService, LogLevel, SseLogCategory } from './sse-structured-logging.service';

/**
 * Níveis de degradação do sistema
 */
export enum DegradationLevel {
  /** Sistema funcionando normalmente */
  NORMAL = 'normal',
  /** Degradação leve - algumas funcionalidades reduzidas */
  LIGHT = 'light',
  /** Degradação moderada - funcionalidades essenciais apenas */
  MODERATE = 'moderate',
  /** Degradação severa - modo de sobrevivência */
  SEVERE = 'severe',
  /** Sistema crítico - apenas operações essenciais */
  CRITICAL = 'critical',
}

/**
 * Estratégias de fallback
 */
export enum FallbackStrategy {
  /** Usar cache local */
  LOCAL_CACHE = 'local_cache',
  /** Usar dados estáticos */
  STATIC_DATA = 'static_data',
  /** Polling em vez de SSE */
  POLLING = 'polling',
  /** Notificações simplificadas */
  SIMPLIFIED_NOTIFICATIONS = 'simplified_notifications',
  /** Desabilitar funcionalidade */
  DISABLE_FEATURE = 'disable_feature',
  /** Usar backup service */
  BACKUP_SERVICE = 'backup_service',
}

/**
 * Configuração de degradação
 */
export interface DegradationConfig {
  /** Habilitar degradação automática */
  enableAutoDegradation: boolean;
  /** Intervalo de verificação em ms */
  checkInterval: number;
  /** Limites para cada nível de degradação */
  thresholds: {
    light: DegradationThreshold;
    moderate: DegradationThreshold;
    severe: DegradationThreshold;
    critical: DegradationThreshold;
  };
  /** Estratégias de fallback por funcionalidade */
  fallbackStrategies: Record<string, FallbackStrategy[]>;
  /** Tempo de recuperação em ms */
  recoveryTime: number;
  /** Habilitar notificações de degradação */
  enableDegradationNotifications: boolean;
}

/**
 * Limites para degradação
 */
export interface DegradationThreshold {
  /** Porcentagem de erros máxima */
  errorRate: number;
  /** Tempo de resposta máximo em ms */
  responseTime: number;
  /** Uso de memória máximo em % */
  memoryUsage: number;
  /** Uso de CPU máximo em % */
  cpuUsage: number;
  /** Número mínimo de conexões saudáveis */
  healthyConnections: number;
  /** Taxa de sucesso mínima em % */
  successRate: number;
}

/**
 * Status de degradação
 */
export interface DegradationStatus {
  /** Nível atual de degradação */
  currentLevel: DegradationLevel;
  /** Nível anterior */
  previousLevel: DegradationLevel;
  /** Timestamp da última mudança */
  lastChange: Date;
  /** Motivo da degradação */
  reason: string;
  /** Funcionalidades afetadas */
  affectedFeatures: string[];
  /** Estratégias ativas */
  activeStrategies: Record<string, FallbackStrategy>;
  /** Métricas que causaram a degradação */
  triggerMetrics: Record<string, number>;
  /** Tempo estimado para recuperação */
  estimatedRecoveryTime?: Date;
}

/**
 * Funcionalidade do sistema
 */
export interface SystemFeature {
  /** Nome da funcionalidade */
  name: string;
  /** Descrição */
  description: string;
  /** Prioridade (1-10, 10 = crítica) */
  priority: number;
  /** Estratégias de fallback disponíveis */
  availableStrategies: FallbackStrategy[];
  /** Estratégia atual */
  currentStrategy?: FallbackStrategy;
  /** Status da funcionalidade */
  status: 'active' | 'degraded' | 'disabled';
  /** Dependências */
  dependencies: string[];
}

/**
 * Métricas de degradação
 */
export interface DegradationMetrics {
  /** Tempo total em cada nível */
  timeInLevels: Record<DegradationLevel, number>;
  /** Número de degradações por tipo */
  degradationsByType: Record<string, number>;
  /** Tempo médio de recuperação */
  averageRecoveryTime: number;
  /** Taxa de sucesso de recuperação */
  recoverySuccessRate: number;
  /** Funcionalidades mais afetadas */
  mostAffectedFeatures: Array<{ feature: string; count: number }>;
}

/**
 * Serviço de degradação gradual para o sistema SSE
 */
@Injectable()
export class SseGracefulDegradationService {
  private readonly logger = new Logger(SseGracefulDegradationService.name);
  private readonly config: DegradationConfig;
  private currentStatus: DegradationStatus;
  private readonly features = new Map<string, SystemFeature>();
  private readonly degradationHistory: DegradationStatus[] = [];
  private checkIntervalId?: NodeJS.Timeout;
  private readonly metrics: DegradationMetrics;

  constructor(
    private readonly configService: ConfigService,
    private readonly healthCheckService: SseHealthCheckService,
    private readonly circuitBreakerService: SseCircuitBreakerService,
    private readonly loggingService: SseStructuredLoggingService,
  ) {
    this.config = {
      enableAutoDegradation: this.configService.get<boolean>('SSE_ENABLE_AUTO_DEGRADATION', true),
      checkInterval: this.configService.get<number>('SSE_DEGRADATION_CHECK_INTERVAL', 30000),
      thresholds: {
        light: {
          errorRate: 5,
          responseTime: 2000,
          memoryUsage: 70,
          cpuUsage: 70,
          healthyConnections: 80,
          successRate: 95,
        },
        moderate: {
          errorRate: 10,
          responseTime: 5000,
          memoryUsage: 80,
          cpuUsage: 80,
          healthyConnections: 60,
          successRate: 90,
        },
        severe: {
          errorRate: 20,
          responseTime: 10000,
          memoryUsage: 90,
          cpuUsage: 90,
          healthyConnections: 40,
          successRate: 80,
        },
        critical: {
          errorRate: 50,
          responseTime: 30000,
          memoryUsage: 95,
          cpuUsage: 95,
          healthyConnections: 20,
          successRate: 60,
        },
      },
      fallbackStrategies: {
        'sse-notifications': [FallbackStrategy.POLLING, FallbackStrategy.SIMPLIFIED_NOTIFICATIONS],
        'real-time-updates': [FallbackStrategy.LOCAL_CACHE, FallbackStrategy.POLLING],
        'user-presence': [FallbackStrategy.STATIC_DATA, FallbackStrategy.DISABLE_FEATURE],
        'file-uploads': [FallbackStrategy.LOCAL_CACHE, FallbackStrategy.BACKUP_SERVICE],
        'database-operations': [FallbackStrategy.LOCAL_CACHE, FallbackStrategy.STATIC_DATA],
        'redis-operations': [FallbackStrategy.LOCAL_CACHE, FallbackStrategy.DISABLE_FEATURE],
      },
      recoveryTime: this.configService.get<number>('SSE_DEGRADATION_RECOVERY_TIME', 300000),
      enableDegradationNotifications: this.configService.get<boolean>('SSE_ENABLE_DEGRADATION_NOTIFICATIONS', true),
    };

    this.currentStatus = {
      currentLevel: DegradationLevel.NORMAL,
      previousLevel: DegradationLevel.NORMAL,
      lastChange: new Date(),
      reason: 'Sistema inicializado',
      affectedFeatures: [],
      activeStrategies: {},
      triggerMetrics: {},
    };

    this.metrics = {
      timeInLevels: {
        [DegradationLevel.NORMAL]: 0,
        [DegradationLevel.LIGHT]: 0,
        [DegradationLevel.MODERATE]: 0,
        [DegradationLevel.SEVERE]: 0,
        [DegradationLevel.CRITICAL]: 0,
      },
      degradationsByType: {},
      averageRecoveryTime: 0,
      recoverySuccessRate: 100,
      mostAffectedFeatures: [],
    };

    this.initializeFeatures();
    this.startMonitoring();

    this.loggingService.logConnection(LogLevel.INFO, 'SseGracefulDegradationService inicializado', {
      component: 'graceful-degradation',
      /* metadata: { config: this.config }, */
    });
  }

  /**
   * Obtém o status atual de degradação
   */
  getCurrentStatus(): DegradationStatus {
    return { ...this.currentStatus };
  }

  /**
   * Força uma mudança de nível de degradação
   */
  async forceDegradationLevel(
    level: DegradationLevel,
    reason: string,
  ): Promise<void> {
    this.loggingService.logConnection(LogLevel.WARN, `Degradação forçada para nível ${level}`, {
      component: 'graceful-degradation',
      operation: 'force-degradation',
      metadata: { level, reason },
    });

    await this.changeDegradationLevel(level, reason, {});
  }

  /**
   * Tenta recuperar o sistema para o nível normal
   */
  async attemptRecovery(): Promise<boolean> {
    this.loggingService.logConnection(LogLevel.INFO, 'Tentando recuperação do sistema', {
      component: 'graceful-degradation',
      operation: 'attempt-recovery',
      metadata: { currentLevel: this.currentStatus.currentLevel },
    });

    const healthStatus = await this.healthCheckService.checkHealth();
    
    if (healthStatus.healthy) {
      await this.changeDegradationLevel(DegradationLevel.NORMAL, 'Recuperação automática', {});
      return true;
    }

    return false;
  }

  /**
   * Obtém funcionalidade por nome
   */
  getFeature(name: string): SystemFeature | undefined {
    return this.features.get(name);
  }

  /**
   * Lista todas as funcionalidades
   */
  getAllFeatures(): SystemFeature[] {
    return Array.from(this.features.values());
  }

  /**
   * Verifica se uma funcionalidade está disponível
   */
  isFeatureAvailable(featureName: string): boolean {
    const feature = this.features.get(featureName);
    return feature?.status === 'active';
  }

  /**
   * Obtém a estratégia de fallback ativa para uma funcionalidade
   */
  getActiveStrategy(featureName: string): FallbackStrategy | undefined {
    return this.currentStatus.activeStrategies[featureName];
  }

  /**
   * Obtém métricas de degradação
   */
  getDegradationMetrics(): DegradationMetrics {
    return { ...this.metrics };
  }

  /**
   * Obtém histórico de degradações
   */
  getDegradationHistory(limit: number = 50): DegradationStatus[] {
    return this.degradationHistory.slice(-limit);
  }

  /**
   * Para o monitoramento automático
   */
  stopMonitoring(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = undefined;
      this.loggingService.logConnection(LogLevel.INFO, 'Monitoramento de degradação parado', {
        component: 'graceful-degradation',
        operation: 'stop-monitoring',
      });
    }
  }

  /**
   * Reinicia o monitoramento automático
   */
  startMonitoring(): void {
    if (!this.config.enableAutoDegradation) {
      return;
    }

    this.stopMonitoring();
    
    this.checkIntervalId = setInterval(async () => {
      try {
        await this.checkSystemHealth();
      } catch (error) {
        this.loggingService.logError(error as Error, {
          component: 'graceful-degradation',
          operation: 'health-check',
        });
      }
    }, this.config.checkInterval);

    this.loggingService.logConnection(LogLevel.INFO, 'Monitoramento de degradação iniciado', {
      component: 'graceful-degradation',
      operation: 'start-monitoring',
      metadata: { interval: this.config.checkInterval },
    });
  }

  /**
   * Inicializa as funcionalidades do sistema
   */
  private initializeFeatures(): void {
    const features: SystemFeature[] = [
      {
        name: 'sse-notifications',
        description: 'Notificações em tempo real via SSE',
        priority: 9,
        availableStrategies: [FallbackStrategy.POLLING, FallbackStrategy.SIMPLIFIED_NOTIFICATIONS],
        status: 'active',
        dependencies: ['redis-operations', 'database-operations'],
      },
      {
        name: 'real-time-updates',
        description: 'Atualizações em tempo real de dados',
        priority: 8,
        availableStrategies: [FallbackStrategy.LOCAL_CACHE, FallbackStrategy.POLLING],
        status: 'active',
        dependencies: ['database-operations'],
      },
      {
        name: 'user-presence',
        description: 'Detecção de presença de usuários',
        priority: 5,
        availableStrategies: [FallbackStrategy.STATIC_DATA, FallbackStrategy.DISABLE_FEATURE],
        status: 'active',
        dependencies: ['redis-operations'],
      },
      {
        name: 'file-uploads',
        description: 'Upload de arquivos',
        priority: 7,
        availableStrategies: [FallbackStrategy.LOCAL_CACHE, FallbackStrategy.BACKUP_SERVICE],
        status: 'active',
        dependencies: [],
      },
      {
        name: 'database-operations',
        description: 'Operações de banco de dados',
        priority: 10,
        availableStrategies: [FallbackStrategy.LOCAL_CACHE, FallbackStrategy.STATIC_DATA],
        status: 'active',
        dependencies: [],
      },
      {
        name: 'redis-operations',
        description: 'Operações do Redis',
        priority: 8,
        availableStrategies: [FallbackStrategy.LOCAL_CACHE, FallbackStrategy.DISABLE_FEATURE],
        status: 'active',
        dependencies: [],
      },
    ];

    features.forEach(feature => {
      this.features.set(feature.name, feature);
    });
  }

  /**
   * Verifica a saúde do sistema e ajusta o nível de degradação
   */
  private async checkSystemHealth(): Promise<void> {
    const healthStatus = await this.healthCheckService.checkHealth();
    const circuitBreakerMetrics = this.circuitBreakerService.getAllCircuitBreakerMetrics();
    
    // Calcular métricas agregadas
    const metrics = this.calculateAggregatedMetrics(healthStatus, circuitBreakerMetrics);
    
    // Determinar nível de degradação necessário
    const requiredLevel = this.determineDegradationLevel(metrics);
    
    // Aplicar mudança se necessário
    if (requiredLevel !== this.currentStatus.currentLevel) {
      const reason = this.generateDegradationReason(metrics, requiredLevel);
      await this.changeDegradationLevel(requiredLevel, reason, metrics);
    }
  }

  /**
   * Calcula métricas agregadas do sistema
   */
  private calculateAggregatedMetrics(
    healthStatus: any,
    circuitBreakerMetrics: any,
  ): Record<string, number> {
    const metrics: Record<string, number> = {};

    // Calcular taxa de erro baseada nos circuit breakers
    const totalRequests = Object.values(circuitBreakerMetrics).reduce(
      (sum: number, cb: any) => sum + (cb.totalRequests || 0),
      0,
    ) as number;
    const totalFailures = Object.values(circuitBreakerMetrics).reduce(
      (sum: number, cb: any) => sum + (cb.failures || 0),
      0,
    ) as number;
    
    metrics.errorRate = totalRequests > 0 ? (totalFailures / totalRequests) * 100 : 0;
    
    // Usar métricas do health check
    metrics.responseTime = healthStatus.responseTime || 0;
    metrics.memoryUsage = healthStatus.components?.memory?.details?.usagePercentage || 0;
    metrics.cpuUsage = healthStatus.components?.system?.details?.cpuUsage || 0;
    
    // Calcular conexões saudáveis (simulado)
    const healthyComponents = Object.values(healthStatus.components || {})
      .filter((comp: any) => comp.status === 'healthy').length;
    const totalComponents = Object.keys(healthStatus.components || {}).length;
    
    metrics.healthyConnections = totalComponents > 0 ? (healthyComponents / totalComponents) * 100 : 100;
    
    // Calcular taxa de sucesso
    metrics.successRate = 100 - metrics.errorRate;

    return metrics;
  }

  /**
   * Determina o nível de degradação baseado nas métricas
   */
  private determineDegradationLevel(metrics: Record<string, number>): DegradationLevel {
    const { thresholds } = this.config;

    // Verificar nível crítico
    if (
      metrics.errorRate >= thresholds.critical.errorRate ||
      metrics.responseTime >= thresholds.critical.responseTime ||
      metrics.memoryUsage >= thresholds.critical.memoryUsage ||
      metrics.cpuUsage >= thresholds.critical.cpuUsage ||
      metrics.healthyConnections <= thresholds.critical.healthyConnections ||
      metrics.successRate <= thresholds.critical.successRate
    ) {
      return DegradationLevel.CRITICAL;
    }

    // Verificar nível severo
    if (
      metrics.errorRate >= thresholds.severe.errorRate ||
      metrics.responseTime >= thresholds.severe.responseTime ||
      metrics.memoryUsage >= thresholds.severe.memoryUsage ||
      metrics.cpuUsage >= thresholds.severe.cpuUsage ||
      metrics.healthyConnections <= thresholds.severe.healthyConnections ||
      metrics.successRate <= thresholds.severe.successRate
    ) {
      return DegradationLevel.SEVERE;
    }

    // Verificar nível moderado
    if (
      metrics.errorRate >= thresholds.moderate.errorRate ||
      metrics.responseTime >= thresholds.moderate.responseTime ||
      metrics.memoryUsage >= thresholds.moderate.memoryUsage ||
      metrics.cpuUsage >= thresholds.moderate.cpuUsage ||
      metrics.healthyConnections <= thresholds.moderate.healthyConnections ||
      metrics.successRate <= thresholds.moderate.successRate
    ) {
      return DegradationLevel.MODERATE;
    }

    // Verificar nível leve
    if (
      metrics.errorRate >= thresholds.light.errorRate ||
      metrics.responseTime >= thresholds.light.responseTime ||
      metrics.memoryUsage >= thresholds.light.memoryUsage ||
      metrics.cpuUsage >= thresholds.light.cpuUsage ||
      metrics.healthyConnections <= thresholds.light.healthyConnections ||
      metrics.successRate <= thresholds.light.successRate
    ) {
      return DegradationLevel.LIGHT;
    }

    return DegradationLevel.NORMAL;
  }

  /**
   * Gera motivo da degradação baseado nas métricas
   */
  private generateDegradationReason(
    metrics: Record<string, number>,
    level: DegradationLevel,
  ): string {
    const issues: string[] = [];
    const threshold = this.config.thresholds[level as keyof typeof this.config.thresholds];

    if (metrics.errorRate >= threshold.errorRate) {
      issues.push(`Taxa de erro alta: ${metrics.errorRate.toFixed(1)}%`);
    }
    if (metrics.responseTime >= threshold.responseTime) {
      issues.push(`Tempo de resposta alto: ${metrics.responseTime}ms`);
    }
    if (metrics.memoryUsage >= threshold.memoryUsage) {
      issues.push(`Uso de memória alto: ${metrics.memoryUsage.toFixed(1)}%`);
    }
    if (metrics.cpuUsage >= threshold.cpuUsage) {
      issues.push(`Uso de CPU alto: ${metrics.cpuUsage.toFixed(1)}%`);
    }
    if (metrics.healthyConnections <= threshold.healthyConnections) {
      issues.push(`Poucas conexões saudáveis: ${metrics.healthyConnections.toFixed(1)}%`);
    }
    if (metrics.successRate <= threshold.successRate) {
      issues.push(`Taxa de sucesso baixa: ${metrics.successRate.toFixed(1)}%`);
    }

    return issues.length > 0 ? issues.join(', ') : `Sistema degradado para nível ${level}`;
  }

  /**
   * Muda o nível de degradação e aplica estratégias
   */
  private async changeDegradationLevel(
    newLevel: DegradationLevel,
    reason: string,
    triggerMetrics: Record<string, number>,
  ): Promise<void> {
    const previousLevel = this.currentStatus.currentLevel;
    const now = new Date();

    // Atualizar métricas de tempo
    const timeInPreviousLevel = now.getTime() - this.currentStatus.lastChange.getTime();
    this.metrics.timeInLevels[previousLevel] += timeInPreviousLevel;

    // Aplicar estratégias de fallback
    const { affectedFeatures, activeStrategies } = await this.applyFallbackStrategies(newLevel);

    // Atualizar status
    this.currentStatus = {
      currentLevel: newLevel,
      previousLevel,
      lastChange: now,
      reason,
      affectedFeatures,
      activeStrategies,
      triggerMetrics,
      estimatedRecoveryTime: newLevel !== DegradationLevel.NORMAL 
        ? new Date(now.getTime() + this.config.recoveryTime)
        : undefined,
    };

    // Adicionar ao histórico
    this.degradationHistory.push({ ...this.currentStatus });
    
    // Manter apenas os últimos 100 registros
    if (this.degradationHistory.length > 100) {
      this.degradationHistory.shift();
    }

    // Log da mudança
    this.loggingService.logConnection(
      newLevel === DegradationLevel.NORMAL ? LogLevel.INFO : LogLevel.WARN,
      `Nível de degradação alterado: ${previousLevel} → ${newLevel}`,
      {
        component: 'graceful-degradation',
        operation: 'level-change',
        metadata: {
          previousLevel,
          newLevel,
          reason,
          affectedFeatures,
          triggerMetrics,
        },
      },
    );

    // Notificar mudança se habilitado
    if (this.config.enableDegradationNotifications) {
      await this.notifyDegradationChange(previousLevel, newLevel, reason);
    }
  }

  /**
   * Aplica estratégias de fallback baseadas no nível de degradação
   */
  private async applyFallbackStrategies(
    level: DegradationLevel,
  ): Promise<{ affectedFeatures: string[]; activeStrategies: Record<string, FallbackStrategy> }> {
    const affectedFeatures: string[] = [];
    const activeStrategies: Record<string, FallbackStrategy> = {};

    for (const [featureName, feature] of this.features.entries()) {
      const shouldDegrade = this.shouldDegradeFeature(feature, level);
      
      if (shouldDegrade) {
        const strategy = this.selectFallbackStrategy(feature, level);
        
        if (strategy) {
          affectedFeatures.push(featureName);
          activeStrategies[featureName] = strategy;
          
          // Atualizar status da funcionalidade
          feature.currentStrategy = strategy;
          feature.status = strategy === FallbackStrategy.DISABLE_FEATURE ? 'disabled' : 'degraded';
        }
      } else {
        // Restaurar funcionalidade se estava degradada
        if (feature.status !== 'active') {
          feature.currentStrategy = undefined;
          feature.status = 'active';
        }
      }
    }

    return { affectedFeatures, activeStrategies };
  }

  /**
   * Determina se uma funcionalidade deve ser degradada
   */
  private shouldDegradeFeature(feature: SystemFeature, level: DegradationLevel): boolean {
    switch (level) {
      case DegradationLevel.NORMAL:
        return false;
      case DegradationLevel.LIGHT:
        return feature.priority <= 5;
      case DegradationLevel.MODERATE:
        return feature.priority <= 7;
      case DegradationLevel.SEVERE:
        return feature.priority <= 8;
      case DegradationLevel.CRITICAL:
        return feature.priority <= 9;
      default:
        return false;
    }
  }

  /**
   * Seleciona estratégia de fallback para uma funcionalidade
   */
  private selectFallbackStrategy(
    feature: SystemFeature,
    level: DegradationLevel,
  ): FallbackStrategy | undefined {
    const strategies = feature.availableStrategies;
    
    if (strategies.length === 0) {
      return undefined;
    }

    // Selecionar estratégia baseada no nível de degradação
    switch (level) {
      case DegradationLevel.LIGHT:
      case DegradationLevel.MODERATE:
        return strategies[0]; // Primeira estratégia (menos drástica)
      case DegradationLevel.SEVERE:
        return strategies[Math.min(1, strategies.length - 1)];
      case DegradationLevel.CRITICAL:
        return strategies[strategies.length - 1]; // Última estratégia (mais drástica)
      default:
        return strategies[0];
    }
  }

  /**
   * Notifica mudança de degradação
   */
  private async notifyDegradationChange(
    previousLevel: DegradationLevel,
    newLevel: DegradationLevel,
    reason: string,
  ): Promise<void> {
    // Implementar notificação (email, webhook, etc.)
    this.loggingService.logConnection(LogLevel.INFO, 'Notificação de degradação enviada', {
      component: 'graceful-degradation',
      operation: 'notify-change',
      metadata: { previousLevel, newLevel, reason },
    });
  }
}