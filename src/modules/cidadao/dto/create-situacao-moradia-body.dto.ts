import {
  IsOptional,
  IsNumber,
  Min,
  IsEnum,
  IsBoolean,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TipoMoradiaEnum,
  ProgramaHabitacionalEnum,
  TipoDesastreEnum,
  TipoDespesaEnum,
} from '../../../enums/situacao-moradia.enum';
import { ApiProperty } from '@nestjs/swagger';

export class DespesaMensalDto {
  @ApiProperty({
    enum: TipoDespesaEnum,
    description: 'Tipo de despesa mensal',
    example: 'agua',
  })
  @IsEnum(TipoDespesaEnum, { message: 'Tipo de despesa inválido' })
  tipo: TipoDespesaEnum;

  @ApiProperty({
    type: 'number',
    description: 'Valor da despesa em reais',
    example: 50.0,
    minimum: 0,
  })
  @IsNumber({}, { message: 'Valor deve ser um número' })
  @Min(0, { message: 'Valor não pode ser negativo' })
  valor: number;

  @ApiProperty({
    type: 'string',
    description: 'Descrição adicional da despesa',
    required: false,
    example: 'Conta de água da CAERN',
  })
  @IsOptional()
  @IsString({ message: 'Descrição deve ser uma string' })
  descricao?: string;
}

/**
 * DTO para criação de situação de moradia via body da requisição.
 * O cidadao_id é obtido do path da URL, não do body.
 */
export class CreateSituacaoMoradiaBodyDto {
  // Seção 1 - Tipo de Moradia
  @ApiProperty({
    enum: TipoMoradiaEnum,
    description: 'Tipo de moradia do cidadão',
    required: false,
    example: 'alugada',
  })
  @IsOptional()
  @IsEnum(TipoMoradiaEnum, { message: 'Tipo de moradia inválido' })
  tipo_moradia?: TipoMoradiaEnum;

  @ApiProperty({
    type: 'number',
    description: 'Número de cômodos da moradia',
    required: false,
    example: 3,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Número de cômodos deve ser um número' })
  @Min(1, { message: 'Deve ter pelo menos 1 cômodo' })
  numero_comodos?: number;

  @ApiProperty({
    type: 'number',
    description: 'Valor do aluguel em reais',
    required: false,
    example: 800.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Valor do aluguel deve ser um número' })
  @Min(0, { message: 'Valor do aluguel não pode ser negativo' })
  valor_aluguel?: number;

  @ApiProperty({
    type: 'number',
    description: 'Tempo de moradia no local em anos',
    required: false,
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tempo de moradia deve ser um número' })
  @Min(0, { message: 'Tempo de moradia não pode ser negativo' })
  tempo_moradia?: number;

  // Seção 2 - Condições da Moradia
  @ApiProperty({
    type: 'boolean',
    description: 'Indica se a moradia possui banheiro',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Possui banheiro deve ser verdadeiro ou falso' })
  possui_banheiro?: boolean;

  @ApiProperty({
    type: 'boolean',
    description: 'Indica se a moradia possui energia elétrica',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean({
    message: 'Possui energia elétrica deve ser verdadeiro ou falso',
  })
  possui_energia_eletrica?: boolean;

  @ApiProperty({
    type: 'boolean',
    description: 'Indica se a moradia possui água encanada',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Possui água encanada deve ser verdadeiro ou falso' })
  possui_agua_encanada?: boolean;

  @ApiProperty({
    type: 'boolean',
    description: 'Indica se a moradia possui coleta de lixo',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Possui coleta de lixo deve ser verdadeiro ou falso' })
  possui_coleta_lixo?: boolean;

  // Seção 3 - Situações Especiais
  @ApiProperty({
    type: 'boolean',
    description: 'Indica se a moradia é cedida',
    required: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Moradia cedida deve ser verdadeiro ou falso' })
  moradia_cedida?: boolean;

  @ApiProperty({
    type: 'boolean',
    description: 'Indica se a moradia é invadida',
    required: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Moradia invadida deve ser verdadeiro ou falso' })
  moradia_invadida?: boolean;

  @ApiProperty({
    enum: TipoDesastreEnum,
    description: 'Tipo de desastre que afetou a moradia',
    required: false,
    example: TipoDesastreEnum.ENCHENTE,
  })
  @IsOptional()
  @IsEnum(TipoDesastreEnum, { message: 'Tipo de desastre inválido' })
  tipo_desastre?: TipoDesastreEnum;

  @ApiProperty({
    type: 'string',
    description: 'Descrição detalhada do desastre',
    required: false,
    example: 'Casa foi atingida por enchente em dezembro de 2023',
  })
  @IsOptional()
  @IsString({ message: 'Descrição do desastre deve ser uma string' })
  descricao_desastre?: string;

  @ApiProperty({
    type: 'string',
    description: 'Descrição de outro tipo de moradia não listado',
    required: false,
    example: 'Moradia em área de risco',
  })
  @IsOptional()
  @IsString({ message: 'Outro tipo de moradia deve ser uma string' })
  outro_tipo_moradia?: string;

  // Seção 4 - Programas Habitacionais
  @ApiProperty({
    enum: ProgramaHabitacionalEnum,
    description: 'Programa habitacional do qual participa',
    required: false,
    example: ProgramaHabitacionalEnum.MINHA_CASA_MINHA_VIDA,
  })
  @IsOptional()
  @IsEnum(ProgramaHabitacionalEnum, {
    message: 'Programa habitacional inválido',
  })
  programa_habitacional?: ProgramaHabitacionalEnum;

  @ApiProperty({
    type: 'boolean',
    description: 'Indica se está inscrito em programa habitacional',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean({
    message: 'Inscrito em programa habitacional deve ser verdadeiro ou falso',
  })
  inscrito_programa_habitacional?: boolean;

  @ApiProperty({
    type: 'boolean',
    description: 'Indica se reside há pelo menos 2 anos em Natal',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean({
    message: 'Reside há 2 anos em Natal deve ser verdadeiro ou falso',
  })
  reside_2_anos_natal?: boolean;

  // Seção 5 - Despesas Mensais
  @ApiProperty({
    type: [DespesaMensalDto],
    description: 'Lista de despesas mensais da moradia',
    required: false,
    example: [
      { tipo: 'agua', valor: 50.0, descricao: 'Conta de água' },
      { tipo: 'energia', valor: 120.0, descricao: 'Conta de luz' },
    ],
  })
  @IsOptional()
  @IsArray({ message: 'Despesas mensais deve ser um array' })
  @ValidateNested({ each: true })
  @Type(() => DespesaMensalDto)
  despesas_mensais?: DespesaMensalDto[];

  @ApiProperty({
    type: 'string',
    description: 'Observações adicionais sobre a situação de moradia',
    required: false,
    example: 'Moradia em boas condições, próxima ao centro',
  })
  @IsOptional()
  @IsString({ message: 'Observações deve ser uma string' })
  observacoes?: string;
}
