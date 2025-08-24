/**
 * Enum que define os possíveis sub-status de uma solicitação de benefício
 * Sub-status detalha o ponto exato dentro do fluxo do estado principal
 *
 * Sub-status por estado:
 * - ABERTA: aguardando_dados, aguardando_parecer_tecnico
 * - PENDENTE: aguardando_solucao, pendencias_resolvidas
 */
export enum SubStatusSolicitacao {
  AGUARDANDO_DADOS = 'aguardando_dados',
  AGUARDANDO_DOCUMENTOS = 'aguardando_documentos',
  AGUARDANDO_PARECER_TECNICO = 'aguardando_parecer_tecnico',
  AGUARDANDO_SOLUCAO = 'aguardando_solucao',
  PENDENCIAS_RESOLVIDAS = 'pendencias_resolvidas',
}
