import {
  IsNotEmpty,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsArray,
  IsUUID,
  ArrayMaxSize,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PublicoPrioritarioAluguel, EspecificacaoAluguel } from '@/enums';

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

  @ApiProperty({
    description:
      'Indica se é caso judicializado pela Lei Maria da Penha (Art. 23, inciso VI)',
    example: false,
  })
  @IsBoolean({
    message: 'Caso judicializado Lei Maria da Penha deve ser um booleano',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  caso_judicializado_maria_penha: boolean;

  @ApiPropertyOptional({
    description: 'Observações adicionais sobre o caso',
    example:
      'Família em situação de extrema vulnerabilidade, necessita acompanhamento psicossocial.',
  })
  @IsOptional()
  observacoes?: string;
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
    description: 'Indica se é caso judicializado pela Lei Maria da Penha',
    example: false,
  })
  @IsOptional()
  @IsBoolean({
    message: 'Caso judicializado Lei Maria da Penha deve ser um booleano',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  caso_judicializado_maria_penha?: boolean;

  @ApiPropertyOptional({
    description: 'Observações adicionais sobre o caso',
    example: 'Observações atualizadas após reavaliação.',
  })
  @IsOptional()
  observacoes?: string;
}
