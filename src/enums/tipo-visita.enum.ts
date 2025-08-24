/**
 * Enum para representar os diferentes tipos de visita domiciliar.
 * 
 * @description
 * Define os tipos de visitas que podem ser realizadas pelos técnicos da SEMTAS,
 * cada uma com objetivos e procedimentos específicos.
 * 
 * @author Sistema PGBEN
 * @since 2025-01-15
 */
export enum TipoVisita {
  /**
   * Primeira visita após concessão do benefício
   */
  INICIAL = 'inicial',

  /**
   * Visita de acompanhamento periódico
   */
  ACOMPANHAMENTO = 'acompanhamento',

  /**
   * Visita para avaliação de renovação do benefício
   */
  RENOVACAO = 'renovacao',

  /**
   * Visita emergencial por situação crítica
   */
  EMERGENCIAL = 'emergencial',

  /**
   * Visita para verificação de denúncia ou irregularidade
   */
  VERIFICACAO = 'verificacao',

  /**
   * Visita de encerramento do acompanhamento
   */
  ENCERRAMENTO = 'encerramento'
}

/**
 * Mapeamento de tipos para descrições legíveis
 */
export const TIPO_VISITA_LABELS = {
  [TipoVisita.INICIAL]: 'Visita Inicial',
  [TipoVisita.ACOMPANHAMENTO]: 'Acompanhamento',
  [TipoVisita.RENOVACAO]: 'Renovação',
  [TipoVisita.EMERGENCIAL]: 'Emergencial',
  [TipoVisita.VERIFICACAO]: 'Verificação',
  [TipoVisita.ENCERRAMENTO]: 'Encerramento'
};

/**
 * Descrições detalhadas dos tipos de visita
 */
export const TIPO_VISITA_DESCRICOES = {
  [TipoVisita.INICIAL]: 'Primeira visita após a concessão do benefício para verificação inicial das condições',
  [TipoVisita.ACOMPANHAMENTO]: 'Visita periódica de acompanhamento da situação socioeconômica da família',
  [TipoVisita.RENOVACAO]: 'Visita para avaliação das condições para renovação do benefício',
  [TipoVisita.EMERGENCIAL]: 'Visita urgente devido a situação crítica ou emergencial',
  [TipoVisita.VERIFICACAO]: 'Visita para verificação de denúncia ou possível irregularidade',
  [TipoVisita.ENCERRAMENTO]: 'Visita final para encerramento do acompanhamento social'
};

/**
 * Tipos de visita que requerem prioridade alta
 */
export const TIPOS_VISITA_PRIORITARIOS = [
  TipoVisita.EMERGENCIAL,
  TipoVisita.VERIFICACAO
];

/**
 * Tipos de visita que são obrigatórios
 */
export const TIPOS_VISITA_OBRIGATORIOS = [
  TipoVisita.INICIAL,
  TipoVisita.RENOVACAO
];

/**
 * Verifica se um tipo de visita requer prioridade alta
 * @param tipo Tipo de visita a ser verificado
 * @returns true se o tipo requer prioridade alta
 */
export function isTipoVisitaPrioritario(tipo: TipoVisita): boolean {
  return TIPOS_VISITA_PRIORITARIOS.includes(tipo);
}

/**
 * Verifica se um tipo de visita é obrigatório
 * @param tipo Tipo de visita a ser verificado
 * @returns true se o tipo é obrigatório
 */
export function isTipoVisitaObrigatorio(tipo: TipoVisita): boolean {
  return TIPOS_VISITA_OBRIGATORIOS.includes(tipo);
}

/**
 * Obtém o rótulo legível de um tipo de visita
 * @param tipo Tipo de visita a ser convertido
 * @returns Rótulo legível do tipo
 */
export function getTipoVisitaLabel(tipo: TipoVisita): string {
  return TIPO_VISITA_LABELS[tipo] || tipo;
}