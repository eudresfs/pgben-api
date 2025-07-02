import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { interval, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  SseConnection,
  HeartbeatEvent,
  HeartbeatResponse,
  AdaptiveHeartbeatConfig,
} from '../interfaces/sse-notification.interface';
import { SseConfig, SSE_CONFIG } from '../../../config/sse.config';

/**
 * Serviço de Heartbeat Adaptativo para SSE
 *
 * Responsável por:
 * - Gerenciar heartbeats bidirecionais
 * - Detectar conexões mortas
 * - Adaptar intervalos de heartbeat baseado na latência
 * - Monitorar saúde das conexões
 */
@Injectable()
export class SseHeartbeatService implements OnModuleDestroy {
  private readonly logger = new Logger(SseHeartbeatService.name);
  private readonly destroy$ = new Subject<void>();
  private heartbeatSubscriptions = new Map<string, Subscription>();
  private deadConnectionCheckSubscription?: Subscription;
  private heartbeatSequences = new Map<string, number>();
  private pendingHeartbeats = new Map<
    string,
    { timestamp: Date; sequence: number }
  >();

  constructor(@Inject(SSE_CONFIG) private readonly sseConfig: SseConfig) {
    this.startDeadConnectionDetection();
  }

  /**
   * Inicia o heartbeat para uma conexão específica
   */
  startHeartbeat(
    connectionId: string,
    connection: SseConnection,
    heartbeatCallback: (event: HeartbeatEvent) => void,
  ): void {
    // Parar heartbeat existente se houver
    this.stopHeartbeat(connectionId);

    // Inicializar configuração de heartbeat adaptativo
    const heartbeatConfig = this.initializeHeartbeatConfig(connection);
    connection.heartbeatConfig = heartbeatConfig;
    connection.currentHeartbeatInterval = heartbeatConfig.baseInterval;
    connection.missedHeartbeats = 0;
    connection.latencyHistory = [];
    connection.lastActivity = new Date();

    // Inicializar sequência de heartbeat
    this.heartbeatSequences.set(connectionId, 0);

    this.logger.debug(
      `Iniciando heartbeat para conexão ${connectionId} com intervalo ${heartbeatConfig.baseInterval}ms`,
    );

    // Criar observable de heartbeat com intervalo adaptativo
    const heartbeatSubscription = interval(connection.currentHeartbeatInterval!)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.sendHeartbeat(connectionId, connection, heartbeatCallback);
      });

    this.heartbeatSubscriptions.set(connectionId, heartbeatSubscription);
  }

  /**
   * Para o heartbeat de uma conexão
   */
  stopHeartbeat(connectionId: string): void {
    const subscription = this.heartbeatSubscriptions.get(connectionId);
    if (subscription) {
      subscription.unsubscribe();
      this.heartbeatSubscriptions.delete(connectionId);
    }

    this.heartbeatSequences.delete(connectionId);
    this.pendingHeartbeats.delete(connectionId);

    this.logger.debug(`Heartbeat parado para conexão ${connectionId}`);
  }

  /**
   * Processa resposta de heartbeat do cliente
   */
  processHeartbeatResponse(
    connectionId: string,
    connection: SseConnection,
    response: HeartbeatResponse,
  ): void {
    const pendingHeartbeat = this.pendingHeartbeats.get(connectionId);
    if (
      !pendingHeartbeat ||
      pendingHeartbeat.sequence !== response.originalSequence
    ) {
      this.logger.warn(
        `Resposta de heartbeat inválida ou atrasada para conexão ${connectionId}`,
      );
      return;
    }

    // Calcular latência
    const latency = Date.now() - pendingHeartbeat.timestamp.getTime();

    // Atualizar estatísticas da conexão
    this.updateConnectionStats(connection, latency);

    // Adaptar intervalo de heartbeat baseado na latência
    this.adaptHeartbeatInterval(connectionId, connection, latency);

    // Remover heartbeat pendente
    this.pendingHeartbeats.delete(connectionId);

    // Resetar contador de heartbeats perdidos
    connection.missedHeartbeats = 0;
    connection.lastHeartbeatResponse = new Date();
    connection.lastActivity = new Date();

    this.logger.debug(
      `Heartbeat respondido para conexão ${connectionId}: latência ${latency}ms, ` +
        `intervalo atual ${connection.currentHeartbeatInterval}ms`,
    );
  }

  /**
   * Verifica se uma conexão está morta
   */
  isConnectionDead(connection: SseConnection): boolean {
    if (!this.sseConfig.deadConnectionDetection.enabled) {
      return false;
    }

    const now = new Date();
    const lastActivity = connection.lastActivity || connection.connectedAt;
    const timeSinceLastActivity = now.getTime() - lastActivity.getTime();

    // Verificar timeout de atividade
    if (
      timeSinceLastActivity > this.sseConfig.deadConnectionDetection.timeout
    ) {
      return true;
    }

    // Verificar heartbeats perdidos
    const maxMissed =
      connection.heartbeatConfig?.maxMissedHeartbeats ||
      this.sseConfig.adaptiveHeartbeat.maxMissedHeartbeats;

    return (connection.missedHeartbeats || 0) >= maxMissed;
  }

  /**
   * Obtém estatísticas de heartbeat para uma conexão
   */
  getConnectionHeartbeatStats(connection: SseConnection): {
    averageLatency: number;
    currentInterval: number;
    missedHeartbeats: number;
    isDead: boolean;
  } {
    return {
      averageLatency: connection.averageLatency || 0,
      currentInterval:
        connection.currentHeartbeatInterval || this.sseConfig.heartbeatInterval,
      missedHeartbeats: connection.missedHeartbeats || 0,
      isDead: connection.isDead || false,
    };
  }

  /**
   * Envia heartbeat para o cliente
   */
  private sendHeartbeat(
    connectionId: string,
    connection: SseConnection,
    heartbeatCallback: (event: HeartbeatEvent) => void,
  ): void {
    // Verificar se conexão está morta
    if (this.isConnectionDead(connection)) {
      this.logger.warn(
        `Conexão ${connectionId} detectada como morta, parando heartbeat`,
      );
      connection.isDead = true;
      this.stopHeartbeat(connectionId);
      return;
    }

    // Verificar heartbeat pendente (não respondido)
    const pendingHeartbeat = this.pendingHeartbeats.get(connectionId);
    if (pendingHeartbeat) {
      const responseTimeout =
        connection.heartbeatConfig?.responseTimeout ||
        this.sseConfig.adaptiveHeartbeat.responseTimeout;

      if (Date.now() - pendingHeartbeat.timestamp.getTime() > responseTimeout) {
        // Heartbeat anterior não foi respondido
        connection.missedHeartbeats = (connection.missedHeartbeats || 0) + 1;
        this.logger.warn(
          `Heartbeat não respondido para conexão ${connectionId} ` +
            `(${connection.missedHeartbeats} perdidos)`,
        );

        // Aumentar intervalo de heartbeat como penalidade
        this.increaseHeartbeatInterval(connectionId, connection);
      }
    }

    // Gerar próximo número sequencial
    const sequence = this.getNextHeartbeatSequence(connectionId);

    // Criar evento de heartbeat
    const heartbeatEvent: HeartbeatEvent = {
      type: 'heartbeat',
      timestamp: new Date(),
      connectionId,
      direction: 'server_to_client',
      sequence,
      lastEventId: connection.lastEventId,
    };

    // Registrar heartbeat pendente
    this.pendingHeartbeats.set(connectionId, {
      timestamp: heartbeatEvent.timestamp,
      sequence,
    });

    // Enviar heartbeat
    heartbeatCallback(heartbeatEvent);

    connection.lastHeartbeat = new Date();
    connection.lastHeartbeatSequence = sequence;
  }

  /**
   * Inicializa configuração de heartbeat adaptativo para uma conexão
   */
  private initializeHeartbeatConfig(
    connection: SseConnection,
  ): AdaptiveHeartbeatConfig {
    return {
      baseInterval: this.sseConfig.adaptiveHeartbeat.baseInterval,
      minInterval: this.sseConfig.adaptiveHeartbeat.minInterval,
      maxInterval: this.sseConfig.adaptiveHeartbeat.maxInterval,
      backoffFactor: this.sseConfig.adaptiveHeartbeat.backoffFactor,
      maxMissedHeartbeats: this.sseConfig.adaptiveHeartbeat.maxMissedHeartbeats,
      responseTimeout: this.sseConfig.adaptiveHeartbeat.responseTimeout,
    };
  }

  /**
   * Atualiza estatísticas de latência da conexão
   */
  private updateConnectionStats(
    connection: SseConnection,
    latency: number,
  ): void {
    // Inicializar histórico se necessário
    if (!connection.latencyHistory) {
      connection.latencyHistory = [];
    }

    // Adicionar nova latência ao histórico (máximo 10 entradas)
    connection.latencyHistory.push(latency);
    if (connection.latencyHistory.length > 10) {
      connection.latencyHistory.shift();
    }

    // Calcular latência média
    const sum = connection.latencyHistory.reduce((acc, lat) => acc + lat, 0);
    connection.averageLatency = sum / connection.latencyHistory.length;
  }

  /**
   * Adapta o intervalo de heartbeat baseado na latência
   */
  private adaptHeartbeatInterval(
    connectionId: string,
    connection: SseConnection,
    latency: number,
  ): void {
    if (
      !this.sseConfig.adaptiveHeartbeat.enabled ||
      !connection.heartbeatConfig
    ) {
      return;
    }

    const config = connection.heartbeatConfig;
    let newInterval =
      connection.currentHeartbeatInterval || config.baseInterval;

    // Adaptar baseado na latência
    if (latency < 100) {
      // Latência baixa - pode diminuir intervalo
      newInterval = Math.max(newInterval * 0.9, config.minInterval);
    } else if (latency > 1000) {
      // Latência alta - aumentar intervalo
      newInterval = Math.min(
        newInterval * config.backoffFactor,
        config.maxInterval,
      );
    }

    // Atualizar intervalo se mudou significativamente
    if (Math.abs(newInterval - connection.currentHeartbeatInterval!) > 1000) {
      connection.currentHeartbeatInterval = newInterval;

      // Reiniciar heartbeat com novo intervalo
      this.restartHeartbeatWithNewInterval(connectionId, connection);

      this.logger.debug(
        `Intervalo de heartbeat adaptado para conexão ${connectionId}: ${newInterval}ms ` +
          `(latência: ${latency}ms)`,
      );
    }
  }

  /**
   * Aumenta o intervalo de heartbeat como penalidade
   */
  private increaseHeartbeatInterval(
    connectionId: string,
    connection: SseConnection,
  ): void {
    if (!connection.heartbeatConfig) return;

    const config = connection.heartbeatConfig;
    const newInterval = Math.min(
      (connection.currentHeartbeatInterval || config.baseInterval) *
        config.backoffFactor,
      config.maxInterval,
    );

    if (newInterval !== connection.currentHeartbeatInterval) {
      connection.currentHeartbeatInterval = newInterval;
      this.restartHeartbeatWithNewInterval(connectionId, connection);

      this.logger.debug(
        `Intervalo de heartbeat aumentado para conexão ${connectionId}: ${newInterval}ms ` +
          `(penalidade por heartbeat perdido)`,
      );
    }
  }

  /**
   * Reinicia heartbeat com novo intervalo
   */
  private restartHeartbeatWithNewInterval(
    connectionId: string,
    connection: SseConnection,
  ): void {
    // Implementação seria necessária no SseService para reiniciar o observable
    // Por enquanto, apenas logamos a mudança
    this.logger.debug(
      `Heartbeat precisa ser reiniciado para conexão ${connectionId}`,
    );
  }

  /**
   * Obtém próximo número sequencial de heartbeat
   */
  private getNextHeartbeatSequence(connectionId: string): number {
    const current = this.heartbeatSequences.get(connectionId) || 0;
    const next = current + 1;
    this.heartbeatSequences.set(connectionId, next);
    return next;
  }

  /**
   * Inicia detecção periódica de conexões mortas
   */
  private startDeadConnectionDetection(): void {
    if (!this.sseConfig.deadConnectionDetection.enabled) {
      return;
    }

    this.deadConnectionCheckSubscription = interval(
      this.sseConfig.deadConnectionDetection.checkInterval,
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.logger.debug('Executando verificação de conexões mortas');
        // A verificação real será feita pelo SseService
      });
  }

  /**
   * Cleanup ao destruir o módulo
   */
  onModuleDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Parar todos os heartbeats
    this.heartbeatSubscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.heartbeatSubscriptions.clear();

    // Parar verificação de conexões mortas
    if (this.deadConnectionCheckSubscription) {
      this.deadConnectionCheckSubscription.unsubscribe();
    }

    this.logger.log('SseHeartbeatService destruído');
  }
}
