import { IsString, IsOptional, IsNumber, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateBaseDto, EnderecoDto } from './template-base.dto';
import { TipoUrnaEnum } from '@/enums';

/**
 * DTO para dados do requerente
 */
export class RequerenteDto {
  @IsString()
  @IsOptional()
  nome?: string;

  @IsString()
  @IsOptional()
  cpf?: string;

  @IsString()
  @IsOptional()
  rg?: string;

  @IsString()
  @IsOptional()
  telefone?: string;

  @IsString()
  @IsOptional()
  parentesco?: string;

  @IsString()
  @IsOptional()
  grauParentesco?: string;

  @ValidateNested()
  @Type(() => EnderecoDto)
  @IsOptional()
  endereco?: EnderecoDto;
}

/**
 * DTO para dados da funerária
 */
export class FunerariaDto {
  @IsString()
  @IsOptional()
  nome?: string;

  @IsString()
  @IsOptional()
  endereco?: string;

  @IsString()
  @IsOptional()
  telefone?: string;
}

/**
 * DTO para dados do cemitério
 */
export class CemiterioDto {
  @IsString()
  @IsOptional()
  nome?: string;

  @IsString()
  @IsOptional()
  endereco?: string;
}

/**
 * DTO para dados específicos do benefício ataúde
 */
export class DadosAtaudeDto {
  @IsEnum(TipoUrnaEnum)
  tipoUrna: TipoUrnaEnum;

  @IsNumber()
  @IsOptional()
  valorUrna?: number;

  @IsString()
  @IsOptional()
  grauParentesco?: string;

  @IsNumber()
  @IsOptional()
  valorAutorizado?: number;

  @IsString()
  @IsOptional()
  dataAutorizacao?: string;

  @IsString()
  @IsOptional()
  dataObito?: string;

  @IsString()
  @IsOptional()
  declaracaoObito?: string;

  @IsString()
  @IsOptional()
  translado?: string;

  @IsString()
  @IsOptional()
  observacoes?: string;

  @ValidateNested()
  @Type(() => FunerariaDto)
  @IsOptional()
  funeraria?: FunerariaDto;

  @ValidateNested()
  @Type(() => CemiterioDto)
  @IsOptional()
  cemiterio?: CemiterioDto;
}

/**
 * DTO para dados do técnico responsável
 */
export class TecnicoDto {
  @IsString()
  @IsOptional()
  nome?: string;

  @IsString()
  @IsOptional()
  unidade?: string;

  @IsString()
  @IsOptional()
  matricula?: string;

  @IsString()
  @IsOptional()
  cargo?: string;
}

/**
 * DTO principal para template de autorização de ataúde
 */
export class AutorizacaoAtaudeTemplateDto extends TemplateBaseDto {
  @ValidateNested()
  @Type(() => RequerenteDto)
  @IsOptional()
  requerente?: RequerenteDto;

  @ValidateNested()
  @Type(() => DadosAtaudeDto)
  dadosAtaude: DadosAtaudeDto;

  @ValidateNested()
  @Type(() => TecnicoDto)
  @IsOptional()
  tecnico?: TecnicoDto;

  @IsString()
  @IsOptional()
  numeroDocumento?: string;

  @IsString()
  @IsOptional()
  dataGeracao?: string;

  @IsString()
  @IsOptional()
  numeroAutorizacao?: string;
}