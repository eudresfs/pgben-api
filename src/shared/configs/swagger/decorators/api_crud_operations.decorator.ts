import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import {
  ApiCommonErrors,
  ApiValidationErrors,
} from './api_error_responses.decorator';
import {
  ApiPaginatedResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
} from '../responses/success';

/**
 * Decorador para endpoints de listagem
 * @param responseType - Tipo da resposta retornada na lista paginada
 * @param description - Descrição da operação
 */
export const ApiListOperation = (
  responseType: any,
  description = 'Lista recursos com paginação, filtros e ordenação',
) => {
  return applyDecorators(
    ApiOperation({ summary: 'Listar', description }),
    ApiPaginatedResponse(responseType),
    ApiCommonErrors(),
  );
};

/**
 * Decorador para endpoints de detalhes por ID
 * @param responseType - Tipo da resposta detalhada
 * @param description - Descrição da operação
 */
export const ApiDetailOperation = (
  responseType: any,
  description = 'Obtém detalhes de um recurso específico',
) => {
  return applyDecorators(
    ApiOperation({ summary: 'Obter detalhes', description }),
    ApiResponse({
      status: 200,
      description: 'Recurso encontrado com sucesso',
      type: responseType,
    }),
    ApiParam({ name: 'id', description: 'ID do recurso', type: 'string' }),
    ApiCommonErrors(),
  );
};

/**
 * Decorador para endpoints de criação
 * @param responseType - Tipo da resposta de criação
 * @param description - Descrição da operação
 */
export const ApiCreateOperation = (
  responseType: any,
  description = 'Cria um novo recurso',
) => {
  return applyDecorators(
    ApiOperation({ summary: 'Criar', description }),
    ApiCreatedResponse(responseType),
    ApiValidationErrors(),
  );
};

/**
 * Decorador para endpoints de atualização
 * @param responseType - Tipo da resposta após atualização
 * @param description - Descrição da operação
 */
export const ApiUpdateOperation = (
  responseType: any,
  description = 'Atualiza um recurso existente',
) => {
  return applyDecorators(
    ApiOperation({ summary: 'Atualizar', description }),
    ApiResponse({
      status: 200,
      description: 'Recurso atualizado com sucesso',
      type: responseType,
    }),
    ApiParam({ name: 'id', description: 'ID do recurso', type: 'string' }),
    ApiValidationErrors(),
  );
};

/**
 * Decorador para endpoints de exclusão
 * @param description - Descrição da operação
 */
export const ApiDeleteOperation = (
  description = 'Remove um recurso existente',
) => {
  return applyDecorators(
    ApiOperation({ summary: 'Excluir', description }),
    ApiNoContentResponse(),
    ApiParam({ name: 'id', description: 'ID do recurso', type: 'string' }),
    ApiCommonErrors(),
  );
};
