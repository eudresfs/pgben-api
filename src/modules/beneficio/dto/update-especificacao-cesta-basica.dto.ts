import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsNumber, IsArray, IsString, Min, IsNotEmpty } from 'class-validator';
import { CreateEspecificacaoCestaBasicaDto } from './create-especificacao-cesta-basica.dto';

export class UpdateEspecificacaoCestaBasicaDto extends PartialType(CreateEspecificacaoCestaBasicaDto) {
  @IsOptional()
  @IsString()
  tipo_beneficio_id?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'O peso total deve ser maior que zero' })
  peso_total_kg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'O valor estimado deve ser maior que zero' })
  valor_estimado?: number;

  @IsOptional()
  @IsString()
  unidade_medida?: string;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'A validade deve ser de pelo menos 1 dia' })
  validade_dias?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true, message: 'Cada item obrigatório não pode estar vazio' })
  itens_obrigatorios?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itens_opcionais?: string[];

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentos_necessarios?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  restricoes_alimentares?: string[];
}
