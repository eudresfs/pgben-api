import { Injectable } from '@nestjs/common';
import { validate as validateUUID } from 'uuid';

/**
 * Serviço para validação de chaves PIX
 *
 * Implementa funções para validar os diferentes tipos de chaves PIX
 * (CPF, e-mail, telefone, chave aleatória) de acordo com as regras do Bacen.
 *
 * @author Equipe PGBen
 */
@Injectable()
export class PixValidator {
  /**
   * Valida uma chave PIX
   */
  validarChavePix(chave: string, tipo: string): boolean {
    if (!chave || !tipo) return false;
    
    switch (tipo.toLowerCase()) {
      case 'cpf':
        return this.validarCPF(chave);
      case 'email':
        return this.validarEmail(chave);
      case 'telefone':
        return this.validarTelefone(chave);
      case 'aleatorio':
        return this.validarChaveAleatoria(chave);
      default:
        return false;
    }
  }

  /**
   * Aplica máscara na chave PIX para exibição
   */
  mascaraChavePix(chave: string, tipo: string): string {
    if (!chave || !tipo) return '';
    
    switch (tipo.toLowerCase()) {
      case 'cpf':
        return this.mascaraCPF(chave);
      case 'email':
        return this.mascaraEmail(chave);
      case 'telefone':
        return this.mascaraTelefone(chave);
      case 'aleatorio':
        return this.mascaraChaveAleatoria(chave);
      default:
        return chave;
    }
  }

  /**
   * Identifica o tipo da chave PIX
   */
  obterTipoChavePix(chave: string): string | null {
    if (!chave) return null;
    
    // Remove espaços e caracteres especiais para análise
    const chaveClean = chave.replace(/\D/g, '');
    
    // CPF (11 dígitos)
    if (chaveClean.length === 11 && this.validarCPF(chave)) {
      return 'cpf';
    }
    
    // Email
    if (this.validarEmail(chave)) {
      return 'email';
    }
    
    // Telefone
    if (this.validarTelefone(chave)) {
      return 'telefone';
    }
    
    // Chave aleatória (UUID)
    if (this.validarChaveAleatoria(chave)) {
      return 'aleatorio';
    }
    
    return null;
  }

  /**
   * Valida CPF
   */
  private validarCPF(cpf: string): boolean {
    return this.validateCpfKey(cpf);
  }

  /**
   * Valida email
   */
  private validarEmail(email: string): boolean {
    return this.validateEmailKey(email);
  }

  /**
   * Valida telefone
   */
  private validarTelefone(telefone: string): boolean {
    return this.validatePhoneKey(telefone);
  }

  /**
   * Valida chave aleatória
   */
  private validarChaveAleatoria(chave: string): boolean {
    return this.validateRandomKey(chave);
  }

  /**
   * Aplica máscara no CPF
   */
  private mascaraCPF(cpf: string): string {
    const cpfClean = cpf.replace(/\D/g, '');
    if (cpfClean.length === 11) {
      const formatted = cpfClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      return this.maskPixKey(formatted, 'cpf');
    }
    return cpf;
  }

  /**
   * Aplica máscara no email
   */
  private mascaraEmail(email: string): string {
    return this.maskPixKey(email, 'email');
  }

  /**
   * Aplica máscara no telefone
   */
  private mascaraTelefone(telefone: string): string {
    return this.maskPixKey(telefone, 'telefone');
  }

  /**
   * Aplica máscara na chave aleatória
   */
  private mascaraChaveAleatoria(chave: string): string {
    return this.maskPixKey(chave, 'aleatorio');
  }
  /**
   * Valida uma chave PIX baseada no seu tipo
   *
   * @param key Chave PIX a ser validada
   * @param keyType Tipo da chave PIX ('cpf', 'email', 'telefone', 'aleatorio')
   * @returns true se a chave for válida para o tipo especificado, false caso contrário
   */
  validatePixKey(
    key: string,
    keyType: 'cpf' | 'email' | 'telefone' | 'aleatorio',
  ): boolean {
    if (!key) {
      return false;
    }

    switch (keyType) {
      case 'cpf':
        return this.validateCpfKey(key);
      case 'email':
        return this.validateEmailKey(key);
      case 'telefone':
        return this.validatePhoneKey(key);
      case 'aleatorio':
        return this.validateRandomKey(key);
      default:
        return false;
    }
  }

