/**
 * Enum para tipos de ação no WhatsApp Flow
 * 
 * @description Define os tipos de ação disponíveis para interação
 * com o sistema de WhatsApp Flows, cada um representando uma
 * operação específica no fluxo de conversação.
 * 
 * @author PGBen Development Team
 * @since 1.0.0
 */
export enum ActionType {
  /**
   * Ação de ping para verificar conectividade
   * Utilizada pelo WhatsApp para testar a disponibilidade do endpoint
   */
  PING = 'ping',

  /**
   * Ação de troca de dados
   * Utilizada para processar dados de formulários e navegação entre telas
   */
  DATA_EXCHANGE = 'data_exchange',

  /**
   * Ação de inicialização do fluxo
   * Utilizada quando o fluxo é iniciado pela primeira vez
   */
  INIT = 'init',

  /**
   * Ação de retorno/voltar no flow
   */
  BACK = 'back',
}