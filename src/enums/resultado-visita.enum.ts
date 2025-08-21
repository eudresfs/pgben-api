/**
 * Enum para representar os possíveis resultados de uma visita domiciliar.
 * 
 * @description
 * Define os resultados da avaliação técnica realizada durante a visita,
 * indicando o nível de conformidade com os critérios do benefício.
 * 
 * @author Sistema PGBEN
 * @since 2025-01-15
 */
export enum ResultadoVisita {
  /**
   * Situação está em conformidade com os critérios do benefício
   */
  CONFORME = 'conforme',

  /**
   * Situação não está em conformidade com os critérios
   */
  NAO_CONFORME = 'nao_conforme',

  /**
   * Situação está parcialmente em conformidade
   */
  PARCIALMENTE_CONFORME = 'parcialmente_conforme',

  /**
   * Situação requer ação imediata
   */
  REQUER_ACAO = 'requer_acao',

  /**
   * Beneficiário não foi encontrado no endereço
   */
  BENEFICIARIO_AUSENTE = 'beneficiario_ausente',

  /**
   * Endereço não foi localizado
   */
  ENDERECO_NAO_LOCALIZADO = 'endereco_nao_localizado',

  /**
   * Visita não pôde ser concluída por outros motivos
   */
  VISITA_INCONCLUSIVA = 'visita_inconclusiva',

  /**
   * Visita foi cancelada
   */
  VISITA_CANCELADA = 'visita_cancelada',

  /**
   * Visita não foi realizada
   */
  NAO_REALIZADA = 'nao_realizada',

  /**
   * Visita foi realizada com sucesso
   */
  REALIZADA_COM_SUCESSO = 'realizada_com_sucesso',
}

/**
 * Mapeamento de resultados para descrições legíveis
 */
export const RESULTADO_VISITA_LABELS = {
  [ResultadoVisita.CONFORME]: 'Conforme',
  [ResultadoVisita.NAO_CONFORME]: 'Não Conforme',
  [ResultadoVisita.PARCIALMENTE_CONFORME]: 'Parcialmente Conforme',
  [ResultadoVisita.REQUER_ACAO]: 'Requer Ação',
  [ResultadoVisita.BENEFICIARIO_AUSENTE]: 'Beneficiário Ausente',
  [ResultadoVisita.ENDERECO_NAO_LOCALIZADO]: 'Endereço Não Localizado',
  [ResultadoVisita.VISITA_INCONCLUSIVA]: 'Visita Inconclusiva',
  [ResultadoVisita.VISITA_CANCELADA]: 'Visita Cancelada',
  [ResultadoVisita.NAO_REALIZADA]: 'Visita Não Realizada',
  [ResultadoVisita.REALIZADA_COM_SUCESSO]: 'Realizada com Sucesso',
};

/**
 * Mapeamento de resultados para cores
 */
export const RESULTADO_VISITA_CORES = {
  [ResultadoVisita.CONFORME]: '#28a745',
  [ResultadoVisita.NAO_CONFORME]: '#dc3545',
  [ResultadoVisita.PARCIALMENTE_CONFORME]: '#ffc107',
  [ResultadoVisita.REQUER_ACAO]: '#fd7e14',
  [ResultadoVisita.BENEFICIARIO_AUSENTE]: '#6c757d',
  [ResultadoVisita.ENDERECO_NAO_LOCALIZADO]: '#6c757d',
  [ResultadoVisita.VISITA_INCONCLUSIVA]: '#6c757d',
  [ResultadoVisita.VISITA_CANCELADA]: '#6c757d',
  [ResultadoVisita.NAO_REALIZADA]: '#6c757d',
  [ResultadoVisita.REALIZADA_COM_SUCESSO]: '#28a745',
};

/**
 * Descrições detalhadas dos resultados
 */
