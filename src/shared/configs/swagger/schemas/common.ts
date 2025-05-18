import { ApiProperty } from '@nestjs/swagger';

/**
 * Resposta de erro padrão da API
 */
export class ErrorResponse {
  @ApiProperty({
    description: 'Código de status HTTP',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Mensagem de erro',
    example: 'Erro de validação',
  })
  message: string;

  @ApiProperty({
    description: 'Tipo do erro',
    example: 'Bad Request',
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: 'Timestamp do erro',
    example: '2025-05-17T21:50:07.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Caminho da requisição',
    example: '/api/endpoint',
  })
  path: string;

  @ApiProperty({
    description: 'Código de erro interno',
    example: 'VALIDATION_ERROR',
    required: false,
  })
  errorCode?: string;

  @ApiProperty({
    description: 'Detalhes adicionais do erro',
    type: 'object',
    additionalProperties: true, 
    required: false as any, 
  })
  details?: Record<string, any>;
}

/**
 * Resposta de sucesso genérica
 */
export class SuccessResponse<T> {
  @ApiProperty({
    description: 'Indica se a operação foi bem-sucedida',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensagem de sucesso',
    example: 'Operação realizada com sucesso',
  })
  message: string;

  @ApiProperty({
    description: 'Dados retornados',
    type: () => Object,
    additionalProperties: true,
    required: false,
  })
  data?: T;
}

/**
 * Classe base para respostas paginadas
 */
export class PaginatedMeta {
  @ApiProperty({
    description: 'Total de itens',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Página atual',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Itens por página',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total de páginas',
    example: 10,
  })
  totalPages: number;
}

/**
 * Classe genérica para respostas paginadas
 */
export class PaginatedResponse<T> {
  @ApiProperty({
    description: 'Array de itens',
    type: [Object],
  })
  data: T[];

  @ApiProperty({
    description: 'Metadados da paginação',
    type: PaginatedMeta,
  })
  meta: PaginatedMeta;
}

/**
 * Resposta de erro de validação
 */
export class ValidationErrorResponse extends ErrorResponse {
  @ApiProperty({
    description: 'Lista de erros de validação',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        field: {
          type: 'string',
          description: 'Nome do campo com erro',
          example: 'email',
        },
        message: {
          type: 'string',
          description: 'Mensagem de erro',
          example: 'Deve ser um email válido',
        },
        validation: {
          type: 'string',
          description: 'Tipo de validação que falhou',
          example: 'isEmail',
        },
      },
    },
  })
  errors: Array<{
    field: string;
    message: string;
    validation?: string;
  }>;
}
