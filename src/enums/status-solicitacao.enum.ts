/**
 * Enum que define os possíveis status de uma solicitação de benefício
 * 
 * Ciclo de vida simplificado:
 * - RASCUNHO: Solicitação criada apenas com beneficiario_id e beneficio_id
 * - ABERTA: Dados específicos do benefício não preenchidos ou documentos não enviados
 * - PENDENTE: Existem pendências atribuídas ou pendências resolvidas aguardando reanálise
 * - EM_ANALISE: Aguardando análise da gestão SEMTAS
 * - APROVADA: Gera concessão e pagamentos automaticamente
 * - INDEFERIDA: Beneficiário inelegível (decisão da gestão)
 * - CANCELADA: Cancelada antes da concessão
 */
export enum StatusSolicitacao {
  RASCUNHO = 'rascunho',
  ABERTA = 'aberta',
  PENDENTE = 'pendente',
  EM_ANALISE = 'em_analise',
  APROVADA = 'aprovada',
  INDEFERIDA = 'indeferida',
  CANCELADA = 'cancelada',
}
