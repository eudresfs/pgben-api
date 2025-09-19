import { WhatsAppFlowRequestDto } from '../dto/whatsapp-flow-request.dto';
import { WhatsAppFlowResponseDto } from '../dto/whatsapp-flow-response.dto';

/**
 * Interface para o serviço de gerenciamento de telas do WhatsApp Flows
 */
export interface IScreenHandlerService {
  /**
   * Processa a requisição baseada na tela atual
   * @param request Dados da requisição do WhatsApp Flow
   * @returns Resposta formatada para o WhatsApp
   */
  handleScreenRequest(
    request: WhatsAppFlowRequestDto,
  ): Promise<WhatsAppFlowResponseDto>;
}