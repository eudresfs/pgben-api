/**
 * Interfaces e tipos base para o sistema de notificações padronizado
 * 
 * Este arquivo define as interfaces fundamentais que serão utilizadas
 * por todos os módulos do sistema para garantir consistência e padronização.
 */

/**
 * Enum para tipos de notificação padronizados
 */
export enum NotificationType {
  SISTEMA = 'sistema',
  SOLICITACAO = 'solicitacao',
  PAGAMENTO = 'pagamento',
  CONCESSAO = 'concessao',
  APROVACAO = 'aprovacao',
  MONITORAMENTO = 'monitoramento',
  PENDENCIA = 'pendencia',
  ALERTA = 'alerta',
  URGENTE = 'urgente',
  ACOMPANHAMENTO = 'acompanhamento'
}

/**
 * Enum para prioridades de notificação
 */
export enum NotificationPriority {
  BAIXA = 'baixa',
  MEDIA = 'media',
  ALTA = 'alta',
  URGENTE = 'urgente'
}

/**
 * Enum para canais de notificação
 */
export enum NotificationChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
  ABLY = 'ably',
  SMS = 'sms'
}

/**
 * Enum específico para eventos de pagamento
 */
export enum PagamentoEventType {
  PAGAMENTO_CRIADO = 'pagamento.criado',
  PAGAMENTO_PROCESSADO = 'pagamento.processado',
  PAGAMENTO_APROVADO = 'pagamento.aprovado',
  PAGAMENTO_REJEITADO = 'pagamento.rejeitado',
  PAGAMENTO_CANCELADO = 'pagamento.cancelado',
  PAGAMENTO_ESTORNADO = 'pagamento.estornado'
}

/**
 * Interface base para contexto de notificação
 * Todos os contextos específicos devem estender esta interface
 */
export interface BaseNotificationContext {
  /** ID único do destinatário */
  destinatario_id: string;
  
  /** Tipo da notificação */
  tipo: NotificationType;
  
  /** Prioridade da notificação */
  prioridade: NotificationPriority;
  
  /** Título da notificação */
  titulo: string;
  
  /** Conteúdo da notificação */
  conteudo: string;
  
  /** URL de redirecionamento (obrigatória para notificações in-app) */
  url: string;
  
  /** Template de e-mail (obrigatório para envio de e-mail) */
  template_email?: string;
  
  /** Dados adicionais para renderização do template */
  dados_contexto?: Record<string, any>;
  
  /** Canais pelos quais a notificação deve ser enviada */
  canais: NotificationChannel[];
  
  /** Metadados adicionais */
  metadata?: Record<string, any>;
}

/**
 * Interface para resultado de envio por canal
 */
export interface ChannelResult {
  /** Canal utilizado */
  canal: NotificationChannel;
  
  /** Sucesso do envio */
  sucesso: boolean;
  
  /** Mensagem de erro (se houver) */
  erro?: string;
  
  /** Dados de resposta do canal */
  dados_resposta?: Record<string, any>;
  
  /** Timestamp do envio */
  timestamp: Date;
}

/**
 * Interface para resultado completo de notificação
 */
export interface NotificationResult {
  /** ID da notificação criada */
  notificacao_id: string;
  
  /** Sucesso geral da operação */
  sucesso: boolean;
  
  /** Resultados por canal */
  resultados_canais: ChannelResult[];
  
  /** Mensagem de erro geral (se houver) */
  erro_geral?: string;
  
  /** Timestamp da operação */
  timestamp: Date;
}

/**
 * Interface para validação de template
 */
export interface TemplateValidationResult {
  /** Template é válido */
  valido: boolean;
  
  /** Template existe no sistema */
  existe: boolean;
  
  /** Template está ativo */
  ativo: boolean;
  
  /** Mensagens de erro */
  erros: string[];
}

/**
 * Interface para configuração de retry
 */
export interface RetryConfig {
  /** Número máximo de tentativas */
  max_tentativas: number;
  
  /** Intervalo base entre tentativas (em ms) */
  intervalo_base: number;
  
  /** Multiplicador para backoff exponencial */
  multiplicador_backoff: number;
  
  /** Intervalo máximo entre tentativas (em ms) */
  intervalo_maximo: number;
}

/**
 * Interface para métricas de notificação
 */
export interface NotificationMetrics {
  /** Total de notificações enviadas */
  total_enviadas: number;
  
  /** Total de sucessos */
  total_sucessos: number;
  
  /** Total de falhas */
  total_falhas: number;
  
  /** Taxa de sucesso */
  taxa_sucesso: number;
  
  /** Tempo médio de processamento (em ms) */
  tempo_medio_processamento: number;
  
  /** Métricas por canal */
  metricas_por_canal: Record<NotificationChannel, ChannelResult[]>;
}