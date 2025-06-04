/**
 * Enum que define os tipos de ações em um workflow de benefício.
 * Cada ação representa uma etapa específica no fluxo de processamento de um benefício.
 */
export enum WorkflowAcaoEnum {
  CRIACAO = 'criacao',
  ANALISE = 'analise',
  APROVACAO = 'aprovacao',
  LIBERACAO = 'liberacao',
  CONFIRMACAO = 'confirmacao',
}
