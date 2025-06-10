import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsEnum,
  IsBoolean,
  IsString,
  IsArray,
  ValidateNested,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TipoMoradiaEnum,
  ProgramaHabitacionalEnum,
  TipoDesastreEnum,
  TipoDespesaEnum,
} from '../../../enums/situacao-moradia.enum';

export class DespesaMensalDto {
  @IsEnum(TipoDespesaEnum, { message: 'Tipo de despesa inválido' })
  tipo: TipoDespesaEnum;

  @IsNumber({}, { message: 'Valor deve ser um número' })
  @IsPositive({ message: 'Valor deve ser positivo' })
  valor: number;

  @IsOptional()
  @IsString({ message: 'Descrição deve ser uma string' })
  descricao?: string;
}

export class CreateSituacaoMoradiaDto {
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  @IsString({ message: 'ID do cidadão deve ser uma string' })
  cidadao_id: string;

  // Seção 1 - Tipo de Moradia
  @IsOptional()
  @IsEnum(TipoMoradiaEnum, { message: 'Tipo de moradia inválido' })
  tipo_moradia?: TipoMoradiaEnum;

  @IsOptional()
  @IsNumber({}, { message: 'Número de cômodos deve ser um número' })
  @Min(1, { message: 'Deve ter pelo menos 1 cômodo' })
  numero_comodos?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Valor do aluguel deve ser um número' })
  @Min(0, { message: 'Valor do aluguel não pode ser negativo' })
  valor_aluguel?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Tempo de moradia deve ser um número' })
  @Min(0, { message: 'Tempo de moradia não pode ser negativo' })
  tempo_moradia?: number; // em anos

  // Seção 2 - Condições da Moradia
  @IsOptional()
  @IsBoolean({ message: 'Possui banheiro deve ser verdadeiro ou falso' })
  possui_banheiro?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Possui energia elétrica deve ser verdadeiro ou falso' })
  possui_energia_eletrica?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Possui água encanada deve ser verdadeiro ou falso' })
  possui_agua_encanada?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Possui coleta de lixo deve ser verdadeiro ou falso' })
  possui_coleta_lixo?: boolean;

  // Seção 3 - Situações Especiais
  @IsOptional()
  @IsBoolean({ message: 'Moradia cedida deve ser verdadeiro ou falso' })
  moradia_cedida?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Moradia invadida deve ser verdadeiro ou falso' })
  moradia_invadida?: boolean;

  @IsOptional()
  @IsEnum(TipoDesastreEnum, { message: 'Tipo de desastre inválido' })
  tipo_desastre?: TipoDesastreEnum;

  @IsOptional()
  @IsString({ message: 'Descrição do desastre deve ser uma string' })
  descricao_desastre?: string;

  @IsOptional()
  @IsString({ message: 'Outro tipo de moradia deve ser uma string' })
  outro_tipo_moradia?: string;

  // Seção 4 - Programas Habitacionais
  @IsOptional()
  @IsEnum(ProgramaHabitacionalEnum, { message: 'Programa habitacional inválido' })
  programa_habitacional?: ProgramaHabitacionalEnum;

  @IsOptional()
  @IsBoolean({ message: 'Inscrito em programa habitacional deve ser verdadeiro ou falso' })
  inscrito_programa_habitacional?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Reside há 2 anos em Natal deve ser verdadeiro ou falso' })
  reside_2_anos_natal?: boolean;

  // Seção 5 - Despesas Mensais
  @IsOptional()
  @IsArray({ message: 'Despesas mensais deve ser um array' })
  @ValidateNested({ each: true })
  @Type(() => DespesaMensalDto)
  despesas_mensais?: DespesaMensalDto[];

  @IsOptional()
  @IsString({ message: 'Observações deve ser uma string' })
  observacoes?: string;
}