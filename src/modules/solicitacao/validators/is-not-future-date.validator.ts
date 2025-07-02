import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Validador personalizado que verifica se uma data não é futura
 */
@ValidatorConstraint({ name: 'isNotFutureDate', async: false })
export class IsNotFutureDateConstraint implements ValidatorConstraintInterface {
  validate(date: any, args: ValidationArguments) {
    if (!date) {
      return true;
    } // Deixar que outras validações (como @IsNotEmpty) lidem com valores nulos

    // Converter para Date se for string
    const dateToValidate = date instanceof Date ? date : new Date(date);

    // Verificar se é uma data válida
    if (isNaN(dateToValidate.getTime())) {
      return false;
    }

    // Verificar se a data não é futura (considerando apenas a data, não a hora)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateToValidate.setHours(0, 0, 0, 0);

    return dateToValidate <= today;
  }

  defaultMessage(args: ValidationArguments) {
    return 'A data não pode ser futura';
  }
}

/**
 * Decorador personalizado que verifica se uma data não é futura
 * @param validationOptions Opções adicionais para a validação
 */
export function IsNotFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotFutureDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNotFutureDateConstraint,
    });
  };
}
