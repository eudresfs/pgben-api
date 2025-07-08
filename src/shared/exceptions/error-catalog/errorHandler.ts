/**
 * Middleware de tratamento de erros integrado ao catálogo
 *
 * Estende o filtro de exceções existente para suportar
 * o novo sistema de catálogo de erros, mantendo
 * compatibilidade com o sistema atual.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ValidationError } from 'class-validator';
import { REQUEST_ID_TOKEN_HEADER } from '../../constants';
import { createRequestContext } from '../../request-context/util';
import { BaseApiException } from '../base-api.exception';
import { LoggingService } from '../../logging/logging.service';
import { ApiErrorResponse } from '../../dtos/api-error-response.dto';
import { AppError } from './AppError';
import { ErrorCategory, ErrorSeverity } from './catalog';

/**
 * Filtro de exceções aprimorado com suporte ao catálogo de erros
 *
 * Mantém compatibilidade total com o sistema existente enquanto
 * adiciona suporte completo para o novo catálogo de erros.
 */
@Catch()
export class CatalogAwareExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggingService,
  ) {}

  catch(exception: any, host: ArgumentsHost): any {
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
    let errorCode: string | undefined;
    let category: ErrorCategory | undefined;
    let severity: ErrorSeverity | undefined;
    let legalReference: string | undefined;

    // Tratamento estruturado por tipo de exceção
    switch (true) {
      case exception instanceof AppError:
        // Novo sistema de catálogo de erros
        const appError = exception as AppError;
        statusCode = appError.getStatus();
        errorName = appError.constructor.name;
        errorCode = appError.errorCode;
        
        // Obter a resposta da API que já inclui a mensagem contextual
        const apiResponse = appError.getApiResponse(this.shouldIncludeDetails());
        message = apiResponse.message;
        localizedMessage = apiResponse.message;
        
        category = appError.definition.category;
        severity = appError.definition.severity;
        legalReference = appError.definition.legalReference;
        details = apiResponse;

        // Log estruturado específico para AppError
        this.logAppError(appError, requestContext, requestId);
        break;

      case exception instanceof BaseApiException:
        // Sistema existente de exceções customizadas
        statusCode = exception.getStatus();
        errorName = exception.constructor.name;
        message = exception.message;
        localizedMessage = exception.localizedMessage?.[acceptedLanguage];
        details = exception.details || exception.getResponse();
        break;

      case exception instanceof BadRequestException:
        // Tratamento de erros de validação
        statusCode = exception.getStatus();
        errorName = exception.constructor.name;
        const response = exception.getResponse() as any;

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
        // Outras exceções HTTP do NestJS
        statusCode = exception.getStatus();
        errorName = exception.constructor.name;
        message = exception.message;
        details = exception.getResponse();
        break;

      case exception instanceof Error:
        // Erros genéricos do JavaScript
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        errorName = exception.constructor.name;
        message = exception.message;
        stack = exception.stack;

        // Tentar mapear para erro do catálogo se possível
        if (this.isDatabaseError(exception)) {
          const mappedError = this.tryMapDatabaseError(
            exception,
            acceptedLanguage,
          );
          if (mappedError) {
            statusCode = mappedError.getStatus();
            errorCode = mappedError.errorCode;
            message = mappedError.message;
            localizedMessage = mappedError.localizedMessage;
            category = mappedError.definition.category;
            severity = mappedError.definition.severity;
            details = mappedError.getApiResponse(this.shouldIncludeDetails());
          }
        }
        break;

      default:
        // Erro desconhecido
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        errorName = 'UnknownException';
        message = 'Erro interno do servidor';
        break;
    }

    // Criar resposta de erro padronizada
    const errorResponse: ApiErrorResponse = {
      statusCode,
      message: localizedMessage || message,
      code: errorCode || errorName,
      details,
      errors: validationErrors,
      timestamp,
      path,
    };

    // Adicionar informações do catálogo se disponíveis
    if (category) {
      (errorResponse as any).category = category;
    }
    if (severity) {
      (errorResponse as any).severity = severity;
    }
    if (legalReference) {
      (errorResponse as any).legalReference = legalReference;
    }

    // Log estruturado do erro (se não foi logado como AppError)
    if (!(exception instanceof AppError)) {
      const logLevel = this.getLogLevel(statusCode, severity);
      const logMessage = `${errorName}: ${message}`;
      const logMeta = {
        statusCode,
        errorName,
        errorCode,
        category,
        severity,
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
        this.logger.error(
          logMessage,
          exception instanceof Error ? exception : undefined,
          CatalogAwareExceptionFilter.name,
          logMeta,
        );
      } else {
        this.logger.warn(logMessage, CatalogAwareExceptionFilter.name, logMeta);
      }
    }

    // Proteger dados sensíveis em produção
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    if (isProduction && statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      errorResponse.message = 'Erro interno do servidor';
      if (!errorCode) {
        errorResponse.details = undefined;
      }
    }

    res.status(statusCode).json(errorResponse);
  }

  /**
   * Log específico para erros do catálogo
   */
  private logAppError(
    appError: AppError,
    requestContext: any,
    requestId: string,
  ): void {
    const logData = appError.getLogData();
    const logLevel = this.getLogLevel(
      appError.getStatus(),
      appError.definition.severity,
    );
    
    // Usar contextualMessage se disponível, senão usar localizedMessage ou message padrão
    const contextualMessage = appError.context.data?.contextualMessage;
    const userFriendlyMessage = appError.context.data?.userFriendlyMessage;
    const displayMessage = contextualMessage || userFriendlyMessage || appError.localizedMessage || appError.message;
    
    const logMessage = `[${appError.errorCode}] ${displayMessage}`;

    const logMeta = {
      ...logData,
      requestId,
      path: requestContext.path,
      method: requestContext.method,
      userAgent: requestContext.userAgent,
      ip: requestContext.ip,
    };

    if (logLevel === 'error') {
      this.logger.error(
        logMessage,
        appError,
        CatalogAwareExceptionFilter.name,
        logMeta,
      );
    } else {
      this.logger.warn(logMessage, CatalogAwareExceptionFilter.name, logMeta);
    }

    // Log adicional para erros críticos
    if (appError.isCritical()) {
      this.logger.error(
        `CRITICAL ERROR: ${logMessage}`,
        appError,
        CatalogAwareExceptionFilter.name,
        {
          ...logMeta,
          alert: true,
          criticalError: true,
        },
      );
    }
  }

  /**
   * Determina o nível de log baseado no status HTTP e severidade
   */
  private getLogLevel(
    statusCode: number,
    severity?: ErrorSeverity,
  ): 'error' | 'warn' {
    if (
      severity === ErrorSeverity.CRITICAL ||
      severity === ErrorSeverity.HIGH
    ) {
      return 'error';
    }
    return statusCode >= 500 ? 'error' : 'warn';
  }

  /**
   * Verifica se deve incluir detalhes na resposta
   */
  private shouldIncludeDetails(): boolean {
    return this.config.get<string>('NODE_ENV') !== 'production';
  }

  /**
   * Verifica se o erro é relacionado ao banco de dados
   */
  private isDatabaseError(error: Error): boolean {
    const dbErrorIndicators = [
      'duplicate key',
      'foreign key',
      'check constraint',
      'not null',
      'violates',
      'constraint',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'connection',
    ];

    const errorMessage = error.message.toLowerCase();
    return dbErrorIndicators.some((indicator) =>
      errorMessage.includes(indicator.toLowerCase()),
    );
  }

  /**
   * Tenta mapear erro de banco para erro do catálogo
   */
  private tryMapDatabaseError(error: Error, language: string): AppError | null {
    try {
      // Extrair código PostgreSQL se disponível
      const postgresCodeMatch = error.message.match(/code:\s*(\d+)/);
      if (postgresCodeMatch) {
        const postgresCode = postgresCodeMatch[1];
        return AppError.fromPostgresError(
          postgresCode,
          {
            cause: error,
            metadata: {
              originalMessage: error.message,
            },
          },
          language,
        );
      }

      // Mapear por padrões na mensagem
      const message = error.message.toLowerCase();

      if (
        message.includes('duplicate key') ||
        message.includes('unique constraint')
      ) {
        return AppError.fromPostgresError(
          '23505',
          {
            cause: error,
            metadata: { originalMessage: error.message },
          },
          language,
        );
      }

      if (
        message.includes('foreign key') ||
        message.includes('violates foreign key')
      ) {
        return AppError.fromPostgresError(
          '23503',
          {
            cause: error,
            metadata: { originalMessage: error.message },
          },
          language,
        );
      }

      if (message.includes('check constraint')) {
        return AppError.fromPostgresError(
          '23514',
          {
            cause: error,
            metadata: { originalMessage: error.message },
          },
          language,
        );
      }

      if (message.includes('not null')) {
        return AppError.fromPostgresError(
          '23502',
          {
            cause: error,
            metadata: { originalMessage: error.message },
          },
          language,
        );
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Processa erros de validação do class-validator em formato estruturado
   * e remove valores sensíveis das respostas de erro
   */
  private processValidationErrors(
    validationErrors: string[] | ValidationError[],
  ): Array<{ field: string; messages: string[]; value?: any }> {
    const result: Array<{ field: string; messages: string[]; value?: any }> =
      [];
    // Lista de campos sensíveis que não devem aparecer na resposta
    const sensitiveFields = [
      'senha',
      'password',
      'token',
      'secret',
      'authorization',
      'key',
      'confirmPassword',
      'confirmSenha',
      'currentPassword',
      'senhaAtual',
      'newPassword',
      'novaSenha',
      'cpf',
      'rg',
      'cnpj',
      'cardNumber',
      'cartao',
      'cvv',
      'passaporte',
      'biometria',
    ];

    const isSensitiveField = (fieldName: string): boolean => {
      return sensitiveFields.some((field) =>
        fieldName.toLowerCase().includes(field.toLowerCase()),
      );
    };

    for (const error of validationErrors) {
      if (typeof error === 'string') {
        result.push({
          field: 'unknown',
          messages: [error],
        });
      } else if (error && typeof error === 'object' && 'property' in error) {
        const validationError = error as ValidationError;
        const messages = validationError.constraints
          ? Object.values(validationError.constraints)
          : ['Erro de validação'];

        const errorItem: { field: string; messages: string[]; value?: any } = {
          field: validationError.property,
          messages,
        };

        // Apenas adiciona o valor se não for um campo sensível
        if (
          !isSensitiveField(validationError.property) &&
          validationError.value !== undefined
        ) {
          errorItem.value = validationError.value;
        }

        result.push(errorItem);

        if (validationError.children && validationError.children.length > 0) {
          const childErrors = this.processValidationErrors(
            validationError.children,
          );
          result.push(
            ...childErrors.map((childError) => {
              const nestedField = `${validationError.property}.${childError.field}`;
              const newErrorItem: {
                field: string;
                messages: string[];
                value?: any;
              } = {
                field: nestedField,
                messages: childError.messages,
              };

              // Apenas adiciona o valor se não for um campo sensível
              if (
                !isSensitiveField(nestedField) &&
                childError.value !== undefined
              ) {
                newErrorItem.value = childError.value;
              }

              return newErrorItem;
            }),
          );
        }
      }
    }

    return result;
  }
}
