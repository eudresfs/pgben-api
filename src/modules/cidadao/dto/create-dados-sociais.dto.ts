import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsString,
  IsBoolean,
  ValidateIf,
  MaxLength,
  IsPositive,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EscolaridadeEnum } from '../../../enums/escolaridade.enum';
import { SituacaoTrabalhoEnum } from '../../../enums/situacao-trabalho.enum';
import { ModalidadeBpcEnum } from '../../../enums/modalidade-bpc.enum';
import { IsEnumValue } from '../../../shared/validators/enum-validator';
import { TipoInsercaoEnum } from '@/enums/tipo-insercao.enum';

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
    examples: {
      analfabeto: {
        value: EscolaridadeEnum.ANALFABETO,
        description: 'Cidadão que não sabe ler nem escrever',
      },
      fundamental_completo: {
        value: EscolaridadeEnum.FUNDAMENTAL_COMPLETO,
        description: 'Ensino fundamental completo (até 9º ano)',
      },
      medio_completo: {
        value: EscolaridadeEnum.MEDIO_COMPLETO,
        description: 'Ensino médio completo',
      },
      superior_completo: {
        value: EscolaridadeEnum.SUPERIOR_COMPLETO,
        description: 'Ensino superior completo',
      },
    },
  })
  @IsNotEmpty({ message: 'Escolaridade é obrigatória' })
  @IsEnumValue(EscolaridadeEnum, {
    enumName: 'Escolaridade',
    caseSensitive: false,
  })
  escolaridade: EscolaridadeEnum;

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
    maximum: 999999.99,
    required: false,
    examples: {
      sem_renda: {
        value: 0,
        description: 'Cidadão sem renda',
      },
      salario_minimo: {
        value: 1320.0,
        description: 'Um salário mínimo',
      },
      renda_media: {
        value: 2500.0,
        description: 'Renda média',
      },
    },
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: 'Renda deve ser um número válido com no máximo 2 casas decimais',
    },
  )
  @Min(0, { message: 'Renda não pode ser negativa' })
  @Max(999999.99, { message: 'Renda não pode exceder R$ 999.999,99' })
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
  renda?: number;

  @ApiProperty({
    description: 'Ocupação ou profissão do cidadão',
    example: 'Auxiliar de limpeza',
    maxLength: 255,
    required: false,
    examples: {
      servicos_gerais: {
        value: 'Auxiliar de limpeza',
        description: 'Profissional de serviços gerais',
      },
      comercio: {
        value: 'Vendedor',
        description: 'Profissional do comércio',
      },
      autonomo: {
        value: 'Manicure autônoma',
        description: 'Profissional autônomo',
      },
      desempregado: {
        value: 'Desempregado',
        description: 'Pessoa sem ocupação atual',
      },
    },
  })
  @IsOptional()
  @IsString({ message: 'Ocupação deve ser um texto' })
  @MaxLength(255, { message: 'Ocupação deve ter no máximo 255 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-.,]*$/, {
    message:
      'Ocupação deve conter apenas letras, números, espaços e pontuação básica',
  })
  ocupacao_beneficiario?: string;

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
    example: 400.0,
    minimum: 0,
    maximum: 10000.0,
    required: false,
    examples: {
      valor_basico: {
        value: 142.0,
        description: 'Valor básico do Auxílio Brasil',
      },
      valor_medio: {
        value: 400.0,
        description: 'Valor médio com benefícios adicionais',
      },
      valor_alto: {
        value: 600.0,
        description: 'Valor com múltiplos benefícios',
      },
    },
  })
  @ValidateIf((o) => o.recebe_pbf === true)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'Valor do PBF deve ser um número válido com no máximo 2 casas decimais',
    },
  )
  @IsPositive({
    message: 'Valor do PBF deve ser maior que zero quando informado',
  })
  @Max(10000.0, { message: 'Valor do PBF não pode exceder R$ 10.000,00' })
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
    minimum: 0,
    maximum: 10000.0,
    required: false,
    examples: {
      salario_minimo: {
        value: 1320.0,
        description: 'Valor padrão do BPC (1 salário mínimo)',
      },
    },
  })
  @ValidateIf((o) => o.recebe_bpc === true)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'Valor do BPC deve ser um número válido com no máximo 2 casas decimais',
    },
  )
  @IsPositive({
    message: 'Valor do BPC deve ser maior que zero quando informado',
  })
  @Max(10000.0, { message: 'Valor do BPC não pode exceder R$ 10.000,00' })
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
  recebe_tributo_crianca: boolean = false;

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
    message:
      'Valor do Tributo Criança deve ser maior que zero quando informado',
  })
  @Max(10000.0, {
    message: 'Valor do Tributo Criança não pode exceder R$ 10.000,00',
  })
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
  @IsBoolean({
    message: 'O campo outros_beneficios deve ser verdadeiro ou falso',
  })
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
    examples: {
      desempregado: {
        value: SituacaoTrabalhoEnum.DESEMPREGADO,
        description: 'Pessoa sem emprego atual',
      },
      empregado_formal: {
        value: SituacaoTrabalhoEnum.EMPREGADO_FORMAL,
        description: 'Empregado com carteira assinada',
      },
      autonomo: {
        value: SituacaoTrabalhoEnum.AUTONOMO,
        description: 'Trabalhador autônomo',
      },
      aposentado: {
        value: SituacaoTrabalhoEnum.APOSENTADO,
        description: 'Pessoa aposentada',
      },
      do_lar: {
        value: SituacaoTrabalhoEnum.DO_LAR,
        description: 'Pessoa dedicada aos cuidados do lar',
      },
    },
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
    description: 'Indica se o beneficiário exerce atividade remunerada',
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
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.exerce_atividade_remunerada === true)
  @IsEnumValue(TipoInsercaoEnum, {
    enumName: 'Tipo de Inserção',
    caseSensitive: false,
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return value;
  })
  tipo_insercao_beneficiario?: TipoInsercaoEnum | null;

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
    message:
      'O campo exerce_atividade_remunerada_conjuge deve ser verdadeiro ou falso',
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
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.exerce_atividade_remunerada_conjuge === true)
  @IsEnumValue(TipoInsercaoEnum, {
    enumName: 'Tipo de Inserção',
    caseSensitive: false,
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return value;
  })
  tipo_insercao_conjuge?: TipoInsercaoEnum | null;

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
