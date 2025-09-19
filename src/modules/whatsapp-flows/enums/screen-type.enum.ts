/**
 * Enum que define os tipos de telas disponíveis no WhatsApp Flows
 * 
 * @description Define as telas que podem ser exibidas durante o fluxo de interação
 * com o WhatsApp Business API. Cada tela representa uma etapa específica do processo.
 * 
 * @author SEMTAS Development Team
 * @since 1.0.0
 */
export enum ScreenType {
  /**
   * Tela inicial de autenticação
   * Permite ao usuário inserir suas credenciais (username/password)
   */
  INICIO = 'inicio',

  /**
   * Tela de recuperação de senha
   * Permite ao usuário solicitar reset de senha via email
   */
  ESQUECEU_SENHA = 'esqueceu_senha',

  /**
   * Tela de busca de cidadão
   * Permite buscar cidadão por CPF no sistema
   */
  BUSCAR_CIDADAO = 'buscar_cidadao',

  /**
   * Tela de cadastro de cidadão
   * Exibida quando o cidadão não é encontrado na busca
   */
  CADASTRO_CIDADAO = 'cadastro_cidadao'
}