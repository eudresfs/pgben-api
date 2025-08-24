import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO base para respostas da API
 */
export abstract class BaseResponseDto {
  @ApiProperty({
    description: 'ID único do registro',
    example: 'uuid-v4-string',
  })
  id: string;

  @ApiProperty({
    description: 'Data de criação do registro',
    example: '2024-01-01T00:00:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Data da última atualização do registro',
    example: '2024-01-01T00:00:00.000Z',
  })
  updated_at: Date;

  @ApiProperty({
    description: 'Data de exclusão do registro (soft delete)',
    required: false,
    example: null,
  })
  deleted_at?: Date;
}
