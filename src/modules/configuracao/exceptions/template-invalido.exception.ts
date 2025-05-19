import { BadRequestException } from '@nestjs/common';

/**
 * Exceção lançada quando um template é considerado inválido.
 * Estende a BadRequestException padrão do NestJS com mensagem personalizada.
 */
export class TemplateInvalidoException extends BadRequestException {
  /**
   * Cria uma nova instância da exceção.
   * @param codigo - Código do template
   * @param motivo - Motivo da invalidação
   */
  constructor(codigo: string, motivo: string) {
    super(`Template '${codigo}' inválido: ${motivo}`);
  }
}
