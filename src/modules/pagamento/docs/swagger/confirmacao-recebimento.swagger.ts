import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Schemas Swagger para confirmações de recebimento
 *
 * Define os schemas utilizados na documentação Swagger para
 * as operações relacionadas a confirmações de recebimento de pagamentos.
 *
 * @author Equipe PGBen
 */

/**
 * Schema para criação de confirmação de recebimento
 */
export class ConfirmacaoRecebimentoCreateDto {
  @ApiProperty({
    description: 'ID do pagamento a ser confirmado',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String,
  })
  pagamentoId: string;

  @ApiProperty({
    description: 'Data da confirmação do recebimento',
    example: '2025-05-20T14:30:00.000Z',
    type: Date,
  })
  dataConfirmacao: Date;

  @ApiProperty({
    description: 'Método de confirmação utilizado',
    example: 'PRESENCIAL',
    enum: ['PRESENCIAL', 'TELEFONE', 'EMAIL', 'APLICATIVO'],
    type: String,
  })
  metodoConfirmacao: string;

  @ApiPropertyOptional({
    description: 'ID do documento de comprovação (se aplicável)',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String,
  })
  documentoId?: string;

  @ApiPropertyOptional({
    description: 'Observações sobre a confirmação',
    example: 'Beneficiário confirmou recebimento pessoalmente na unidade',
    type: String,
  })
  observacoes?: string;
}

/**
 * Schema para resposta de confirmação de recebimento
 */
export class ConfirmacaoRecebimentoResponseDto {
  @ApiProperty({
    description: 'ID único da confirmação de recebimento',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String,
  })
  id: string;

  @ApiProperty({
    description: 'ID do pagamento confirmado',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String,
  })
  pagamentoId: string;

  @ApiProperty({
    description: 'Data da confirmação do recebimento',
    example: '2025-05-20T14:30:00.000Z',
    type: Date,
  })
  dataConfirmacao: Date;

  @ApiProperty({
    description: 'Método de confirmação utilizado',
    example: 'PRESENCIAL',
    enum: ['PRESENCIAL', 'TELEFONE', 'EMAIL', 'APLICATIVO'],
    type: String,
  })
  metodoConfirmacao: string;

  @ApiProperty({
    description: 'ID do usuário que registrou a confirmação',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String,
  })
  registradoPor: string;

  @ApiPropertyOptional({
    description: 'ID do documento de comprovação (se aplicável)',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String,
  })
  documentoId?: string;

  @ApiPropertyOptional({
    description: 'URL para download do documento de comprovação (se aplicável)',
    example:
      'https://api.pgben.natal.rn.gov.br/documentos/5f8d3b4e3b4f3b2d3c2e1d2f/download',
    type: String,
  })
  urlDocumento?: string;

  @ApiPropertyOptional({
    description: 'Observações sobre a confirmação',
    example: 'Beneficiário confirmou recebimento pessoalmente na unidade',
    type: String,
  })
  observacoes?: string;

  @ApiProperty({
    description: 'Data de criação do registro',
    example: '2025-05-20T14:30:00.000Z',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do registro',
    example: '2025-05-20T14:30:00.000Z',
    type: Date,
  })
  updatedAt: Date;
}

/**
 * Schema para resposta de lista de confirmações de recebimento
 */
export class ConfirmacoesRecebimentoResponseDto {
  @ApiProperty({
    description: 'Lista de confirmações de recebimento',
    type: [ConfirmacaoRecebimentoResponseDto],
    isArray: true,
  })
  items: ConfirmacaoRecebimentoResponseDto[];

  @ApiProperty({
    description: 'Total de registros encontrados',
    example: 1,
    type: Number,
  })
  total: number;
}

/**
 * Schema para filtros de confirmações de recebimento
 */
export class ConfirmacaoRecebimentoFilterDto {
  @ApiPropertyOptional({
    description: 'Filtrar por ID do pagamento',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String,
  })
  pagamentoId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por método de confirmação',
    example: 'PRESENCIAL',
    enum: ['PRESENCIAL', 'TELEFONE', 'EMAIL', 'APLICATIVO'],
    type: String,
  })
  metodoConfirmacao?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por data inicial de confirmação',
    example: '2025-05-01T00:00:00.000Z',
    type: Date,
  })
  dataConfirmacaoInicio?: Date;

  @ApiPropertyOptional({
    description: 'Filtrar por data final de confirmação',
    example: '2025-05-31T23:59:59.999Z',
    type: Date,
  })
  dataConfirmacaoFim?: Date;

  @ApiPropertyOptional({
    description: 'Número da página para paginação',
    example: 1,
    minimum: 1,
    default: 1,
    type: Number,
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'Limite de itens por página',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
    type: Number,
  })
  limit?: number;
}
