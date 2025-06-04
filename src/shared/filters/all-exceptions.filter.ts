import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ValidationError } from 'class-validator';
import { REQUEST_ID_TOKEN_HEADER } from '../constants';
import { createRequestContext } from '../request-context/util';
import { BaseApiException } from '../exceptions/base-api.exception';
import { UnifiedLoggerService } from '../logging/unified-logger.service';
import { ApiErrorResponse } from '../dtos/api-error-response.dto';

/**
 * Filtro global para tratamento de exceções
 *
 * Padroniza todas as respostas de erro da aplicação,
 * garantindo consistência e logging adequado.
 *
 * Características:
 * - Tratamento específico para diferentes tipos de exceção
 * - Logging estruturado com contexto de requisição
 * - Respostas padronizadas conforme ApiErrorResponse
 * - Suporte a validação e localização de mensagens
 * - Proteção de dados sensíveis em produção
 */
@Injectable()
@Catch()
export class AllExceptionsFilter<T> implements ExceptionFilter {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: UnifiedLoggerService,
  ) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: T, host: ArgumentsHost): any {
    const ctx = host.switchToHttp();
    const req: Request = ctx.getRequest<Request>();
    const res: Response = ctx.getResponse<Response>();

    const path = req.url;
    const timestamp = new Date().toISOString();
    const requestId = req.headers[REQUEST_ID_TOKEN_HEADER] as string;
    const requestContext = createRequestContext(req);

    // Extrair idioma do header para localização (padrão: pt-BR)
    const acceptedLanguage =
      req.headers['accept-language']?.split(',')[0] || 'pt-BR';

    let stack: string | undefined;
    let statusCode: HttpStatus;
    let errorName: string;
    let message: string;
    let details: any;
    let localizedMessage: string | undefined;
    let validationErrors:
      | Array<{ field: string; messages: string[] }>
      | undefined;

    // Tratamento estruturado por tipo de exceção
    switch (true) {
      case exception instanceof BaseApiException:
        statusCode = exception.getStatus();
        errorName = exception.constructor.name;
        message = exception.message;
        localizedMessage = exception.localizedMessage?.[acceptedLanguage];
        details = exception.details || exception.getResponse();
        break;

      case exception instanceof BadRequestException:
        statusCode = exception.getStatus();
        errorName = exception.constructor.name;
        const response = exception.getResponse() as any;

        // Tratar erros de validação do class-validator
        if (response?.message && Array.isArray(response.message)) {
          validationErrors = this.processValidationErrors(response.message);
          message = 'Erro de validação';
          details = { validationErrors };
        } else {
          message = response?.message || exception.message;
          details = response;
        }
        break;

      case exception instanceof HttpException:
        statusCode = exception.getStatus();
        errorName = exception.constructor.name;
        message = exception.message;
        details = exception.getResponse();
        break;

      case exception instanceof Error:
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        errorName = exception.constructor.name;
        message = exception.message;
        stack = exception.stack;
        break;

      default:
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        errorName = 'UnknownException';
        message = 'Erro interno do servidor';
        break;
    }

    // Criar resposta de erro padronizada
    const errorResponse: ApiErrorResponse = {
      statusCode,
      message,
      code: errorName,
      details,
      errors: validationErrors,
      timestamp,
      path,
    };

    // Log estruturado do erro
    const logLevel = statusCode >= 500 ? 'error' : 'warn';
    const logMessage = `${errorName}: ${message}`;
    const logMeta = {
      statusCode,
      errorName,
      path,
      requestId,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      method: req.method,
      stack:
        stack && this.config.get<string>('NODE_ENV') === 'development'
          ? stack
          : undefined,
    };

    if (logLevel === 'error') {
      this.logger.error(requestContext, logMessage, logMeta);
    } else {
      this.logger.warn(requestContext, logMessage, logMeta);
    }

    // Proteger dados sensíveis em produção
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    if (isProduction && statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      errorResponse.message = 'Erro interno do servidor';
      errorResponse.details = undefined;
    }

    res.status(statusCode).json(errorResponse);
  }

  /**
   * Processa erros de validação do class-validator em formato estruturado
   */
  private processValidationErrors(
    validationErrors: string[] | ValidationError[],
  ): Array<{ field: string; messages: string[] }> {
    const result: Array<{ field: string; messages: string[] }> = [];

    for (const error of validationErrors) {
      if (typeof error === 'string') {
        // Erro simples como string
        result.push({
          field: 'unknown',
          messages: [error],
        });
      } else if (error && typeof error === 'object' && 'property' in error) {
        // ValidationError do class-validator
        const validationError = error as ValidationError;
        const messages = validationError.constraints
          ? Object.values(validationError.constraints)
          : ['Erro de validação'];

        result.push({
          field: validationError.property,
          messages,
        });

        // Processar erros aninhados
        if (validationError.children && validationError.children.length > 0) {
          const childErrors = this.processValidationErrors(
            validationError.children,
          );
          result.push(
            ...childErrors.map((childError) => ({
              field: `${validationError.property}.${childError.field}`,
              messages: childError.messages,
            })),
          );
        }
      }
    }

    return result;
  }
}
