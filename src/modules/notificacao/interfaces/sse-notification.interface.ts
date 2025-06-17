import { TipoNotificacao } from '../../../entities/notification.entity';

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

  /** ID do último evento para recuperação de eventos perdidos */
  lastEventId?: string;

  /** Número sequencial do evento para ordenação */
  eventSequence?: number;

  /** TTL do evento em segundos (para armazenamento temporário) */
  eventTtl?: number;
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

  /** Timestamp da conexão */
  connectedAt: Date;

  /** Timestamp do último heartbeat */
  lastHeartbeat: Date;

  /** User Agent do cliente (opcional) */
  userAgent?: string;

  /** Endereço IP do cliente (opcional) */
  ipAddress?: string;

  /** ID da instância do servidor */
  instanceId: string;

  /** ID do último evento recebido pelo cliente */
  lastEventId?: string;

  /** Timestamp do último evento processado */
  lastEventTimestamp?: Date;

  /** Informações do cliente (opcional) - DEPRECATED: usar userAgent e ipAddress */
  clientInfo?: {
    userAgent?: string;
    ip?: string;
  };

  /** Configuração de heartbeat adaptativo para esta conexão */
  heartbeatConfig?: AdaptiveHeartbeatConfig;

  /** Número sequencial do último heartbeat enviado */
  lastHeartbeatSequence?: number;

  /** Timestamp da última resposta de heartbeat recebida */
  lastHeartbeatResponse?: Date;

  /** Número de heartbeats consecutivos perdidos */
  missedHeartbeats?: number;

  /** Latência média da conexão em ms */
  averageLatency?: number;

  /** Histórico de latências (últimas 10 medições) */
  latencyHistory?: number[];

  /** Indica se a conexão está sendo considerada como morta */
  isDead?: boolean;

  /** Timestamp da última atividade do cliente */
  lastActivity?: Date;

  /** Intervalo atual de heartbeat (adaptativo) */
  currentHeartbeatInterval?: number;
}

/**
 * Interface para eventos de heartbeat
 */
export interface HeartbeatEvent {
  type: 'heartbeat';
  timestamp: Date;
  connectionId: string;
  lastEventId?: string;
  /** Indica se é um heartbeat do servidor ou resposta do cliente */
  direction?: 'server_to_client' | 'client_to_server';
  /** Número sequencial do heartbeat para detectar perda */
  sequence?: number;
  /** Latência da conexão em ms (apenas em respostas do cliente) */
  latency?: number;
}

/**
 * Interface para resposta de heartbeat do cliente
 */
export interface HeartbeatResponse {
  type: 'heartbeat_response';
  timestamp: Date;
  connectionId: string;
  /** Timestamp do heartbeat original do servidor */
  originalTimestamp: Date;
  /** Número sequencial do heartbeat original */
  originalSequence: number;
  /** Latência calculada pelo cliente */
  latency: number;
}

/**
 * Interface para configuração de heartbeat adaptativo
 */
export interface AdaptiveHeartbeatConfig {
  /** Intervalo base de heartbeat em ms */
  baseInterval: number;
  /** Intervalo mínimo permitido em ms */
  minInterval: number;
  /** Intervalo máximo permitido em ms */
  maxInterval: number;
  /** Fator de multiplicação para aumentar intervalo */
  backoffFactor: number;
  /** Número máximo de heartbeats perdidos antes de considerar conexão morta */
  maxMissedHeartbeats: number;
  /** Timeout para resposta de heartbeat em ms */
  responseTimeout: number;
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

/**
 * Interface para eventos armazenados para recuperação
 */
export interface StoredSseEvent {
  /** ID único do evento */
  eventId: string;

  /** ID do usuário destinatário */
  userId: string;

  /** Dados da notificação */
  notification: SseNotification;

  /** Timestamp de criação */
  createdAt: Date;

  /** Timestamp de expiração */
  expiresAt: Date;

  /** Número sequencial para ordenação */
  sequence: number;

  /** Status do evento */
  status: 'pending' | 'delivered' | 'expired';
}

/**
 * Interface para requisição de replay de eventos
 */
export interface EventReplayRequest {
  /** ID do usuário */
  userId: string;

  /** ID do último evento recebido pelo cliente */
  lastEventId?: string;

  /** Timestamp a partir do qual recuperar eventos */
  since?: Date;

  /** Limite de eventos a retornar */
  limit?: number;
}

/**
 * Interface para resposta de replay de eventos
 */
export interface EventReplayResponse {
  /** Lista de eventos perdidos */
  events: StoredSseEvent[];

  /** Total de eventos disponíveis */
  totalEvents: number;

  /** Indica se há mais eventos disponíveis */
  hasMore: boolean;

  /** ID do último evento na resposta */
  lastEventId?: string;

  /** Timestamp da consulta */
  timestamp: Date;
}
