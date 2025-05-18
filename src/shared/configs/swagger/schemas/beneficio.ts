import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para criação de tipo de benefício
 */
export class CreateTipoBeneficioDto {
  @ApiProperty({
    description: 'Nome do tipo de benefício',
    example: 'Auxílio Moradia',
  })
  nome: string;

  @ApiProperty({
    description: 'Descrição detalhada do benefício',
    example: 'Auxílio financeiro para famílias em situação de vulnerabilidade social com fim habitacional',
  })
  descricao: string;

  @ApiProperty({
    description: 'Base legal que institui o benefício',
    example: 'Lei Municipal 7.205/2021',
  })
  baseLegal: string;

  @ApiProperty({
    description: 'Valor do benefício em Reais',
    example: 400.00,
    type: 'number',
    format: 'float',
  })
  valor: number;

  @ApiProperty({
    description: 'Periodicidade do benefício',
    example: 'MENSAL',
    enum: ['UNICO', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'],
  })
  periodicidade: string;

  @ApiProperty({
    description: 'Número máximo de parcelas (0 = sem limite)',
    example: 12,
    default: 0,
  })
  limiteParcelas: number;

  @ApiProperty({
    description: 'Critérios de elegibilidade em formato JSON',
    example: {
      rendaPerCapita: { max: 178.0 },
      idade: { min: 18 },
      tempoResidenciaCidade: { min: 12, unidade: 'meses' },
    },
    type: 'object',
    additionalProperties: true
  })
  criteriosElegibilidade: Record<string, any>;

  @ApiProperty({
    description: 'Se o benefício está ativo para solicitações',
    example: true,
    default: true,
  })
  ativo: boolean;
}

/**
 * DTO para resposta de tipo de benefício
 */
export class TipoBeneficioResponseDto extends CreateTipoBeneficioDto {
  @ApiProperty({
    description: 'Identificador único do tipo de benefício',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
  })
  id: string;

  @ApiProperty({
    description: 'Data e hora de criação do registro',
    example: '2025-05-18T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data e hora da última atualização do registro',
    example: '2025-05-18T12:00:00.000Z',
  })
  updatedAt: Date;
}

/**
 * DTO para atualização de tipo de benefício
 */
export class UpdateTipoBeneficioDto {
  @ApiProperty({
    description: 'Nome do tipo de benefício',
    example: 'Auxílio Moradia',
    required: false,
  })
  nome?: string;

  @ApiProperty({
    description: 'Descrição detalhada do benefício',
    example: 'Auxílio financeiro para famílias em situação de vulnerabilidade social com fim habitacional',
    required: false,
  })
  descricao?: string;

  @ApiProperty({
    description: 'Base legal que institui o benefício',
    example: 'Lei Municipal 7.205/2021',
    required: false,
  })
  baseLegal?: string;

  @ApiProperty({
    description: 'Valor do benefício em Reais',
    example: 400.00,
    type: 'number',
    format: 'float',
    required: false,
  })
  valor?: number;

  @ApiProperty({
    description: 'Periodicidade do benefício',
    example: 'MENSAL',
    enum: ['UNICO', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'],
    required: false,
  })
  periodicidade?: string;

  @ApiProperty({
    description: 'Número máximo de parcelas (0 = sem limite)',
    example: 12,
    required: false,
  })
  limiteParcelas?: number;

  @ApiProperty({
    description: 'Critérios de elegibilidade em formato JSON',
    example: {
      rendaPerCapita: { max: 178.0 },
      idade: { min: 18 },
      tempoResidenciaCidade: { min: 12, unidade: 'meses' },
    },
    type: 'object',
    additionalProperties: true
  })
  criteriosElegibilidade?: Record<string, any>;

  @ApiProperty({
    description: 'Se o benefício está ativo para solicitações',
    example: true,
    required: false,
  })
  ativo?: boolean;
}

/**
 * DTO para criação de solicitação de benefício
 */
export class CreateSolicitacaoBeneficioDto {
  @ApiProperty({
    description: 'ID do cidadão solicitante',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
  })
  cidadaoId: string;

  @ApiProperty({
    description: 'ID do tipo de benefício solicitado',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
  })
  tipoBeneficioId: string;

  @ApiProperty({
    description: 'Dados específicos do benefício em formato JSON',
    example: {
      motivoSolicitacao: 'Perda de renda por desemprego',
      possuiComprovanteResidencia: true,
      rendaFamiliar: 850.00,
      quantidadePessoas: 3,
    },
    type: 'object',
    additionalProperties: true
  })
  dadosDinamicos: Record<string, any>;
}
