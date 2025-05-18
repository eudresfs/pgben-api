import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para tipo de benefício
 */
export class TipoBeneficioDto {
  @ApiProperty({
    description: 'ID do tipo de benefício',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
  })
  id: string;

  @ApiProperty({
    description: 'Nome do benefício',
    example: 'Auxílio Emergencial',
  })
  nome: string;

  @ApiProperty({
    description: 'Descrição do benefício',
    example: 'Auxílio financeiro temporário para famílias em situação de vulnerabilidade',
  })
  descricao: string;

  @ApiProperty({
    description: 'Valor do benefício',
    example: 600.0,
  })
  valor: number;

  @ApiProperty({
    description: 'Indica se o benefício está ativo',
    example: true,
    default: true,
  })
  ativo: boolean;
}

/**
 * DTO para criação de tipo de benefício
 */
export class CreateTipoBeneficioDto {
  @ApiProperty({
    description: 'Nome do benefício',
    example: 'Auxílio Emergencial',
  })
  nome: string;

  @ApiProperty({
    description: 'Descrição do benefício',
    example: 'Auxílio financeiro temporário para famílias em situação de vulnerabilidade',
  })
  descricao: string;

  @ApiProperty({
    description: 'Valor do benefício',
    example: 600.0,
  })
  valor: number;
}

/**
 * DTO para atualização de tipo de benefício
 */
export class UpdateTipoBeneficioDto extends CreateTipoBeneficioDto {
  @ApiProperty({
    description: 'ID do tipo de benefício',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
  })
  id: string;

  @ApiProperty({
    description: 'Indica se o benefício está ativo',
    example: true,
    default: true,
  })
  ativo?: boolean;
}

/**
 * DTO para solicitação de benefício
 */
export class SolicitacaoBeneficioDto {
  @ApiProperty({
    description: 'ID da solicitação',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
  })
  id: string;

  @ApiProperty({
    description: 'ID do cidadão solicitante',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
  })
  cidadaoId: string;

  @ApiProperty({
    description: 'Tipo de benefício solicitado',
    type: TipoBeneficioDto,
  })
  tipoBeneficio: TipoBeneficioDto;

  @ApiProperty({
    description: 'Status da solicitação',
    example: 'EM_ANALISE',
    enum: ['RASCUNHO', 'EM_ANALISE', 'APROVADA', 'REPROVADA', 'CANCELADA', 'CONCLUIDA'],
  })
  status: string;

  @ApiProperty({
    description: 'Data da solicitação',
    example: '2025-05-17T21:50:07.000Z',
  })
  dataSolicitacao: string;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2025-05-17T21:50:07.000Z',
  })
  dataAtualizacao: string;

  @ApiProperty({
    description: 'Observações sobre a solicitação',
    example: 'Solicitação em análise pela equipe técnica',
    required: false,
  })
  observacoes?: string;
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
    description: 'ID do tipo de benefício',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
  })
  tipoBeneficioId: string;

  @ApiProperty({
    description: 'Observações sobre a solicitação',
    example: 'Solicito o benefício em caráter emergencial',
    required: false,
  })
  observacoes?: string;
}

/**
 * DTO para atualização de status de solicitação
 */
export class UpdateStatusSolicitacaoDto {
  @ApiProperty({
    description: 'Novo status da solicitação',
    example: 'APROVADA',
    enum: ['EM_ANALISE', 'APROVADA', 'REPROVADA', 'CANCELADA', 'CONCLUIDA'],
  })
  status: string;

  @ApiProperty({
    description: 'Observações sobre a mudança de status',
    example: 'Solicitação aprovada conforme análise técnica',
    required: false,
  })
  observacoes?: string;
}
