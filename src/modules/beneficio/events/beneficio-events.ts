/**
 * Tipos de eventos do módulo de Benefício
 * Define todos os eventos que podem ser emitidos durante o ciclo de vida de uma concessão
 */
export enum BeneficioEventType {
  // Eventos de criação e alteração de concessão
  CONCESSAO_CREATED = 'beneficio.concessao.created',
  CONCESSAO_STATUS_CHANGED = 'beneficio.concessao.status_changed',
  CONCESSAO_SUSPENDED = 'beneficio.concessao.suspended',
  CONCESSAO_BLOCKED = 'beneficio.concessao.blocked',
  CONCESSAO_REACTIVATED = 'beneficio.concessao.reactivated',
  CONCESSAO_EXTENDED = 'beneficio.concessao.extended',

  // Eventos de validação
  VALIDATION_COMPLETED = 'beneficio.validation.completed',
  VALIDATION_FAILED = 'beneficio.validation.failed',

  // Eventos de documentação
  DOCUMENT_ATTACHED = 'beneficio.document.attached',
  DOCUMENT_VALIDATED = 'beneficio.document.validated',
  DOCUMENT_REJECTED = 'beneficio.document.rejected',

  // Eventos de prazo
  DEADLINE_APPROACHING = 'beneficio.deadline.approaching',
  DEADLINE_EXPIRED = 'beneficio.deadline.expired',
}

/**
 * Interface base para todos os eventos de benefício
 */
export interface BeneficioEvent {
  type: BeneficioEventType;
  concessaoId: string;
  timestamp: Date;
  data: Record<string, any>;
}

/**
 * Dados do evento de criação de concessão
 */
export interface ConcessaoCreatedEventData {
  solicitacaoId: string;
  requerenteId: string;
  tipoBeneficioId: string;
  dataInicio: Date;
  dataFim?: Date;
  valor?: number;
  usuarioCriadorId: string;
}

/**
 * Dados do evento de mudança de status de concessão
 */
export interface ConcessaoStatusChangedEventData {
  statusAnterior: string;
  statusAtual: string;
  usuarioId: string;
  observacao?: string;
  dataAlteracao: Date;
}

/**
 * Dados do evento de suspensão de concessão
 */
export interface ConcessaoSuspendedEventData {
  motivoSuspensao: string;
  dataSuspensao: Date;
  usuarioId: string;
  observacao?: string;
  prazoReativacao?: Date;
}

/**
 * Dados do evento de bloqueio de concessão
 */
export interface ConcessaoBlockedEventData {
  motivoBloqueio: string;
  dataBloqueio: Date;
  usuarioId: string;
  observacao?: string;
  determinacaoJudicial?: boolean;
}

/**
 * Dados do evento de reativação de concessão
 */
export interface ConcessaoReactivatedEventData {
  dataReativacao: Date;
  usuarioId: string;
  observacao?: string;
  statusAnterior: string;
}

/**
 * Dados do evento de prorrogação de concessão
 */
export interface ConcessaoExtendedEventData {
  dataFimAnterior?: Date;
  novaDataFim: Date;
  motivoProrrogacao: string;
  usuarioId: string;
  observacao?: string;
}

/**
 * Dados do evento de validação completada
 */
export interface ValidationCompletedEventData {
  tipoValidacao: string;
  resultado: 'aprovado' | 'reprovado' | 'pendente';
  validadorId: string;
  observacao?: string;
  dataValidacao: Date;
}

/**
 * Dados do evento de validação falhada
 */
export interface ValidationFailedEventData {
  tipoValidacao: string;
  motivoFalha: string;
  validadorId: string;
  observacao?: string;
  dataFalha: Date;
}

/**
 * Dados do evento de anexação de documento
 */
export interface DocumentAttachedEventData {
  documentoId: string;
  tipoDocumento: string;
  nomeArquivo: string;
  usuarioId: string;
  observacao?: string;
}

/**
 * Dados do evento de validação de documento
 */
export interface DocumentValidatedEventData {
  documentoId: string;
  tipoDocumento: string;
  resultado: 'aprovado' | 'reprovado';
  validadorId: string;
  observacao?: string;
  dataValidacao: Date;
}

/**
 * Dados do evento de rejeição de documento
 */
export interface DocumentRejectedEventData {
  documentoId: string;
  tipoDocumento: string;
  motivoRejeicao: string;
  validadorId: string;
  observacao?: string;
  dataRejeicao: Date;
}

/**
 * Dados do evento de prazo próximo
 */
export interface DeadlineApproachingEventData {
  tipoPrazo: 'concessao' | 'validacao' | 'documentos';
  dataPrazo: Date;
  diasRestantes: number;
  determinacaoJudicial?: boolean;
}

/**
 * Dados do evento de prazo expirado
 */
export interface DeadlineExpiredEventData {
  tipoPrazo: 'concessao' | 'validacao' | 'documentos';
  dataPrazo: Date;
  diasAtraso: number;
  determinacaoJudicial?: boolean;
}