import { ApiProperty } from '@nestjs/swagger';

export class ValidationError {
  @ApiProperty({
    description: 'Nome do campo que falhou na validação',
    example: 'email',
  })
  field: string;

  @ApiProperty({
    description: 'Mensagens de erro de validação para o campo',
    example: ['O email deve ser um endereço de email válido'],
    type: [String],
  })
  messages: string[];
}

export class ApiErrorResponse {
  @ApiProperty({
    description: 'Código de status HTTP',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Mensagem de erro amigável',
    example: 'Erro de validação',
  })
  message: string;

  @ApiProperty({
    description: 'Código de erro interno para referência',
    example: 'VALIDATION_ERROR',
    required: false,
  })
  code?: string;

  @ApiProperty({
    description: 'Detalhes adicionais sobre o erro',
    required: false,
  })
  details?: any;

  @ApiProperty({
    description: 'Lista de erros de validação',
    type: [ValidationError],
    required: false,
  })
  errors?: ValidationError[];

  @ApiProperty({
    description: 'Timestamp do erro',
    example: '2023-05-16T10:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Caminho da requisição que causou o erro',
    example: '/api/v1/cidadao',
  })
  path: string;

  constructor(partial: Partial<ApiErrorResponse>) {
    Object.assign(this, partial);
  }
}
