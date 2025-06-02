import { BadRequestException } from '@nestjs/common';
import { ParametroTipoEnum } from '../../../enums';

/**
 * Exceção lançada quando um valor de parâmetro não pode ser convertido para o tipo esperado.
 * Estende a BadRequestException padrão do NestJS com mensagem personalizada.
 */
export class ParametroTipoInvalidoException extends BadRequestException {
  /**
   * Cria uma nova instância da exceção.
   * @param chave - Chave do parâmetro
   * @param valor - Valor que não pode ser convertido
   * @param tipo - Tipo esperado para o parâmetro
   */
  constructor(chave: string, valor: string, tipo: ParametroTipoEnum) {
    super(`Valor '${valor}' do parâmetro '${chave}' não pode ser convertido para o tipo ${tipo}`);
  }
}
