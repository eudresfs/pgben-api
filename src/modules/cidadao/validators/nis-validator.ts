import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'nisValidator', async: false })
export class NISValidator implements ValidatorConstraintInterface {
  validate(nis: string, args: ValidationArguments) {
    if (!nis) return false;

    // Remove caracteres especiais
    nis = nis.replace(/[^\d]/g, '');

    // Verifica se tem 11 dígitos
    if (nis.length !== 11) return false;

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(nis)) return false;

    // Validação do dígito verificador (algoritmo do PIS/PASEP/NIS)
    const multiplicadores = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;

    for (let i = 0; i < 10; i++) {
      soma += parseInt(nis.charAt(i)) * multiplicadores[i];
    }

    const resto = soma % 11;
    const digitoVerificador = resto < 2 ? 0 : 11 - resto;

    return digitoVerificador === parseInt(nis.charAt(10));
  }

  defaultMessage(args: ValidationArguments) {
    return 'NIS inválido';
  }
}
