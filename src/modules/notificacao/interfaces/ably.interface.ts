/**
 * Interface para configuração de autenticação do Ably
 */
export interface IAblyAuthConfig {
  /** ID do usuário */
  userId: string;
  /** Se o usuário é administrador */
  isAdmin: boolean;
  /** Tempo de expiração do token em segundos */
  expiresIn?: number;
  /** Capacidades específicas do token */
  capabilities?: Record<string, string[]>;
}

/**
 * Interface para token de autenticação do Ably
 */
export interface IAblyTokenDetails {
  /** Token JWT gerado */
  token: string;
  /** Timestamp de expiração */
  expires: number;
  /** Capacidades do token */
  capability: Record<string, string[]>;
  /** ID do cliente */
  clientId: string;
}

/**
 * Interface para dados de notificação
 */
export interface IAblyNotificationData {
  /** ID único da notificação */
  id: string;
  /** Tipo da notificação */
  type: NotificationType;
  /** Título da notificação */
  title: string;
  /** Conteúdo da notificação */
  message: string;
  /** Dados adicionais */
  data?: Record<string, any>;
  /** Timestamp de criação */
  timestamp: Date;
  /** ID do usuário destinatário */
  senderId?: string;
  /** ID do usuário (para compatibilidade) */
  userId?: string;
  /** Prioridade da notificação */
  priority: NotificationPriority;
  /** Se requer ação do usuário */
  requiresAction?: boolean;
  /** URL de ação (se aplicável) */
  actionUrl?: string;
  /** Metadados */
  metadata?: object;
}

/**
 * Tipos de notificação suportados
 */
export enum NotificationType {
  SYSTEM = 'system',
  BENEFICIO_APROVADO = 'beneficio_aprovado',
  BENEFICIO_REJEITADO = 'beneficio_rejeitado',
  BENEFICIO_PENDENTE = 'beneficio_pendente',
  DOCUMENTO_SOLICITADO = 'documento_solicitado',
  PRAZO_VENCENDO = 'prazo_vencendo',
  USUARIO_CRIADO = 'usuario_criado',
  PERFIL_ALTERADO = 'perfil_alterado',
  MANUTENCAO_SISTEMA = 'manutencao_sistema',
  AUDITORIA = 'auditoria',
}

/**
 * Prioridades de notificação
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Interface para configuração de canal
 */
export interface IAblyChannelConfig {
  /** Nome do canal */
  name: string;
  /** Se o canal é privado */
  private: boolean;
  /** Configurações de presença */
  presence?: boolean;
  /** Configurações de persistência */
  persist?: boolean;
  /** TTL das mensagens em segundos */
  messageTtl?: number;
}

/**
 * Interface para estatísticas do canal
 */
export interface IAblyChannelStats {
  /** Número de assinantes ativos */
  activeSubscribers?: number;
  /** Número de membros em presença */
  presenceMembers?: number;
  /** Timestamp de criação do canal */
  createdAt?: Date;
  /** Nome do canal */
  channelName: string;
  /** Número de conexões ativas */
  activeConnections: number;
  /** Número de mensagens enviadas */
  messagesSent: number;
  /** Número de mensagens recebidas */
  messagesReceived: number;
  /** Timestamp da última atividade */
  lastActivity: Date;
  /** Tamanho médio das mensagens */
  averageMessageSize: number;
}

/**
 * Interface para evento de conexão
 */
export interface IAblyConnectionEvent {
  /** Tipo do evento */
  type: 'connected' | 'disconnected' | 'suspended' | 'failed';
  /** ID da conexão */
  connectionId: string;
  /** ID do cliente */
  clientId: string;
  /** Timestamp do evento */
  timestamp: Date;
  /** Informações adicionais */
  details?: Record<string, any>;
}

/**
 * Interface para configuração de fallback
 */
export interface IAblyFallbackConfig {
  /** Se o fallback está habilitado */
  enabled: boolean;
  /** Tipo de fallback (SSE, WebSocket, etc.) */
  type: 'sse' | 'websocket' | 'polling';
  /** Timeout para ativar fallback */
  timeout: number;
  /** Número máximo de tentativas */
  maxRetries: number;
}

