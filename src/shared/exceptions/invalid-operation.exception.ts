import { BadRequestException } from '@nestjs/common';

/**
 * Exceção lançada quando uma operação não pode ser executada devido ao estado atual da entidade.
 * 
 * Esta exceção é usada para casos onde a operação é tecnicamente válida,
 * mas não pode ser executada devido ao contexto ou estado atual.
 */
export class InvalidOperationException extends BadRequestException {
  constructor(
    operation: string,
    reason: string,
    currentState?: string,
    requiredState?: string
  ) {
    const message = `Operação '${operation}' não pode ser executada`;
    const details = {
      operation,
      reason,
      currentState,
      requiredState,
      message: `${reason}${currentState ? ` (estado atual: ${currentState})` : ''}${requiredState ? ` (estado necessário: ${requiredState})` : ''}`
    };

    super({
      message,
      code: 'INVALID_OPERATION',
      details
    });
  }
}