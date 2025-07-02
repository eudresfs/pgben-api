import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggingService } from '../logging.service';
import { v4 as uuidv4 } from 'uuid';

// Estender a interface Request
declare module 'express' {
  interface Request {
    requestId?: string;
    startTime?: number;
    logger?: LoggingService;
  }
}

/**
 * Middleware de Logging para inicialização de contexto
 *
 * Responsável por:
 * - Gerar ID único para cada requisição
 * - Inicializar logger com contexto da requisição
 * - Adicionar headers de correlação
 * - Preparar dados para logging posterior
 */
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly loggingService: LoggingService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Gerar ID único para a requisição
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    const correlationId =
      (req.headers['x-correlation-id'] as string) || requestId;

    // Adicionar dados de rastreamento na requisição
    req.requestId = requestId;
    req.startTime = Date.now();

    // Criar logger contextualizado para esta requisição
    req.logger = this.loggingService.child('HTTP');

    // Adicionar headers de resposta para facilitar debugging
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Correlation-ID', correlationId);

    // Log de início da requisição com informações básicas
    req.logger.debug(`Request started: ${req.method} ${req.url}`, 'HTTP', {
      requestId,
      correlationId,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
    });

    // Interceptar o final da resposta para logging
    const originalSend = res.send;
    res.send = function (body) {
      const duration = Date.now() - (req.startTime || 0);

      req.logger?.debug(`Request completed: ${req.method} ${req.url}`, 'HTTP', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        contentLength: Buffer.isBuffer(body)
          ? body.length
          : JSON.stringify(body).length,
      });

      return originalSend.call(this, body);
    };

    next();
  }
}
