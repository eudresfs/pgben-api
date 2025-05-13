import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

/**
 * Filtro para tratar exceções HTTP e padronizar as respostas de erro
 * 
 * Garante que todas as respostas de erro sigam o formato:
 * {
 *   error: {
 *     statusCode: number,
 *     message: string,
 *     timestamp: string,
 *   }
 * }
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    response
      .status(status)
      .json({
        error: {
          statusCode: status,
          message: typeof exceptionResponse === 'object' 
            ? (exceptionResponse as any).message 
            : exceptionResponse,
          timestamp: new Date().toISOString(),
        }
      });
  }
}
