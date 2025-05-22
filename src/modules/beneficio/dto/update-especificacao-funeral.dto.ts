import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsNumber, IsString, IsArray, IsBoolean, IsNotEmpty, Min, Max } from 'class-validator';
import { CreateEspecificacaoFuneralDto } from './create-especificacao-funeral.dto';

export class UpdateEspecificacaoFuneralDto extends PartialType(CreateEspecificacaoFuneralDto) {
  @IsOptional()
  @IsString()
  tipo_beneficio_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'O valor máximo não pode ser negativo' })
  valor_maximo?: number;

  @IsOptional()
  @IsString()
  moeda?: string;

  @IsOptional()
  @IsBoolean()
  permite_cremacao?: boolean;

  @IsOptional()
  @IsBoolean()
  permite_sepultamento?: boolean;

  @IsOptional()
  @IsBoolean()
  permite_transporte?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'A distância máxima não pode ser negativa' })
  distancia_maxima_km?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true, message: 'Cada documento necessário não pode estar vazio' })
  documentos_necessarios?: string[];

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'O prazo em dias deve ser de pelo menos 1 dia' })
  prazo_dias_utilizacao?: number;

  @IsOptional()
  @IsBoolean()
  permite_parcelamento?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'O número máximo de parcelas deve ser pelo menos 1' })
  @Max(12, { message: 'O número máximo de parcelas não pode exceder 12' })
  max_parcelas?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tipos_servicos_cremacao?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tipos_urnas_cremacao?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tipos_ataudes_sepultamento?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cidades_atuacao?: string[];
}
