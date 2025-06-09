import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para respostas de sucesso padronizadas
 */
export class SuccessResponseDto<T = any> {
  @ApiProperty({
    description: 'Código de status HTTP',
    example: 200,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Mensagem de sucesso',
    example: 'Operação realizada com sucesso',
  })
  message: string;

  @ApiProperty({
    description: 'Dados da resposta',
    required: false,
  })
  data?: T;

  @ApiProperty({
    description: 'Timestamp da resposta',
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp: string;
}