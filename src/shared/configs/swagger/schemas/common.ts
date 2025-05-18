import { ApiProperty } from '@nestjs/swagger';

/**
 * Resposta paginada para listagens com múltiplos itens
 */
export class PaginatedResponse<T> {
  @ApiProperty({
    description: 'Itens da página atual',
    isArray: true,
  })
  items: T[];

  @ApiProperty({
    description: 'Número total de itens em todas as páginas',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Número da página atual (iniciando em 1)',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Número de itens por página',
    example: 10,
  })
  pageSize: number;

  @ApiProperty({
    description: 'Número total de páginas',
    example: 10,
  })
  totalPages: number;
}

/**
 * Modelo de erro padronizado para respostas de erro
 */
export class ApiErrorResponse {
  @ApiProperty({
    description: 'Código de status HTTP',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Mensagem de erro',
    example: 'Erro de validação',
  })
  message: string | string[];

  @ApiProperty({
    description: 'Tipo do erro',
    example: 'Bad Request',
  })
  error: string;
}

/**
 * Modelo detalhado de erro de validação
 */
export class ValidationErrorResponse extends ApiErrorResponse {
  @ApiProperty({
    description: 'Detalhes dos erros de validação',
    example: [
      {
        field: 'cpf',
        message: 'CPF inválido',
      },
    ],
  })
  validationErrors: Array<{
    field: string;
    message: string;
  }>;
}
