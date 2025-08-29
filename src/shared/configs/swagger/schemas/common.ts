import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Parâmetros de paginação para consultas
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Número da página (iniciando em 1)',
    example: 1,
    minimum: 1,
    default: 1,
    type: 'integer',
  })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Número de itens por página',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
    type: 'integer',
  })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Campo para ordenação',
    example: 'createdAt',
    type: 'string',
  })
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Direção da ordenação',
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * Resposta paginada padronizada para listagens com múltiplos itens
 */
export class PaginatedResponse<T> {
  @ApiProperty({
    description: 'Lista de itens da página atual',
    isArray: true,
    type: 'array',
  })
  data: T[];

  @ApiProperty({
    description: 'Metadados de paginação',
    type: 'object',
    properties: {
      total: {
        type: 'integer',
        description: 'Número total de itens em todas as páginas',
        example: 150,
      },
      page: {
        type: 'integer',
        description: 'Número da página atual (iniciando em 1)',
        example: 1,
      },
      limit: {
        type: 'integer',
        description: 'Número de itens por página',
        example: 10,
      },
      pages: {
        type: 'integer',
        description: 'Número total de páginas',
        example: 15,
      },
      hasPrevious: {
        type: 'boolean',
        description: 'Indica se existe página anterior',
        example: false,
      },
      hasNext: {
        type: 'boolean',
        description: 'Indica se existe próxima página',
        example: true,
      },
    },
  })
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
}

/**
 * Resposta de sucesso padronizada para operações simples
 */
export class SuccessResponse {
  @ApiProperty({
    description: 'Indica se a operação foi bem-sucedida',
    example: true,
    type: 'boolean',
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensagem descritiva do resultado',
    example: 'Operação realizada com sucesso',
    type: 'string',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Dados adicionais retornados pela operação',
  })
  data?: any;

  @ApiProperty({
    description: 'Timestamp da operação',
    example: '2025-01-18T10:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  timestamp: string;
}

/**
 * Modelo de erro padronizado para respostas de erro
 */
export class ApiErrorResponse {
  @ApiProperty({
    description: 'Código de status HTTP',
    example: 400,
    type: 'integer',
  })
  statusCode: number;

  @ApiProperty({
    description: 'Mensagem de erro principal',
    example: 'Dados inválidos fornecidos',
    type: 'string',
  })
  message: string;

  @ApiProperty({
    description: 'Tipo/categoria do erro',
    example: 'ValidationError',
    type: 'string',
  })
  error: string;

  @ApiProperty({
    description: 'Timestamp do erro',
    example: '2025-01-18T10:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  timestamp: string;

  @ApiPropertyOptional({
    description: 'Caminho da requisição que gerou o erro',
    example: '/api/v1/cidadao',
    type: 'string',
  })
  path?: string;
}

/**
 * Modelo detalhado de erro de validação
 */
export class ValidationErrorResponse extends ApiErrorResponse {
  @ApiProperty({
    description: 'Lista detalhada dos erros de validação encontrados',
    example: [
      {
        field: 'cpf',
        value: '123.456.789-00',
        message: 'CPF deve ter formato válido',
        code: 'INVALID_FORMAT',
      },
      {
        field: 'email',
        value: 'email-invalido',
        message: 'Email deve ter formato válido',
        code: 'INVALID_EMAIL',
      },
    ],
    type: 'array',
  })
  validationErrors: Array<{
    field: string;
    value: any;
    message: string;
    code: string;
  }>;
}

/**
 * Modelo de erro para recursos não encontrados
 */
export class NotFoundErrorResponse extends ApiErrorResponse {
  @ApiProperty({
    description: 'Identificador do recurso não encontrado',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
  })
  resourceId: string;

  @ApiProperty({
    description: 'Tipo do recurso não encontrado',
    example: 'Cidadao',
    type: 'string',
  })
  resourceType: string;
}

/**
 * Modelo de erro para operações não autorizadas
 */
export class UnauthorizedErrorResponse extends ApiErrorResponse {
  @ApiProperty({
    description: 'Código específico do erro de autorização',
    example: 'INSUFFICIENT_PERMISSIONS',
    enum: [
      'INVALID_TOKEN',
      'EXPIRED_TOKEN',
      'INSUFFICIENT_PERMISSIONS',
      'ACCOUNT_DISABLED',
    ],
    type: 'string',
  })
  authErrorCode: string;

  @ApiPropertyOptional({
    description: 'Permissões necessárias para a operação',
    example: ['CIDADAO_READ', 'CIDADAO_WRITE'],
    type: 'array',
    items: { type: 'string' },
  })
  requiredPermissions?: string[];
}