  /**
   * Valida uma chave PIX do tipo CPF
   *
   * @param key Chave PIX do tipo CPF (apenas números, 11 dígitos)
   * @returns true se for um CPF válido, false caso contrário
   */
  private validateCpfKey(key: string): boolean {
    // Remove caracteres não numéricos
    const cpf = key.replace(/\D/g, '');

    // Verifica se tem 11 dígitos
    if (cpf.length !== 11) {
      return false;
    }

    // Verifica se todos os dígitos são iguais (caso inválido)
    if (/^(\d)\1+$/.test(cpf)) {
      return false;
    }

    // Algoritmo de validação do CPF
    let sum = 0;
    let remainder;

    // Primeiro dígito verificador
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) {
      remainder = 0;
    }

    if (remainder !== parseInt(cpf.substring(9, 10))) {
      return false;
    }

    // Segundo dígito verificador
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) {
      remainder = 0;
    }

    if (remainder !== parseInt(cpf.substring(10, 11))) {
      return false;
    }

    return true;
  }

  /**
   * Valida uma chave PIX do tipo e-mail
   *
   * @param key Chave PIX do tipo e-mail
   * @returns true se for um e-mail válido, false caso contrário
   */
  private validateEmailKey(key: string): boolean {
    // Regex para validação básica de e-mail
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // Verifica o formato básico do e-mail
    if (!emailRegex.test(key)) {
      return false;
    }

    // Verificações adicionais
    if (key.length > 77) {
      // Limitação do Bacen
      return false;
    }

    // Não pode ter espaços
    if (/\s/.test(key)) {
      return false;
    }

    return true;
  }

  /**
   * Valida uma chave PIX do tipo telefone brasileiro
   *
   * @param key Chave PIX do tipo telefone (formato +5599999999999)
   * @returns true se for um telefone válido, false caso contrário
   */
  private validatePhoneKey(key: string): boolean {
    // Regex para validação de telefone no formato +55 seguido de DDD e número
    const phoneRegex = /^\+55[1-9]{2}9?[0-9]{8}$/;

    // Remove caracteres não numéricos exceto o "+"
    const phone = key.replace(/[^\d+]/g, '');

    // Verifica o formato do telefone
    return phoneRegex.test(phone);
  }

  /**
   * Valida uma chave PIX do tipo aleatório (UUID)
   *
   * @param key Chave PIX do tipo aleatório (UUID)
   * @returns true se for um UUID válido, false caso contrário
   */
  private validateRandomKey(key: string): boolean {
    // Verifica se é um UUID válido
    return validateUUID(key);
  }

  /**
   * Mascara uma chave PIX para exibição segura
   *
   * @param key Chave PIX original
   * @param keyType Tipo da chave PIX ('cpf', 'email', 'telefone', 'aleatorio')
   * @returns Chave mascarada para exibição
   */
  maskPixKey(
    key: string,
    keyType: 'cpf' | 'email' | 'telefone' | 'aleatorio',
  ): string {
    if (!key) {
      return '';
    }

    switch (keyType) {
      case 'cpf':
        // Mascara CPF: 123.456.789-00 -> ***.456.789-**
        return key.replace(
          /^(\d{3})\.(\d{3})\.(\d{3})-(\d{2})$/,
          '***.$2.$3-**',
        );

      case 'email':
        // Mascara email: usuario@dominio.com -> u****@****.com
        return key.replace(
          /^([a-zA-Z0-9])[a-zA-Z0-9._%+-]+@([a-zA-Z0-9])[a-zA-Z0-9.-]+(\.[a-zA-Z]{2,})$/,
          '$1****@$2****$3',
        );

      case 'telefone':
        // Mascara telefone: +5599999999999 -> +55*****99999
        return key.replace(
          /^\+55([0-9]{2})([0-9]{5})([0-9]{4})$/,
          '+55$1*****$3',
        );

      case 'aleatorio':
        // Mascara UUID: mostra apenas os primeiros 8 caracteres
        return key.substring(0, 8) + '********-****-****-****-************';

      default:
        return '********';
    }
  }
}
