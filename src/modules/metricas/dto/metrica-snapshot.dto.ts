import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsDate, IsObject, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { GranularidadeTemporal } from '../entities/metrica-definicao.entity';

/**
 * DTO para criar um snapshot de métrica manualmente
 */
export class CriarMetricaSnapshotDto {
  @ApiProperty({
    description: 'ID da definição da métrica',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  definicao_id: string;

  @ApiProperty({
    description: 'Início do período de referência',
    example: '2023-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  periodo_inicio: Date;

  @ApiProperty({
    description: 'Fim do período de referência',
    example: '2023-01-31T23:59:59.999Z',
  })
  @IsDate()
  @Type(() => Date)
  periodo_fim: Date;

  @ApiProperty({
    description: 'Granularidade temporal do snapshot',
    enum: GranularidadeTemporal,
    example: GranularidadeTemporal.MES,
  })
  @IsEnum(GranularidadeTemporal)
  granularidade: GranularidadeTemporal;

  @ApiProperty({
    description: 'Valor numérico da métrica',
    example: 85.75,
  })
  @IsNumber()
  valor: number;

  @ApiPropertyOptional({
    description: 'Dimensões ou filtros aplicados na coleta do valor',
    example: { "regiao": "nordeste", "faixa_etaria": "18-25" },
  })
  @IsObject()
  @IsOptional()
  dimensoes?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Metadados adicionais sobre o snapshot',
    example: { "fonte": "importacao_manual", "usuario": "admin" },
  })
  @IsObject()
  @IsOptional()
  metadados?: Record<string, any>;
}

/**
 * DTO para filtrar snapshots na consulta
 */
export class FiltroMetricaSnapshotsDto {
  @ApiPropertyOptional({
    description: 'Código da métrica',
    example: 'tempo_medio_processamento_beneficio',
  })
  @IsString()
  @IsOptional()
  codigo_metrica?: string;

  @ApiPropertyOptional({
    description: 'ID da métrica',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  metrica_id?: string;

  @ApiPropertyOptional({
    description: 'Data inicial do período',
    example: '2023-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  data_inicial?: Date;

  @ApiPropertyOptional({
    description: 'Data final do período',
    example: '2023-12-31T23:59:59.999Z',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  data_final?: Date;

  @ApiPropertyOptional({
    description: 'Granularidade do snapshot',
    enum: GranularidadeTemporal,
    example: GranularidadeTemporal.MES,
  })
  @IsEnum(GranularidadeTemporal)
  @IsOptional()
  granularidade?: GranularidadeTemporal;

  @ApiPropertyOptional({
    description: 'Dimensões para filtrar os snapshots',
    example: { "regiao": "nordeste" },
  })
  @IsObject()
  @IsOptional()
  dimensoes?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Página para paginação de resultados',
    example: 1,
    default: 1,
  })
  @IsNumber()
  @IsOptional()
  pagina?: number;

  @ApiPropertyOptional({
    description: 'Quantidade de itens por página',
    example: 10,
    default: 10,
  })
  @IsNumber()
  @IsOptional()
  limite?: number;

  @ApiPropertyOptional({
    description: 'Ordenar por campo específico',
    example: 'periodo_inicio',
    default: 'periodo_inicio',
  })
  @IsString()
  @IsOptional()
  ordenar_por?: string;

  @ApiPropertyOptional({
    description: 'Direção da ordenação (asc ou desc)',
    example: 'desc',
    default: 'desc',
  })
  @IsString()
  @IsOptional()
  direcao?: 'asc' | 'desc';
}

/**
 * DTO para configurar a coleta manual de uma métrica
 */
export class ColetaManualMetricaDto {
  @ApiProperty({
    description: 'Código da métrica',
    example: 'tempo_medio_processamento_beneficio',
  })
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @ApiPropertyOptional({
    description: 'Dimensões para filtrar a coleta',
    example: { "regiao": "nordeste", "faixa_etaria": "18-25" },
  })
  @IsObject()
  @IsOptional()
  dimensoes?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Data de início do período (se não informado, usa padrão da granularidade)',
    example: '2023-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  periodo_inicio?: Date;

  @ApiPropertyOptional({
    description: 'Data de fim do período (se não informado, usa data atual)',
    example: '2023-01-31T23:59:59.999Z',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  periodo_fim?: Date;
}

/**
 * DTO para consultar valor atual de uma métrica
 */
export class ConsultaValorMetricaDto {
  @ApiProperty({
    description: 'Código da métrica',
    example: 'tempo_medio_processamento_beneficio',
  })
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @ApiPropertyOptional({
    description: 'Dimensões para filtrar o valor',
    example: { "regiao": "nordeste", "faixa_etaria": "18-25" },
  })
  @IsObject()
  @IsOptional()
  dimensoes?: Record<string, any>;
}

/**
 * DTO para consultar série temporal de uma métrica
 */
export class ConsultaSerieTemporalDto {
  @ApiProperty({
    description: 'Código da métrica',
    example: 'tempo_medio_processamento_beneficio',
  })
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @ApiProperty({
    description: 'Data inicial do período',
    example: '2023-01-01T00:00:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  data_inicial: Date;

  @ApiProperty({
    description: 'Data final do período',
    example: '2023-12-31T23:59:59.999Z',
  })
  @IsDate()
  @Type(() => Date)
  data_final: Date;

  @ApiPropertyOptional({
    description: 'Granularidade para agregação dos dados',
    enum: GranularidadeTemporal,
    example: GranularidadeTemporal.MES,
  })
  @IsEnum(GranularidadeTemporal)
  @IsOptional()
  granularidade?: GranularidadeTemporal;

  @ApiPropertyOptional({
    description: 'Dimensões para filtrar os dados',
    example: { "regiao": "nordeste" },
  })
  @IsObject()
  @IsOptional()
  dimensoes?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Limitar número máximo de pontos na série',
    example: 12,
  })
  @IsNumber()
  @IsOptional()
  limite_pontos?: number;
}
