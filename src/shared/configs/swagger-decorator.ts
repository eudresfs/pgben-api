import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

/**
 * Utilitários para documentação Swagger
 *
 * Este arquivo contém funções auxiliares para padronizar a documentação
 * da API no Swagger, garantindo consistência nos exemplos e descrições.
 */

/**
 * Decorator para documentar endpoints de listagem com paginação
 */
export const ApiPaginatedResponse = (
  description: string,
  exampleResponse: any,
) => {
  return ApiResponse({
    status: 200,
    description,
    schema: {
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            example: exampleResponse,
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              example: 100,
            },
            page: {
              type: 'number',
              example: 1,
            },
            limit: {
              type: 'number',
              example: 10,
            },
            totalPages: {
              type: 'number',
              example: 10,
            },
          },
        },
      },
    },
  });
};

/**
 * Decorator para documentar endpoints de criação
 */
export const ApiCreateEndpoint = (
  summary: string,
  examplePayload: any,
  exampleResponse: any,
) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    ApiOperation({ summary })(target, key, descriptor);
    ApiBody({
      description: 'Dados para criação',
      schema: {
        example: examplePayload,
      },
    })(target, key, descriptor);
    ApiResponse({
      status: 201,
      description: 'Criado com sucesso',
      schema: {
        example: exampleResponse,
      },
    })(target, key, descriptor);
    ApiResponse({ status: 400, description: 'Dados inválidos' })(
      target,
      key,
      descriptor,
    );
    return descriptor;
  };
};

/**
 * Decorator para documentar endpoints de atualização
 */
export const ApiUpdateEndpoint = (
  summary: string,
  examplePayload: any,
  exampleResponse: any,
) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    ApiOperation({ summary })(target, key, descriptor);
    ApiParam({ name: 'id', description: 'ID do registro' })(
      target,
      key,
      descriptor,
    );
    ApiBody({
      description: 'Dados para atualização',
      schema: {
        example: examplePayload,
      },
    })(target, key, descriptor);
    ApiResponse({
      status: 200,
      description: 'Atualizado com sucesso',
      schema: {
        example: exampleResponse,
      },
    })(target, key, descriptor);
    ApiResponse({ status: 400, description: 'Dados inválidos' })(
      target,
      key,
      descriptor,
    );
    ApiResponse({ status: 404, description: 'Registro não encontrado' })(
      target,
      key,
      descriptor,
    );
    return descriptor;
  };
};

/**
 * Decorator para documentar endpoints de detalhamento
 */
export const ApiDetailEndpoint = (summary: string, exampleResponse: any) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    ApiOperation({ summary })(target, key, descriptor);
    ApiParam({ name: 'id', description: 'ID do registro' })(
      target,
      key,
      descriptor,
    );
    ApiResponse({
      status: 200,
      description: 'Detalhes obtidos com sucesso',
      schema: {
        example: exampleResponse,
      },
    })(target, key, descriptor);
    ApiResponse({ status: 404, description: 'Registro não encontrado' })(
      target,
      key,
      descriptor,
    );
    return descriptor;
  };
};

/**
 * Decorator para documentar endpoints de ação específica (ex: aprovar, cancelar)
 */
export const ApiActionEndpoint = (
  summary: string,
  examplePayload: any = null,
  exampleResponse: any,
) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    ApiOperation({ summary })(target, key, descriptor);
    ApiParam({ name: 'id', description: 'ID do registro' })(
      target,
      key,
      descriptor,
    );

    if (examplePayload) {
      ApiBody({
        description: 'Dados para a ação',
        schema: {
          example: examplePayload,
        },
      })(target, key, descriptor);
    }

    ApiResponse({
      status: 200,
      description: 'Ação realizada com sucesso',
      schema: {
        example: exampleResponse,
      },
    })(target, key, descriptor);
    ApiResponse({
      status: 400,
      description: 'Não foi possível realizar a ação',
    })(target, key, descriptor);
    ApiResponse({ status: 404, description: 'Registro não encontrado' })(
      target,
      key,
      descriptor,
    );
    return descriptor;
  };
};
