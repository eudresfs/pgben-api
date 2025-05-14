import { getSchemaPath } from '@nestjs/swagger';
import { respostasExemplo } from './swagger-respostas';
import {
  cidadaoSchema,
  beneficioSchema,
  solicitacaoSchema,
  documentoSchema,
  usuarioSchema,
  unidadeSchema,
  notificacaoSchema,
  ocorrenciaSchema,
  healthCheckSchema,
  metricasSchema
} from './swagger-entidades';

/**
 * Esquemas reutilizáveis para a documentação Swagger
 * 
 * Este arquivo contém esquemas que podem ser reutilizados em vários endpoints
 * para melhorar a consistência da documentação e evitar repetição.
 */

// Esquema para respostas paginadas
export const paginatedResponseSchema = (dataSchema: any) => ({
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: { $ref: getSchemaPath(dataSchema) },
    },
    meta: {
      type: 'object',
      properties: {
        total: {
          type: 'number',
          example: 100,
          description: 'Total de registros',
        },
        page: {
          type: 'number',
          example: 1,
          description: 'Página atual',
        },
        limit: {
          type: 'number',
          example: 10,
          description: 'Itens por página',
        },
        totalPages: {
          type: 'number',
          example: 10,
          description: 'Total de páginas',
        },
      },
    },
  },
});

// Esquema para mensagens de erro
export const errorResponseSchema = {
  type: 'object',
  properties: {
    statusCode: {
      type: 'number',
      example: 400,
      description: 'Código HTTP do erro',
    },
    message: {
      type: 'string',
      example: 'Erro de validação',
      description: 'Mensagem de erro',
    },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          property: {
            type: 'string',
            example: 'nome',
            description: 'Campo com erro',
          },
          constraints: {
            type: 'object',
            example: {
              isNotEmpty: 'Nome é obrigatório',
            },
            description: 'Restrições violadas',
          },
        },
      },
      description: 'Lista de erros de validação',
    },
  },
};

// Esquema para respostas de sucesso com mensagem
export const successResponseSchema = {
  type: 'object',
  properties: {
    message: {
      type: 'string',
      example: 'Operação realizada com sucesso',
      description: 'Mensagem de sucesso',
    },
  },
};

// Esquema para respostas de autenticação
export const authResponseSchema = {
  type: 'object',
  properties: {
    accessToken: {
      type: 'string',
      example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      description: 'Token de acesso JWT',
    },
    refreshToken: {
      type: 'string',
      example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      description: 'Token de atualização JWT',
    },
    expiresIn: {
      type: 'number',
      example: 3600,
      description: 'Tempo de expiração do token em segundos',
    },
    user: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440000',
          description: 'ID do usuário',
        },
        nome: {
          type: 'string',
          example: 'João Silva',
          description: 'Nome do usuário',
        },
        email: {
          type: 'string',
          example: 'joao.silva@semtas.gov.br',
          description: 'Email do usuário',
        },
        role: {
          type: 'string',
          example: 'tecnico_semtas',
          description: 'Papel do usuário no sistema',
        },
        unidade: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '550e8400-e29b-41d4-a716-446655440000',
              description: 'ID da unidade',
            },
            nome: {
              type: 'string',
              example: 'CRAS Centro',
              description: 'Nome da unidade',
            },
          },
        },
      },
    },
  },
};