export const RESULTADO_VISITA_DESCRICOES = {
  [ResultadoVisita.CONFORME]: 'A situação familiar está em conformidade com os critérios do benefício',
  [ResultadoVisita.NAO_CONFORME]: 'A situação não atende aos critérios necessários para manutenção do benefício',
  [ResultadoVisita.PARCIALMENTE_CONFORME]: 'A situação atende parcialmente aos critérios, necessitando acompanhamento',
  [ResultadoVisita.REQUER_ACAO]: 'Situação crítica que requer intervenção imediata',
  [ResultadoVisita.BENEFICIARIO_AUSENTE]: 'Beneficiário não foi encontrado no endereço cadastrado',
  [ResultadoVisita.ENDERECO_NAO_LOCALIZADO]: 'Endereço informado não foi localizado',
  [ResultadoVisita.VISITA_INCONCLUSIVA]: 'Visita não pôde ser concluída devido a circunstâncias externas',
  [ResultadoVisita.VISITA_CANCELADA]: 'Visita foi cancelada',
  [ResultadoVisita.NAO_REALIZADA]: 'Visita não foi realizada',
  [ResultadoVisita.REALIZADA_COM_SUCESSO]: 'Visita foi realizada com sucesso e avaliação concluída',
};

/**
 * Resultados que indicam conformidade (total ou parcial)
 */
export const RESULTADOS_CONFORMES = [
  ResultadoVisita.CONFORME,
  ResultadoVisita.PARCIALMENTE_CONFORME
];

/**
 * Resultados que indicam não conformidade
 */
export const RESULTADOS_NAO_CONFORMES = [
  ResultadoVisita.NAO_CONFORME,
  ResultadoVisita.REQUER_ACAO
];

/**
 * Resultados que indicam visita não realizada
 */
export const RESULTADOS_VISITA_NAO_REALIZADA = [
  ResultadoVisita.BENEFICIARIO_AUSENTE,
  ResultadoVisita.ENDERECO_NAO_LOCALIZADO,
  ResultadoVisita.VISITA_INCONCLUSIVA,
  ResultadoVisita.VISITA_CANCELADA,
  ResultadoVisita.NAO_REALIZADA,
];

/**
 * Resultados que requerem reagendamento
 */
export const RESULTADOS_REQUEREM_REAGENDAMENTO = [
  ResultadoVisita.BENEFICIARIO_AUSENTE,
  ResultadoVisita.ENDERECO_NAO_LOCALIZADO,
  ResultadoVisita.VISITA_INCONCLUSIVA,
  ResultadoVisita.VISITA_CANCELADA,
  ResultadoVisita.NAO_REALIZADA,
];

/**
 * Verifica se o resultado indica conformidade
 * @param resultado Resultado a ser verificado
 * @returns true se o resultado indica conformidade
 */
export function isResultadoConforme(resultado: ResultadoVisita): boolean {
  return RESULTADOS_CONFORMES.includes(resultado);
}

/**
 * Verifica se o resultado indica não conformidade
 * @param resultado Resultado a ser verificado
 * @returns true se o resultado indica não conformidade
 */
export function isResultadoNaoConforme(resultado: ResultadoVisita): boolean {
  return RESULTADOS_NAO_CONFORMES.includes(resultado);
}

/**
 * Verifica se o resultado indica que a visita não foi realizada
 * @param resultado Resultado a ser verificado
 * @returns true se a visita não foi realizada
 */
export function isVisitaNaoRealizada(resultado: ResultadoVisita): boolean {
  return RESULTADOS_VISITA_NAO_REALIZADA.includes(resultado);
}

/**
 * Verifica se o resultado requer reagendamento
 * @param resultado Resultado a ser verificado
 * @returns true se requer reagendamento
 */
export function requerReagendamento(resultado: ResultadoVisita): boolean {
  return RESULTADOS_REQUEREM_REAGENDAMENTO.includes(resultado);
}

/**
 * Obtém o rótulo legível de um resultado de visita
 * @param resultado Resultado a ser convertido
 * @returns Rótulo legível do resultado
 */
export function getResultadoVisitaLabel(resultado: ResultadoVisita): string {
  return RESULTADO_VISITA_LABELS[resultado] || resultado;
}

/**
 * Obtém a cor associada a um resultado de visita
 * @param resultado Resultado a ser verificado
 * @returns Código hexadecimal da cor
 */
export function getResultadoVisitaCor(resultado: ResultadoVisita): string {
  return RESULTADO_VISITA_CORES[resultado];
}