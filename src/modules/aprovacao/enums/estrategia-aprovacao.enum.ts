/**
 * Enum para estratégias de aprovação
 * Inclui estratégias para escalonamento e autoaprovação
 */
export enum EstrategiaAprovacao {
  SIMPLES = 'simples',                    // Apenas um aprovador necessário
  MAIORIA = 'maioria',                    // Maioria dos aprovadores deve aprovar
  ESCALONAMENTO_SETOR = 'escalonamento_setor',  // Escalonamento por setor/unidade
  AUTOAPROVACAO_PERFIL = 'autoaprovacao_perfil' // Autoaprovação baseada no perfil do solicitante
}