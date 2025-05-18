import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusPagamentoEnum } from '../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../enums/metodo-pagamento.enum';

/**
 * Schemas Swagger para o módulo de pagamento
 * 
 * Define os schemas utilizados na documentação Swagger para
 * as operações relacionadas a pagamentos.
 * 
 * @author Equipe PGBen
 */

/**
 * Schema para criação de pagamento
 */
export class PagamentoCreateDto {
  @ApiProperty({
    description: 'Valor do pagamento em reais',
    example: 500.00,
    minimum: 0.01,
    type: Number
  })
  valor: number;

  @ApiProperty({
    description: 'Data de liberação do pagamento',
    example: '2025-05-18T12:00:00.000Z',
    type: Date
  })
  dataLiberacao: Date;

  @ApiProperty({
    description: 'Método de pagamento',
    enum: MetodoPagamentoEnum,
    example: MetodoPagamentoEnum.PIX,
    enumName: 'MetodoPagamentoEnum'
  })
  metodoPagamento: MetodoPagamentoEnum;

  @ApiProperty({
    description: 'ID da informação bancária do beneficiário',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String
  })
  infoBancariaId: string;

  @ApiProperty({
    description: 'Dados bancários para o pagamento',
    type: 'object',
    properties: {
      pixTipo: {
        type: 'string',
        description: 'Tipo da chave PIX (CPF, email, telefone, aleatoria)',
        example: 'CPF'
      },
      pixChave: {
        type: 'string',
        description: 'Valor da chave PIX',
        example: '123.456.789-09'
      },
      banco: {
        type: 'string',
        description: 'Código do banco (para transferência bancária)',
        example: '001'
      },
      agencia: {
        type: 'string',
        description: 'Número da agência (para transferência bancária)',
        example: '1234'
      },
      conta: {
        type: 'string',
        description: 'Número da conta com dígito (para transferência bancária)',
        example: '12345-6'
      }
    }
  })
  dadosBancarios: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Observações sobre o pagamento',
    example: 'Pagamento referente ao benefício eventual de auxílio moradia',
    type: String
  })
  observacoes?: string;
}

/**
 * Schema para atualização de status de pagamento
 */
export class PagamentoStatusUpdateDto {
  @ApiProperty({
    description: 'Novo status do pagamento',
    enum: StatusPagamentoEnum,
    example: StatusPagamentoEnum.LIBERADO,
    enumName: 'StatusPagamentoEnum'
  })
  status: StatusPagamentoEnum;

  @ApiPropertyOptional({
    description: 'Observações sobre a mudança de status',
    example: 'Pagamento liberado após verificação da documentação',
    type: String
  })
  observacoes?: string;
}

/**
 * Schema para cancelamento de pagamento
 */
export class PagamentoCancelamentoDto {
  @ApiProperty({
    description: 'Motivo do cancelamento',
    example: 'Dados bancários incorretos',
    type: String
  })
  motivo: string;
}

/**
 * Schema para resposta de pagamento
 */
export class PagamentoResponseDto {
  @ApiProperty({
    description: 'ID único do pagamento',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String
  })
  id: string;

  @ApiProperty({
    description: 'ID da solicitação associada ao pagamento',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String
  })
  solicitacaoId: string;

  @ApiProperty({
    description: 'Valor do pagamento em reais',
    example: 500.00,
    type: Number
  })
  valor: number;

  @ApiProperty({
    description: 'Status atual do pagamento',
    enum: StatusPagamentoEnum,
    example: StatusPagamentoEnum.AGENDADO,
    enumName: 'StatusPagamentoEnum'
  })
  status: StatusPagamentoEnum;

  @ApiProperty({
    description: 'Método de pagamento',
    enum: MetodoPagamentoEnum,
    example: MetodoPagamentoEnum.PIX,
    enumName: 'MetodoPagamentoEnum'
  })
  metodoPagamento: MetodoPagamentoEnum;

  @ApiProperty({
    description: 'Data de liberação do pagamento',
    example: '2025-05-18T12:00:00.000Z',
    type: Date
  })
  dataLiberacao: Date;

