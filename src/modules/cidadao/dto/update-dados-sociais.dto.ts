import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateDadosSociaisDto } from './create-dados-sociais.dto';
import {
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsString,
  IsBoolean,
  ValidateIf,
  MaxLength,
  IsPositive,
} from 'class-validator';
import { Expose, Transform, Type } from 'class-transformer';
import { EscolaridadeEnum } from '../../../enums/escolaridade.enum';
import { SituacaoTrabalhoEnum } from '../../../enums/situacao-trabalho.enum';
import { ModalidadeBpcEnum } from '../../../enums/modalidade-bpc.enum';
import { IsEnumValue } from '../../../shared/validators/enum-validator';
import { TipoInsercaoEnum } from '@/enums/tipo-insercao.enum';

/**
 * DTO para atualização de dados sociais de um cidadão
 *
 * Permite atualização parcial dos dados sociais, mantendo as mesmas
 * validações do DTO de criação mas com todos os campos opcionais.
 */
export class UpdateDadosSociaisDto extends PartialType(CreateDadosSociaisDto) {
  @ApiProperty({
    description: 'Nível de escolaridade do cidadão',
    enum: EscolaridadeEnum,
    example: EscolaridadeEnum.MEDIO_COMPLETO,
    required: false,
    enumName: 'EscolaridadeEnum',
  })
  @IsOptional()
  @IsEnumValue(EscolaridadeEnum, {
    enumName: 'Escolaridade',
    caseSensitive: false,
  })
  escolaridade?: EscolaridadeEnum;

