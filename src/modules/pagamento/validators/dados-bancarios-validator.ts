import { Injectable } from '@nestjs/common';

/**
 * Validador de dados bancários
 * 
 * Implementa validações específicas para informações bancárias,
 * incluindo validação de agência, conta e dígitos verificadores.
 * 
 * @author Equipe PGBen
 */
@Injectable()
export class DadosBancariosValidator {
  /**
   * Códigos dos principais bancos brasileiros
   */
  private readonly codigosBancos = {
    '001': 'Banco do Brasil',
    '033': 'Santander',
    '104': 'Caixa Econômica Federal',
    '237': 'Bradesco',
    '341': 'Itaú',
    '260': 'Nubank',
    '077': 'Inter',
    '212': 'Banco Original',
    '336': 'C6 Bank',
    '756': 'Sicoob',
    '748': 'Sicredi',
    // Outros bancos podem ser adicionados conforme necessário
  };

  /**
   * Valida um código de banco
   * 
   * @param codigo Código do banco (3 dígitos)
   * @returns true se o código for válido
   */
  validarCodigoBanco(codigo: string): boolean {
    if (!codigo || !/^\d{3}$/.test(codigo)) {
      return false;
    }
    
    return Object.keys(this.codigosBancos).includes(codigo);
  }

  /**
   * Obtém o nome do banco a partir do código
   * 
   * @param codigo Código do banco
   * @returns Nome do banco ou 'Banco não cadastrado'
   */
  obterNomeBanco(codigo: string): string {
    return this.codigosBancos[codigo] || 'Banco não cadastrado';
  }

  /**
   * Valida um número de agência bancária
   * 
   * @param agencia Número da agência
   * @param codigoBanco Código do banco (opcional)
   * @returns true se a agência for válida
   */
  validarAgencia(agencia: string, codigoBanco?: string): boolean {
    // Remover caracteres não numéricos
    const agenciaLimpa = agencia.replace(/\D/g, '');
    
    // Verificação básica (a maioria dos bancos usa 4 dígitos)
    if (!agenciaLimpa || agenciaLimpa.length < 2 || agenciaLimpa.length > 5) {
      return false;
    }

    // Validações específicas por banco
    if (codigoBanco) {
      switch (codigoBanco) {
        case '001': // Banco do Brasil
          return /^\d{4,5}$/.test(agenciaLimpa);
        case '104': // Caixa
          return /^\d{4}$/.test(agenciaLimpa);
        case '341': // Itaú
          return /^\d{4}$/.test(agenciaLimpa);
        case '033': // Santander
          return /^\d{4}$/.test(agenciaLimpa);
        case '237': // Bradesco
          return /^\d{4}$/.test(agenciaLimpa);
        default:
          return /^\d{2,5}$/.test(agenciaLimpa);
      }
    }
    
    // Validação genérica
    return /^\d{2,5}$/.test(agenciaLimpa);
  }

  /**
   * Valida um número de conta bancária
   * 
   * @param conta Número da conta com ou sem dígito
   * @param codigoBanco Código do banco (opcional)
   * @returns true se a conta for válida
   */
  validarConta(conta: string, codigoBanco?: string): boolean {
    // Remover caracteres não numéricos e traços
    const contaLimpa = conta.replace(/[^\dXx]/g, '');
    
    // Verificação básica
    if (!contaLimpa || contaLimpa.length < 3 || contaLimpa.length > 13) {
      return false;
    }

    // Validações específicas por banco
    if (codigoBanco) {
      switch (codigoBanco) {
        case '001': // Banco do Brasil
          return /^\d{5,8}[\dXx]$/.test(contaLimpa);
        case '104': // Caixa
          return /^\d{6,11}[\dXx]$/.test(contaLimpa);
        case '341': // Itaú
          return /^\d{4,5}[\dXx]$/.test(contaLimpa);
        case '033': // Santander
          return /^\d{6,8}$/.test(contaLimpa);
        case '237': // Bradesco
          return /^\d{6,7}[\dXx]$/.test(contaLimpa);
        default:
          return /^\d{2,12}[\dXx]?$/.test(contaLimpa);
      }
    }
    
    // Validação genérica
    return /^\d{2,12}[\dXx]?$/.test(contaLimpa);
  }

