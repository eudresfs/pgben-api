import { BadRequestException } from '@nestjs/common';

/**
 * Exceção lançada quando um teste de integração falha.
 * Estende a BadRequestException padrão do NestJS com mensagem personalizada.
 */
export class IntegracaoTesteException extends BadRequestException {
  /**
   * Cria uma nova instância da exceção.
   * @param codigo - Código da integração
   * @param motivo - Motivo da falha
   */
  constructor(codigo: string, motivo: string) {
    super(`Teste de integração '${codigo}' falhou: ${motivo}`);
  }
}