/**
 * Interface para métricas do Ably
 */
export interface IAblyMetrics {
  /** Número total de conexões */
  totalConnections: number;
  /** Número de conexões ativas */
  activeConnections: number;
  /** Número total de mensagens */
  totalMessages: number;
  /** Número de mensagens publicadas */
  messagesPublished: number;
  /** Número de mensagens recebidas */
  messagesReceived: number;
  /** Número de canais ativos */
  activeChannels: number;
  /** Estado da conexão */
  connectionState: string;
  /** Último erro */
  lastError: string | null;
  /** Tempo de atividade */
  uptime: number;
  /** Taxa de mensagens por segundo */
  messagesPerSecond: number;
  /** Latência média */
  averageLatency: number;
  /** Taxa de erro */
  errorRate: number;
  /** Uso de banda */
  bandwidthUsage: number;
  /** Timestamp da coleta */
  timestamp: Date;
}

/**
 * Interface para configuração de rate limiting
 */
export interface IAblyRateLimitConfig {
  /** Número máximo de mensagens por período */
  maxMessages: number;
  /** Período em segundos */
  periodSeconds: number;
  /** Ação quando limite é excedido */
  action: 'block' | 'queue' | 'drop';
  /** Tempo de bloqueio em segundos */
  blockDuration?: number;
}

/**
 * Interface para resultado de operação do Ably
 */
export interface IAblyOperationResult<T = any> {
  /** Se a operação foi bem-sucedida */
  success: boolean;
  /** Dados retornados */
  data?: T;
  /** Mensagem de erro (se houver) */
  error?: string;
  /** Código de erro */
  errorCode?: string;
  /** Timestamp da operação */
  timestamp: Date;
  /** Tempo de execução em ms */
  executionTime?: number;
}

/**
 * Interface para configuração de retry
 */
export interface IAblyRetryConfig {
  /** Número máximo de tentativas */
  maxAttempts: number;
  /** Delay inicial em ms */
  initialDelay: number;
  /** Multiplicador do delay */
  delayMultiplier: number;
  /** Delay máximo em ms */
  maxDelay: number;
  /** Se deve usar jitter */
  useJitter: boolean;
}

/**
 * Interface para evento de presença
 */
export interface IAblyPresenceEvent {
  /** Tipo do evento */
  action: 'enter' | 'leave' | 'update';
  /** ID do cliente */
  clientId: string;
  /** Dados do cliente */
  data?: Record<string, any>;
  /** Timestamp do evento */
  timestamp: Date;
  /** Nome do canal */
  channelName: string;
}

/**
 * Interface para configuração de webhook
 */
export interface IAblyWebhookConfig {
  /** URL do webhook */
  url: string;
  /** Eventos para escutar */
  events: string[];
  /** Headers customizados */
  headers?: Record<string, string>;
  /** Se deve validar SSL */
  validateSsl: boolean;
  /** Secret para validação */
  secret?: string;
}

/**
 * Interface para dados de auditoria
 */
export interface IAblyAuditData {
  /** ID da operação */
  operationId: string;
  /** Tipo da operação */
  operation: string;
  /** ID do usuário */
  userId: string;
  /** Canal afetado */
  channel?: string;
  /** Dados da operação */
  data: Record<string, any>;
  /** Timestamp */
  timestamp: Date;
  /** IP do cliente */
  clientIp?: string;
  /** User agent */
  userAgent?: string;
}

/**
 * Interface para configuração de monitoramento
 */
export interface IAblyMonitoringConfig {
  /** Se o monitoramento está habilitado */
  enabled: boolean;
  /** Intervalo de coleta de métricas em ms */
  metricsInterval: number;
  /** Se deve coletar métricas detalhadas */
  detailedMetrics: boolean;
  /** Configuração de alertas */
  alerts: {
    /** Limite de conexões */
    connectionLimit: number;
    /** Limite de taxa de erro */
    errorRateLimit: number;
    /** Limite de latência em ms */
    latencyLimit: number;
  };
}
