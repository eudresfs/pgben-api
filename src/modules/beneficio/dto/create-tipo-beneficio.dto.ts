import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsOptional,
  Min,
  MaxLength,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PeriodicidadeEnum } from '../../../enums/periodicidade.enum';

/**
 * DTO para critérios de elegibilidade
 */
export class CriteriosElegibilidadeDto {
  @ApiPropertyOptional({ description: 'Idade mínima para elegibilidade' })
  @IsOptional()
  @IsNumber({}, { message: 'Idade mínima deve ser um número' })
  @Min(0, { message: 'Idade mínima não pode ser negativa' })
  idade_minima?: number;

  @ApiPropertyOptional({ description: 'Idade máxima para elegibilidade' })
  @IsOptional()
  @IsNumber({}, { message: 'Idade máxima deve ser um número' })
  @Min(0, { message: 'Idade máxima não pode ser negativa' })
  idade_maxima?: number;

  @ApiPropertyOptional({
    description: 'Renda máxima per capita para elegibilidade',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Renda máxima deve ser um número' })
  @Min(0, { message: 'Renda máxima não pode ser negativa' })
  renda_maxima?: number;

  @ApiPropertyOptional({
    description: 'Tempo mínimo de residência no município (em meses)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tempo mínimo de residência deve ser um número' })
  @Min(0, { message: 'Tempo mínimo de residência não pode ser negativo' })
  tempo_minimo_residencia?: number;

  @ApiPropertyOptional({ description: 'Outros critérios de elegibilidade' })
  @IsOptional()
  @IsString({ each: true, message: 'Outros critérios devem ser textos' })
  outros?: string[];
}

/**
 * DTO para criação de tipo de benefício
 */
export class CreateTipoBeneficioDto {
  @ApiProperty({
    description: 'Nome do tipo de benefício',
    example: 'Auxílio Moradia',
  })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @IsString({ message: 'Nome deve ser um texto' })
  @MaxLength(100, { message: 'Nome não pode ter mais de 100 caracteres' })
  nome: string;

  @ApiProperty({ description: 'Descrição detalhada do benefício' })
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  @IsString({ message: 'Descrição deve ser um texto' })
  descricao: string;

  @ApiProperty({
    description: 'Periodicidade do benefício',
    enum: PeriodicidadeEnum,
    example: PeriodicidadeEnum.MENSAL,
  })
  @IsNotEmpty({ message: 'Periodicidade é obrigatória' })
  @IsEnum(PeriodicidadeEnum, { message: 'Periodicidade inválida' })
  periodicidade: PeriodicidadeEnum;

  @ApiProperty({ description: 'Valor do benefício', example: 400.0 })
  @IsNotEmpty({ message: 'Valor é obrigatório' })
  @IsNumber({}, { message: 'Valor deve ser um número' })
  @Min(0, { message: 'Valor não pode ser negativo' })
  valor: number;

  @ApiPropertyOptional({ description: 'Status do benefício', default: true })
  @IsOptional()
  @IsBoolean({ message: 'Ativo deve ser um booleano' })
  ativo?: boolean;

  @ApiPropertyOptional({
    description: 'Critérios de elegibilidade para o benefício',
  })
  @IsOptional()
  @IsObject({ message: 'Critérios de elegibilidade devem ser um objeto' })
  @ValidateNested()
  @Type(() => CriteriosElegibilidadeDto)
  criterios_elegibilidade?: CriteriosElegibilidadeDto;
}
