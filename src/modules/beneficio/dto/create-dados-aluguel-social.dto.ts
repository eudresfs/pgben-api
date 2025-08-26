import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsArray,
  IsUUID,
  ArrayMaxSize,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PublicoPrioritarioAluguel, EspecificacaoAluguel } from '@/enums';
import { ValidateTipoBeneficio } from '@/shared/validators/tipo-beneficio.validator';

/**
 * DTO para criação de dados específicos do cidadão para Aluguel Social
 */
export class CreateDadosAluguelSocialDto {
  @ApiProperty({
    description: 'ID da solicitação de benefício',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  @IsUUID('4', { message: 'ID da solicitação inválido' })
  @ValidateTipoBeneficio('aluguel-social')
  solicitacao_id: string;

  @ApiProperty({
    description: 'Público prioritário (apenas 1 opção)',
    enum: PublicoPrioritarioAluguel,
    example: PublicoPrioritarioAluguel.FAMILIAS_IDOSOS,
  })
  @IsNotEmpty({ message: 'Público prioritário é obrigatório' })
  @IsEnum(PublicoPrioritarioAluguel, {
    message: 'Público prioritário inválido',
  })
  publico_prioritario: PublicoPrioritarioAluguel;

  @ApiPropertyOptional({
    description: 'Especificações adicionais (até 2 opções)',
    enum: EspecificacaoAluguel,
    isArray: true,
    example: [
      EspecificacaoAluguel.VITIMA_VIOLENCIA,
      EspecificacaoAluguel.LGBTQIA_PLUS,
    ],
  })
  @IsOptional()
  @IsArray({ message: 'Especificações devem ser um array' })
  @ArrayMaxSize(2, { message: 'Máximo de 2 especificações permitidas' })
  @IsEnum(EspecificacaoAluguel, {
    each: true,
    message: 'Especificação inválida',
  })
  especificacoes?: EspecificacaoAluguel[];

  @ApiProperty({
    description: 'Descrição detalhada da situação atual da moradia',
    example:
      'Família reside em casa de parentes, sem condições de permanência devido a conflitos familiares.',
  })
  @IsNotEmpty({ message: 'Situação da moradia atual é obrigatória' })
  @MinLength(10, {
    message: 'Situação da moradia deve ter pelo menos 10 caracteres',
  })
  situacao_moradia_atual: string;

  @ApiProperty({
    description: 'Indica se possui imóvel interditado',
    example: false,
  })
  @IsBoolean({ message: 'Possui imóvel interditado deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  possui_imovel_interditado: boolean;

  @ApiPropertyOptional({
    description: 'Tipo de processo judicializado',
    example: 'Lei Maria da Penha',
  })
  @IsOptional()
  @IsString({ message: 'Processo judicializado deve ser uma string' })
  processo_judicializado?: string;

  @ApiPropertyOptional({
    description: 'Número do processo judicial',
    example: '1234567-89.2024.8.26.0001',
  })
  @IsOptional()
  @IsString({ message: 'Número do processo deve ser uma string' })
  numero_processo?: string;

  @ApiPropertyOptional({
    description: 'Observações adicionais sobre o caso',
    example:
      'Família em situação de extrema vulnerabilidade, necessita acompanhamento psicossocial.',
  })
  @IsOptional()
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Valor do aluguel pretendido',
    example: 'R$ 600,00',
  })
  @IsOptional()
  @IsString({ message: 'Valor do aluguel pretendido deve ser uma string' })
  valor_aluguel_pretendido?: string;

  @ApiPropertyOptional({
    description: 'Endereço do imóvel pretendido',
    example: 'Rua das Flores, 123 - Centro',
  })
  @IsOptional()
  @IsString({ message: 'Endereço do imóvel pretendido deve ser uma string' })
  endereco_imovel_pretendido?: string;

  @ApiPropertyOptional({
    description: 'Nome do locador',
    example: 'João Silva',
  })
  @IsOptional()
  @IsString({ message: 'Nome do locador deve ser uma string' })
  nome_locador?: string;

  @ApiPropertyOptional({
    description: 'CPF do locador',
    example: '123.456.789-00',
  })
  @IsOptional()
  @IsString({ message: 'CPF do locador deve ser uma string' })
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'CPF do locador deve estar no formato XXX.XXX.XXX-XX',
  })
  cpf_locador?: string;

  @ApiPropertyOptional({
    description: 'Telefone do locador',
    example: '(11) 99999-9999',
  })
  @IsOptional()
  @IsString({ message: 'Telefone do locador deve ser uma string' })
  @Matches(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, {
    message: 'Telefone do locador deve estar em formato válido',
  })
  telefone_locador?: string;



  @ApiPropertyOptional({
    description: 'Determinação judicial',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Determinação judicial deve ser um booleano' })
  determinacao_judicial?: boolean;
}

/**
 * DTO para atualização de dados específicos do cidadão para Aluguel Social
 */
export class UpdateDadosAluguelSocialDto {
  @ApiPropertyOptional({
    description: 'Público prioritário (apenas 1 opção)',
    enum: PublicoPrioritarioAluguel,
    example: PublicoPrioritarioAluguel.FAMILIAS_IDOSOS,
  })
  @IsOptional()
  @IsEnum(PublicoPrioritarioAluguel, {
    message: 'Público prioritário inválido',
  })
  publico_prioritario?: PublicoPrioritarioAluguel;

  @ApiPropertyOptional({
    description: 'Especificações adicionais (até 2 opções)',
    enum: EspecificacaoAluguel,
    isArray: true,
    example: [EspecificacaoAluguel.VITIMA_VIOLENCIA],
  })
  @IsOptional()
  @IsArray({ message: 'Especificações devem ser um array' })
  @ArrayMaxSize(2, { message: 'Máximo de 2 especificações permitidas' })
  @IsEnum(EspecificacaoAluguel, {
    each: true,
    message: 'Especificação inválida',
  })
  especificacoes?: EspecificacaoAluguel[];

  @ApiPropertyOptional({
    description: 'Descrição detalhada da situação atual da moradia',
    example: 'Situação da moradia foi atualizada após visita técnica.',
  })
  @IsOptional()
  @MinLength(10, {
    message: 'Situação da moradia deve ter pelo menos 10 caracteres',
  })
  situacao_moradia_atual?: string;

  @ApiPropertyOptional({
    description: 'Indica se possui imóvel interditado',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Possui imóvel interditado deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  possui_imovel_interditado?: boolean;

  @ApiPropertyOptional({
    description: 'Tipo de processo judicializado',
    example: 'Lei Maria da Penha',
  })
  @IsOptional()
  @IsString({ message: 'Processo judicializado deve ser uma string' })
  processo_judicializado?: string;

  @ApiPropertyOptional({
    description: 'Número do processo judicial',
    example: '1234567-89.2024.8.26.0001',
  })
  @IsOptional()
  @IsString({ message: 'Número do processo deve ser uma string' })
  numero_processo?: string;

  @ApiPropertyOptional({
    description: 'Observações adicionais sobre o caso',
    example: 'Observações atualizadas após reavaliação.',
  })
  @IsOptional()
  observacoes?: string;
}
