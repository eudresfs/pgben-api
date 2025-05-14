import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { LoggingService } from './logging.service';
import { Request, Response } from 'express';

// Estender a interface Request para incluir a propriedade user
declare module 'express' {
  interface Request {
    user?: any;
  }
}

/**
 * Filtro de Exceções Global
 * 
 * Captura todas as exceções lançadas pela aplicação e:
 * - Registra informações detalhadas no log
 * - Formata a resposta de erro para o cliente
 * - Adiciona informações de rastreamento em ambiente de desenvolvimento
 */
@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly loggingService: LoggingService) {}

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
    const userId = request.user ? request.user.id : 'anônimo';
    const userIp = request.ip;
    const userAgent = request.headers?.['user-agent'] || request.get?.('user-agent') || '';
    
    this.loggingService.error(
      `Exceção capturada: ${request.method} ${request.url} - Status: ${status} - Mensagem: ${message}`,
      exception instanceof Error ? exception.stack : 'Sem stack trace disponível',
      'ExceptionFilter',
      {
        method: request.method,
        path: request.url,
        statusCode: status,
        message,
        userId,
        ip: userIp,
        userAgent
      }
    );
    
    response.status(status).json(errorResponse);
  }
}
