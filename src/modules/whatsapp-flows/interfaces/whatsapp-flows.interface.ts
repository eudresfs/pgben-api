import { WhatsAppFlowRequestDto } from '../dto/whatsapp-flow-request.dto';
import { EncryptedFlowResponseDto, WhatsAppFlowResponseDto } from '../dto/whatsapp-flow-response.dto';

/**
 * Interface para o serviço principal do WhatsApp Flows
 */
export interface IWhatsAppFlowsService {
  /**
   * Processa uma requisição criptografada do WhatsApp
   * @param encryptedRequest Requisição criptografada
   * @returns Resposta criptografada
   */
  processEncryptedRequest(
    encryptedRequest: any,
  ): Promise<EncryptedFlowResponseDto>;

  /**
   * Processa uma requisição descriptografada do WhatsApp
   * @param request Requisição descriptografada
   * @returns Resposta formatada
   */
  processRequest(
    request: WhatsAppFlowRequestDto,
  ): Promise<WhatsAppFlowResponseDto>;
}