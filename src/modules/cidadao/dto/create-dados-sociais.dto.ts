import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  IsBoolean,
  MaxLength,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EscolaridadeEnum } from '../../../enums/escolaridade.enum';
import { SituacaoTrabalhoEnum } from '../../../enums/situacao-trabalho.enum';
import { ModalidadeBpcEnum } from '../../../enums/modalidade-bpc.enum';
import { TipoInsercaoEnum } from '../../../enums/tipo-insercao.enum';

export class CreateDadosSociaisDto {
  @ApiProperty({ description: 'Escolaridade', enum: EscolaridadeEnum })
  @IsNotEmpty()
  escolaridade: EscolaridadeEnum;

  @ApiProperty({ description: 'Público prioritário', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  publico_prioritario?: boolean;

  @ApiProperty({ description: 'Renda mensal', required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  @Type(() => Number)
  renda?: number;

  @ApiProperty({ description: 'Ocupação do beneficiário', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  ocupacao_beneficiario?: string;

  @ApiProperty({ description: 'Recebe PBF' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  recebe_pbf: boolean = false;

  @ApiProperty({ description: 'Valor do PBF', required: false })
  @ValidateIf((o) => o.recebe_pbf === true)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(10000)
  @Type(() => Number)
  valor_pbf?: number;

  @ApiProperty({ description: 'Recebe BPC' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  recebe_bpc: boolean = false;

  @ApiProperty({ description: 'Modalidade do BPC', enum: ModalidadeBpcEnum, required: false })
  @ValidateIf((o) => o.recebe_bpc === true)
  modalidade_bpc?: ModalidadeBpcEnum;

  @ApiProperty({ description: 'Valor do BPC', required: false })
  @ValidateIf((o) => o.recebe_bpc === true)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(10000)
  @Type(() => Number)
  valor_bpc?: number;

  @ApiProperty({ description: 'Recebe Tributo Criança' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  recebe_tributo_crianca: boolean = false;

  @ApiProperty({ description: 'Valor do Tributo Criança', required: false })
  @ValidateIf((o) => o.recebe_tributo_crianca === true)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(10000)
  @Type(() => Number)
  valor_tributo_crianca?: number;

  @ApiProperty({ description: 'Pensão por morte' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  pensao_morte: boolean = false;

  @ApiProperty({ description: 'Aposentadoria' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  aposentadoria: boolean = false;

  @ApiProperty({ description: 'Outros benefícios' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  outros_beneficios: boolean = false;

  @ApiProperty({ description: 'Descrição de outros benefícios', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descricao_outros_beneficios?: string;

  @ApiProperty({ description: 'Curso profissionalizante', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  curso_profissionalizante?: string;

  @ApiProperty({ description: 'Interesse em curso profissionalizante', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  interesse_curso_profissionalizante?: boolean;

  @ApiProperty({ description: 'Situação de trabalho', enum: SituacaoTrabalhoEnum, required: false })
  @IsOptional()
  situacao_trabalho?: SituacaoTrabalhoEnum;

  @ApiProperty({ description: 'Área de trabalho', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  area_trabalho?: string;

  @ApiProperty({ description: 'Familiar apto para trabalho', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  familiar_apto_trabalho?: boolean;

  @ApiProperty({ description: 'Área de interesse familiar', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  area_interesse_familiar?: string;

  @ApiProperty({ description: 'Exerce atividade remunerada', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  exerce_atividade_remunerada?: boolean;

  @ApiProperty({ description: 'Tipo de inserção do beneficiário', enum: TipoInsercaoEnum, required: false })
  @IsOptional()
  tipo_insercao_beneficiario?: TipoInsercaoEnum;

  @ApiProperty({ description: 'Nome do cônjuge', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nome_conjuge?: string;

  @ApiProperty({ description: 'Ocupação do cônjuge', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  ocupacao_conjuge?: string;

  @ApiProperty({ description: 'Cônjuge exerce atividade remunerada', required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  exerce_atividade_remunerada_conjuge?: boolean;

  @ApiProperty({ description: 'Tipo de inserção do cônjuge', enum: TipoInsercaoEnum, required: false })
  @IsOptional()
  tipo_insercao_conjuge?: TipoInsercaoEnum;

  @ApiProperty({ description: 'Observações', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;
}