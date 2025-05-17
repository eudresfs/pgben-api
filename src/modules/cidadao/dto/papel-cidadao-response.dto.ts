import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoPapel } from '../entities/papel-cidadao.entity';

/**
 * DTO de resposta para papel de cidadão
 *
 * Contém os dados de um papel atribuído a um cidadão
 */
export class PapelCidadaoResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID único do papel',
  })
  id: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID do cidadão associado ao papel',
  })
  cidadao_id: string;

  @ApiProperty({
    enum: TipoPapel,
    enumName: 'TipoPapel',
    example: TipoPapel.BENEFICIARIO,
    description: 'Tipo de papel do cidadão',
  })
  tipo_papel: TipoPapel;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: {
      grau_parentesco: 'Mãe',
      documento_representacao: '12345',
      data_validade_representacao: '2026-01-01',
    },
    description: 'Metadados específicos do papel (varia conforme o tipo)',
  })
  metadados?: {
    grau_parentesco?: string;
    documento_representacao?: string;
    data_validade_representacao?: Date;
    [key: string]: any;
  };

  @ApiProperty({
    example: true,
    description: 'Indica se o papel está ativo',
  })
  ativo: boolean;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Data de criação do papel',
  })
  created_at: Date;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Data da última atualização do papel',
  })
  updated_at: Date;
}
