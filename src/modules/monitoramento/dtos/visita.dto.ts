import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsUUID,
  IsNotEmpty,
  ValidateNested,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import {
  TipoVisita,
  StatusVisita,
  ResultadoVisita,
  StatusAgendamento,
} from '../enums';

/**
 * DTO para registrar uma nova visita
 */
export class RegistrarVisitaDto {
  @ApiProperty({
    description: 'ID do agendamento relacionado',
    example: 'uuid-agendamento',
  })
  @IsUUID()
  @IsNotEmpty()
  agendamento_id: string;

  @ApiProperty({
    description: 'Data e hora de início da visita',
    example: '2024-01-15T10:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  data_inicio: string;

  @ApiPropertyOptional({
    description: 'Data e hora de fim da visita',
    example: '2024-01-15T11:30:00Z',
  })
  @IsDateString()
  @IsOptional()
  data_fim?: string;

  @ApiProperty({
    description: 'Resultado da visita',
    enum: ResultadoVisita,
    example: ResultadoVisita.REALIZADA_COM_SUCESSO,
  })
  @IsEnum(ResultadoVisita)
  @IsNotEmpty()
  resultado: ResultadoVisita;

  @ApiPropertyOptional({
    description: 'Observações sobre a visita',
    example: 'Beneficiário estava presente e receptivo',
  })
  @IsString()
  @IsOptional()
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Se recomenda renovação do benefício',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  recomenda_renovacao?: boolean;

  @ApiPropertyOptional({
    description: 'Se necessita nova visita',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  necessita_nova_visita?: boolean;

  @ApiPropertyOptional({
    description: 'Se os critérios de elegibilidade foram mantidos',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  criterios_elegibilidade_mantidos?: boolean;
}

/**
 * DTO para iniciar uma visita
 */
export class IniciarVisitaDto {
  @ApiProperty({
    description: 'ID do agendamento relacionado',
    example: 'uuid-agendamento',
  })
  @IsUUID()
  @IsNotEmpty()
  agendamento_id: string;

  @ApiProperty({
    description: 'Data e hora de início da visita',
    example: '2024-01-15T10:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  data_inicio: string;

  @ApiPropertyOptional({
    description: 'Observações iniciais sobre a visita',
    example: 'Iniciando visita domiciliar',
  })
  @IsString()
  @IsOptional()
  observacoes?: string;
}

/**
 * DTO para concluir uma visita
 */
export class ConcluirVisitaDto {
  @ApiProperty({
    description: 'Data e hora de fim da visita',
    example: '2024-01-15T11:30:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  data_fim: string;

  @ApiProperty({
    description: 'Resultado da visita',
    enum: ResultadoVisita,
    example: ResultadoVisita.REALIZADA_COM_SUCESSO,
  })
  @IsEnum(ResultadoVisita)
  @IsNotEmpty()
  resultado: ResultadoVisita;

  @ApiPropertyOptional({
    description: 'Observações finais sobre a visita',
    example: 'Visita concluída com sucesso',
  })
  @IsString()
  @IsOptional()
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Se recomenda renovação do benefício',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  recomenda_renovacao?: boolean;

  @ApiPropertyOptional({
    description: 'Se necessita nova visita',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  necessita_nova_visita?: boolean;

  @ApiPropertyOptional({
    description: 'Se os critérios de elegibilidade foram mantidos',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  criterios_elegibilidade_mantidos?: boolean;
}

/**
 * DTO para atualização de visita
 */
export class AtualizarVisitaDto {
  @ApiPropertyOptional({
    description: 'Data e hora de início da visita',
    example: '2024-01-15T10:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data e hora de fim da visita',
    example: '2024-01-15T11:30:00Z',
  })
  @IsDateString()
  @IsOptional()
  data_fim?: string;

  @ApiPropertyOptional({
    description: 'Status da visita',
    enum: StatusVisita,
    example: StatusVisita.EM_ANDAMENTO,
  })
  @IsEnum(StatusVisita)
  @IsOptional()
  status?: StatusVisita;

  @ApiPropertyOptional({
    description: 'Resultado da visita',
    enum: ResultadoVisita,
    example: ResultadoVisita.REALIZADA_COM_SUCESSO,
  })
  @IsEnum(ResultadoVisita)
  @IsOptional()
  resultado?: ResultadoVisita;

  @ApiPropertyOptional({
    description: 'Observações sobre a visita',
    example: 'Visita reagendada a pedido do beneficiário',
  })
  @IsString()
  @IsOptional()
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Se recomenda renovação do benefício',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  recomenda_renovacao?: boolean;

  @ApiPropertyOptional({
    description: 'Se necessita nova visita',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  necessita_nova_visita?: boolean;

  @ApiPropertyOptional({
    description: 'Se os critérios de elegibilidade foram mantidos',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  criterios_elegibilidade_mantidos?: boolean;
}

/**
 * DTO de resposta para visita
 */
export class VisitaResponseDto {
  @ApiProperty({
    description: 'ID da visita',
    example: 'uuid-visita',
  })
  id: string;

  @ApiProperty({
    description: 'ID do agendamento relacionado',
    example: 'uuid-agendamento',
  })
  agendamento_id: string;

  @ApiProperty({
    description: 'ID do beneficiário',
    example: 'uuid-beneficiario',
  })
  beneficiario_id: string;

  @ApiProperty({
    description: 'Nome do beneficiário',
    example: 'João Silva',
  })
  beneficiario_nome: string;

  @ApiProperty({
    description: 'ID do técnico responsável',
    example: 'uuid-tecnico',
  })
  tecnico_id: string;

  @ApiProperty({
    description: 'Nome do técnico responsável',
    example: 'Maria Santos',
  })
  tecnico_nome: string;

  @ApiProperty({
    description: 'ID da unidade',
    example: 'uuid-unidade',
  })
  unidade_id: string;

  @ApiProperty({
    description: 'Nome da unidade',
    example: 'CRAS Centro',
  })
  unidade_nome: string;

  @ApiProperty({
    description: 'Tipo da visita',
    enum: TipoVisita,
    example: TipoVisita.INICIAL,
  })
  tipo_visita: TipoVisita;

  @ApiPropertyOptional({
    description: 'Label do tipo da visita',
    example: 'Visita Inicial',
  })
  tipo_visita_label?: string;

  @ApiProperty({
    description: 'Status da visita',
    enum: StatusVisita,
    example: StatusVisita.CONCLUIDA,
  })
  status: StatusVisita;

  @ApiProperty({
    description: 'Data e hora de início da visita',
    example: '2024-01-15T10:00:00Z',
  })
  data_inicio: Date;

  @ApiPropertyOptional({
    description: 'Data e hora de fim da visita',
    example: '2024-01-15T11:30:00Z',
  })
  data_fim?: Date;

  @ApiProperty({
    description: 'Resultado da visita',
    enum: ResultadoVisita,
    example: ResultadoVisita.REALIZADA_COM_SUCESSO,
  })
  resultado: ResultadoVisita;

  @ApiPropertyOptional({
    description: 'Label do resultado da visita',
    example: 'Visita Realizada',
  })
  resultado_label?: string;

  @ApiPropertyOptional({
    description: 'Cor do resultado da visita',
    example: 'success',
  })
  resultado_cor?: string;

  @ApiPropertyOptional({
    description: 'Se o beneficiário estava presente',
    example: true,
  })
  beneficiario_presente?: boolean;

  @ApiPropertyOptional({
    description: 'Pessoa que atendeu a visita',
    example: 'João Silva',
  })
  pessoa_atendeu?: string;

  @ApiPropertyOptional({
    description: 'Relação da pessoa que atendeu',
    example: 'Próprio beneficiário',
  })
  relacao_pessoa_atendeu?: string;

  @ApiPropertyOptional({
    description: 'Endereço visitado',
    example: 'Rua das Flores, 123',
  })
  endereco_visitado?: string;

  @ApiPropertyOptional({
    description: 'Condições habitacionais observadas',
    example: { descricao: 'Casa em bom estado' },
  })
  condicoes_habitacionais?: any;

  @ApiPropertyOptional({
    description: 'Situação socioeconômica observada',
    example: { descricao: 'Família em situação de vulnerabilidade' },
  })
  situacao_socioeconomica?: any;

  @ApiPropertyOptional({
    description: 'Composição familiar observada',
    example: { descricao: 'Família composta por 4 pessoas' },
  })
  composicao_familiar_observada?: any;

  @ApiPropertyOptional({
    description: 'Observações sobre critérios de elegibilidade',
    example: 'Critérios mantidos conforme avaliação',
  })
  observacoes_criterios?: string;

  @ApiPropertyOptional({
    description: 'Necessidades identificadas',
    example: { descricao: 'Necessita acompanhamento psicológico' },
  })
  necessidades_identificadas?: any;

  @ApiPropertyOptional({
    description: 'Encaminhamentos realizados',
    example: { descricao: 'Encaminhado para CAPS' },
  })
  encaminhamentos_realizados?: any;

  @ApiPropertyOptional({
    description: 'Recomendações técnicas',
    example: { descricao: 'Manter acompanhamento mensal' },
  })
  recomendacoes?: any;

  @ApiPropertyOptional({
    description: 'Parecer técnico da visita',
    example: 'Beneficiário mantém critérios de elegibilidade',
  })
  parecer_tecnico?: string;

  @ApiPropertyOptional({
    description: 'Justificativa da recomendação',
    example: 'Recomenda-se manter o benefício devido às condições observadas',
  })
  justificativa_recomendacao?: string;

  @ApiPropertyOptional({
    description: 'Nota de avaliação da visita (0-10)',
    example: 8.5,
  })
  nota_avaliacao?: number;

  @ApiPropertyOptional({
    description: 'Observações gerais da visita',
    example: 'Visita transcorreu sem intercorrências',
  })
  observacoes_gerais?: string;

  @ApiPropertyOptional({
    description: 'Motivo da não realização da visita',
    example: 'Beneficiário não estava em casa'
  })
  motivo_nao_realizacao?: string;

  @ApiPropertyOptional({
    description: 'Pontuação de risco calculada',
    example: 75
  })
  pontuacao_risco?: number;

  @ApiPropertyOptional({
    description: 'Conformidade com critérios de elegibilidade',
    example: true
  })
  conformidade_criterios?: boolean;

  @ApiPropertyOptional({
    description: 'Indica se necessita ação imediata',
    example: false
  })
  necessita_acao_imediata?: boolean;

  @ApiPropertyOptional({
    description: 'Dados complementares da visita',
    example: {}
  })
  dados_complementares?: any;

  @ApiPropertyOptional({
    description: 'Prazo para próxima visita',
    example: '2024-03-15'
  })
  prazo_proxima_visita?: string;

  @ApiPropertyOptional({
    description: 'Observações sobre a visita',
    example: 'Visita realizada com sucesso',
  })
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Se recomenda renovação do benefício',
    example: true,
  })
  recomenda_renovacao?: boolean;

  @ApiPropertyOptional({
    description: 'Se necessita nova visita',
    example: false,
  })
  necessita_nova_visita?: boolean;

  @ApiPropertyOptional({
    description: 'Se os critérios de elegibilidade foram mantidos',
    example: true,
  })
  criterios_elegibilidade_mantidos?: boolean;

  @ApiProperty({
    description: 'Data de criação',
    example: '2024-01-10T08:00:00Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'Data de atualização',
    example: '2024-01-10T08:00:00Z',
  })
  updated_at: string;
}

/**
 * DTO para filtros de visita
 */
export class FiltrosVisitaDto extends PaginationParamsDto {
  @ApiPropertyOptional({
    description: 'ID do beneficiário',
    example: 'uuid-beneficiario',
  })
  @IsUUID()
  @IsOptional()
  beneficiario_id?: string;

  @ApiPropertyOptional({
    description: 'ID do técnico responsável',
    example: 'uuid-tecnico',
  })
  @IsUUID()
  @IsOptional()
  tecnico_id?: string;

  @ApiPropertyOptional({
    description: 'ID da unidade',
    example: 'uuid-unidade',
  })
  @IsUUID()
  @IsOptional()
  unidade_id?: string;

  @ApiPropertyOptional({
    description: 'Data de início do período',
    example: '2024-01-01',
  })
  @IsDateString()
  @IsOptional()
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim do período',
    example: '2024-01-31',
  })
  @IsDateString()
  @IsOptional()
  data_fim?: string;

  @ApiPropertyOptional({
    description: 'Tipo da visita',
    enum: TipoVisita,
    example: TipoVisita.INICIAL,
  })
  @IsEnum(TipoVisita)
  @IsOptional()
  tipo_visita?: TipoVisita;

  @ApiPropertyOptional({
    description: 'Status da visita',
    enum: StatusVisita,
    example: StatusVisita.CONCLUIDA,
  })
  @IsEnum(StatusVisita)
  @IsOptional()
  status?: StatusVisita;

  @ApiPropertyOptional({
    description: 'Resultado da visita',
    enum: ResultadoVisita,
    example: ResultadoVisita.REALIZADA_COM_SUCESSO,
  })
  @IsEnum(ResultadoVisita)
  @IsOptional()
  resultado?: ResultadoVisita;

  @ApiPropertyOptional({
    description: 'Se recomenda renovação do benefício',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  recomenda_renovacao?: boolean;

  @ApiPropertyOptional({
    description: 'Se necessita nova visita',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  necessita_nova_visita?: boolean;

  @ApiPropertyOptional({
    description: 'Se os critérios de elegibilidade foram mantidos',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  criterios_elegibilidade_mantidos?: boolean;
}