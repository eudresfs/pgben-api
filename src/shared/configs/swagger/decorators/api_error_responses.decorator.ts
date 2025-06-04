import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiServerErrorResponse,
  ApiValidationResponse,
} from '../responses/errors';

/**
 * Decorator que aplica todas as respostas de erro comum para endpoints autenticados
 * Adiciona as respostas 400, 401, 403, 404 e 500
 */
export const ApiCommonErrors = () => {
  return applyDecorators(
    ApiBadRequestResponse,
    ApiUnauthorizedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiServerErrorResponse,
  );
};

/**
 * Decorator que aplica todas as respostas de erro para endpoints públicos (sem autenticação)
 * Adiciona as respostas 400, 404 e 500
 */
export const ApiPublicErrors = () => {
  return applyDecorators(
    ApiBadRequestResponse,
    ApiNotFoundResponse,
    ApiServerErrorResponse,
  );
};

/**
 * Decorator que aplica respostas de erro para endpoints com validação de dados
 * Adiciona as respostas 400 (com detalhes de validação), 401, 403, 404 e 500
 */
export const ApiValidationErrors = () => {
  return applyDecorators(
    ApiValidationResponse,
    ApiUnauthorizedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiServerErrorResponse,
  );
};
