import { IsNotEmpty, IsString, Length, Validate, IsUUID, IsOptional, IsEnum, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CPFValidator } from '../validators/cpf-validator';
import { ParentescoEnum } from '../../../enums/parentesco.enum';
import { EscolaridadeEnum } from '../../../enums/escolaridade.enum';
import { Sexo } from '../../../enums/sexo.enum'; 

/**
 * DTO para dados básicos do cidadão
 */
export class DadosCidadaoDto {
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @IsString({ message: 'Nome deve ser uma string' })
  nome: string;

  @IsOptional()
  @IsString({ message: 'RG deve ser uma string' })
  rg?: string;

  @IsOptional()
  @IsString({ message: 'NIS deve ser uma string' })
  nis?: string;

  @IsOptional()
  @IsString({ message: 'Email deve ser uma string' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Telefone deve ser uma string' })
  telefone?: string;
  
  @IsOptional()
  @IsString({ message: 'Data de nascimento deve ser uma string' })
  data_nascimento?: string;
  
  @IsOptional()
  @IsString({ message: 'Sexo deve ser uma string' })
  sexo?: Sexo;
  
  @IsOptional()
  @IsString({ message: 'Endereço deve ser uma string' })
  endereco?: string;
}

/**
 * DTO para conversão de membro de composição familiar para cidadão beneficiário
 */
export class ConversaoParaBeneficiarioDto {
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @IsString({ message: 'CPF deve ser uma string' })
  @Length(11, 14, { message: 'CPF deve ter entre 11 e 14 caracteres' })
  @Validate(CPFValidator, { message: 'CPF inválido' })
  cpf: string;

  @IsNotEmpty({ message: 'Justificativa é obrigatória' })
  @IsString({ message: 'Justificativa deve ser uma string' })
  justificativa: string;

  @IsNotEmpty({ message: 'Dados do cidadão são obrigatórios' })
  @ValidateNested()
  @Type(() => DadosCidadaoDto)
  dados_cidadao: DadosCidadaoDto;
}

/**
 * DTO para dados de composição familiar
 */
export class DadosComposicaoFamiliarDto {
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @IsString({ message: 'Nome deve ser uma string' })
  nome: string;

  @IsOptional()
  @IsString({ message: 'NIS deve ser uma string' })
  nis?: string;

  @IsNotEmpty({ message: 'Idade é obrigatória' })
  @IsNumber({}, { message: 'Idade deve ser um número' })
  @Min(0, { message: 'Idade não pode ser negativa' })
  idade: number;

  @IsNotEmpty({ message: 'Ocupação é obrigatória' })
  @IsString({ message: 'Ocupação deve ser uma string' })
  ocupacao: string;

  @IsNotEmpty({ message: 'Escolaridade é obrigatória' })
  @IsEnum(EscolaridadeEnum, { message: 'Escolaridade inválida' })
  escolaridade: EscolaridadeEnum;

  @IsNotEmpty({ message: 'Parentesco é obrigatório' })
  @IsEnum(ParentescoEnum, { message: 'Parentesco inválido' })
  parentesco: ParentescoEnum;

  @IsOptional()
  @IsNumber({}, { message: 'Renda deve ser um número' })
  @Min(0, { message: 'Renda não pode ser negativa' })
  renda?: number;

  @IsOptional()
  @IsString({ message: 'Observações devem ser uma string' })
  observacoes?: string;
}

/**
 * DTO para conversão de papel para composição familiar
 */
export class ConversaoParaComposicaoFamiliarDto {
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @IsString({ message: 'CPF deve ser uma string' })
  @Length(11, 14, { message: 'CPF deve ter entre 11 e 14 caracteres' })
  @Validate(CPFValidator, { message: 'CPF inválido' })
  cpf: string;

  @IsNotEmpty({ message: 'ID do cidadão alvo é obrigatório' })
  @IsUUID('4', { message: 'ID do cidadão alvo inválido' })
  cidadao_alvo_id: string;

  @IsNotEmpty({ message: 'Dados da composição familiar são obrigatórios' })
  @ValidateNested()
  @Type(() => DadosComposicaoFamiliarDto)
  dados_composicao: DadosComposicaoFamiliarDto;

  @IsNotEmpty({ message: 'Justificativa é obrigatória' })
  @IsString({ message: 'Justificativa deve ser uma string' })
  justificativa: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID do técnico notificado inválido' })
  tecnico_notificado_id?: string;
}

/**
 * DTO para resposta de conversão de papel
 */
export class ConversaoPapelResponseDto {
  sucesso: boolean;
  mensagem: string;
  historicoId?: string;
}
