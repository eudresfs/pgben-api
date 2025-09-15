import { IsString, IsOptional, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para endereço
 */
export class EnderecoDto {
  @IsString()
  @IsNotEmpty()
  logradouro: string;

  @IsString()
  @IsOptional()
  numero?: string;

  @IsString()
  @IsOptional()
  complemento?: string;

  @IsString()
  @IsNotEmpty()
  bairro: string;

  @IsString()
  @IsNotEmpty()
  cidade: string;

  @IsString()
  @IsNotEmpty()
  estado: string;

  @IsString()
  @IsNotEmpty()
  cep: string;
}

/**
 * DTO base para dados de beneficiário
 */
export class BeneficiarioBaseDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsNotEmpty()
  cpf: string;

  @IsString()
  @IsOptional()
  rg?: string;

  @ValidateNested()
  @Type(() => EnderecoDto)
  endereco: EnderecoDto;
}



/**
 * DTO base para dados de unidade
 */
export class UnidadeBaseDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsOptional()
  codigo?: string;

  @ValidateNested()
  @Type(() => EnderecoDto)
  @IsOptional()
  endereco?: EnderecoDto;
}

/**
 * DTO para dados de solicitação
 */
export class SolicitacaoDto {
  @IsString()
  @IsOptional()
  protocolo?: string;

  @IsString()
  @IsOptional()
  numeroMemorado?: string;
}

/**
 * DTO base para dados de pagamento
 */
export class PagamentoBaseDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  valor: number;

  @IsString()
  @IsOptional()
  numeroParcela?: number;

  @IsString()
  @IsOptional()
  totalParcelas?: number;

  @IsString()
  @IsNotEmpty()
  dataLiberacao: Date;

  @IsString()
  @IsNotEmpty()
  metodoPagamento: string;

  @ValidateNested()
  @Type(() => SolicitacaoDto)
  @IsOptional()
  solicitacao?: SolicitacaoDto;
}

/**
 * DTO base para todos os templates
 */
export abstract class TemplateBaseDto {
  @ValidateNested()
  @Type(() => BeneficiarioBaseDto)
  beneficiario: BeneficiarioBaseDto;

  @ValidateNested()
  @Type(() => UnidadeBaseDto)
  unidade: UnidadeBaseDto;

  @ValidateNested()
  @Type(() => PagamentoBaseDto)
  pagamento: PagamentoBaseDto;

  @IsString()
  @IsOptional()
  observacoes?: string;
}