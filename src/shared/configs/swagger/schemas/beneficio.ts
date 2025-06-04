import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para criação de novo tipo de benefício no sistema
 */
export class CreateTipoBeneficioDto {
  @ApiProperty({
    description: 'Nome oficial do tipo de benefício',
    example: 'Benefício Natalidade',
    type: 'string',
    minLength: 3,
    maxLength: 100,
  })
  nome: string;

  @ApiProperty({
    description: 'Descrição detalhada do benefício e seus objetivos',
    example:
      'Benefício financeiro destinado a famílias em situação de vulnerabilidade social para despesas relacionadas ao nascimento de criança',
    type: 'string',
    minLength: 10,
    maxLength: 500,
  })
  descricao: string;

  @ApiProperty({
    description: 'Base legal que fundamenta a concessão do benefício',
    example: 'Lei Municipal nº 1.234/2023, Art. 15',
    type: 'string',
    minLength: 5,
    maxLength: 200,
  })
  baseLegal: string;

  @ApiProperty({
    description: 'Valor monetário do benefício em reais (R$)',
    example: 500.0,
    type: 'number',
    format: 'float',
    minimum: 0.01,
    maximum: 50000.0,
  })
  valor: number;

  @ApiProperty({
    description: 'Frequência de pagamento do benefício',
    example: 'UNICO',
    enum: ['UNICO', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'],
    type: 'string',
  })
  periodicidade: string;

  @ApiPropertyOptional({
    description:
      'Número máximo de parcelas (aplicável apenas para benefícios recorrentes)',
    example: 6,
    type: 'integer',
    minimum: 1,
    maximum: 60,
  })
  limiteParcelas?: number;

  @ApiProperty({
    description:
      'Critérios de elegibilidade estruturados para avaliação automática',
    example: {
      rendaFamiliarMaxima: 1000.0,
      idadeMinimaRequerente: 18,
      idadeMaximaRequerente: 65,
      documentosObrigatorios: [
        'CPF',
        'RG',
        'Comprovante de Residência',
        'Comprovante de Renda',
      ],
      situacoesEspeciais: ['gestante', 'lactante', 'deficiencia'],
      tempoMinimoResidencia: 12,
    },
  })
  criteriosElegibilidade: object;

  @ApiProperty({
    description:
      'Indica se o tipo de benefício está disponível para solicitação',
    example: true,
    type: 'boolean',
    default: true,
  })
  ativo: boolean;

  @ApiPropertyOptional({
    description: 'Categoria do benefício para organização administrativa',
    example: 'ASSISTENCIA_SOCIAL',
    enum: [
      'ASSISTENCIA_SOCIAL',
      'AUXILIO_EMERGENCIAL',
      'PROMOCAO_SOCIAL',
      'HABITACAO',
      'ALIMENTACAO',
    ],
    type: 'string',
  })
  categoria?: string;

  @ApiPropertyOptional({
    description: 'Prazo em dias para análise da solicitação',
    example: 30,
    type: 'integer',
    minimum: 1,
    maximum: 180,
  })
  prazoAnalise?: number;

  @ApiPropertyOptional({
    description: 'Documentos específicos exigidos para este tipo de benefício',
    example: ['Certidão de Nascimento da Criança', 'Declaração do Hospital'],
    type: 'array',
    items: {
      type: 'string',
    },
  })
  documentosEspecificos?: string[];
}

/**
 * DTO para resposta com dados completos do tipo de benefício
 */
export class TipoBeneficioResponseDto extends CreateTipoBeneficioDto {
  @ApiProperty({
    description: 'Identificador único do tipo de benefício no sistema',
    example: '507f1f77bcf86cd799439011',
    type: 'string',
  })
  id: string;

