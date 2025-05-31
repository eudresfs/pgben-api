import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsEnum,
  IsString,
  IsBoolean,
  ValidateIf,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { EscolaridadeEnum } from '../enums/escolaridade.enum';
import { SituacaoTrabalhoEnum } from '../enums/situacao-trabalho.enum';

/**
 * DTO para criação de dados sociais de um cidadão
 * 
 * Contém todas as informações socioeconômicas necessárias para
 * caracterizar a situação social do cidadão e sua família.
 */
export class CreateDadosSociaisDto {
  @ApiProperty({
    description: 'Nível de escolaridade do cidadão',
    enum: EscolaridadeEnum,
    example: EscolaridadeEnum.MEDIO_COMPLETO,
  })
  @IsNotEmpty({ message: 'Escolaridade é obrigatória' })
  @IsEnum(EscolaridadeEnum, { message: 'Escolaridade inválida' })
  escolaridade: EscolaridadeEnum;

  @ApiProperty({
    description: 'Indica se o cidadão faz parte de público prioritário',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'O campo publico_prioritario deve ser verdadeiro ou falso' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  publico_prioritario?: boolean;

  @ApiProperty({
    description: 'Renda mensal do cidadão em reais',
    example: 1500.50,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Renda deve ser um número válido' })
  @Min(0, { message: 'Renda não pode ser negativa' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  })
  renda?: number;

  @ApiProperty({
    description: 'Ocupação ou profissão do cidadão',
    example: 'Auxiliar de limpeza',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Ocupação deve ser um texto' })
  @MaxLength(255, { message: 'Ocupação deve ter no máximo 255 caracteres' })
  ocupacao?: string;

  @ApiProperty({
    description: 'Indica se o cidadão recebe Programa Bolsa Família',
    example: false,
    default: false,
  })
  @IsBoolean({ message: 'O campo recebe_pbf deve ser verdadeiro ou falso' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  recebe_pbf: boolean = false;

  @ApiProperty({
    description: 'Valor mensal recebido do Programa Bolsa Família',
    example: 400.00,
    minimum: 0,
    required: false,
  })
  @ValidateIf((o) => o.recebe_pbf === true)
  @IsNumber({}, { message: 'Valor do PBF deve ser um número válido' })
  @Min(0, { message: 'Valor do PBF não pode ser negativo' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  })
  valor_pbf?: number;

  @ApiProperty({
    description: 'Indica se o cidadão recebe Benefício de Prestação Continuada',
    example: false,
    default: false,
  })
  @IsBoolean({ message: 'O campo recebe_bpc deve ser verdadeiro ou falso' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  recebe_bpc: boolean = false;

  @ApiProperty({
    description: 'Tipo do BPC recebido (idoso, deficiente, etc.)',
    example: 'Pessoa com deficiência',
    maxLength: 100,
    required: false,
  })
  @ValidateIf((o) => o.recebe_bpc === true)
  @IsString({ message: 'Tipo do BPC deve ser um texto' })
  @MaxLength(100, { message: 'Tipo do BPC deve ter no máximo 100 caracteres' })
  tipo_bpc?: string;

  @ApiProperty({
    description: 'Valor mensal recebido do BPC',
    example: 1320.00,
    minimum: 0,
    required: false,
  })
  @ValidateIf((o) => o.recebe_bpc === true)
  @IsNumber({}, { message: 'Valor do BPC deve ser um número válido' })
  @Min(0, { message: 'Valor do BPC não pode ser negativo' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return value;
  })
  valor_bpc?: number;

  @ApiProperty({
    description: 'Curso profissionalizante que o cidadão possui ou está cursando',
    example: 'Técnico em Informática',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Curso profissionalizante deve ser um texto' })
  @MaxLength(255, { message: 'Curso profissionalizante deve ter no máximo 255 caracteres' })
  curso_profissionalizante?: string;

  @ApiProperty({
    description: 'Indica se o cidadão tem interesse em fazer curso profissionalizante',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'O campo interesse_curso_profissionalizante deve ser verdadeiro ou falso' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  interesse_curso_profissionalizante?: boolean;

  @ApiProperty({
    description: 'Situação atual de trabalho do cidadão',
    enum: SituacaoTrabalhoEnum,
    example: SituacaoTrabalhoEnum.DESEMPREGADO,
    required: false,
  })
  @IsOptional()
  @IsEnum(SituacaoTrabalhoEnum, { message: 'Situação de trabalho inválida' })
  situacao_trabalho?: SituacaoTrabalhoEnum;

  @ApiProperty({
    description: 'Área de trabalho ou interesse profissional',
    example: 'Serviços gerais',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Área de trabalho deve ser um texto' })
  @MaxLength(255, { message: 'Área de trabalho deve ter no máximo 255 caracteres' })
  area_trabalho?: string;

  @ApiProperty({
    description: 'Indica se há familiar apto para trabalhar na composição familiar',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'O campo familiar_apto_trabalho deve ser verdadeiro ou falso' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  familiar_apto_trabalho?: boolean;

  @ApiProperty({
    description: 'Área de interesse profissional de familiares',
    example: 'Construção civil',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Área de interesse familiar deve ser um texto' })
  @MaxLength(255, { message: 'Área de interesse familiar deve ter no máximo 255 caracteres' })
  area_interesse_familiar?: string;

  @ApiProperty({
    description: 'Observações adicionais sobre a situação social',
    example: 'Família em situação de vulnerabilidade social',
    maxLength: 1000,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser um texto' })
  @MaxLength(1000, { message: 'Observações devem ter no máximo 1000 caracteres' })
  observacoes?: string;
}