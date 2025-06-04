import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable, interval } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import {
  SseNotification,
  SseConnection,
  SseConnectionStats,
  HeartbeatEvent,
} from '../interfaces/sse-notification.interface';

/**
 * Serviço SSE (Server-Sent Events)
 *
 * Responsável por gerenciar conexões SSE e envio de notificações em tempo real.
 * Mantém um mapa de conexões ativas por usuário e fornece métodos para
 * envio de notificações individuais ou em massa.
 */
@Injectable()
export class SseService {
  isUserConnected(userId: string) {
    throw new Error('Method not implemented.');
  }
  getUserConnectionCount(userId: string) {
    throw new Error('Method not implemented.');
  }
  private readonly logger = new Logger(SseService.name);

  /** Mapa de conexões ativas: userId -> Map<connectionId, Subject> */
  private readonly connections = new Map<
    string,
    Map<string, Subject<MessageEvent>>
  >();

  /** Intervalo de heartbeat em milissegundos (30 segundos) */
  private readonly heartbeatInterval = 30000;

  /** Máximo de conexões por usuário */
  private readonly maxConnectionsPerUser = 5;

  /**
   * Cria uma nova conexão SSE para o usuário
   * @param userId ID do usuário
   * @param clientInfo Informações do cliente (opcional)
   * @returns Observable de MessageEvent para a conexão SSE
   */
  createConnection(
    userId: string,
    clientInfo?: { userAgent?: string; ip?: string },
  ): Observable<MessageEvent> {
    const connectionId = this.generateConnectionId();
    const subject = new Subject<MessageEvent>();

    // Inicializa mapa do usuário se não existir
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Map());
    }

    const userConnections = this.connections.get(userId)!;

    // Verifica limite de conexões por usuário
    if (userConnections.size >= this.maxConnectionsPerUser) {
      this.logger.warn(
        `Usuário ${userId} atingiu o limite de ${this.maxConnectionsPerUser} conexões`,
      );
      // Remove a conexão mais antiga
      const oldestConnectionId = userConnections.keys().next().value;
      this.removeConnection(userId, oldestConnectionId);
    }

    userConnections.set(connectionId, subject);
    this.logger.log(`Nova conexão SSE: ${userId}:${connectionId}`);

    if (clientInfo) {
      this.logger.debug(
        `Cliente conectado: ${clientInfo.userAgent} - IP: ${clientInfo.ip}`,
      );
    }

    // Configura heartbeat
    const heartbeat$ = interval(this.heartbeatInterval).pipe(
      map(() => {
        const heartbeatEvent: HeartbeatEvent = {
          type: 'heartbeat',
          timestamp: new Date(),
          connectionId,
        };

        return {
          data: JSON.stringify(heartbeatEvent),
        } as MessageEvent;
      }),
    );

    // Combina notificações com heartbeat
    return new Observable<MessageEvent>((observer) => {
      // Envia evento de conexão estabelecida
      observer.next({
        data: JSON.stringify({
          type: 'connection_established',
          connectionId,
          timestamp: new Date(),
        }),
      } as MessageEvent);

      const subscription = subject.asObservable().subscribe(observer);
      const heartbeatSub = heartbeat$.subscribe(observer);

      // Cleanup na desconexão
      return () => {
        subscription.unsubscribe();
        heartbeatSub.unsubscribe();
        this.removeConnection(userId, connectionId);
      };
    });
  }

  /**
   * Envia notificação para usuário específico
   * @param userId ID do usuário destinatário
   * @param notification Dados da notificação
   */
  sendToUser(userId: string, notification: SseNotification): void {
    const userConnections = this.connections.get(userId);

    if (!userConnections || userConnections.size === 0) {
      this.logger.warn(`Usuário ${userId} não tem conexões ativas`);
      return;
    }

    const messageEvent: MessageEvent = {
      data: JSON.stringify({
        ...notification,
        timestamp: notification.timestamp.toISOString(),
      }),
    } as MessageEvent;

    // Envia para todas as conexões do usuário
    let successCount = 0;
    userConnections.forEach((subject, connectionId) => {
      try {
        subject.next(messageEvent);
        successCount++;
        this.logger.debug(`Notificação enviada: ${userId}:${connectionId}`);
      } catch (error) {
        this.logger.error(
          `Erro ao enviar notificação para ${userId}:${connectionId}: ${error.message}`,
        );
        this.removeConnection(userId, connectionId);
      }
    });

    this.logger.log(
      `Notificação enviada para ${successCount}/${userConnections.size} conexões do usuário ${userId}`,
    );
  }

  /**
   * Envia notificação para múltiplos usuários
   * @param userIds Lista de IDs dos usuários
   * @param notification Dados da notificação (sem userId)
   */
  sendToUsers(
    userIds: string[],
    notification: Omit<SseNotification, 'userId'>,
  ): void {
    this.logger.log(
      `Enviando notificação em massa para ${userIds.length} usuários`,
    );

    userIds.forEach((userId) => {
      this.sendToUser(userId, { ...notification, userId });
    });
  }

  /**
   * Envia notificação broadcast para todos os usuários conectados
   * @param notification Dados da notificação
   */
  broadcastToAll(notification: Omit<SseNotification, 'userId'>): void {
    const connectedUserIds = Array.from(this.connections.keys());
    this.logger.log(
      `Enviando broadcast para ${connectedUserIds.length} usuários conectados`,
    );

    this.sendToUsers(connectedUserIds, notification);
  }

  /**
   * Remove uma conexão específica
   * @param userId ID do usuário
   * @param connectionId ID da conexão
   */
  removeConnection(userId: string, connectionId: string): void {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      const subject = userConnections.get(connectionId);
      if (subject) {
        subject.complete();
      }

      userConnections.delete(connectionId);

      // Remove mapa do usuário se não houver mais conexões
      if (userConnections.size === 0) {
        this.connections.delete(userId);
      }

      this.logger.log(`Conexão removida: ${userId}:${connectionId}`);
    }
  }

  /**
   * Remove todas as conexões de um usuário
   * @param userId ID do usuário
   */
  removeUserConnections(userId: string): void {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      userConnections.forEach((subject, connectionId) => {
        subject.complete();
        this.logger.log(`Conexão removida: ${userId}:${connectionId}`);
      });

      this.connections.delete(userId);
      this.logger.log(`Todas as conexões do usuário ${userId} foram removidas`);
    }
  }

  /**
   * Verifica se um usuário tem conexões ativas
   * @param userId ID do usuário
   * @returns true se o usuário tem conexões ativas
   */
  hasActiveConnections(userId: string): boolean {
    const userConnections = this.connections.get(userId);
    return userConnections ? userConnections.size > 0 : false;
  }

  /**
   * Retorna estatísticas das conexões
   * @returns Estatísticas detalhadas das conexões SSE
   */
  getConnectionStats(): SseConnectionStats {
    let totalConnections = 0;
    const connectionsPerUser: Record<string, number> = {};

    this.connections.forEach((userConns, userId) => {
      const connectionCount = userConns.size;
      totalConnections += connectionCount;
      connectionsPerUser[userId] = connectionCount;
    });

    return {
      totalUsers: this.connections.size,
      totalConnections,
      connectionsPerUser,
      lastUpdated: new Date(),
    };
  }

  /**
   * Retorna lista de usuários conectados
   * @returns Array com IDs dos usuários conectados
   */
  getConnectedUsers(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Limpa todas as conexões (usado para shutdown graceful)
   */
  clearAllConnections(): void {
    this.logger.log('Limpando todas as conexões SSE');

    this.connections.forEach((userConns, userId) => {
      userConns.forEach((subject, connectionId) => {
        subject.complete();
      });
    });

    this.connections.clear();
    this.logger.log('Todas as conexões SSE foram limpas');
  }

  /**
   * Gera um ID único para a conexão
   * @returns ID único da conexão
   */
  private generateConnectionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
