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
    tipo: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA'
  ): string {
    if (!chave) {
      return chave;
    }

    switch (tipo) {
      case 'CPF':
        // Formato: ***.***.***-**
        if (chave.length === 11) {
          return '***.***.***-' + chave.slice(-2);
        }
        return '***.***.***-**';
        
      case 'CNPJ':
        // Formato: **.***.***/****-**
        return '**.***.***/****-**';
        
      case 'EMAIL':
        const emailParts = chave.split('@');
        if (emailParts.length === 2) {
          return '***@' + emailParts[1];
        }
        return '***@domain.com';
        
      case 'TELEFONE':
        // Manter codigo do pais e mascarar o resto
        if (chave.startsWith('+55')) {
          return '+55***********';
        }
        return '***********';
        
      case 'ALEATORIA':
        // Manter apenas os ultimos 4 caracteres
        if (chave.length > 4) {
          const maskLength = Math.min(chave.length - 4, 8);
          return '*'.repeat(maskLength) + chave.slice(-4);
        }
        return '*'.repeat(chave.length);
        
      default:
        return '*'.repeat(chave.length);
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
    pixTipo?: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
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
    permissions: string[] = []
  ): boolean {
    // Administradores sempre podem ver dados completos
    if (userRole === 'ADMIN') {
      return true;
    }
    
    // Supervisores com permissao especifica podem ver dados completos
    if (userRole === 'SUPERVISOR' && permissions.includes('VIEW_SENSITIVE_DATA')) {
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