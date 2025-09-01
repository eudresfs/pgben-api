/**
 * Definições de eventos para o módulo de Pagamento
 * 
 * Este arquivo define os tipos de eventos e suas interfaces de dados
 * para o sistema de notificações event-driven do módulo de pagamento.
 */

/**
 * Enum com os tipos de eventos do módulo de Pagamento
 */
export enum PagamentoEventType {
  // Eventos de criação e processamento
  PAGAMENTO_CREATED = 'pagamento.created',
  PAGAMENTO_PROCESSED = 'pagamento.processed',
  PAGAMENTO_FAILED = 'pagamento.failed',
  
  // Eventos de status
  PAGAMENTO_STATUS_CHANGED = 'pagamento.status_changed',
  PAGAMENTO_APPROVED = 'pagamento.approved',
  PAGAMENTO_REJECTED = 'pagamento.rejected',
  PAGAMENTO_CANCELLED = 'pagamento.cancelled',
  
  // Eventos de validação
  COMPROVANTE_UPLOADED = 'pagamento.comprovante_uploaded',
  COMPROVANTE_VALIDATED = 'pagamento.comprovante_validated',
  COMPROVANTE_REJECTED = 'pagamento.comprovante_rejected',
  
  // Eventos de prazos
  DEADLINE_APPROACHING = 'pagamento.deadline_approaching',
  DEADLINE_EXPIRED = 'pagamento.deadline_expired',
  
  // Eventos de estorno
  ESTORNO_REQUESTED = 'pagamento.estorno_requested',
  ESTORNO_PROCESSED = 'pagamento.estorno_processed',
  ESTORNO_FAILED = 'pagamento.estorno_failed',
  
  // Eventos de lote
  LOTE_CREATED = 'pagamento.lote_created',
  LOTE_PROCESSED = 'pagamento.lote_processed',
  LOTE_FAILED = 'pagamento.lote_failed',
}

/**
 * Interface base para todos os eventos de pagamento
 */
export interface PagamentoEvent {
  /** ID do pagamento relacionado ao evento */
  pagamentoId: string;
  /** Tipo do evento */
  type: PagamentoEventType;
  /** Timestamp do evento */
  timestamp: Date;
  /** Dados específicos do evento */
  data: any;
}

/**
 * Interface para dados do evento de criação de pagamento
 */
export interface PagamentoCreatedEventData {
  /** ID da concessão relacionada */
  concessaoId: string;
  /** Valor do pagamento */
  valor: number;
  /** Data de vencimento */
  dataVencimento: Date;
  /** ID do usuário que criou */
  usuarioCriadorId: string;
  /** Observações */
  observacao?: string;
}

/**
 * Interface para dados do evento de processamento de pagamento
 */
export interface PagamentoProcessedEventData {
  /** Valor processado */
  valorProcessado: number;
  /** Data do processamento */
  dataProcessamento: Date;
  /** ID do lote de processamento */
  loteId?: string;
  /** Referência bancária */
  referenciaBancaria?: string;
  /** ID do usuário que processou */
  usuarioProcessadorId: string;
}

/**
 * Interface para dados do evento de falha no pagamento
 */
export interface PagamentoFailedEventData {
  /** Motivo da falha */
  motivoFalha: string;
  /** Código do erro */
  codigoErro?: string;
  /** Data da falha */
  dataFalha: Date;
  /** Tentativa de reprocessamento */
  tentativaReprocessamento: number;
  /** ID do usuário responsável */
  usuarioId?: string;
}

/**
 * Interface para dados do evento de mudança de status
 */
export interface PagamentoStatusChangedEventData {
  /** Status anterior */
  statusAnterior: string;
  /** Status atual */
  statusAtual: string;
  /** Motivo da mudança */
  motivoMudanca?: string;
  /** ID do usuário que alterou */
  usuarioId: string;
  /** Observações */
  observacao?: string;
}

/**
 * Interface para dados do evento de aprovação de pagamento
 */
export interface PagamentoApprovedEventData {
  /** ID do aprovador */
  aprovadorId: string;
  /** Data da aprovação */
  dataAprovacao: Date;
  /** Observações da aprovação */
  observacaoAprovacao?: string;
  /** Valor aprovado */
  valorAprovado: number;
}

/**
 * Interface para dados do evento de rejeição de pagamento
 */
export interface PagamentoRejectedEventData {
  /** ID do usuário que rejeitou */
  rejeitadoPorId: string;
  /** Motivo da rejeição */
  motivoRejeicao: string;
  /** Data da rejeição */
  dataRejeicao: Date;
  /** Observações */
  observacao?: string;
}

