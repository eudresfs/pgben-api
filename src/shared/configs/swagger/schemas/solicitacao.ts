import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CidadaoResponseDto } from './cidadao';
import { TipoBeneficioResponseDto } from './beneficio';

/**
 * DTO para criação de nova solicitação de benefício
 */
export class CreateSolicitacaoDto {
  @ApiProperty({
    description: 'ID do tipo de benefício solicitado',
    example: '507f1f77bcf86cd799439011',
    type: 'string'
  })
  tipoBeneficioId: string;

  @ApiProperty({
    description: 'ID do cidadão solicitante',
    example: '507f1f77bcf86cd799439012',
    type: 'string'
  })
  cidadaoId: string;

  @ApiProperty({
    description: 'Justificativa detalhada para a solicitação do benefício',
    example: 'Família em situação de vulnerabilidade social após nascimento de gêmeos, necessitando de auxílio para despesas médicas e alimentação.',
    type: 'string',
    minLength: 20,
    maxLength: 1000
  })
  justificativa: string;

  @ApiPropertyOptional({
    description: 'Observações adicionais do solicitante',
    example: 'Pai desempregado há 3 meses, mãe em licença maternidade.',
    type: 'string',
    maxLength: 500
  })
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Lista de IDs dos documentos anexados à solicitação',
    example: ['doc1_id', 'doc2_id', 'doc3_id'],
    type: 'array',
    items: {
      type: 'string'
    }
  })
  documentosAnexados?: string[];

  @ApiPropertyOptional({
    description: 'Dados específicos relacionados ao tipo de benefício solicitado',
    example: {
      quantidadePessoas: 3,
      valorAluguel: 800.00,
      tempoMoradia: '2 anos',
      situacaoHabitacional: 'Aluguel'
    }
  })
  dadosEspecificos?: object;

  @ApiPropertyOptional({
    description: 'Indica se é uma solicitação urgente',
    example: false,
    type: 'boolean',
    default: false
  })
  urgente?: boolean;
}

/**
 * DTO para resposta com dados completos da solicitação
 */
export class SolicitacaoResponseDto extends CreateSolicitacaoDto {
  @ApiProperty({
    description: 'Identificador único da solicitação',
    example: '507f1f77bcf86cd799439013',
    type: 'string'
  })
  id: string;

  @ApiProperty({
    description: 'Número sequencial da solicitação para identificação',
    example: '2025/001234',
    type: 'string'
  })
  numeroProtocolo: string;

  @ApiProperty({
    description: 'Status atual da solicitação',
    example: 'EM_ANALISE',
    enum: [
      'RASCUNHO',
      'SUBMETIDA', 
      'EM_ANALISE',
      'PENDENTE_DOCUMENTACAO',
      'APROVADA',
      'REJEITADA',
      'CANCELADA',
      'PAGAMENTO_AUTORIZADO',
      'PAGA',
      'FINALIZADA'
    ],
    type: 'string'
  })
  status: string;

  @ApiProperty({
    description: 'Prioridade da solicitação baseada em critérios automáticos',
    example: 'MEDIA',
    enum: ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'],
    type: 'string'
  })
  prioridade: string;

  @ApiProperty({
    description: 'Dados completos do cidadão solicitante',
    type: () => CidadaoResponseDto
  })
  cidadao: CidadaoResponseDto;

  @ApiProperty({
    description: 'Dados completos do tipo de benefício solicitado',
    type: () => TipoBeneficioResponseDto
  })
  tipoBeneficio: TipoBeneficioResponseDto;

  @ApiProperty({
    description: 'Data e hora de criação da solicitação',
    example: '2025-01-18T10:30:00.000Z',
    type: 'string',
    format: 'date-time'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Data e hora da última atualização',
    example: '2025-01-18T14:45:00.000Z',
    type: 'string',
    format: 'date-time'
  })
  updatedAt: string;

  @ApiPropertyOptional({
    description: 'Data limite para análise da solicitação',
    example: '2025-02-17T23:59:59.000Z',
    type: 'string',
    format: 'date-time'
  })
  prazoAnalise?: string;

  @ApiPropertyOptional({
    description: 'ID do usuário responsável pela análise',
    example: '507f1f77bcf86cd799439014',
    type: 'string'
  })
  analistaId?: string;

  @ApiPropertyOptional({
    description: 'Nome do analista responsável',
    example: 'Maria Silva Santos',
    type: 'string'
  })
  nomeAnalista?: string;

  @ApiPropertyOptional({
    description: 'Data de aprovação da solicitação',
    example: '2025-01-25T16:30:00.000Z',
    type: 'string',
    format: 'date-time'
  })
  dataAprovacao?: string;

  @ApiPropertyOptional({
    description: 'Data de rejeição da solicitação',
    example: '2025-01-25T16:30:00.000Z',
    type: 'string',
    format: 'date-time'
  })
  dataRejeicao?: string;

  @ApiPropertyOptional({
    description: 'Motivo da rejeição quando aplicável',
    example: 'Documentação incompleta: falta comprovante de renda atualizado',
    type: 'string',
    maxLength: 500
  })
  motivoRejeicao?: string;

