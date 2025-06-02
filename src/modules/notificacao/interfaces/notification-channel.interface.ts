import { NotificacaoSistema } from '../../../entities/notification.entity';

/**
 * Interface para implementação de canais de notificação
 * Cada canal (email, in-app, sms, etc) deve implementar esta interface
 */
export interface CanalNotificacao {
  /**
   * Identificador único do canal
   */
  readonly canal_id: string;

  /**
   * Envia uma notificação através deste canal
   * @param notificacao A notificação a ser enviada
   * @returns Promise com resultado da tentativa de envio
   */
  enviar(notificacao: NotificacaoSistema): Promise<ResultadoEnvio>;

  /**
   * Verifica se o canal está disponível para envio
   * @returns Promise com status de disponibilidade
   */
  verificarDisponibilidade(): Promise<boolean>;
}

/**
 * Interface para o resultado de uma tentativa de envio
 */
export interface ResultadoEnvio {
  sucesso: boolean;
  mensagem?: string;
  data_envio: Date;
  erro?: Error;
  dados_resposta?: Record<string, any>;
  identificador_externo?: string; // ID de rastreamento do provedor externo, se houver
}