  @ApiProperty({
    description: 'Indica se o cidadão faz parte de público prioritário',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({
    message: 'O campo publico_prioritario deve ser verdadeiro ou falso',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  publico_prioritario?: boolean;

  @ApiProperty({
    description: 'Renda mensal do cidadão em reais',
    example: 1500.5,
    minimum: 0,
    maximum: 50000,
    required: false,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: 'Renda deve ser um número válido com no máximo 2 casas decimais',
    },
  )
  @Min(0, { message: 'Renda não pode ser negativa' })
  @Max(50000, { message: 'Renda não pode exceder R$ 50.000,00' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // Remove vírgulas e converte para número
      const cleanValue = value.replace(/,/g, '.');
      return parseFloat(cleanValue);
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
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'O campo recebe_pbf deve ser verdadeiro ou falso' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  recebe_pbf?: boolean;

  @ApiProperty({
    description: 'Valor mensal recebido do Programa Bolsa Família',
    example: 400.0,
    minimum: 50,
    maximum: 10000,
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.recebe_pbf === true)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'Valor do PBF deve ser um número válido com no máximo 2 casas decimais',
    },
  )
  @Min(50, { message: 'Valor do PBF deve ser no mínimo R$ 50,00' })
  @Max(10000, { message: 'Valor do PBF não pode exceder R$ 10.000,00' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // Remove vírgulas e espaços, converte para número
      const cleanValue = value.replace(/[,\s]/g, '.').replace(/\.{2,}/g, '.');
      return parseFloat(cleanValue) || 0;
    }
    return value;
  })
  valor_pbf?: number;

  @ApiProperty({
    description: 'Indica se o cidadão recebe Benefício de Prestação Continuada',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'O campo recebe_bpc deve ser verdadeiro ou falso' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  recebe_bpc?: boolean;

  @ApiProperty({
    description: 'Modalidade do BPC recebido',
    enum: ModalidadeBpcEnum,
    example: ModalidadeBpcEnum.PCD,
    required: false,
    examples: {
      pessoa_com_deficiencia: {
        value: ModalidadeBpcEnum.PCD,
        description: 'BPC para pessoa com deficiência',
      },
      idoso: {
        value: ModalidadeBpcEnum.IDOSO,
        description: 'BPC para pessoa idosa',
      },
    },
  })
  @ValidateIf((o) => o.recebe_bpc === true)
  @IsEnumValue(ModalidadeBpcEnum, {
    enumName: 'ModalidadeBpc',
    caseSensitive: false,
  })
  modalidade_bpc?: ModalidadeBpcEnum;

  @ApiProperty({
    description: 'Valor mensal recebido do BPC',
    example: 1320.0,
    minimum: 100,
    maximum: 10000,
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.recebe_bpc === true)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'Valor do BPC deve ser um número válido com no máximo 2 casas decimais',
    },
  )
  @Min(100, { message: 'Valor do BPC deve ser no mínimo R$ 100,00' })
  @Max(10000, { message: 'Valor do BPC não pode exceder R$ 10.000,00' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // Remove vírgulas e espaços, converte para número
      const cleanValue = value.replace(/[,\s]/g, '.').replace(/\.{2,}/g, '.');
      return parseFloat(cleanValue) || 0;
    }
    return value;
  })
  valor_bpc?: number;

  @ApiProperty({
    description: 'Indica se o cidadão recebe Tributo Criança',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({
    message: 'O campo recebe_tributo_crianca deve ser verdadeiro ou falso',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  recebe_tributo_crianca?: boolean;

  @ApiProperty({
    description: 'Valor mensal recebido do Tributo Criança',
    example: 600.0,
    minimum: 0,
    maximum: 10000.0,
    required: false,
  })
  @ValidateIf((o) => o.recebe_tributo_crianca === true)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'Valor do Tributo Criança deve ser um número válido com no máximo 2 casas decimais',
    },
  )
  @IsPositive({
    message: 'Valor do Tributo Criança deve ser maior que zero quando informado',
  })
  @Max(10000.0, { message: 'Valor do Tributo Criança não pode exceder R$ 10.000,00' })
  @Type(() => Number)
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(',', '.'));
      return isNaN(parsed) ? value : parsed;
    }
    return value;
  })
  valor_tributo_crianca?: number;

  @ApiProperty({
    description: 'Indica se o cidadão recebe pensão por morte',
    example: false,
    default: false,
  })
  @IsBoolean({ message: 'O campo pensao_morte deve ser verdadeiro ou falso' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  pensao_morte: boolean = false;

  @ApiProperty({
    description: 'Indica se o cidadão recebe aposentadoria',
    example: false,
    default: false,
  })
  @IsBoolean({ message: 'O campo aposentadoria deve ser verdadeiro ou falso' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  aposentadoria: boolean = false;

  @ApiProperty({
    description: 'Indica se o cidadão recebe outros benefícios',
    example: false,
    default: false,
  })
  @IsBoolean({ message: 'O campo outros_beneficios deve ser verdadeiro ou falso' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  outros_beneficios: boolean = false;

  @ApiProperty({
    description: 'Descrição detalhada de outros benefícios recebidos',
    example: 'Auxílio emergencial municipal',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.outros_beneficios === true)
  @IsString({ message: 'Descrição de outros benefícios deve ser um texto' })
  @MaxLength(500, {
    message: 'Descrição de outros benefícios deve ter no máximo 500 caracteres',
  })
  descricao_outros_beneficios?: string;

  @ApiProperty({
    description:
      'Curso profissionalizante que o cidadão possui ou está cursando',
    example: 'Técnico em Informática',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Curso profissionalizante deve ser um texto' })
  @MaxLength(255, {
    message: 'Curso profissionalizante deve ter no máximo 255 caracteres',
  })
  curso_profissionalizante?: string;

  @ApiProperty({
    description:
      'Indica se o cidadão tem interesse em fazer curso profissionalizante',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({
    message:
      'O campo interesse_curso_profissionalizante deve ser verdadeiro ou falso',
  })
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
    enumName: 'SituacaoTrabalhoEnum',
  })
  @IsOptional()
  @IsEnumValue(SituacaoTrabalhoEnum, {
    enumName: 'Situação de Trabalho',
    caseSensitive: false,
  })
  situacao_trabalho?: SituacaoTrabalhoEnum;

  @ApiProperty({
    description: 'Área de trabalho ou interesse profissional',
    example: 'Serviços gerais',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Área de trabalho deve ser um texto' })
  @MaxLength(255, {
    message: 'Área de trabalho deve ter no máximo 255 caracteres',
  })
  area_trabalho?: string;

  @ApiProperty({
    description:
      'Indica se há familiar apto para trabalhar na composição familiar',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({
    message: 'O campo familiar_apto_trabalho deve ser verdadeiro ou falso',
  })
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
  @MaxLength(255, {
    message: 'Área de interesse familiar deve ter no máximo 255 caracteres',
  })
  area_interesse_familiar?: string;

  @ApiProperty({
    description: 'Indica se o beneficiario exerce atividade remunerada',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({
    message: 'O campo exerce_atividade_remunerada deve ser verdadeiro ou falso',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  exerce_atividade_remunerada?: boolean;

  @ApiProperty({
    description: 'Tipo de inserção no trabalho do beneficiário',
    enum: TipoInsercaoEnum,
    example: TipoInsercaoEnum.INFORMAL,
    nullable: true,
  })
  @Expose()
  tipo_insercao_beneficiario: TipoInsercaoEnum | null;

  @ApiProperty({
    description: 'Nome completo do cônjuge',
    example: 'Maria Silva Santos',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Nome do cônjuge deve ser um texto' })
  @MaxLength(255, {
    message: 'Nome do cônjuge deve ter no máximo 255 caracteres',
  })
  nome_conjuge?: string;

  @ApiProperty({
    description: 'Ocupação profissional do cônjuge',
    example: 'Auxiliar de limpeza',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Ocupação do cônjuge deve ser um texto' })
  @MaxLength(255, {
    message: 'Ocupação do cônjuge deve ter no máximo 255 caracteres',
  })
  ocupacao_conjuge?: string;

  @ApiProperty({
    description: 'Indica se o cônjuge exerce atividade remunerada',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({
    message: 'O campo exerce_atividade_remunerada_conjuge deve ser verdadeiro ou falso',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  exerce_atividade_remunerada_conjuge?: boolean;

  @ApiProperty({
    description: 'Tipo de inserção no trabalho do cônjuge',
    enum: TipoInsercaoEnum,
    example: TipoInsercaoEnum.INFORMAL,
    nullable: true,
  })
  @Expose()
  tipo_insercao_conjuge: TipoInsercaoEnum | null;

  @ApiProperty({
    description: 'Observações adicionais sobre a situação social',
    example: 'Família em situação de vulnerabilidade social',
    maxLength: 1000,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser um texto' })
  @MaxLength(1000, {
    message: 'Observações devem ter no máximo 1000 caracteres',
  })
  observacoes?: string;
}
