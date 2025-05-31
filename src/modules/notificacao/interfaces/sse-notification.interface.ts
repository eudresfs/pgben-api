import { TipoNotificacao } from '../entities/notification.entity';

/**
 * Interface para notificações SSE
 * Define a estrutura das notificações enviadas via Server-Sent Events
 */
export interface SseNotification {
  /** ID único da notificação */
  id: string;
  
  /** ID do usuário destinatário */
  userId: string;
  
  /** Tipo da notificação */
  type: TipoNotificacao;
  
  /** Título da notificação */
  title: string;
  
  /** Conteúdo/mensagem da notificação */
  message: string;
  
  /** Dados adicionais da notificação */
  data?: any;
  
  /** Timestamp da notificação */
  timestamp: Date;
  
  /** Prioridade da notificação */
  priority?: 'low' | 'medium' | 'high';
  
  /** Link relacionado à notificação */
  link?: string;
  
  /** ID da entidade relacionada */
  entidade_relacionada_id?: string;
  
  /** Tipo da entidade relacionada */
  entidade_tipo?: string;
}

/**
 * Interface para conexões SSE ativas
 * Gerencia as conexões de usuários conectados via SSE
 */
export interface SseConnection {
  /** ID do usuário */
  userId: string;
  
  /** ID único da conexão */
  connectionId: string;
  
  /** Timestamp do último heartbeat */
  lastHeartbeat: Date;
  
  /** Informações do cliente (opcional) */
  clientInfo?: {
    userAgent?: string;
    ip?: string;
  };
}

/**
 * Interface para eventos de heartbeat
 */
export interface HeartbeatEvent {
  type: 'heartbeat';
  timestamp: Date;
  connectionId: string;
}

/**
 * Interface para estatísticas de conexões SSE
 */
export interface SseConnectionStats {
  /** Total de usuários conectados */
  totalUsers: number;
  
  /** Total de conexões ativas */
  totalConnections: number;
  
  /** Conexões por usuário */
  connectionsPerUser: Record<string, number>;
  
  /** Timestamp da última atualização */
  lastUpdated: Date;
}