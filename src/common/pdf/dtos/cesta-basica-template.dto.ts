import { IsString, IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateBaseDto, BeneficiarioBaseDto } from './template-base.dto';

/**
 * DTO específico para dados de beneficiário de cesta básica
 */
export class BeneficiarioCestaBasicaDto extends BeneficiarioBaseDto {
  @IsString()
  @IsOptional()
  telefone?: string;

  @IsString()
  @IsOptional()
  email?: string;
}

/**
 * DTO para dados específicos de cesta básica
 */
export class DadosCestaBasicaDto {
  @IsNumber()
  @IsOptional()
  quantidadePessoas?: number;

  @IsString()
  @IsOptional()
  situacaoVulnerabilidade?: string;

  @IsString()
  @IsOptional()
  motivoSolicitacao?: string;
}

/**
 * DTO completo para template de cesta básica
 * Campos opcionais serão preenchidos com "_" para preenchimento manual
 */
export class CestaBasicaTemplateDto extends TemplateBaseDto {
  @ValidateNested()
  @Type(() => BeneficiarioCestaBasicaDto)
  beneficiario: BeneficiarioCestaBasicaDto;

  @ValidateNested()
  @Type(() => DadosCestaBasicaDto)
  @IsOptional()
  dadosEspecificos?: DadosCestaBasicaDto;

  // Campos opcionais específicos para preenchimento manual
  @IsString()
  @IsOptional()
  dataEntrega?: string; // Se não informado, será preenchido com "_"

  @IsString()
  @IsOptional()
  localEntrega?: string; // Se não informado, será preenchido com "_"

  @IsString()
  @IsOptional()
  responsavelEntrega?: string; // Se não informado, será preenchido com "_"
}