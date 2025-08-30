/**
 * Enum que define os possíveis status de uma solicitação de benefício
 *
 * Ciclo de vida completo:
 * - RASCUNHO: Solicitação criada apenas com beneficiario_id e beneficio_id
 * - ABERTA: Dados específicos do benefício não preenchidos ou documentos não enviados
 * - PENDENTE: Existem pendências atribuídas ou pendências resolvidas aguardando reanálise
 * - EM_ANALISE: Aguardando análise da gestão SEMTAS
 * - AGUARDANDO_DOCUMENTOS: Aguardando documentos do beneficiário
 * - APROVADA: Gera concessão e pagamentos automaticamente
 * - INDEFERIDA: Beneficiário inelegível (decisão da gestão)
 * - LIBERADA: Solicitação liberada para processamento
 * - EM_PROCESSAMENTO: Em processamento de pagamento
 * - ARQUIVADA: Solicitação arquivada
 * - CANCELADA: Cancelada antes da concessão
 * - CONCLUIDA: Processo concluído
 * - EXECUTADA: Execução automática concluída
 * - ERRO_EXECUCAO: Erro durante execução automática
 */
export enum StatusSolicitacao {
  RASCUNHO = 'rascunho',
  ABERTA = 'aberta',
  EM_ANALISE = 'em_analise',
  PENDENTE = 'pendente',
  AGUARDANDO_DOCUMENTOS = 'aguardando_documentos',
  APROVADA = 'aprovada',
  INDEFERIDA = 'indeferida',
  LIBERADA = 'liberada',
  EM_PROCESSAMENTO = 'em_processamento',
  ARQUIVADA = 'arquivada',
  CANCELADA = 'cancelada',
  CONCLUIDA = 'concluida',
  EXECUTADA = 'executada',
  ERRO_EXECUCAO = 'erro_execucao',
}
