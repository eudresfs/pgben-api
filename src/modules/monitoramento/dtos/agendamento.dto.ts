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
    description: 'ID do pagamento',
    example: 'uuid-pagamento',
  })
  @IsUUID()
  @IsNotEmpty()
  pagamento_id: string;

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
    description: 'ID do pagamento',
    example: 'uuid-pagamento',
  })
  pagamento_id: string;

  @ApiProperty({
    description: 'Dados do pagamento',
    example: {
      valor: 500.00,
      parcela: 1,
      total_parcelas: 12,
      data: '2025-01-15'
    },
  })
  pagamento: {
    id: string;
    valor: number;
    parcela: number;
    total_parcelas: number;
    data: Date;
  };

  @ApiProperty({
    description: 'Dados do beneficiário',
    example: {
      id: 'uuid-beneficiario',
      nome: 'João Silva',
      cpf: '123.456.789-00'
    },
  })
  beneficiario: {
    id: string;
    nome: string;
    cpf: string;
  };

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
    description: 'ID do pagamento',
    example: 'uuid-pagamento',
  })
  @IsUUID()
  @IsOptional()
  pagamento_id?: string;

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