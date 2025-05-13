import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtro de Exceções Global
 * 
 * Captura todas as exceções lançadas pela aplicação e:
 * - Registra informações detalhadas no log
 * - Formata a resposta de erro para o cliente
 * - Adiciona informações de rastreamento em ambiente de desenvolvimento
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    
    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Erro interno do servidor';
    
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };
    
    // Adicionar detalhes do erro em ambiente de desenvolvimento
    if (process.env.NODE_ENV !== 'production') {
      errorResponse['error'] = exception instanceof Error ? exception.name : 'Erro desconhecido';
      errorResponse['stack'] = exception instanceof Error ? exception.stack : undefined;
    }
    
    // Log detalhado do erro
    const userId = request.user ? (request.user as any).id : 'anônimo';
    const userIp = request.ip;
    const userAgent = request.get('user-agent') || '';
    
    this.logger.error(
      `Exceção capturada: ${request.method} ${request.url} - Status: ${status} - Usuário: ${userId} - IP: ${userIp} - User-Agent: ${userAgent} - Mensagem: ${message}`,
      exception instanceof Error ? exception.stack : 'Sem stack trace disponível',
    );
    
    response.status(status).json(errorResponse);
  }
}
