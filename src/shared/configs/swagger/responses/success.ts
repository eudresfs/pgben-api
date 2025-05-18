import { ApiResponse } from '@nestjs/swagger';
import { PaginatedResponse } from '../schemas/common';

/**
 * Resposta de sucesso para operações de listagem com paginação
 */
export const ApiPaginatedResponse = (type: any) => {
  return ApiResponse({
    status: 200,
    description: 'Lista paginada de recursos',
    type: PaginatedResponse,
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PaginatedResponse' },
        {
          properties: {
            items: {
              type: 'array',
              items: { $ref: `#/components/schemas/${type.name}` },
            },
          },
        },
      ],
    },
  });
};

/**
 * Resposta de sucesso para operações de criação
 */
export const ApiCreatedResponse = (type: any, description = 'Recurso criado com sucesso') => {
  return ApiResponse({
    status: 201,
    description,
    type,
  });
};

/**
 * Resposta de sucesso para operações de exclusão
 */
export const ApiNoContentResponse = (description = 'Operação realizada com sucesso. Sem conteúdo para retornar.') => {
  return ApiResponse({
    status: 204,
    description,
  });
};
