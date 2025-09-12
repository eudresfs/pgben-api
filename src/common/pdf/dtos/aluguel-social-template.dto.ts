import { IsString, IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateBaseDto, EnderecoDto } from './template-base.dto';

/**
 * DTO para dados do locador
 */
export class LocadorDto {
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

  @ValidateNested()
  @Type(() => EnderecoDto)
  @IsOptional()
  endereco?: EnderecoDto;
}

/**
 * DTO para dados do imóvel
 */
export class ImovelDto {
  @IsString()
  @IsOptional()
  endereco?: string;

  @IsNumber()
  @IsOptional()
  valorAluguel?: number;

  @IsString()
  @IsOptional()
  tipoImovel?: string;

  @IsString()
  @IsOptional()
  descricao?: string;
}

/**
 * DTO para dados específicos de aluguel social
 */
export class DadosAluguelSocialDto {
  @IsString()
  @IsOptional()
  motivoSolicitacao?: string;

  @IsString()
  @IsOptional()
  situacaoVulnerabilidade?: string;

  @IsNumber()
  @IsOptional()
  periodoMeses?: number;

  @IsString()
  @IsOptional()
  observacoesTecnicas?: string;
}

/**
 * DTO completo para template de aluguel social
 * Campos opcionais serão preenchidos com "_" para preenchimento manual
 */
export class AluguelSocialTemplateDto extends TemplateBaseDto {
  @ValidateNested()
  @Type(() => LocadorDto)
  @IsOptional()
  locador?: LocadorDto;

  @ValidateNested()
  @Type(() => ImovelDto)
  @IsOptional()
  imovel?: ImovelDto;

  @ValidateNested()
  @Type(() => DadosAluguelSocialDto)
  @IsOptional()
  dadosEspecificos?: DadosAluguelSocialDto;

  // Campos opcionais específicos para preenchimento manual
  @IsString()
  @IsOptional()
  dataInicioContrato?: string; // Se não informado, será preenchido com "_"

  @IsString()
  @IsOptional()
  dataFimContrato?: string; // Se não informado, será preenchido com "_"

  @IsString()
  @IsOptional()
  numeroContrato?: string; // Se não informado, será preenchido com "_"

  @IsString()
  @IsOptional()
  testemunha1?: string; // Se não informado, será preenchido com "_"

  @IsString()
  @IsOptional()
  testemunha2?: string; // Se não informado, será preenchido com "_"
}