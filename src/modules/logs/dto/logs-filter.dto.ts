import { IsOptional, IsString, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Enum para criticidade dos logs
 */
export enum CriticidadeLog {
  BAIXA = 'BAIXA',
  NORMAL = 'NORMAL',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
}

/**
 * DTO para filtros de logs
 */
export class LogsFilterDto {
  /**
   * Página atual para paginação
   * @example 1
   */
  @ApiProperty({
    description: 'Página atual',
    required: false,
    default: 1,
  })
  @IsOptional()
  page?: number;

  /**
   * Quantidade de itens por página
   * @example 10
   */
  @ApiProperty({
    description: 'Itens por página',
    required: false,
    default: 10,
  })
  @IsOptional()
  limit?: number;

  /**
   * Filtro por entidade
   * @example "solicitacao"
   */
  @ApiProperty({
    description: 'Filtro por entidade',
    required: false,
  })
  @IsOptional()
  @IsString()
  entidade?: string;

  /**
   * Filtro por ID da entidade
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @ApiProperty({
    description: 'Filtro por ID da entidade',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  entidade_id?: string;

  /**
   * Filtro por usuário
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @ApiProperty({
    description: 'Filtro por usuário',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  usuario_id?: string;

  /**
   * Filtro por ação
   * @example "CREATE"
   */
  @ApiProperty({
    description: 'Filtro por ação',
    required: false,
  })
  @IsOptional()
  @IsString()
  acao?: string;

  /**
   * Filtro por módulo
   * @example "solicitacao"
   */
  @ApiProperty({
    description: 'Filtro por módulo',
    required: false,
  })
  @IsOptional()
  @IsString()
  modulo?: string;

  /**
   * Filtro por criticidade
   * @example "ALTA"
   */
  @ApiProperty({
    description: 'Filtro por criticidade',
    required: false,
    enum: CriticidadeLog,
  })
  @IsOptional()
  @IsEnum(CriticidadeLog)
  criticidade?: CriticidadeLog;

  /**
   * Data inicial para filtro
   * @example "2025-01-01"
   */
  @ApiProperty({
    description: 'Data inicial (formato: YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  data_inicio?: string;

  /**
   * Data final para filtro
   * @example "2025-12-31"
   */
  @ApiProperty({
    description: 'Data final (formato: YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  data_fim?: string;
}