/**
 * Interface para dados do evento de cancelamento de pagamento
 */
export interface PagamentoCancelledEventData {
  /** ID do usuário que cancelou */
  canceladoPorId: string;
  /** Motivo do cancelamento */
  motivoCancelamento: string;
  /** Data do cancelamento */
  dataCancelamento: Date;
  /** Observações */
  observacao?: string;
}

/**
 * Interface para dados do evento de upload de comprovante
 */
export interface ComprovanteUploadedEventData {
  /** Nome do arquivo */
  nomeArquivo: string;
  /** Tamanho do arquivo em bytes */
  tamanhoArquivo: number;
  /** Tipo MIME do arquivo */
  tipoArquivo: string;
  /** ID do usuário que fez upload */
  usuarioUploadId: string;
  /** Data do upload */
  dataUpload: Date;
}

/**
 * Interface para dados do evento de validação de comprovante
 */
export interface ComprovanteValidatedEventData {
  /** ID do validador */
  validadorId: string;
  /** Resultado da validação */
  resultadoValidacao: 'APROVADO' | 'REJEITADO' | 'PENDENTE';
  /** Data da validação */
  dataValidacao: Date;
  /** Observações da validação */
  observacaoValidacao?: string;
}

/**
 * Interface para dados do evento de rejeição de comprovante
 */
export interface ComprovanteRejectedEventData {
  /** ID do usuário que rejeitou */
  rejeitadoPorId: string;
  /** Motivo da rejeição */
  motivoRejeicao: string;
  /** Data da rejeição */
  dataRejeicao: Date;
  /** Observações */
  observacao?: string;
}

/**
 * Interface para dados do evento de prazo próximo
 */
export interface DeadlineApproachingEventData {
  /** Tipo do prazo */
  tipoPrazo: 'VENCIMENTO' | 'COMPROVACAO' | 'VALIDACAO';
  /** Dias restantes */
  diasRestantes: number;
  /** Data do prazo */
  dataPrazo: Date;
}

/**
 * Interface para dados do evento de prazo expirado
 */
export interface DeadlineExpiredEventData {
  /** Tipo do prazo */
  tipoPrazo: 'VENCIMENTO' | 'COMPROVACAO' | 'VALIDACAO';
  /** Dias de atraso */
  diasAtraso: number;
  /** Data do prazo */
  dataPrazo: Date;
}

/**
 * Interface para dados do evento de solicitação de estorno
 */
export interface EstornoRequestedEventData {
  /** Motivo do estorno */
  motivoEstorno: string;
  /** Valor do estorno */
  valorEstorno: number;
  /** ID do solicitante */
  solicitanteId: string;
  /** Data da solicitação */
  dataSolicitacao: Date;
  /** Observações */
  observacao?: string;
}

/**
 * Interface para dados do evento de processamento de estorno
 */
export interface EstornoProcessedEventData {
  /** Valor estornado */
  valorEstornado: number;
  /** Data do processamento */
  dataProcessamento: Date;
  /** Referência bancária do estorno */
  referenciaBancariaEstorno?: string;
  /** ID do usuário que processou */
  usuarioProcessadorId: string;
}

/**
 * Interface para dados do evento de falha no estorno
 */
export interface EstornoFailedEventData {
  /** Motivo da falha */
  motivoFalha: string;
  /** Código do erro */
  codigoErro?: string;
  /** Data da falha */
  dataFalha: Date;
  /** ID do usuário responsável */
  usuarioId?: string;
}

/**
 * Interface para dados do evento de criação de lote
 */
export interface LoteCreatedEventData {
  /** ID do lote */
  loteId: string;
  /** Quantidade de pagamentos */
  quantidadePagamentos: number;
  /** Valor total do lote */
  valorTotal: number;
  /** ID do usuário que criou */
  usuarioCriadorId: string;
  /** Data de criação */
  dataCriacao: Date;
}

/**
 * Interface para dados do evento de processamento de lote
 */
export interface LoteProcessedEventData {
  /** ID do lote */
  loteId: string;
  /** Quantidade processada */
  quantidadeProcessada: number;
  /** Valor processado */
  valorProcessado: number;
  /** Data do processamento */
  dataProcessamento: Date;
  /** ID do usuário que processou */
  usuarioProcessadorId: string;
}

/**
 * Interface para dados do evento de falha no lote
 */
export interface LoteFailedEventData {
  /** ID do lote */
  loteId: string;
  /** Motivo da falha */
  motivoFalha: string;
  /** Quantidade de falhas */
  quantidadeFalhas: number;
  /** Data da falha */
  dataFalha: Date;
  /** ID do usuário responsável */
  usuarioId?: string;
}