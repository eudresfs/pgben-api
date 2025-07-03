import { ApiProperty } from '@nestjs/swagger';
import { StatusConcessao } from '../../../enums/status-concessao.enum';

/**
 * DTO de resposta para dados de concessão na listagem paginada
 */
export class ConcessaoListResponseDto {
  @ApiProperty({
    description: 'UUID da concessão',
    example: 'c9e1a5b2-4b7d-4a4b-8f5d-2a6b1e7a9c4e',
  })
  concessao_id: string;

  @ApiProperty({
    description: 'Data de início da concessão',
    example: '2025-01-15',
    type: 'string',
    format: 'date',
  })
  data_inicio: string;

  @ApiProperty({
    description: 'Status atual da concessão',
    enum: StatusConcessao,
    example: StatusConcessao.APTO,
  })
  status: StatusConcessao;

  @ApiProperty({
    description: 'Prioridade da concessão (1-5)',
    example: 1,
    minimum: 1,
    maximum: 5,
  })
  prioridade: number;

  @ApiProperty({
    description: 'Protocolo da solicitação vinculada',
    example: 'SOL-2025-001234',
  })
  protocolo: string;

  @ApiProperty({
    description: 'Flag indicando se é determinação judicial',
    example: false,
  })
  determinacao_judicial: boolean;

  @ApiProperty({
    description: 'Nome completo do beneficiário',
    example: 'João Silva Santos',
  })
  nome_beneficiario: string;

  @ApiProperty({
    description: 'CPF do beneficiário (formatado)',
    example: '123.456.789-00',
  })
  cpf_beneficiario: string;

  @ApiProperty({
    description: 'Nome do tipo de benefício',
    example: 'Benefício Natalidade',
  })
  nome_beneficio: string;

  @ApiProperty({
    description: 'Nome da unidade responsável',
    example: 'CRAS Centro',
  })
  nome_unidade: string;
}