  /**
   * Valida o dígito verificador de uma conta
   * 
   * @param conta Número da conta sem dígito
   * @param digito Dígito verificador
   * @param codigoBanco Código do banco
   * @returns true se o dígito for válido
   */
  validarDigitoVerificador(conta: string, digito: string, codigoBanco: string): boolean {
    // Implementação simplificada - em produção, cada banco teria seu próprio algoritmo
    // Esta é uma validação genérica que não representa o algoritmo real de cada banco
    
    const contaLimpa = conta.replace(/\D/g, '');
    const digitoLimpo = digito.toUpperCase();
    
    // Alguns bancos usam X como dígito
    if (digitoLimpo === 'X') {
      return true; // Aceitar X como válido para bancos que o utilizam
    }
    
    // Para dígitos numéricos, fazer uma validação simples
    if (/^\d$/.test(digitoLimpo)) {
      // Soma dos dígitos multiplicados por pesos
      let soma = 0;
      const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
      
      for (let i = 0; i < contaLimpa.length; i++) {
        const peso = pesos[i % pesos.length];
        soma += parseInt(contaLimpa.charAt(contaLimpa.length - 1 - i)) * peso;
      }
      
      // Cálculo do dígito (simplificado)
      const resto = soma % 11;
      const digitoCalculado = resto === 0 ? '0' : resto === 1 ? '0' : (11 - resto).toString();
      
      return digitoCalculado === digitoLimpo;
    }
    
    return false;
  }

  /**
   * Formata uma agência para exibição
   * 
   * @param agencia Número da agência
   * @returns Agência formatada
   */
  formatarAgencia(agencia: string): string {
    const agenciaLimpa = agencia.replace(/\D/g, '');
    
    // Formato padrão: 0000
    if (agenciaLimpa.length === 4) {
      return agenciaLimpa;
    }
    
    // Outros formatos
    return agenciaLimpa;
  }

  /**
   * Formata uma conta para exibição
   * 
   * @param conta Número da conta com ou sem dígito
   * @returns Conta formatada
   */
  formatarConta(conta: string): string {
    const contaLimpa = conta.replace(/[^\dXx]/g, '');
    
    // Extrair dígito verificador (último caractere)
    const digito = contaLimpa.slice(-1);
    const numero = contaLimpa.slice(0, -1);
    
    // Formato padrão: 00000-0
    return `${numero}-${digito}`;
  }

  /**
   * Mascara uma conta para exibição segura
   * 
   * @param conta Número da conta completo
   * @returns Conta mascarada
   */
  mascaraConta(conta: string): string {
    const contaLimpa = conta.replace(/[^\dXx]/g, '');
    
    if (contaLimpa.length <= 4) {
      return '****';
    }
    
    // Manter os dois primeiros e os dois últimos dígitos
    const inicio = contaLimpa.slice(0, 2);
    const fim = contaLimpa.slice(-2);
    const meio = '*'.repeat(contaLimpa.length - 4);
    
    return `${inicio}${meio}${fim}`;
  }

  /**
   * Mascara uma agência para exibição segura
   * 
   * @param agencia Número da agência
   * @returns Agência mascarada
   */
  mascaraAgencia(agencia: string): string {
    const agenciaLimpa = agencia.replace(/\D/g, '');
    
    if (agenciaLimpa.length <= 2) {
      return '****';
    }
    
    // Manter o primeiro e o último dígito
    const inicio = agenciaLimpa.slice(0, 1);
    const fim = agenciaLimpa.slice(-1);
    const meio = '*'.repeat(agenciaLimpa.length - 2);
    
    return `${inicio}${meio}${fim}`;
  }
}
