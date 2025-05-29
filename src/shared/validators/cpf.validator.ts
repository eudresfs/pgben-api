import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Validador personalizado para CPF
 *
 * Verifica se um CPF é válido usando o algoritmo de validação oficial
 */
@ValidatorConstraint({ name: 'isCPF', async: false })
export class IsCPF implements ValidatorConstraintInterface {
  validate(cpf: string): boolean {
    if (!cpf) {return false;}

    // Remove caracteres não numéricos
    cpf = cpf.replace(/[^\d]/g, '');

    // Verifica se tem 11 dígitos
    if (cpf.length !== 11) {return false;}

    // Verifica se todos os dígitos são iguais (caso inválido)
    if (/^(\d)\1{10}$/.test(cpf)) {return false;}

    // Algoritmo de validação do CPF
    let soma = 0;
    let resto;

    // Primeiro dígito verificador
    for (let i = 1; i <= 9; i++) {
      soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }

    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) {resto = 0;}
    if (resto !== parseInt(cpf.substring(9, 10))) {return false;}

    // Segundo dígito verificador
    soma = 0;
    for (let i = 1; i <= 10; i++) {
      soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }

    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) {resto = 0;}
    if (resto !== parseInt(cpf.substring(10, 11))) {return false;}

    return true;
  }

  defaultMessage(): string {
    return 'CPF inválido';
  }
}
