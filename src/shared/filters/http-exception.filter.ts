import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../dtos/api-error-response.dto';
import { ValidationError } from 'class-validator';

interface ValidationErrorResponse {
  property: string;
  constraints: {
    [type: string]: string;
  };
  children?: ValidationErrorResponse[];
}

/**
 * Filtro para tratar exceções HTTP e padronizar as respostas de erro
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Extrai a primeira mensagem de erro de validação para usar como mensagem principal
   */
  private getFirstValidationErrorMessage(
    validationErrors:
      | ValidationError[]
      | Array<{ field: string; messages: string[] }>,
  ): string {
    if (!validationErrors || validationErrors.length === 0) {
      return 'Erro de validação';
    }

    // Verifica se é um array de ValidationError (class-validator)
    if (
      'property' in validationErrors[0] ||
      'constraints' in validationErrors[0]
    ) {
      const errors = validationErrors as ValidationError[];
      for (const error of errors) {
        if (error.constraints) {
          const constraintMessage = Object.values(error.constraints)[0];
          if (constraintMessage) {
            return constraintMessage;
          }
        }

        // Se não encontrou nas constraints, verifica os filhos
        if (error.children && error.children.length > 0) {
          const childMessage = this.getFirstValidationErrorMessage(
            error.children,
          );
          if (childMessage && childMessage !== 'Erro de validação') {
            return childMessage;
          }
        }
      }
    }
    // Se for o formato interno { field: string; messages: string[] }
    else if (
      'field' in validationErrors[0] &&
      'messages' in validationErrors[0]
    ) {
      const errors = validationErrors as Array<{
        field: string;
        messages: string[];
      }>;
      for (const error of errors) {
        if (error.messages && error.messages.length > 0) {
          return error.messages[0];
        }
      }
    }

    return 'Erro de validação';
  }

  /**
   * Processa os erros de validação em um formato estruturado
   */
  private processValidationErrors(
    validationErrors: ValidationError[],
    parentProperty: string = '',
  ): Array<{ field: string; messages: string[] }> {
    const result: Array<{ field: string; messages: string[] }> = [];

    for (const error of validationErrors) {
      const property = parentProperty
        ? `${parentProperty}.${error.property}`
        : error.property;

      if (error.constraints) {
        const messages = Object.values(error.constraints);
        if (messages.length > 0) {
          result.push({
            field: property,
            messages,
          });
        }
      }

      if (error.children && error.children.length > 0) {
        const childErrors = this.processValidationErrors(
          error.children,
          property,
        );
        result.push(...childErrors);
      }
    }

    return result;
  }

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
        if (exception instanceof BadRequestException) {
          code = 'VALIDATION_ERROR';

          // Caso o erro já venha formatado pelo ValidationPipe
          if (responseObj.errors && Array.isArray(responseObj.errors)) {
            validationErrors = responseObj.errors.map((err: any) => ({
              field: err.field || 'geral',
              messages: [err.message],
            }));
            // Converte para o formato ValidationError para usar com getFirstValidationErrorMessage
            const validationErrorObjects = responseObj.errors.map(
              (err: any) => ({
                property: err.field || 'geral',
                constraints: {
                  custom: err.message,
                },
                children: [],
              }),
            );
            message = this.getFirstValidationErrorMessage(
              validationErrorObjects,
            );
          }
          // Caso seja um erro de validação do class-validator
          else if (responseObj.message && Array.isArray(responseObj.message)) {
            if (
              responseObj.message[0] &&
              typeof responseObj.message[0] === 'object' &&
              responseObj.message[0].property
            ) {
              // É um erro de validação do class-validator
              message = this.getFirstValidationErrorMessage(
                responseObj.message,
              );
              validationErrors = this.processValidationErrors(
                responseObj.message,
              );
            } else {
              // É uma lista de mensagens de erro
              message = responseObj.message[0] || 'Erro de validação';
              validationErrors = responseObj.message.map((msg: string) => ({
                field: 'geral',
                messages: [msg],
              }));
            }
          }
          // Outros tipos de BadRequest
          else if (responseObj.message) {
            message = responseObj.message;
          }
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
      this.logger.error(
        `Erro não tratado: ${exception.message}`,
        exception.stack,
      );
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
