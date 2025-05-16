import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../dtos/api-error-response.dto';

interface ValidationErrorResponse {
  property: string;
  constraints: {
    [type: string]: string;
  };
}

/**
 * Filtro para tratar exceções HTTP e padronizar as respostas de erro
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let code = 'INTERNAL_SERVER_ERROR';
    let details: any = undefined;
    let validationErrors: Array<{ field: string; messages: string[] }> = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        
        // Trata erros de validação
        if (Array.isArray(responseObj.message)) {
          code = 'VALIDATION_ERROR';
          message = 'Erro de validação';
          validationErrors = responseObj.message.reduce((acc: Array<{ field: string; messages: string[] }>, error: string) => {
            const [field, ...errorMsgs] = error.split(' ');
            const fieldName = field.replace(/^\w+\.(\w+)$/, '$1');
            const errorMessage = errorMsgs.join(' ').replace(/(^"|"$)/g, '');
            
            const existingError = acc.find(e => e.field === fieldName);
            if (existingError) {
              existingError.messages.push(errorMessage);
            } else {
              acc.push({ field: fieldName, messages: [errorMessage] });
            }
            return acc;
          }, []);
        } else if (responseObj.message) {
          message = responseObj.message;
          code = responseObj.code || code;
          details = responseObj.details;
        }
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Erro não tratado: ${exception.message}`, exception.stack);
    }

    // Criar resposta de erro padronizada
    const errorResponse = new ApiErrorResponse({
      statusCode: status,
      message,
      code,
      details,
      errors: validationErrors.length > 0 ? validationErrors : undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
    
    // Log do erro apenas para erros de servidor (500)
    if (status >= 500) {
      this.logger.error(
        `[${status}] ${message}`,
        exception instanceof Error ? exception.stack : undefined,
        'HttpExceptionFilter',
      );
    } else if (status >= 400) {
      this.logger.warn(
        `[${status}] ${request.method} ${request.url} - ${message}`,
        'HttpExceptionFilter',
      );
    }
    
    // Retornar a resposta de erro padronizada
    response.status(status).json(errorResponse);
  }
}
