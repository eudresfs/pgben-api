import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { StatusConcessao } from '../../../enums/status-concessao.enum';

export class FiltroConcessaoDto {
  @ApiPropertyOptional({ description: 'Data de início mínima (YYYY-MM-DD)', type: String, example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  dataInicioDe?: string;

  @ApiPropertyOptional({ description: 'Data de início máxima (YYYY-MM-DD)', type: String, example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  dataInicioAte?: string;

  @ApiPropertyOptional({ enum: StatusConcessao })
  @IsOptional()
  @IsEnum(StatusConcessao)
  status?: StatusConcessao;

  @ApiPropertyOptional({ description: 'UUID da unidade' })
  @IsOptional()
  @IsUUID()
  unidadeId?: string;

  @ApiPropertyOptional({ description: 'UUID do tipo de benefício' })
  @IsOptional()
  @IsUUID()
  tipoBeneficioId?: string;

  @ApiPropertyOptional({ description: 'Flag de determinação judicial' })
  @IsOptional()
  @IsBoolean()
  determinacaoJudicial?: boolean;

  @ApiPropertyOptional({ description: 'Prioridade (inteiro, 1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  prioridade?: number;

  @ApiPropertyOptional({ description: 'Busca por nome, CPF ou protocolo' })
  @IsOptional()
  @IsString()
  search?: string;
}
