import { HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponse as ErrorResponseType } from '../schemas/types';

/**
 * Respostas comuns da API que podem ser reutilizadas em vários controladores
 */

// Classe para respostas de erro
class ErrorResponse implements ErrorResponseType {
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path?: string;
  errors?: Array<{
    field: string;
    message: string;
    validation?: string;
  }>;

  constructor(partial: Partial<ErrorResponseType>) {
    Object.assign(this, {
      timestamp: new Date().toISOString(),
      ...partial
    });
  }
}

export const InternalServerErrorResponse = {
  description: 'Erro interno do servidor',
  type: ErrorResponse,
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  schema: {
    example: new ErrorResponse({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ocorreu um erro interno no servidor',
      error: 'Internal Server Error',
      path: '/api/endpoint',
    })
  }
};

export const BadRequestResponse = {
  description: 'Requisição inválida',
  type: ErrorResponse,
  status: HttpStatus.BAD_REQUEST,
  schema: {
    example: {
      statusCode: 400,
      message: 'Dados inválidos fornecidos',
      error: 'Bad Request',
      timestamp: '2025-05-17T21:50:07.000Z',
      path: '/api/endpoint',
    },
  },
};

export const UnauthorizedResponse = {
  description: 'Não autorizado',
  type: ErrorResponse,
  status: HttpStatus.UNAUTHORIZED,
  schema: {
    example: {
      statusCode: 401,
      message: 'Não autorizado',
      error: 'Unauthorized',
      timestamp: '2025-05-17T21:50:07.000Z',
      path: '/api/endpoint',
    },
  },
};

export const ForbiddenResponse = {
  description: 'Acesso negado',
  type: ErrorResponse,
  status: HttpStatus.FORBIDDEN,
  schema: {
    example: {
      statusCode: 403,
      message: 'Você não tem permissão para acessar este recurso',
      error: 'Forbidden',
      timestamp: '2025-05-17T21:50:07.000Z',
      path: '/api/endpoint',
    },
  },
};

export const NotFoundResponse = {
  description: 'Recurso não encontrado',
  type: ErrorResponse,
  status: HttpStatus.NOT_FOUND,
  schema: {
    example: {
      statusCode: 404,
      message: 'Recurso não encontrado',
      error: 'Not Found',
      timestamp: '2025-05-17T21:50:07.000Z',
      path: '/api/endpoint',
    },
  },
};

/**
 * Decorator para documentar respostas comuns
 */
export const ApiCommonResponses = () => {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    ApiResponse(InternalServerErrorResponse)(target, propertyKey, descriptor);
    ApiResponse(UnauthorizedResponse)(target, propertyKey, descriptor);
    ApiResponse(ForbiddenResponse)(target, propertyKey, descriptor);
    ApiResponse(NotFoundResponse)(target, propertyKey, descriptor);
    ApiResponse(BadRequestResponse)(target, propertyKey, descriptor);
  };
};
