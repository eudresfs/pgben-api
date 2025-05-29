import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

/**
 * Validador de CPF
 *
 * Verifica se o CPF informado é válido, incluindo cálculo dos dígitos verificadores
 */
@ValidatorConstraint({ name: 'cpf', async: false })
export class CPFValidator implements ValidatorConstraintInterface {
  validate(cpf: string, args: ValidationArguments) {
    if (!cpf) {return false;}

    // Remove caracteres não numéricos
    cpf = cpf.replace(/[^\d]/g, '');

    // Verifica se tem 11 dígitos
    if (cpf.length !== 11) {return false;}

    // Verifica se todos os dígitos são iguais (CPF inválido, mas passa na verificação de dígitos)
    if (/^(\d)\1{10}$/.test(cpf)) {return false;}

    // Cálculo do primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    const dv1 = resto > 9 ? 0 : resto;

    // Cálculo do segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    const dv2 = resto > 9 ? 0 : resto;

    // Verifica se os dígitos verificadores estão corretos
    return dv1 === parseInt(cpf.charAt(9)) && dv2 === parseInt(cpf.charAt(10));
  }

  defaultMessage(args: ValidationArguments) {
    return 'CPF inválido';
  }
}

/**
 * Validador de NIS (PIS/PASEP/NIT)
 *
 * Verifica se o NIS informado é válido, incluindo cálculo do dígito verificador
 */
@ValidatorConstraint({ name: 'nis', async: false })
export class NISValidator implements ValidatorConstraintInterface {
  validate(nis: string, args: ValidationArguments) {
    if (!nis) {return false;}

    // Remove caracteres não numéricos
    nis = nis.replace(/[^\d]/g, '');

    // Verifica se tem 11 dígitos
    if (nis.length !== 11) {return false;}

    // Verifica se todos os dígitos são iguais (NIS inválido, mas passa na verificação de dígitos)
    if (/^(\d)\1{10}$/.test(nis)) {return false;}

    // Pesos para cálculo do dígito verificador
    const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    // Cálculo do dígito verificador
    let soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(nis.charAt(i)) * pesos[i];
    }
    const resto = soma % 11;
    let dv = 11 - resto;
    if (dv === 10 || dv === 11) {dv = 0;}

    // Verifica se o dígito verificador está correto
    return dv === parseInt(nis.charAt(10));
  }

  defaultMessage(args: ValidationArguments) {
    return 'NIS (PIS/PASEP/NIT) inválido';
  }
}

/**
 * Validador de CEP
 *
 * Verifica se o CEP está no formato correto (apenas validação de formato)
 */
@ValidatorConstraint({ name: 'cep', async: false })
export class CEPValidator implements ValidatorConstraintInterface {
  validate(cep: string, args: ValidationArguments) {
    if (!cep) {return false;}

    // Remove caracteres não numéricos
    cep = cep.replace(/[^\d]/g, '');

    // Verifica se tem 8 dígitos
    return cep.length === 8;
  }

  defaultMessage(args: ValidationArguments) {
    return 'CEP inválido, deve conter 8 dígitos';
  }
}

/**
 * Validador de telefone brasileiro
 *
 * Verifica se o telefone está em um formato válido para Brasil
 */
@ValidatorConstraint({ name: 'telefone', async: false })
export class TelefoneValidator implements ValidatorConstraintInterface {
  validate(telefone: string, args: ValidationArguments) {
    if (!telefone) {return false;}

    // Remove caracteres não numéricos
    telefone = telefone.replace(/[^\d]/g, '');

    // Verifica se tem entre 10 e 11 dígitos (com DDD)
    return telefone.length >= 10 && telefone.length <= 11;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Telefone inválido, deve conter DDD + número (10 ou 11 dígitos no total)';
  }
}

/**
 * Decorator para validação de CPF
 */
export function IsCPF(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCPF',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: CPFValidator,
    });
  };
}

/**
 * Decorator para validação de NIS
 */
export function IsNIS(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNIS',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: NISValidator,
    });
  };
}

/**
 * Decorator para validação de CEP
 */
export function IsCEP(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCEP',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: CEPValidator,
    });
  };
}

/**
 * Decorator para validação de telefone brasileiro
 */
export function IsTelefone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isTelefone',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: TelefoneValidator,
    });
  };
}
