import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Validador personalizado para CEP brasileiro
 *
 * Aceita formatos:
 * - 00000-000 (com hífen)
 * - 00000000 (sem formatação)
 */
@ValidatorConstraint({ name: 'cepValidator', async: false })
export class CEPValidator implements ValidatorConstraintInterface {
  validate(text: string, args: ValidationArguments) {
    if (!text) {
      return true;
    } // Permite valores vazios (use @IsNotEmpty se quiser tornar obrigatório)

    // Remove todos os caracteres não numéricos
    const cepLimpo = text.replace(/\D/g, '');

    // Verifica se o CEP tem 8 dígitos
    if (cepLimpo.length !== 8) {
      return false;
    }

    // Verifica se o CEP não é uma sequência de dígitos iguais (00000000, 11111111, etc.)
    if (/^(\d)\1{7}$/.test(cepLimpo)) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'CEP inválido. Formato esperado: 00000-000 ou 00000000';
  }
}