  @ApiPropertyOptional({
    description: 'Pontuação calculada automaticamente baseada nos critérios',
    example: 85.5,
    type: 'number',
    format: 'float',
    minimum: 0,
    maximum: 100
  })
  pontuacao?: number;

  @ApiPropertyOptional({
    description: 'Valor aprovado para pagamento (pode diferir do valor padrão)',
    example: 500.00,
    type: 'number',
    format: 'float',
    minimum: 0
  })
  valorAprovado?: number;

  @ApiPropertyOptional({
    description: 'Número de parcelas aprovadas',
    example: 1,
    type: 'integer',
    minimum: 1
  })
  parcelasAprovadas?: number;
}

/**
 * DTO para atualização de solicitação
 */
export class UpdateSolicitacaoDto {
  @ApiPropertyOptional({
    description: 'Justificativa detalhada para a solicitação',
    example: 'Atualização: situação agravada devido a problemas de saúde da mãe',
    type: 'string',
    minLength: 20,
    maxLength: 1000
  })
  justificativa?: string;

  @ApiPropertyOptional({
    description: 'Observações adicionais',
    example: 'Documentos médicos anexados comprovando a necessidade',
    type: 'string',
    maxLength: 500
  })
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Lista atualizada de documentos anexados',
    example: ['doc1_id', 'doc2_id', 'doc3_id', 'doc4_id'],
    type: 'array',
    items: {
      type: 'string'
    }
  })
  documentosAnexados?: string[];

  @ApiPropertyOptional({
    description: 'Dados específicos atualizados',
    example: {
      situacaoSaude: 'Mãe com complicações pós-parto',
      rendaFamiliarAtual: 0
    }
  })
  dadosEspecificos?: object;
}

/**
 * DTO para análise de solicitação pelo analista
 */
export class AnaliseSolicitacaoDto {
  @ApiProperty({
    description: 'Decisão da análise',
    example: 'APROVADA',
    enum: ['APROVADA', 'REJEITADA', 'PENDENTE_DOCUMENTACAO'],
    type: 'string'
  })
  decisao: string;

  @ApiProperty({
    description: 'Parecer técnico detalhado do analista',
    example: 'Solicitação atende todos os critérios estabelecidos. Família em situação de vulnerabilidade comprovada.',
    type: 'string',
    minLength: 10,
    maxLength: 1000
  })
  parecerTecnico: string;

  @ApiPropertyOptional({
    description: 'Motivo da rejeição (obrigatório quando decisão = REJEITADA)',
    example: 'Renda familiar superior ao limite estabelecido',
    type: 'string',
    maxLength: 500
  })
  motivoRejeicao?: string;

  @ApiPropertyOptional({
    description: 'Valor aprovado (pode ser diferente do valor padrão)',
    example: 400.00,
    type: 'number',
    format: 'float',
    minimum: 0
  })
  valorAprovado?: number;

  @ApiPropertyOptional({
    description: 'Número de parcelas aprovadas',
    example: 1,
    type: 'integer',
    minimum: 1,
    maximum: 60
  })
  parcelasAprovadas?: number;

  @ApiPropertyOptional({
    description: 'Documentos adicionais solicitados',
    example: ['Comprovante de renda atualizado', 'Declaração médica'],
    type: 'array',
    items: {
      type: 'string'
    }
  })
  documentosSolicitados?: string[];

  @ApiPropertyOptional({
    description: 'Prazo em dias para apresentação de documentos pendentes',
    example: 15,
    type: 'integer',
    minimum: 1,
    maximum: 90
  })
  prazoDocumentos?: number;
}

/**
 * DTO para filtros de busca de solicitações
 */
export class FiltroSolicitacaoDto {
  @ApiPropertyOptional({
    description: 'Filtrar por status da solicitação',
    example: 'EM_ANALISE',
    enum: [
      'RASCUNHO',
      'SUBMETIDA',
      'EM_ANALISE', 
      'PENDENTE_DOCUMENTACAO',
      'APROVADA',
      'REJEITADA',
      'CANCELADA',
      'PAGAMENTO_AUTORIZADO',
      'PAGA',
      'FINALIZADA'
    ],
    type: 'string'
  })
  status?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de benefício',
    example: '507f1f77bcf86cd799439011',
    type: 'string'
  })
  tipoBeneficioId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por prioridade',
    example: 'ALTA',
    enum: ['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'],
    type: 'string'
  })
  prioridade?: string;

  @ApiPropertyOptional({
    description: 'Data inicial para filtro por período de criação',
    example: '2025-01-01',
    type: 'string',
    format: 'date'
  })
  dataInicio?: string;

  @ApiPropertyOptional({
    description: 'Data final para filtro por período de criação',
    example: '2025-01-31',
    type: 'string',
    format: 'date'
  })
  dataFim?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por analista responsável',
    example: '507f1f77bcf86cd799439014',
    type: 'string'
  })
  analistaId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar apenas solicitações urgentes',
    example: true,
    type: 'boolean'
  })
  apenasUrgentes?: boolean;

  @ApiPropertyOptional({
    description: 'Buscar por número de protocolo',
    example: '2025/001234',
    type: 'string'
  })
  numeroProtocolo?: string;

  @ApiPropertyOptional({
    description: 'Buscar por CPF do cidadão',
    example: '123.456.789-00',
    type: 'string'
  })
  cpfCidadao?: string;
}