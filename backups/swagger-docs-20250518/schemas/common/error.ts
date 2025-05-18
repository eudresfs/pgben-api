import { ApiProperty } from '@nestjs/swagger';

/**
 * Modelo padronizado para erros de validação de campo
 */
export class ValidationErrorItem {
  @ApiProperty({
    description: 'Nome do campo com erro',
    example: 'cpf',
  })
  field: string;

  @ApiProperty({
    description: 'Mensagem de erro',
    example: 'CPF deve conter 11 dígitos numéricos',
  })
  message: string;

  @ApiProperty({
    description: 'Tipo de validação que falhou',
    example: 'pattern',
  })
  validation: string;
}

/**
 * Modelo padronizado para respostas de erro da API
 * 
 * Este modelo é usado para todas as respostas de erro da API,
 * garantindo consistência e facilitando o tratamento de erros
 * pelos clientes.
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

  @ApiProperty({
    description: 'Data e hora do erro',
    example: '2025-05-18T12:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Caminho da requisição que gerou o erro',
    example: '/api/cidadaos',
  })
  path: string;

  @ApiProperty({
    description: 'Detalhes dos erros de validação',
    type: [ValidationErrorItem],
    required: false,
  })
  errors?: ValidationErrorItem[];
}
