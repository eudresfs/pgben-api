import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para respostas de erro padronizadas
 */
export class ErrorResponseDto {
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
    description: 'Timestamp do erro',
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Caminho da requisição',
    example: '/api/v1/pendencias',
  })
  path: string;

  @ApiProperty({
    description: 'Detalhes adicionais do erro',
    required: false,
  })
  details?: any;
}