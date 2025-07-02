import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggingService } from '../logging.service';

/**
 * Filtro global para captura e logging de exceções
 *
 * Responsável por:
 * - Capturar todas as exceções não tratadas
 * - Logar erros com contexto completo
 * - Retornar respostas padronizadas
 * - Identificar tipos específicos de erro
 */
@Catch()
export class ErrorLoggerFilter implements ExceptionFilter {
  constructor(private readonly loggingService: LoggingService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.getHttpStatus(exception);
    const message = this.getErrorMessage(exception);
    const stack = this.getErrorStack(exception);

    // Preparar dados do erro
    const errorData = {
      requestId: request.requestId,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      userId: (request as any).user?.id || 'anonymous',
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Logar baseado na severidade do erro
    if (status >= 500) {
      // Erros de servidor - log como error
      this.loggingService.error(
        `Server Error: ${message}`,
        stack,
        'ErrorHandler',
        {
          ...errorData,
          errorType: 'SERVER_ERROR',
          exception: this.serializeException(exception),
        },
      );
    } else if (status >= 400) {
      // Erros de cliente - log como warning
      this.loggingService.warn(`Client Error: ${message}`, 'ErrorHandler', {
        ...errorData,
        errorType: 'CLIENT_ERROR',
        trace: stack,
      });
    } else {
      // Outros erros
      this.loggingService.info(`Request Error: ${message}`, 'ErrorHandler', {
        ...errorData,
        errorType: 'OTHER_ERROR',
        trace: stack,
      });
    }

    // Log de segurança para tentativas de acesso não autorizado
    if (status === 401 || status === 403) {
      this.loggingService.logSecurity(
        `Unauthorized access attempt: ${request.method} ${request.url}`,
        status === 401 ? 'medium' : 'high',
        {
          ...errorData,
          reason: message,
        },
      );
    }

    // Preparar resposta para o cliente
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: this.getSafeErrorMessage(exception, status),
      requestId: request.requestId,
      ...(process.env.NODE_ENV === 'development' && {
        stack: stack,
        details: this.serializeException(exception),
      }),
    };

    response.status(status).json(errorResponse);
  }

  /**
   * Extrai o status HTTP da exceção
   */
  private getHttpStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * Extrai a mensagem de erro
   */
  private getErrorMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      return typeof response === 'string'
        ? response
        : (response as any).message || 'Unknown error';
    }
    if (exception instanceof Error) {
      return exception.message;
    }
    return 'Unknown error occurred';
  }

  /**
   * Extrai o stack trace do erro
   */
  private getErrorStack(exception: unknown): string | undefined {
    if (exception instanceof Error) {
      return exception.stack;
    }
    return undefined;
  }

  /**
   * Serializa a exceção para logging (removendo informações sensíveis)
   */
  private serializeException(exception: unknown): any {
    if (exception instanceof HttpException) {
      return {
        name: exception.name,
        message: exception.message,
        status: exception.getStatus(),
        response: exception.getResponse(),
      };
    }
    if (exception instanceof Error) {
      return {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      };
    }
    return { error: String(exception) };
  }

  /**
   * Retorna uma mensagem de erro segura para o cliente
   * (remove informações sensíveis em produção)
   */
  private getSafeErrorMessage(exception: unknown, status: number): string {
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      return this.getErrorMessage(exception);
    }

    // Em produção, retornar mensagens genéricas para erros de servidor
    if (status >= 500) {
      return 'Internal server error';
    }

    if (status === 404) {
      return 'Resource not found';
    }

    if (status === 401) {
      return 'Unauthorized';
    }

    if (status === 403) {
      return 'Forbidden';
    }

    // Para outros erros de cliente, pode mostrar a mensagem original
    return this.getErrorMessage(exception);
  }
}
