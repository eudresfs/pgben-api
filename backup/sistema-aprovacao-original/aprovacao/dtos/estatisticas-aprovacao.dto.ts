import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para período de estatísticas
 */
export class PeriodoEstatisticasDto {
  @ApiProperty({
    description: 'Data de início do período',
    example: '2024-01-01T00:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  data_inicio: Date;

  @ApiProperty({
    description: 'Data de fim do período',
    example: '2024-12-31T23:59:59.999Z',
    type: 'string',
    format: 'date-time',
  })
  data_fim: Date;
}

/**
 * DTO para totais de aprovação
 */
export class TotaisAprovacaoDto {
  @ApiProperty({
    description: 'Total de solicitações criadas',
    example: 150,
  })
  solicitacoes: number;

  @ApiProperty({
    description: 'Total de aprovações',
    example: 120,
  })
  aprovacoes: number;

  @ApiProperty({
    description: 'Total de rejeições',
    example: 20,
  })
  rejeicoes: number;

  @ApiProperty({
    description: 'Total de cancelamentos',
    example: 5,
  })
  cancelamentos: number;

  @ApiProperty({
    description: 'Total de solicitações expiradas',
    example: 3,
  })
  expirados: number;

  @ApiProperty({
    description: 'Total de solicitações pendentes',
    example: 2,
  })
  pendentes: number;
}

/**
 * DTO para percentuais de aprovação
 */
export class PercentuaisAprovacaoDto {
  @ApiProperty({
    description: 'Taxa de aprovação (%)',
    example: 80.0,
  })
  taxa_aprovacao: number;

  @ApiProperty({
    description: 'Taxa de rejeição (%)',
    example: 13.33,
  })
  taxa_rejeicao: number;

  @ApiProperty({
    description: 'Taxa de cancelamento (%)',
    example: 3.33,
  })
  taxa_cancelamento: number;

  @ApiProperty({
    description: 'Taxa de expiração (%)',
    example: 2.0,
  })
  taxa_expiracao: number;
}

/**
 * DTO para tempos de aprovação
 */
export class TemposAprovacaoDto {
  @ApiProperty({
    description: 'Tempo médio de aprovação em horas',
    example: 4.5,
  })
  tempo_medio_aprovacao_horas: number;

  @ApiPropertyOptional({
    description: 'Tempo mínimo de aprovação em horas',
    example: 0.5,
  })
  tempo_minimo_aprovacao_horas?: number;

  @ApiPropertyOptional({
    description: 'Tempo máximo de aprovação em horas',
    example: 24.0,
  })
  tempo_maximo_aprovacao_horas?: number;

  @ApiPropertyOptional({
    description: 'Mediana do tempo de aprovação em horas',
    example: 3.0,
  })
  mediana_tempo_aprovacao_horas?: number;
}

/**
 * DTO para estatísticas por tipo de ação
 */
export class EstatisticasPorTipoDto {
  @ApiProperty({
    description: 'Número de aprovações para este tipo',
    example: 45,
  })
  aprovado: number;

  @ApiProperty({
    description: 'Número de rejeições para este tipo',
    example: 5,
  })
  rejeitado: number;

  @ApiPropertyOptional({
    description: 'Taxa de aprovação para este tipo (%)',
    example: 90.0,
  })
  taxa_aprovacao?: number;
}

/**
 * DTO para estatísticas por aprovador
 */
export class EstatisticasPorAprovadorDto {
  @ApiProperty({
    description: 'Número de aprovações pelo aprovador',
    example: 25,
  })
  aprovado: number;

  @ApiProperty({
    description: 'Número de rejeições pelo aprovador',
    example: 3,
  })
  rejeitado: number;

  @ApiPropertyOptional({
    description: 'Taxa de aprovação do aprovador (%)',
    example: 89.3,
  })
  taxa_aprovacao?: number;

  @ApiPropertyOptional({
    description: 'Tempo médio de decisão em horas',
    example: 2.5,
  })
  tempo_medio_decisao_horas?: number;
}

/**
 * DTO principal para estatísticas de aprovação
 */
export class EstatisticasAprovacaoDto {
  @ApiProperty({
    description: 'Período das estatísticas',
    type: PeriodoEstatisticasDto,
  })
  periodo: PeriodoEstatisticasDto;

  @ApiPropertyOptional({
    description: 'Filtro de unidade aplicado (se houver)',
    example: 'DIRETORIA_TECNICA',
  })
  unidade_filtro?: string;

  @ApiProperty({
    description: 'Totais absolutos',
    type: TotaisAprovacaoDto,
  })
  totais: TotaisAprovacaoDto;

  @ApiProperty({
    description: 'Percentuais calculados',
    type: PercentuaisAprovacaoDto,
  })
  percentuais: PercentuaisAprovacaoDto;

  @ApiProperty({
    description: 'Tempos de aprovação',
    type: TemposAprovacaoDto,
  })
  tempos: TemposAprovacaoDto;

  @ApiProperty({
    description: 'Estatísticas por tipo de ação crítica',
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        aprovado: { type: 'number' },
        rejeitado: { type: 'number' },
        taxa_aprovacao: { type: 'number' },
      },
    },
    example: {
      'EXCLUSAO_USUARIO': {
        aprovado: 45,
        rejeitado: 5,
        taxa_aprovacao: 90.0,
      },
      'ALTERACAO_PERMISSAO': {
        aprovado: 30,
        rejeitado: 8,
        taxa_aprovacao: 78.9,
      },
    },
  })
  por_tipo_acao: Record<string, EstatisticasPorTipoDto>;

  @ApiProperty({
    description: 'Estatísticas por aprovador',
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        aprovado: { type: 'number' },
        rejeitado: { type: 'number' },
        taxa_aprovacao: { type: 'number' },
        tempo_medio_decisao_horas: { type: 'number' },
      },
    },
    example: {
      'João Silva': {
        aprovado: 25,
        rejeitado: 3,
        taxa_aprovacao: 89.3,
        tempo_medio_decisao_horas: 2.5,
      },
      'Maria Santos': {
        aprovado: 20,
        rejeitado: 2,
        taxa_aprovacao: 90.9,
        tempo_medio_decisao_horas: 1.8,
      },
    },
  })
  por_aprovador: Record<string, EstatisticasPorAprovadorDto>;

  @ApiProperty({
    description: 'Data e hora de geração das estatísticas',
    example: '2024-01-15T10:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  gerado_em: Date;

  @ApiPropertyOptional({
    description: 'Observações ou notas sobre as estatísticas',
    example: 'Dados incluem apenas solicitações finalizadas',
  })
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Versão do algoritmo de cálculo',
    example: '1.0.0',
  })
  versao_calculo?: string;
}