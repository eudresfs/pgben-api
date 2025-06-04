import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

/**
 * Interface para configuração de validação de senha
 */
export interface PasswordStrengthOptions {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  forbidCommonPasswords?: boolean;
}

/**
 * Lista de senhas comuns que devem ser rejeitadas
 */
const COMMON_PASSWORDS = [
  '123456',
  'password',
  '123456789',
  '12345678',
  '12345',
  '1234567',
  '1234567890',
  'qwerty',
  'abc123',
  'million2',
  '000000',
  '1234',
  'iloveyou',
  'aaron431',
  'password1',
  'qqww1122',
  '123',
  'omgpop',
  '123321',
  '654321',
  'admin',
  'root',
  'user',
  'guest',
  'test',
];

/**
 * Validador customizado para força de senha
 * Implementa verificações de segurança para senhas
 */
@ValidatorConstraint({ name: 'passwordStrength', async: false })
export class PasswordStrengthConstraint
  implements ValidatorConstraintInterface
{
  /**
   * Valida a força da senha
   * @param password Senha a ser validada
   * @param args Argumentos de validação
   * @returns true se a senha for válida
   */
  validate(password: string, args: ValidationArguments): boolean {
    if (!password || typeof password !== 'string') {
      return false;
    }

    const options: PasswordStrengthOptions = args.constraints[0] || {};

    // Configurações padrão
    const config = {
      minLength: options.minLength || 8,
      requireUppercase: options.requireUppercase !== false,
      requireLowercase: options.requireLowercase !== false,
      requireNumbers: options.requireNumbers !== false,
      requireSpecialChars: options.requireSpecialChars !== false,
      forbidCommonPasswords: options.forbidCommonPasswords !== false,
    };

    // Verificar comprimento mínimo
    if (password.length < config.minLength) {
      return false;
    }

    // Verificar letra maiúscula
    if (config.requireUppercase && !/[A-Z]/.test(password)) {
      return false;
    }

    // Verificar letra minúscula
    if (config.requireLowercase && !/[a-z]/.test(password)) {
      return false;
    }

    // Verificar números
    if (config.requireNumbers && !/\d/.test(password)) {
      return false;
    }

    // Verificar caracteres especiais
    if (
      config.requireSpecialChars &&
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ) {
      return false;
    }

    // Verificar senhas comuns
    if (
      config.forbidCommonPasswords &&
      COMMON_PASSWORDS.includes(password.toLowerCase())
    ) {
      return false;
    }

    // Verificar padrões sequenciais
    if (PasswordStrengthConstraint.hasSequentialPattern(password)) {
      return false;
    }

    // Verificar repetição excessiva
    if (PasswordStrengthConstraint.hasExcessiveRepetition(password)) {
      return false;
    }

    return true;
  }

  /**
   * Retorna mensagem de erro personalizada
   * @param args Argumentos de validação
   * @returns Mensagem de erro
   */
  defaultMessage(args: ValidationArguments): string {
    const options: PasswordStrengthOptions = args.constraints[0] || {};
    const config = {
      minLength: options.minLength || 8,
      requireUppercase: options.requireUppercase !== false,
      requireLowercase: options.requireLowercase !== false,
      requireNumbers: options.requireNumbers !== false,
      requireSpecialChars: options.requireSpecialChars !== false,
    };

    const requirements: string[] = [];

    requirements.push(`pelo menos ${config.minLength} caracteres`);

    if (config.requireUppercase) {
      requirements.push('pelo menos uma letra maiúscula');
    }

    if (config.requireLowercase) {
      requirements.push('pelo menos uma letra minúscula');
    }

    if (config.requireNumbers) {
      requirements.push('pelo menos um número');
    }

    if (config.requireSpecialChars) {
      requirements.push('pelo menos um caractere especial');
    }

    return `A senha deve conter ${requirements.join(', ')} e não pode ser uma senha comum ou conter padrões sequenciais.`;
  }

  /**
   * Verifica se a senha contém padrões sequenciais
   * @param password Senha a ser verificada
   * @returns true se contiver padrões sequenciais
   */
  public static hasSequentialPattern(password: string): boolean {
    // Verificar sequências numéricas (123, 321, etc.)
    for (let i = 0; i < password.length - 2; i++) {
      const char1 = password.charCodeAt(i);
      const char2 = password.charCodeAt(i + 1);
      const char3 = password.charCodeAt(i + 2);

      // Sequência crescente ou decrescente
      if (
        (char2 === char1 + 1 && char3 === char2 + 1) ||
        (char2 === char1 - 1 && char3 === char2 - 1)
      ) {
        return true;
      }
    }

    // Verificar sequências de teclado comuns
    const keyboardPatterns = [
      'qwerty',
      'asdfgh',
      'zxcvbn',
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm',
      '1234567890',
    ];

    const lowerPassword = password.toLowerCase();
    for (const pattern of keyboardPatterns) {
      if (
        lowerPassword.includes(pattern) ||
        lowerPassword.includes(pattern.split('').reverse().join(''))
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Verifica se a senha tem repetição excessiva de caracteres
   * @param password Senha a ser verificada
   * @returns true se tiver repetição excessiva
   */
  public static hasExcessiveRepetition(password: string): boolean {
    // Verificar se mais de 50% dos caracteres são iguais
    const charCount = new Map<string, number>();

    for (const char of password) {
      charCount.set(char, (charCount.get(char) || 0) + 1);
    }

    for (const count of charCount.values()) {
      if (count > password.length * 0.5) {
        return true;
      }
    }

    // Verificar sequências repetitivas (aaa, 111, etc.)
    let consecutiveCount = 1;
    for (let i = 1; i < password.length; i++) {
      if (password[i] === password[i - 1]) {
        consecutiveCount++;
        if (consecutiveCount >= 3) {
          return true;
        }
      } else {
        consecutiveCount = 1;
      }
    }

    return false;
  }
}

/**
 * Decorator para validação de força de senha
 * @param options Opções de configuração
 * @param validationOptions Opções de validação do class-validator
 * @returns Decorator function
 */
export function IsPasswordStrong(
  options?: PasswordStrengthOptions,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: PasswordStrengthConstraint,
    });
  };
}

/**
 * Função utilitária para calcular score de força da senha
 * @param password Senha a ser avaliada
 * @returns Score de 0 a 100
 */
export function calculatePasswordStrength(password: string): number {
  if (!password) {
    return 0;
  }

  let score = 0;

  // Comprimento (máximo 25 pontos)
  score += Math.min(password.length * 2, 25);

  // Variedade de caracteres (máximo 25 pontos)
  if (/[a-z]/.test(password)) {
    score += 5;
  }
  if (/[A-Z]/.test(password)) {
    score += 5;
  }
  if (/\d/.test(password)) {
    score += 5;
  }
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 10;
  }

  // Complexidade (máximo 25 pontos)
  const uniqueChars = new Set(password).size;
  score += Math.min(uniqueChars * 2, 25);

  // Penalidades
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    score -= 50;
  }
  if (PasswordStrengthConstraint.hasSequentialPattern(password)) {
    score -= 25;
  }
  if (PasswordStrengthConstraint.hasExcessiveRepetition(password)) {
    score -= 25;
  }

  // Bônus por comprimento extra (máximo 25 pontos)
  if (password.length > 12) {
    score += Math.min((password.length - 12) * 3, 25);
  }

  return Math.max(0, Math.min(100, score));
}
