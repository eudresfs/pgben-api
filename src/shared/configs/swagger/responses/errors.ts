import { ApiResponse } from '@nestjs/swagger';
import { ApiErrorResponse, ValidationErrorResponse } from '../schemas/common';

/**
 * Resposta para erro de requisição inválida (400)
 */
export const ApiBadRequestResponse = ApiResponse({
  status: 400,
  description: 'Requisição inválida',
  type: ApiErrorResponse,
});

/**
 * Resposta para erro de validação (400 com detalhes dos campos)
 */
export const ApiValidationResponse = ApiResponse({
  status: 400,
  description: 'Erro de validação dos dados enviados',
  type: ValidationErrorResponse,
});

/**
 * Resposta para erro de autenticação (401)
 */
export const ApiUnauthorizedResponse = ApiResponse({
  status: 401,
  description: 'Não autenticado. É necessário fazer login.',
  type: ApiErrorResponse,
});

/**
 * Resposta para erro de permissão (403)
 */
export const ApiForbiddenResponse = ApiResponse({
  status: 403,
  description: 'Acesso negado. Usuário não tem permissão para esta operação.',
  type: ApiErrorResponse,
});

/**
 * Resposta para erro de recurso não encontrado (404)
 */
export const ApiNotFoundResponse = ApiResponse({
  status: 404,
  description: 'Recurso não encontrado.',
  type: ApiErrorResponse,
});

/**
 * Resposta para erro interno do servidor (500)
 */
export const ApiServerErrorResponse = ApiResponse({
  status: 500,
  description: 'Erro interno do servidor.',
  type: ApiErrorResponse,
});
