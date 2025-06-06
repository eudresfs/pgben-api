import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

/**
 * Validador para verificar se dois campos possuem o mesmo valor
 *
 * Útil para confirmação de senhas, emails, etc.
 */
@ValidatorConstraint({ name: 'match', async: false })
export class MatchValidator implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    return value === relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} deve ser igual a ${relatedPropertyName}`;
  }
}

/**
 * Decorator para validar se dois campos possuem o mesmo valor
 *
 * @param property - Nome da propriedade que deve ter o mesmo valor
 * @param validationOptions - Opções de validação
 *
 * @example
 * ```typescript
 * export class AlterarSenhaDto {
 *   @IsString()
 *   novaSenha: string;
 *
 *   @IsString()
 *   @Match('novaSenha', { message: 'As senhas não coincidem' })
 *   confirmarSenha: string;
 * }
 * ```
 */
export function Match(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: MatchValidator,
    });
  };
}
