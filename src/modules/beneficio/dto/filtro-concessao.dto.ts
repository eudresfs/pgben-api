import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { PaginationParamsDto } from '@/shared/dtos/pagination-params.dto';

export class FiltroConcessaoDto extends PaginationParamsDto {
  @ApiPropertyOptional({
    description: 'Data de início mínima (YYYY-MM-DD)',
    type: String,
    example: '2025-01-01',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDateString()
  dataInicioDe?: string;

  @ApiPropertyOptional({
    description: 'Data de início máxima (YYYY-MM-DD)',
    type: String,
    example: '2025-12-31',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDateString()
  dataInicioAte?: string;

  @ApiPropertyOptional({ enum: StatusConcessao })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEnum(StatusConcessao)
  status?: StatusConcessao;

  @ApiPropertyOptional({ description: 'UUID da unidade' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID()
  unidadeId?: string;

  @ApiPropertyOptional({ description: 'UUID do tipo de benefício' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID()
  tipoBeneficioId?: string;

  @ApiPropertyOptional({ description: 'Flag de determinação judicial' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsBoolean()
  determinacaoJudicial?: boolean;

  @ApiPropertyOptional({
    description: 'Prioridade (inteiro, 1-5)',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsNumber()
  @Min(1)
  @Max(5)
  prioridade?: number;

  @ApiPropertyOptional({ description: 'Busca por nome, CPF ou protocolo' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  search?: string;
}
