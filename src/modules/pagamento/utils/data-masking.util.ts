/**
 * Utilitario para mascaramento de dados sensiveis
 *
 * Este utilitario implementa funcoes para mascarar dados bancarios
 * e informacoes sensiveis conforme regras de seguranca e LGPD.
 *
 * Regras de mascaramento:
 * - Conta bancaria: manter apenas os ultimos 4 digitos
 * - Agencia: manter apenas os ultimos 3 digitos
 * - Chave PIX: mascaramento especifico por tipo
 * - Dados pessoais: mascaramento contextual
 */

export class DataMaskingUtil {
  /**
   * Mascara numero da conta bancaria
   *
   * Regras:
   * - Minimo 4 caracteres para mascaramento
   * - Maximo mascaramento de 12 caracteres
   * - Manter apenas os ultimos 4 digitos visiveis
   *
   * Exemplos:
   * - 12345678 -> ****5678
   * - 123 -> 123 (muito curto para mascarar)
   * - 123456789012345 -> ****9012345 (limita mascaramento)
   */
  static maskConta(conta: string): string {
    if (!conta || conta.length < 4) {
      return conta;
    }

    // Limitar o resultado total a 16 caracteres (12 asteriscos + 4 digitos)
    const maxTotalLength = 16;
    const visibleDigits = 4;

    if (conta.length <= visibleDigits) {
      return conta;
    }

    const visible = conta.slice(-visibleDigits);

    if (conta.length > maxTotalLength) {
      // Para contas muito longas, limitar a 12 asteriscos + 4 digitos
      const maskLength = maxTotalLength - visibleDigits;
      const mask = '*'.repeat(maskLength);
      return mask + visible;
    } else {
      // Para contas normais, mascarar todos os digitos exceto os ultimos 4
      const maskLength = conta.length - visibleDigits;
      const mask = '*'.repeat(maskLength);
      return mask + visible;
    }
  }

  /**
   * Mascara numero da agencia
   *
   * Regras:
   * - Minimo 3 caracteres para mascaramento
   * - Manter apenas os ultimos 3 digitos visiveis
   *
   * Exemplos:
   * - 12345 -> **345
   * - 123 -> 123 (muito curto para mascarar)
   */
  static maskAgencia(agencia: string): string {
    if (!agencia || agencia.length < 3) {
      return agencia;
    }

    const visibleDigits = 3;
    const maskLength = agencia.length - visibleDigits;
    const mask = '*'.repeat(maskLength);
    const visible = agencia.slice(-visibleDigits);

    return mask + visible;
  }

  /**
   * Mascara chave PIX baseada no tipo
   *
   * Regras por tipo:
   * - CPF: ***.***.***-**
   * - EMAIL: ***@domain.com
   * - TELEFONE: +55**********
   * - ALEATORIA: ********ultimos4
   */
  static maskPixKey(
    chave: string,
    tipo: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria',
  ): string {
    if (!chave) {
      return chave;
    }

    switch (tipo) {
      case 'cpf':
        // Mascara CPF mantendo apenas os 3 primeiros e 2 últimos dígitos
        // Ex: 123.456.789-01 -> 123.***.***-01
        return chave.replace(
          /(\d{3})\.?(\d{3})\.?(\d{3})\-?(\d{2})/,
          '$1.***.***-$4',
        );

      case 'cnpj':
        // Mascara CNPJ mantendo apenas os 2 primeiros e 2 últimos dígitos
        return chave.replace(
          /(\d{2})\.?(\d{3})\.?(\d{3})\/?([0-9]{4})\-?(\d{2})/,
          '$1.***.***/****-$5',
        );

      case 'email':
        // Mascara email mantendo apenas o primeiro caractere e o domínio
        // Ex: usuario@dominio.com -> u*****@dominio.com
        const [localPart, domain] = chave.split('@');
        if (localPart && domain) {
          const maskedLocal =
            localPart.charAt(0) + '*'.repeat(Math.max(localPart.length - 1, 3));
          return `${maskedLocal}@${domain}`;
        }
        return chave;

      case 'telefone':
        // Mascara telefone mantendo apenas os 2 primeiros e 4 últimos dígitos
        // Ex: +5584999999999 -> +55****9999
        return chave.replace(/(\+?\d{2})(\d+)(\d{4})/, '$1****$3');

      case 'aleatoria':
        // Para chave aleatória, mascara mantendo apenas os 8 primeiros caracteres
        // Ex: 123e4567-e89b-12d3-a456-426614174000 -> 123e4567-****-****-****-************
        if (chave.length > 8) {
          const prefix = chave.substring(0, 8);
          const suffix = chave.substring(8);
          return prefix + '*'.repeat(Math.min(suffix.length, 32));
        }
        return chave;

      default:
        return chave;
    }
  }

  /**
   * Mascara dados bancarios completos
   *
   * Aplica mascaramento em:
   * - Numero da conta
   * - Numero da agencia
   * - Chave PIX (se presente)
   * - Nome do titular (parcial)
   */
  static maskDadosBancarios(dados: {
    banco?: string;
    conta?: string;
    agencia?: string;
    pixKey?: string;
    pixTipo?: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
    titular?: string;
  }): any {
    if (!dados) {
      return dados;
    }

    const masked: any = { ...dados };

    if (masked.conta) {
      masked.conta = this.maskConta(masked.conta);
    }

    if (masked.agencia) {
      masked.agencia = this.maskAgencia(masked.agencia);
    }

    if (masked.pixKey && masked.pixTipo) {
      masked.pixKey = this.maskPixKey(masked.pixKey, masked.pixTipo);
    }

    if (masked.titular) {
      // Mascarar nome: manter primeiro nome e inicial do ultimo
      const nomes = masked.titular.split(' ');
      if (nomes.length > 1) {
        const primeiro = nomes[0];
        const ultimo = nomes[nomes.length - 1];
        masked.titular = `${primeiro} ${'*'.repeat(Math.max(ultimo.length - 1, 1))}${ultimo.slice(-1)}`;
      }
    }

    return masked;
  }

  /**
   * Verifica se o usuario pode visualizar dados nao mascarados
   *
   * Regras de permissao:
   * - ADMIN: sempre pode ver dados completos
   * - SUPERVISOR: pode ver com permissao especifica
   * - OPERADOR: sempre ve dados mascarados
   */
  static canViewUnmaskedData(
    userRole: string,
    permissions: string[] = [],
  ): boolean {
    // Administradores sempre podem ver dados completos
    if (userRole === 'ADMIN') {
      return true;
    }

    // Supervisores com permissao especifica podem ver dados completos
    if (
      userRole === 'SUPERVISOR' &&
      permissions.includes('VIEW_SENSITIVE_DATA')
    ) {
      return true;
    }

    // Permissao especifica para visualizar dados sensiveis
    if (permissions.includes('VIEW_UNMASKED_BANKING_DATA')) {
      return true;
    }

    // Por padrao, dados sao mascarados
    return false;
  }
}
