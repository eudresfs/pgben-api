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
} from 'class-validator';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import {
  TipoVisita,
  StatusAgendamento,
  PrioridadeVisita,
} from '../enums';

/**
 * DTO para criação de agendamento
 */
export class CriarAgendamentoDto {
  @ApiProperty({
    description: 'ID do beneficiário',
    example: 'uuid-beneficiario',
  })
  @IsUUID()
  @IsNotEmpty()
  beneficiario_id: string;

  @ApiProperty({
    description: 'ID do técnico responsável',
    example: 'uuid-tecnico',
  })
  @IsUUID()
  @IsNotEmpty()
  tecnico_id: string;

  @ApiProperty({
    description: 'ID da unidade',
    example: 'uuid-unidade',
  })
  @IsUUID()
  @IsNotEmpty()
  unidade_id: string;

  @ApiProperty({
    description: 'ID da concessão',
    example: 'uuid-concessao',
  })
  @IsUUID()
  @IsNotEmpty()
  concessao_id?: string;

  @ApiProperty({
    description: 'Data e hora do agendamento',
    example: '2024-01-15T10:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  data_agendamento: string;

  @ApiProperty({
    description: 'Tipo da visita',
    enum: TipoVisita,
    example: TipoVisita.INICIAL,
  })
  @IsEnum(TipoVisita)
  @IsNotEmpty()
  tipo_visita: TipoVisita;

  @ApiProperty({
    description: 'Prioridade do agendamento',
    enum: PrioridadeVisita,
    example: PrioridadeVisita.NORMAL,
  })
  @IsEnum(PrioridadeVisita)
  @IsNotEmpty()
  prioridade: PrioridadeVisita;

  @ApiPropertyOptional({
    description: 'Observações sobre o agendamento',
    example: 'Beneficiário solicitou visita pela manhã',
  })
  @IsString()
  @IsOptional()
  observacoes?: string;
}

/**
 * DTO para atualização de agendamento
 */
export class AtualizarAgendamentoDto {
  @ApiPropertyOptional({
    description: 'Data e hora do agendamento',
    example: '2024-01-15T10:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  data_agendamento?: string;

  @ApiPropertyOptional({
    description: 'Tipo da visita',
    enum: TipoVisita,
    example: TipoVisita.INICIAL,
  })
  @IsEnum(TipoVisita)
  @IsOptional()
  tipo_visita?: TipoVisita;

  @ApiPropertyOptional({
    description: 'Prioridade do agendamento',
    enum: PrioridadeVisita,
    example: PrioridadeVisita.NORMAL,
  })
  @IsEnum(PrioridadeVisita)
  @IsOptional()
  prioridade?: PrioridadeVisita;

  @ApiPropertyOptional({
    description: 'Status do agendamento',
    enum: StatusAgendamento,
    example: StatusAgendamento.AGENDADO,
  })
  @IsEnum(StatusAgendamento)
  @IsOptional()
  status?: StatusAgendamento;

  @ApiPropertyOptional({
    description: 'Observações sobre o agendamento',
    example: 'Reagendado a pedido do beneficiário',
  })
  @IsString()
  @IsOptional()
  observacoes?: string;
}

/**
 * DTO de resposta para agendamento
 */
export class AgendamentoResponseDto {
  @ApiProperty({
    description: 'ID do agendamento',
    example: 'uuid-agendamento',
  })
  id: string;

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
    description: 'Data e hora do agendamento',
    example: '2024-01-15T10:00:00Z',
  })
  data_agendamento: Date;

  @ApiProperty({
    description: 'Tipo da visita',
    enum: TipoVisita,
    example: TipoVisita.INICIAL,
  })
  tipo_visita: TipoVisita;

  @ApiProperty({
    description: 'Status do agendamento',
    enum: StatusAgendamento,
    example: StatusAgendamento.AGENDADO,
  })
  status: StatusAgendamento;

  @ApiProperty({
    description: 'Prioridade do agendamento',
    enum: PrioridadeVisita,
    example: PrioridadeVisita.NORMAL,
  })
  prioridade: PrioridadeVisita;

  @ApiPropertyOptional({
    description: 'Observações sobre o agendamento',
    example: 'Beneficiário solicitou visita pela manhã',
  })
  observacoes?: string;

  @ApiProperty({
    description: 'Data de criação',
    example: '2024-01-10T08:00:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Data de atualização',
    example: '2024-01-10T08:00:00Z',
  })
  updated_at: Date;
}

/**
 * DTO para filtros de agendamento
 */
export class FiltrosAgendamentoDto extends PaginationParamsDto {
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
    description: 'Status do agendamento',
    enum: StatusAgendamento,
    example: StatusAgendamento.AGENDADO,
  })
  @IsEnum(StatusAgendamento)
  @IsOptional()
  status?: StatusAgendamento;

  @ApiPropertyOptional({
    description: 'Prioridade do agendamento',
    enum: PrioridadeVisita,
    example: PrioridadeVisita.NORMAL,
  })
  @IsEnum(PrioridadeVisita)
  @IsOptional()
  prioridade?: PrioridadeVisita;
}