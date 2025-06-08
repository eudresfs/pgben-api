import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Interceptor para remover parâmetros vazios das requisições
 *
 * Remove automaticamente propriedades com valores:
 * - String vazia ('')
 * - null
 * - undefined
 * - Arrays vazios ([])
 * - Objetos vazios ({})
 *
 * Características:
 * - Aplica-se apenas a requisições POST, PUT, PATCH
 * - Preserva valores falsy válidos como 0, false
 * - Processa objetos aninhados recursivamente
 * - Mantém estrutura de arrays com elementos válidos
 */
@Injectable()
export class RemoveEmptyParamsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, body } = request;

    // Aplicar apenas em métodos que enviam dados no body
    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      request.body = this.removeEmptyParams(body);
    }

    return next.handle();
  }

  /**
   * Remove parâmetros vazios de um objeto recursivamente
   * @param obj Objeto a ser processado
   * @returns Objeto sem parâmetros vazios
   */
  private removeEmptyParams(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Se for um array, processar cada elemento
    if (Array.isArray(obj)) {
      const filteredArray = obj
        .map((item) => this.removeEmptyParams(item))
        .filter((item) => !this.isEmpty(item));
      
      // Retornar array apenas se tiver elementos válidos
      return filteredArray.length > 0 ? filteredArray : undefined;
    }

    // Se for um objeto, processar suas propriedades
    if (typeof obj === 'object') {
      const cleanedObj: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = this.removeEmptyParams(value);
        
        // Adicionar apenas se o valor não estiver vazio
        if (!this.isEmpty(cleanedValue)) {
          cleanedObj[key] = cleanedValue;
        }
      }
      
      // Retornar objeto apenas se tiver propriedades válidas
      return Object.keys(cleanedObj).length > 0 ? cleanedObj : undefined;
    }

    // Para tipos primitivos, retornar o valor original
    return obj;
  }

  /**
   * Verifica se um valor deve ser considerado vazio
   * @param value Valor a ser verificado
   * @returns true se o valor for considerado vazio
   */
  private isEmpty(value: any): boolean {
    // null ou undefined
    if (value === null || value === undefined) {
      return true;
    }

    // String vazia
    if (typeof value === 'string' && value.trim() === '') {
      return true;
    }

    // Array vazio
    if (Array.isArray(value) && value.length === 0) {
      return true;
    }

    // Objeto vazio
    if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    ) {
      return true;
    }

    // Valores falsy válidos (0, false) não são considerados vazios
    return false;
  }
}