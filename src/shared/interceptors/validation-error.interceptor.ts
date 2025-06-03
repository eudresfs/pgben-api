import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ValidationError } from 'class-validator';

/**
 * Interceptor para melhorar o tratamento de erros de validação
 * 
 * Características:
 * - Melhora mensagens de erro de enum
 * - Agrupa erros por campo
 * - Fornece sugestões para valores inválidos
 * - Padroniza formato de resposta de erro
 */
@Injectable()
export class ValidationErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof BadRequestException) {
          const response = error.getResponse();
          
          // Se for um erro de validação do class-validator
          if (this.isValidationError(response)) {
            const enhancedError = this.enhanceValidationError(response);
            return throwError(() => new BadRequestException(enhancedError));
          }
        }
        
        return throwError(() => error);
      })
    );
  }
  
  /**
   * Verifica se é um erro de validação
   */
  private isValidationError(response: any): boolean {
    return (
      response &&
      typeof response === 'object' &&
      (Array.isArray(response.message) || 
       (response.error === 'Bad Request' && Array.isArray(response.message)))
    );
  }
  
  /**
   * Melhora os erros de validação
   */
  private enhanceValidationError(response: any): any {
    const messages = Array.isArray(response.message) 
      ? response.message 
      : response.message || [];
    
    const enhancedMessages = messages.map((message: string) => 
      this.enhanceErrorMessage(message)
    );
    
    // Agrupar erros por campo
    const groupedErrors = this.groupErrorsByField(enhancedMessages);
    
    return {
      error: 'Erro de Validação',
      message: 'Os dados fornecidos contêm erros de validação',
      details: groupedErrors,
      timestamp: new Date().toISOString(),
      statusCode: 400,
    };
  }
  
  /**
   * Melhora mensagens de erro individuais
   */
  private enhanceErrorMessage(message: string): string {
    // Melhorar mensagens de enum
    if (message.includes('must be one of the following values')) {
      return this.enhanceEnumErrorMessage(message);
    }
    
    // Melhorar mensagens de tipo
    if (message.includes('must be a') || message.includes('must be an')) {
      return this.enhanceTypeErrorMessage(message);
    }
    
    // Melhorar mensagens de tamanho
    if (message.includes('must be longer than') || message.includes('must be shorter than')) {
      return this.enhanceLengthErrorMessage(message);
    }
    
    // Melhorar mensagens de valor numérico
    if (message.includes('must not be less than') || message.includes('must not be greater than')) {
      return this.enhanceNumericErrorMessage(message);
    }
    
    return message;
  }
  
  /**
   * Melhora mensagens de erro de enum
   */
  private enhanceEnumErrorMessage(message: string): string {
    // Extrair o nome do campo
    const fieldMatch = message.match(/^(\w+)\s/);
    const field = fieldMatch ? fieldMatch[1] : 'campo';
    
    // Extrair os valores válidos
    const valuesMatch = message.match(/\[(.*?)\]/);
    const values = valuesMatch ? valuesMatch[1] : '';
    
    if (values) {
      return `O campo '${field}' deve ser um dos seguintes valores: ${values}`;
    }
    
    return message;
  }
  
  /**
   * Melhora mensagens de erro de tipo
   */
  private enhanceTypeErrorMessage(message: string): string {
    const typeMap: Record<string, string> = {
      'string': 'texto',
      'number': 'número',
      'boolean': 'verdadeiro ou falso',
      'array': 'lista',
      'object': 'objeto',
      'date': 'data válida',
      'email': 'email válido',
      'url': 'URL válida',
    };
    
    let enhancedMessage = message;
    
    Object.entries(typeMap).forEach(([english, portuguese]) => {
      enhancedMessage = enhancedMessage.replace(
        new RegExp(`must be a ${english}`, 'gi'),
        `deve ser um ${portuguese}`
      );
      enhancedMessage = enhancedMessage.replace(
        new RegExp(`must be an ${english}`, 'gi'),
        `deve ser um ${portuguese}`
      );
    });
    
    return enhancedMessage;
  }
  
  /**
   * Melhora mensagens de erro de tamanho
   */
  private enhanceLengthErrorMessage(message: string): string {
    return message
      .replace(/must be longer than (\d+) characters?/gi, 'deve ter mais de $1 caracteres')
      .replace(/must be shorter than (\d+) characters?/gi, 'deve ter menos de $1 caracteres')
      .replace(/must contain at least (\d+) characters?/gi, 'deve conter pelo menos $1 caracteres')
      .replace(/must contain at most (\d+) characters?/gi, 'deve conter no máximo $1 caracteres');
  }
  
  /**
   * Melhora mensagens de erro numérico
   */
  private enhanceNumericErrorMessage(message: string): string {
    return message
      .replace(/must not be less than (\d+(?:\.\d+)?)/gi, 'deve ser maior ou igual a $1')
      .replace(/must not be greater than (\d+(?:\.\d+)?)/gi, 'deve ser menor ou igual a $1')
      .replace(/must be a positive number/gi, 'deve ser um número positivo')
      .replace(/must be a negative number/gi, 'deve ser um número negativo');
  }
  
  /**
   * Agrupa erros por campo
   */
  private groupErrorsByField(messages: string[]): Record<string, string[]> {
    const grouped: Record<string, string[]> = {};
    
    messages.forEach((message) => {
      // Tentar extrair o nome do campo da mensagem
      const fieldMatch = message.match(/^(\w+)\s/) || 
                        message.match(/campo '(\w+)'/) ||
                        message.match(/field '(\w+)'/);
      
      const field = fieldMatch ? fieldMatch[1] : 'geral';
      
      if (!grouped[field]) {
        grouped[field] = [];
      }
      
      // Remover o nome do campo da mensagem se estiver no início
      const cleanMessage = message.replace(/^\w+\s/, '').trim();
      grouped[field].push(cleanMessage || message);
    });
    
    return grouped;
  }
}

