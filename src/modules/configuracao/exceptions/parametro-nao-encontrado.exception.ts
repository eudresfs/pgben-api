import { NotFoundException } from '@nestjs/common';

/**
 * Exceção lançada quando um parâmetro de configuração não é encontrado.
 * Estende a NotFoundException padrão do NestJS com mensagem personalizada.
 */
export class ParametroNaoEncontradoException extends NotFoundException {
  /**
   * Cria uma nova instância da exceção.
   * @param chave - Chave do parâmetro que não foi encontrado
   */
  constructor(chave: string) {
    super(`Parâmetro com chave '${chave}' não encontrado`);
  }
}
