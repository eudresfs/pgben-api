import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Validador customizado para enums com mensagens de erro aprimoradas
 * 
 * Características:
 * - Mensagens de erro mais amigáveis
 * - Sugestões de valores válidos
 * - Suporte a case-insensitive (opcional)
 * - Formatação automática de valores
 */
@ValidatorConstraint({ name: 'isEnumValue', async: false })
export class IsEnumValueConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    const [enumObject, options] = args.constraints;
    const { caseSensitive = true } = options || {};
    
    if (value === null || value === undefined) {
      return false;
    }
    
    const enumValues = Object.values(enumObject);
    
    if (caseSensitive) {
      return enumValues.includes(value);
    }
    
    // Comparação case-insensitive
    const valueStr = String(value).toLowerCase();
    return enumValues.some(enumValue => 
      String(enumValue).toLowerCase() === valueStr
    );
  }

  defaultMessage(args: ValidationArguments): string {
    const [enumObject, options] = args.constraints;
    const { enumName, caseSensitive = true } = options || {};
    const enumValues = Object.values(enumObject);
    const property = args.property;
    const value = args.value;
    
    // Encontrar valores similares para sugestões
    const suggestions = this.findSimilarValues(value, enumValues);
    
    let message = `O campo '${property}' deve ser um dos valores válidos`;
    
    if (enumName) {
      message += ` para ${enumName}`;
    }
    
    message += `: ${enumValues.join(', ')}`;
    
    if (suggestions.length > 0) {
      message += `. Você quis dizer: ${suggestions.join(', ')}?`;
    }
    
    if (!caseSensitive) {
      message += ' (não diferencia maiúsculas/minúsculas)';
    }
    
    return message;
  }
  
  /**
   * Encontra valores similares usando distância de Levenshtein simplificada
   */
  private findSimilarValues(input: any, enumValues: any[]): string[] {
    if (!input || typeof input !== 'string') {
      return [];
    }
    
    const inputStr = input.toLowerCase();
    const suggestions: Array<{ value: string; distance: number }> = [];
    
    for (const enumValue of enumValues) {
      const enumStr = String(enumValue).toLowerCase();
      const distance = this.levenshteinDistance(inputStr, enumStr);
      
      // Considerar como sugestão se a distância for pequena
      if (distance <= Math.max(2, Math.floor(enumStr.length * 0.3))) {
        suggestions.push({ value: String(enumValue), distance });
      }
    }
    
    // Ordenar por distância e retornar os 3 melhores
    return suggestions
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map(s => s.value);
  }
  
  /**
   * Calcula a distância de Levenshtein entre duas strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

/**
 * Decorator para validação de enum com mensagens aprimoradas
 * 
 * @param enumObject - O objeto enum a ser validado
 * @param options - Opções de validação
 * @param validationOptions - Opções padrão do class-validator
 * 
 * @example
 * ```typescript
 * enum StatusEnum {
 *   ATIVO = 'ATIVO',
 *   INATIVO = 'INATIVO',
 *   PENDENTE = 'PENDENTE'
 * }
 * 
 * class CreateUserDto {
 *   @IsEnumValue(StatusEnum, {
 *     enumName: 'Status do Usuário',
 *     caseSensitive: false
 *   })
 *   status: StatusEnum;
 * }
 * ```
 */
export function IsEnumValue(
  enumObject: object,
  options?: {
    enumName?: string;
    caseSensitive?: boolean;
  },
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [enumObject, options],
      validator: IsEnumValueConstraint,
    });
  };
}

/**
 * Utilitário para criar mensagens de erro padronizadas para enums
 */
export class EnumValidationHelper {
  /**
   * Cria uma mensagem de erro padronizada para enum
   */
  static createEnumMessage(
    enumObject: object,
    enumName?: string,
    fieldName?: string
  ): string {
    const values = Object.values(enumObject).join(', ');
    const field = fieldName || 'campo';
    const name = enumName || 'enum';
    
    return `O ${field} deve ser um dos valores válidos para ${name}: ${values}`;
  }
  
  /**
   * Verifica se um valor é válido para o enum
   */
  static isValidEnumValue(value: any, enumObject: object): boolean {
    return Object.values(enumObject).includes(value);
  }
  
  /**
   * Normaliza um valor para o enum (útil para case-insensitive)
   */
  static normalizeEnumValue(
    value: any,
    enumObject: object,
    caseSensitive = true
  ): any {
    if (!value) return value;
    
    const enumValues = Object.values(enumObject);
    
    if (caseSensitive) {
      return enumValues.find(enumValue => enumValue === value);
    }
    
    const valueStr = String(value).toLowerCase();
    return enumValues.find(enumValue => 
      String(enumValue).toLowerCase() === valueStr
    );
  }
  
  /**
   * Obtém todos os valores válidos de um enum
   */
  static getEnumValues(enumObject: object): any[] {
    return Object.values(enumObject);
  }
  
  /**
   * Obtém todas as chaves de um enum
   */
  static getEnumKeys(enumObject: object): string[] {
    return Object.keys(enumObject);
  }
}