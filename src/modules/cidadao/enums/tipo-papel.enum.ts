/**
 * Constantes para os papéis de um cidadão
 * 
 * Este arquivo substitui o antigo enum PAPEL, fornecendo constantes
 * que correspondem aos valores na tabela papéis.
 */
export const TipoPapel = {
   BENEFICIARIO: 'beneficiario', 
   REQUERENTE: 'requerente',
   REPRESENTANTE_LEGAL: 'representante_legal',
   MEMBRO_COMPOSICAO: 'membro_composicao'
} as const;

/**
 * Tipo que representa os valores possíveis de papéis
 */
export type PaperType = typeof TipoPapel[keyof typeof TipoPapel];

/**
 * Array com todos os valores de papéis
 */
export const ALL_PAPERS = Object.values(TipoPapel);


export enum Parentesco {
   CONJUGE = 'conjuge',
   FILHO = 'filho',
   PAI = 'pai',
   MAE = 'mae',
   IRMAO = 'irmao',
   AVO = 'avo',
   NETO = 'neto',
   TIO = 'tio',
   SOBRINHO = 'sobrinho',
   OUTRO = 'outro',
 }