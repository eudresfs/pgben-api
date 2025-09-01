import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

/**
 * Interceptor global para normalização de campos textuais
 * 
 * Normaliza campos específicos (nome, sobrenome) aplicando as seguintes regras:
 * - Converte para minúsculas
 * - Capitaliza a primeira letra de cada palavra
 * - Mantém artigos definidos em minúsculas (de, do, da, dos, das)
 * 
 * A normalização é aplicada independentemente do formato recebido
 * (UPPER CASE, lower case ou mixed case) e não afeta outros campos.
 */
@Injectable()
export class TextNormalizationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TextNormalizationInterceptor.name);

  /**
   * Lista de campos que devem ser normalizados
   * Apenas campos presentes nesta whitelist serão processados
   */
  private readonly fieldsToNormalize = ['nome', 'sobrenome'];

  /**
   * Artigos definidos que devem permanecer em minúsculas
   */
  private readonly articlesLowerCase = ['de', 'do', 'da', 'dos', 'das'];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Aplica normalização apenas se houver body na requisição
    if (request.body && typeof request.body === 'object') {
      this.normalizeTextFields(request.body);
    }

    return next.handle();
  }

  /**
   * Normaliza campos de texto no objeto fornecido
   * 
   * @param obj - Objeto que pode conter campos a serem normalizados
   */
  private normalizeTextFields(obj: any): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    // Processa cada campo do objeto
    for (const [key, value] of Object.entries(obj)) {
      if (this.shouldNormalizeField(key, value)) {
        const originalValue = value as string;
        const normalizedValue = this.normalizeText(originalValue);
        
        obj[key] = normalizedValue;
        
        this.logger.debug(
          `Campo '${key}' normalizado: '${originalValue}' → '${normalizedValue}'`
        );
      }
      // Recursivamente processa objetos aninhados
      else if (typeof value === 'object' && value !== null) {
        this.normalizeTextFields(value);
      }
    }
  }

  /**
   * Verifica se um campo deve ser normalizado
   * 
   * @param fieldName - Nome do campo
   * @param value - Valor do campo
   * @returns true se o campo deve ser normalizado
   */
  private shouldNormalizeField(fieldName: string, value: any): boolean {
    return (
      this.fieldsToNormalize.includes(fieldName) &&
      typeof value === 'string' &&
      value.trim().length > 0
    );
  }

  /**
   * Normaliza um texto aplicando as regras de capitalização
   * 
   * @param text - Texto a ser normalizado
   * @returns Texto normalizado
   */
  private normalizeText(text: string): string {
    if (!text || typeof text !== 'string') {
      return text;
    }

    return text
      .trim()
      .toLowerCase()
      .split(' ')
      .filter(word => word.length > 0) // Remove espaços extras
      .map(word => this.capitalizeWord(word))
      .join(' ');
  }

  /**
   * Capitaliza uma palavra seguindo as regras específicas
   * 
   * @param word - Palavra a ser capitalizada
   * @returns Palavra capitalizada ou em minúsculas se for artigo
   */
  private capitalizeWord(word: string): string {
    const cleanWord = word.toLowerCase();
    
    // Mantém artigos definidos em minúsculas
    if (this.articlesLowerCase.includes(cleanWord)) {
      return cleanWord;
    }
    
    // Capitaliza a primeira letra das demais palavras
    return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
  }
}