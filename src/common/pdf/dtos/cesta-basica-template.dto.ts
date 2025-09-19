import { IsString, IsOptional, IsNumber, ValidateNested, IsEnum, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateBaseDto, BeneficiarioBaseDto } from './template-base.dto';
import { PeriodicidadeEnum, OrigemAtendimentoEnum } from '@/enums';

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
 * DTO para dados específicos de cesta básica baseado no CreateDadosCestaBasicaDto
 * Todos os campos são opcionais exceto quantidade_cestas_solicitadas
 */
export class DadosCestaBasicaDto {
  @IsUUID('4')
  @IsOptional()
  solicitacao_id?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  prioridade?: number;

  @IsNumber()
  @Min(1)
  @Max(12)
  quantidade_cestas_solicitadas: number; // Campo obrigatório

  @IsNumber()
  @Min(1)
  @Max(12)
  @IsOptional()
  quantidade_parcelas?: number;

  @IsEnum(OrigemAtendimentoEnum)
  @IsOptional()
  origem_atendimento?: OrigemAtendimentoEnum;

  @IsNumber()
  @Min(1)
  @IsOptional()
  numero_pessoas_familia?: number;

  @IsString()
  @IsOptional()
  justificativa_quantidade?: string;

  @IsString()
  @IsOptional()
  observacoes?: string;

  @IsString()
  @IsOptional()
  tecnico_responsavel?: string;

  @IsString()
  @IsOptional()
  unidade_solicitante?: string;
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