  @ApiProperty({
    description: 'ID da informação bancária do beneficiário',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String
  })
  infoBancariaId: string;

  @ApiProperty({
    description: 'Dados bancários para o pagamento (mascarados)',
    type: 'object',
    properties: {
      pixTipo: {
        type: 'string',
        description: 'Tipo da chave PIX',
        example: 'CPF'
      },
      pixChave: {
        type: 'string',
        description: 'Valor da chave PIX (mascarado)',
        example: '***.456.789-**'
      },
      banco: {
        type: 'string',
        description: 'Código do banco',
        example: '001'
      },
      nomeBanco: {
        type: 'string',
        description: 'Nome do banco',
        example: 'Banco do Brasil'
      },
      agencia: {
        type: 'string',
        description: 'Número da agência (mascarado)',
        example: '1**4'
      },
      conta: {
        type: 'string',
        description: 'Número da conta com dígito (mascarado)',
        example: '12**5-6'
      }
    }
  })
  dadosBancarios: Record<string, any>;

  @ApiProperty({
    description: 'ID do usuário responsável pela liberação',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String
  })
  responsavelLiberacao: string;

  @ApiPropertyOptional({
    description: 'ID do usuário responsável pela confirmação',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String
  })
  responsavelConfirmacao?: string;

  @ApiPropertyOptional({
    description: 'Data da confirmação do pagamento',
    example: '2025-05-20T14:30:00.000Z',
    type: Date
  })
  dataConfirmacao?: Date;

  @ApiPropertyOptional({
    description: 'Observações sobre o pagamento',
    example: 'Pagamento referente ao benefício eventual de auxílio moradia',
    type: String
  })
  observacoes?: string;

  @ApiProperty({
    description: 'Data de criação do registro',
    example: '2025-05-15T10:00:00.000Z',
    type: Date
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do registro',
    example: '2025-05-18T12:00:00.000Z',
    type: Date
  })
  updatedAt: Date;
}

/**
 * Schema para filtros de pagamento
 */
export class PagamentoFilterDto {
  @ApiPropertyOptional({
    description: 'Filtrar por status do pagamento',
    enum: StatusPagamentoEnum,
    example: StatusPagamentoEnum.LIBERADO,
    enumName: 'StatusPagamentoEnum'
  })
  status?: StatusPagamentoEnum;

  @ApiPropertyOptional({
    description: 'Filtrar por método de pagamento',
    enum: MetodoPagamentoEnum,
    example: MetodoPagamentoEnum.PIX,
    enumName: 'MetodoPagamentoEnum'
  })
  metodoPagamento?: MetodoPagamentoEnum;

  @ApiPropertyOptional({
    description: 'Filtrar por ID da solicitação',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String
  })
  solicitacaoId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ID da unidade',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String
  })
  unidadeId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ID do cidadão',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String
  })
  cidadaoId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por data inicial de liberação',
    example: '2025-05-01T00:00:00.000Z',
    type: Date
  })
  dataLiberacaoInicio?: Date;

  @ApiPropertyOptional({
    description: 'Filtrar por data final de liberação',
    example: '2025-05-31T23:59:59.999Z',
    type: Date
  })
  dataLiberacaoFim?: Date;

  @ApiPropertyOptional({
    description: 'Número da página para paginação',
    example: 1,
    minimum: 1,
    default: 1,
    type: Number
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'Limite de itens por página',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
    type: Number
  })
  limit?: number;
}

/**
 * Schema para resposta paginada de pagamentos
 */
export class PagamentosPaginatedResponseDto {
  @ApiProperty({
    description: 'Lista de pagamentos',
    type: [PagamentoResponseDto],
    isArray: true
  })
  items: PagamentoResponseDto[];

  @ApiProperty({
    description: 'Total de registros encontrados',
    example: 42,
    type: Number
  })
  total: number;

  @ApiProperty({
    description: 'Número da página atual',
    example: 1,
    type: Number
  })
  page: number;

  @ApiProperty({
    description: 'Limite de itens por página',
    example: 10,
    type: Number
  })
  limit: number;
}