  @ApiProperty({
    description: 'Data e hora de criação do registro',
    example: '2025-01-18T10:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Data e hora da última atualização do registro',
    example: '2025-01-18T10:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  updatedAt: string;

  @ApiPropertyOptional({
    description:
      'Número total de solicitações já realizadas para este tipo de benefício',
    example: 150,
    type: 'integer',
    minimum: 0,
  })
  totalSolicitacoes?: number;

  @ApiPropertyOptional({
    description: 'Número de solicitações aprovadas',
    example: 120,
    type: 'integer',
    minimum: 0,
  })
  solicitacoesAprovadas?: number;

  @ApiPropertyOptional({
    description: 'Valor total já concedido para este tipo de benefício',
    example: 60000.0,
    type: 'number',
    format: 'float',
    minimum: 0,
  })
  valorTotalConcedido?: number;
}

/**
 * DTO para atualização de dados do tipo de benefício
 */
export class UpdateTipoBeneficioDto {
  @ApiPropertyOptional({
    description: 'Nome oficial do tipo de benefício',
    example: 'Benefício Natalidade Especial',
    type: 'string',
    minLength: 3,
    maxLength: 100,
  })
  nome?: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada do benefício e seus objetivos',
    example:
      'Benefício financeiro destinado a famílias em situação de extrema vulnerabilidade social',
    type: 'string',
    minLength: 10,
    maxLength: 500,
  })
  descricao?: string;

  @ApiPropertyOptional({
    description: 'Base legal que fundamenta a concessão do benefício',
    example:
      'Lei Municipal nº 1.234/2023, Art. 15, alterada pela Lei nº 1.456/2024',
    type: 'string',
    minLength: 5,
    maxLength: 200,
  })
  baseLegal?: string;

  @ApiPropertyOptional({
    description: 'Valor monetário do benefício em reais (R$)',
    example: 750.0,
    type: 'number',
    format: 'float',
    minimum: 0.01,
    maximum: 50000.0,
  })
  valor?: number;

  @ApiPropertyOptional({
    description: 'Frequência de pagamento do benefício',
    example: 'MENSAL',
    enum: ['UNICO', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'],
    type: 'string',
  })
  periodicidade?: string;

  @ApiPropertyOptional({
    description:
      'Número máximo de parcelas (aplicável apenas para benefícios recorrentes)',
    example: 3,
    type: 'integer',
    minimum: 1,
    maximum: 60,
  })
  limiteParcelas?: number;

  @ApiPropertyOptional({
    description:
      'Critérios de elegibilidade estruturados para avaliação automática',
    example: {
      rendaFamiliarMaxima: 1500.0,
      idadeMinimaRequerente: 16,
      documentosObrigatorios: ['CPF', 'RG', 'Comprovante de Residência'],
      situacoesEspeciais: ['gestante', 'lactante'],
    },
  })
  criteriosElegibilidade?: object;

  @ApiPropertyOptional({
    description:
      'Indica se o tipo de benefício está disponível para solicitação',
    example: false,
    type: 'boolean',
  })
  ativo?: boolean;

  @ApiPropertyOptional({
    description: 'Categoria do benefício para organização administrativa',
    example: 'AUXILIO_EMERGENCIAL',
    enum: [
      'ASSISTENCIA_SOCIAL',
      'AUXILIO_EMERGENCIAL',
      'PROMOCAO_SOCIAL',
      'HABITACAO',
      'ALIMENTACAO',
    ],
    type: 'string',
  })
  categoria?: string;

  @ApiPropertyOptional({
    description: 'Prazo em dias para análise da solicitação',
    example: 15,
    type: 'integer',
    minimum: 1,
    maximum: 180,
  })
  prazoAnalise?: number;

  @ApiPropertyOptional({
    description: 'Documentos específicos exigidos para este tipo de benefício',
    example: [
      'Certidão de Nascimento da Criança',
      'Declaração Médica',
      'Comprovante de Vacinação',
    ],
    type: 'array',
    items: {
      type: 'string',
    },
  })
  documentosEspecificos?: string[];
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
      rendaFamiliar: 850.0,
      quantidadePessoas: 3,
    },
  })
  dadosDinamicos: Record<string, any>;
}
