import { BadRequestException } from '@nestjs/common';

/**
 * Exceção lançada quando dados fornecidos não passam na validação.
 *
 * Esta exceção padroniza as respostas para erros de validação de dados,
 * fornecendo informações específicas sobre o campo e valor que falharam.
 */
export class ValidationErrorException extends BadRequestException {
  constructor(
    field: string,
    value: any,
    expectedType?: string,
    additionalInfo?: string,
  ) {
    const message = `Erro de validação no campo '${field}'`;
    const details = {
      field,
      value,
      expectedType,
      additionalInfo,
      message:
        additionalInfo ||
        `Valor '${value}' é inválido para o campo '${field}'${expectedType ? ` (esperado: ${expectedType})` : ''}`,
    };

    super({
      message,
      code: 'VALIDATION_ERROR',
      details,
    });
  }
}
