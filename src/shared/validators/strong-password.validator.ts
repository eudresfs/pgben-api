import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Validador personalizado para senhas fortes
 *
 * Verifica se uma senha é forte o suficiente, considerando:
 * - Tem pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial
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

  // Armazena o motivo da falha para mensagem personalizada
  private failReason: string | null = null;

  validate(password: string, args: ValidationArguments): boolean {
    // Resetar o motivo da falha no início da validação
    this.failReason = null;

    if (!password) {
      this.failReason = 'A senha não pode estar vazia';
      return false;
    }

    // 1. Verificar regras de complexidade de senha

    // Verificar se tem pelo menos uma letra minúscula
    if (!/[a-z]/.test(password)) {
      this.failReason = 'A senha deve conter pelo menos uma letra minúscula';
      return false;
    }

    // Verificar se tem pelo menos uma letra maiúscula
    if (!/[A-Z]/.test(password)) {
      this.failReason = 'A senha deve conter pelo menos uma letra maiúscula';
      return false;
    }

    // Verificar se tem pelo menos um número
    if (!/\d/.test(password)) {
      this.failReason = 'A senha deve conter pelo menos um número';
      return false;
    }

    // Verificar se tem pelo menos um caractere especial
    if (!/[^A-Za-z0-9]/.test(password)) {
      this.failReason = 'A senha deve conter pelo menos um caractere especial';
      return false;
    }

    // Removida a restrição de caracteres permitidos para aceitar todos os caracteres especiais

    // 2. Verificar se é uma senha comum
    if (this.commonPasswords.includes(password.toLowerCase())) {
      this.failReason = 'A senha é muito comum e facilmente adivinhável';
      return false;
    }

    // 3. Verificar se contém informações pessoais
    const object = args.object as any;

    // Verifica se a senha contém o nome do usuário
    if (
      object.nome &&
      password.toLowerCase().includes(object.nome.toLowerCase().split(' ')[0])
    ) {
      this.failReason = 'A senha não pode conter partes do seu nome';
      return false;
    }

    // Verifica se a senha contém o email do usuário
    if (
      object.email &&
      password.toLowerCase().includes(object.email.split('@')[0].toLowerCase())
    ) {
      this.failReason = 'A senha não pode conter partes do seu email';
      return false;
    }

    // Verifica se a senha contém a matrícula do usuário
    if (object.matricula && password.includes(object.matricula)) {
      this.failReason = 'A senha não pode conter sua matrícula';
      return false;
    }

    // Verifica se a senha contém o CPF do usuário (apenas os números)
    if (object.cpf) {
      const cpfNumbers = object.cpf.replace(/[^\d]/g, '');
      // Verifica se a senha contém sequências de 4 ou mais dígitos do CPF
      for (let i = 0; i <= cpfNumbers.length - 4; i++) {
        const sequence = cpfNumbers.substring(i, i + 4);
        if (password.includes(sequence)) {
          this.failReason = 'A senha não pode conter sequências do seu CPF';
          return false;
        }
      }
    }

    // Se passou por todas as verificações, a senha é válida
    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    // Retorna o motivo específico da falha ou uma mensagem genérica
    return this.failReason || 'A senha não atende aos critérios de segurança';
  }
}
