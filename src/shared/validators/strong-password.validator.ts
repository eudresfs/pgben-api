import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Validador personalizado para senhas fortes
 *
 * Verifica se uma senha é forte o suficiente, considerando:
 * - Não contém informações pessoais (nome, email, etc)
 * - Não é uma senha comum ou facilmente adivinhável
 */
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPassword implements ValidatorConstraintInterface {
  // Lista de senhas comuns que devem ser evitadas
  private commonPasswords = [
    'senha123',
    'password',
    '123456',
    'admin',
    'qwerty',
    'abc123',
    'senha',
    '12345678',
    'admin123',
    'semtas',
    'pgben',
    'natal',
    'brasil',
    'sistema',
    'usuario',
  ];

  validate(password: string, args: ValidationArguments): boolean {
    if (!password) return false;

    // Verifica se a senha está na lista de senhas comuns
    if (this.commonPasswords.includes(password.toLowerCase())) {
      return false;
    }

    // Obtém o objeto que está sendo validado (para verificar informações pessoais)
    const object = args.object as any;

    // Verifica se a senha contém o nome do usuário
    if (
      object.nome &&
      password.toLowerCase().includes(object.nome.toLowerCase().split(' ')[0])
    ) {
      return false;
    }

    // Verifica se a senha contém o email do usuário
    if (
      object.email &&
      password.toLowerCase().includes(object.email.split('@')[0].toLowerCase())
    ) {
      return false;
    }

    // Verifica se a senha contém a matrícula do usuário
    if (object.matricula && password.includes(object.matricula)) {
      return false;
    }

    // Verifica se a senha contém o CPF do usuário (apenas os números)
    if (object.cpf) {
      const cpfNumbers = object.cpf.replace(/[^\d]/g, '');
      // Verifica se a senha contém sequências de 4 ou mais dígitos do CPF
      for (let i = 0; i <= cpfNumbers.length - 4; i++) {
        const sequence = cpfNumbers.substring(i, i + 4);
        if (password.includes(sequence)) {
          return false;
        }
      }
    }

    return true;
  }

  defaultMessage(): string {
    return 'A senha não pode conter informações pessoais ou ser uma senha comum';
  }
}
