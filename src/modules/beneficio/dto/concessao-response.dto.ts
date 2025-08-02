import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusConcessao } from '../../../enums/status-concessao.enum';

/**
 * DTO de resposta para dados de beneficiário na listagem de concessões
 */
export class BeneficiarioConcessaoDto {
  @ApiProperty({
    description: 'ID único do beneficiário',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Nome completo do beneficiário',
    example: 'João Silva Santos',
  })
  nome: string;

  @ApiProperty({
    description: 'CPF do beneficiário',
    example: '12345678901',
  })
  cpf: string;
}

/**
 * DTO de resposta para dados de benefício na listagem de concessões
 */
export class BeneficioConcessaoDto {
  @ApiProperty({
    description: 'ID único do tipo de benefício',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Nome do tipo de benefício',
    example: 'Benefício Natalidade',
  })
  nome: string;

  @ApiProperty({
    description: 'Código do tipo de benefício',
    example: 'NAT',
  })
  codigo: string;
}

/**
 * DTO de resposta para dados de unidade na listagem de concessões
 */
export class UnidadeConcessaoDto {
  @ApiProperty({
    description: 'ID único da unidade',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Nome da unidade',
    example: 'CRAS Centro',
  })
  nome: string;

  @ApiProperty({
    description: 'Código da unidade',
    example: 'CRAS-01',
  })
  codigo: string;
}

/**
 * DTO de resposta para dados de técnico na listagem de concessões
 */
export class TecnicoConcessaoDto {
  @ApiProperty({
    description: 'ID único do técnico',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Nome completo do técnico',
    example: 'Maria Santos Silva',
  })
  nome: string;
}

/**
 * DTO de resposta para dados de concessão na listagem paginada
 */
export class ConcessaoListResponseDto {
  @ApiProperty({
    description: 'ID único da concessão',
    example: 'c9e1a5b2-4b7d-4a4b-8f5d-2a6b1e7a9c4e',
  })
  id: string;

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
    description: 'Prioridade da solicitação (1-5)',
    example: 3,
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
    description: 'Data de criação da concessão',
    example: '2025-01-15T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Data de última atualização da concessão',
    example: '2025-01-15T10:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  updated_at: Date;

  @ApiPropertyOptional({
    description: 'Dados do beneficiário',
    type: BeneficiarioConcessaoDto,
  })
  beneficiario?: BeneficiarioConcessaoDto;

  @ApiPropertyOptional({
    description: 'Dados do tipo de benefício',
    type: BeneficioConcessaoDto,
  })
  tipo_beneficio?: BeneficioConcessaoDto;

  @ApiPropertyOptional({
    description: 'Dados da unidade responsável',
    type: UnidadeConcessaoDto,
  })
  unidade?: UnidadeConcessaoDto;

  @ApiPropertyOptional({
    description: 'Dados do técnico responsável',
    type: TecnicoConcessaoDto,
  })
  tecnico?: TecnicoConcessaoDto;
}
