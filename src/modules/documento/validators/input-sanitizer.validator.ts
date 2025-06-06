import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable, Logger } from '@nestjs/common';
import * as DOMPurify from 'isomorphic-dompurify';
import * as validator from 'validator';

/**
 * Interface para o resultado da sanitização de input
 */
export interface InputSanitizationResult {
  isValid: boolean;
  sanitizedValue: string;
  originalValue: string;
  warnings: string[];
  blocked: boolean;
}

/**
 * Validador e sanitizador personalizado para inputs do usuário
 *
 * Implementa sanitização robusta para prevenir ataques XSS, injeção de código
 * e outros tipos de ataques através de inputs maliciosos
 */
@ValidatorConstraint({ name: 'inputSanitizerValidator', async: false })
@Injectable()
export class InputSanitizerValidator implements ValidatorConstraintInterface {
  private readonly logger = new Logger(InputSanitizerValidator.name);

  // Padrões perigosos que devem ser bloqueados
  private readonly dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi, // Scripts
    /javascript:/gi, // URLs javascript
    /vbscript:/gi, // URLs vbscript
    /on\w+\s*=/gi, // Event handlers (onclick, onload, etc.)
    /<iframe[^>]*>.*?<\/iframe>/gi, // iframes
    /<object[^>]*>.*?<\/object>/gi, // objects
    /<embed[^>]*>.*?<\/embed>/gi, // embeds
    /<link[^>]*>/gi, // links externos
    /<meta[^>]*>/gi, // meta tags
    /\${.*?}/g, // Template literals
    /eval\s*\(/gi, // eval functions
    /Function\s*\(/gi, // Function constructor
    /setTimeout\s*\(/gi, // setTimeout
    /setInterval\s*\(/gi, // setInterval
  ];

  // Caracteres que devem ser escapados
  private readonly escapeMap: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  /**
   * Valida se o input é seguro após sanitização
   * @param value Valor a ser validado
   * @param args Argumentos de validação
   * @returns true se o valor é válido após sanitização
   */
  validate(value: any, args: ValidationArguments): boolean {
    if (!value || typeof value !== 'string') {
      return true; // Valores vazios ou não-string são válidos
    }

    const result = this.sanitizeInput(value);

    // Log de tentativas de ataques
    if (result.blocked || result.warnings.length > 0) {
      this.logger.warn(
        `Tentativa de input potencialmente malicioso detectada: ${JSON.stringify(
          {
            originalValue: result.originalValue.substring(0, 100),
            warnings: result.warnings,
            blocked: result.blocked,
            property: args.property,
          },
        )}`,
      );
    }

    return !result.blocked;
  }

  /**
   * Retorna a mensagem de erro padrão
   * @param args Argumentos de validação
   * @returns Mensagem de erro
   */
  defaultMessage(args: ValidationArguments): string {
    return `O campo ${args.property} contém conteúdo não permitido por motivos de segurança`;
  }

  /**
   * Sanitiza um input do usuário
   * @param input Input a ser sanitizado
   * @param options Opções de sanitização
   * @returns Resultado da sanitização
   */
  sanitizeInput(
    input: string,
    options: {
      allowHtml?: boolean;
      maxLength?: number;
      strictMode?: boolean;
    } = {},
  ): InputSanitizationResult {
    const { allowHtml = false, maxLength = 10000, strictMode = true } = options;

    const result: InputSanitizationResult = {
      isValid: true,
      sanitizedValue: input,
      originalValue: input,
      warnings: [],
      blocked: false,
    };

    // Verificar comprimento máximo
    if (input.length > maxLength) {
      result.warnings.push(
        `Input excede o comprimento máximo de ${maxLength} caracteres`,
      );
      result.sanitizedValue = input.substring(0, maxLength);
    }

    // Verificar padrões perigosos
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(input)) {
        result.warnings.push(`Padrão perigoso detectado: ${pattern.source}`);
        if (strictMode) {
          result.blocked = true;
          result.isValid = false;
          return result;
        }
      }
    }

    // Sanitização básica
    let sanitized = input;

    if (!allowHtml) {
      // Remover todas as tags HTML
      sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [] });

      // Escapar caracteres especiais
      sanitized = this.escapeHtmlChars(sanitized);
    } else {
      // Permitir apenas tags HTML seguras
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
        ALLOWED_ATTR: [],
      });
    }

    // Normalizar espaços em branco
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Remover caracteres de controle
    sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    // Verificar se houve mudanças significativas
    if (sanitized !== input) {
      result.warnings.push('Input foi modificado durante a sanitização');
    }

    result.sanitizedValue = sanitized;
    return result;
  }

  /**
   * Escapa caracteres HTML especiais
   * @param text Texto a ser escapado
   * @returns Texto com caracteres escapados
   */
  private escapeHtmlChars(text: string): string {
    return text.replace(/[&<>"'`=\/]/g, (char) => this.escapeMap[char] || char);
  }

  /**
   * Sanitiza um nome de arquivo
   * @param filename Nome do arquivo
   * @returns Nome do arquivo sanitizado
   */
  sanitizeFilename(filename: string): string {
    if (!filename) {return '';}

    // Remover caracteres perigosos para nomes de arquivo
    let sanitized = filename.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '_');

    // Remover múltiplos pontos consecutivos
    sanitized = sanitized.replace(/\.{2,}/g, '.');

    // Remover pontos no início e fim
    sanitized = sanitized.replace(/^\.|\.$/, '');

    // Limitar comprimento
    if (sanitized.length > 255) {
      const ext = sanitized.substring(sanitized.lastIndexOf('.'));
      const name = sanitized.substring(0, sanitized.lastIndexOf('.'));
      sanitized = name.substring(0, 255 - ext.length) + ext;
    }

    // Garantir que não seja vazio
    if (!sanitized || sanitized.trim() === '') {
      sanitized = 'arquivo_sem_nome';
    }

    return sanitized;
  }

  /**
   * Valida e sanitiza metadados de documento
   * @param metadados Metadados a serem validados
   * @returns Metadados sanitizados
   */
  sanitizeMetadados(metadados: any): any {
    if (!metadados || typeof metadados !== 'object') {
      return {};
    }

    const sanitized: any = {};

    // Lista de campos permitidos nos metadados
    const allowedFields = [
      'titulo',
      'descricao',
      'autor',
      'data_documento',
      'tags',
      'categoria',
      'versao',
      'observacoes',
    ];

    for (const field of allowedFields) {
      if (metadados[field] !== undefined) {
        if (typeof metadados[field] === 'string') {
          const result = this.sanitizeInput(metadados[field], {
            allowHtml: false,
            maxLength: field === 'descricao' ? 2000 : 500,
            strictMode: true,
          });

          if (!result.blocked) {
            sanitized[field] = result.sanitizedValue;
          }
        } else if (Array.isArray(metadados[field]) && field === 'tags') {
          // Sanitizar array de tags
          sanitized[field] = metadados[field]
            .filter((tag: any) => typeof tag === 'string')
            .map((tag: string) => {
              const result = this.sanitizeInput(tag, {
                allowHtml: false,
                maxLength: 50,
                strictMode: true,
              });
              return result.blocked ? null : result.sanitizedValue;
            })
            .filter((tag: string | null) => tag !== null)
            .slice(0, 10); // Máximo 10 tags
        }
      }
    }

    return sanitized;
  }
}