/**
 * Utilitários para criação de mensagens de erro padronizadas
 */
export class ValidationMessageHelper {
  /**
   * Cria mensagem de erro para campo obrigatório
   */
  static required(fieldName: string): string {
    return `O campo '${fieldName}' é obrigatório`;
  }
  
  /**
   * Cria mensagem de erro para tipo inválido
   */
  static invalidType(fieldName: string, expectedType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'texto',
      'number': 'número',
      'boolean': 'verdadeiro ou falso',
      'array': 'lista',
      'object': 'objeto',
      'date': 'data válida',
      'email': 'email válido',
      'url': 'URL válida',
    };
    
    const type = typeMap[expectedType.toLowerCase()] || expectedType;
    return `O campo '${fieldName}' deve ser ${type}`;
  }
  
  /**
   * Cria mensagem de erro para tamanho inválido
   */
  static invalidLength(
    fieldName: string,
    min?: number,
    max?: number
  ): string {
    if (min && max) {
      return `O campo '${fieldName}' deve ter entre ${min} e ${max} caracteres`;
    }
    if (min) {
      return `O campo '${fieldName}' deve ter pelo menos ${min} caracteres`;
    }
    if (max) {
      return `O campo '${fieldName}' deve ter no máximo ${max} caracteres`;
    }
    return `O campo '${fieldName}' tem tamanho inválido`;
  }
  
  /**
   * Cria mensagem de erro para valor numérico inválido
   */
  static invalidRange(
    fieldName: string,
    min?: number,
    max?: number
  ): string {
    if (min !== undefined && max !== undefined) {
      return `O campo '${fieldName}' deve estar entre ${min} e ${max}`;
    }
    if (min !== undefined) {
      return `O campo '${fieldName}' deve ser maior ou igual a ${min}`;
    }
    if (max !== undefined) {
      return `O campo '${fieldName}' deve ser menor ou igual a ${max}`;
    }
    return `O campo '${fieldName}' está fora do intervalo válido`;
  }
  
  /**
   * Cria mensagem de erro para formato inválido
   */
  static invalidFormat(fieldName: string, format: string): string {
    const formatMap: Record<string, string> = {
      'email': 'email válido (exemplo: usuario@dominio.com)',
      'cpf': 'CPF válido (exemplo: 123.456.789-00)',
      'cnpj': 'CNPJ válido (exemplo: 12.345.678/0001-90)',
      'phone': 'telefone válido (exemplo: (11) 99999-9999)',
      'date': 'data válida (exemplo: 2023-12-31)',
      'url': 'URL válida (exemplo: https://exemplo.com)',
    };
    
    const formatDescription = formatMap[format.toLowerCase()] || format;
    return `O campo '${fieldName}' deve ter o formato: ${formatDescription}`;
  }
}