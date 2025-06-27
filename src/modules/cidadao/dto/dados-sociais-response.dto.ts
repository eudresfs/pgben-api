import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { EscolaridadeEnum } from '../../../enums/escolaridade.enum';
import { SituacaoTrabalhoEnum } from '../../../enums/situacao-trabalho.enum';
import { ModalidadeBpcEnum } from '../../../enums/modalidade-bpc.enum';
import { TipoInsercaoEnum } from '../../../enums/tipo-insercao.enum';

export class DadosSociaisResponseDto {
  @ApiProperty({ description: 'ID único dos dados sociais' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'ID do cidadão proprietário dos dados sociais' })
  @Expose()
  cidadao_id: string;

  @ApiProperty({ description: 'Nível de escolaridade do cidadão', enum: EscolaridadeEnum })
  @Expose()
  escolaridade: EscolaridadeEnum;

  @ApiProperty({ description: 'Indica se o cidadão faz parte de público prioritário' })
  @Expose()
  publico_prioritario: boolean;

  @ApiProperty({ description: 'Renda mensal do cidadão em reais', nullable: true })
  @Expose()
  @Transform(({ value }) => (value ? parseFloat(value) : null))
  renda: number | null;

  @ApiProperty({ description: 'Ocupação ou profissão do beneficiário' })
  @Expose()
  ocupacao_beneficiario: string;

  @ApiProperty({ description: 'Indica se o cidadão recebe Programa Bolsa Família' })
  @Expose()
  recebe_pbf: boolean;

  @ApiProperty({ description: 'Valor mensal recebido do Programa Bolsa Família', nullable: true })
  @Expose()
  @Transform(({ value }) => (value ? parseFloat(value) : null))
  valor_pbf: number | null;

  @ApiProperty({ description: 'Indica se o cidadão recebe Benefício de Prestação Continuada' })
  @Expose()
  recebe_bpc: boolean;

  @ApiProperty({ description: 'Modalidade do BPC recebido', enum: ModalidadeBpcEnum })
  @Expose()
  modalidade_bpc: ModalidadeBpcEnum;

  @ApiProperty({ description: 'Valor mensal recebido do BPC', nullable: true })
  @Expose()
  @Transform(({ value }) => (value ? parseFloat(value) : null))
  valor_bpc: number | null;

  @ApiProperty({ description: 'Indica se o cidadão recebe Tributo Criança' })
  @Expose()
  recebe_tributo_crianca: boolean;

  @ApiProperty({ description: 'Valor mensal recebido do Tributo Criança', nullable: true })
  @Expose()
  @Transform(({ value }) => (value ? parseFloat(value) : null))
  valor_tributo_crianca: number | null;

  @ApiProperty({ description: 'Indica se o cidadão recebe pensão por morte' })
  @Expose()
  pensao_morte: boolean;

  @ApiProperty({ description: 'Indica se o cidadão é aposentado' })
  @Expose()
  aposentadoria: boolean;

  @ApiProperty({ description: 'Indica se o cidadão recebe outros benefícios' })
  @Expose()
  outros_beneficios: boolean;

  @ApiProperty({ description: 'Descrição dos outros benefícios recebidos', nullable: true })
  @Expose()
  descricao_outros_beneficios: string | null;

  @ApiProperty({ description: 'Curso profissionalizante que o cidadão possui ou está cursando' })
  @Expose()
  curso_profissionalizante: string;

  @ApiProperty({ description: 'Indica se o cidadão tem interesse em fazer curso profissionalizante' })
  @Expose()
  interesse_curso_profissionalizante: boolean;

  @ApiProperty({ description: 'Situação atual de trabalho do cidadão', enum: SituacaoTrabalhoEnum })
  @Expose()
  situacao_trabalho: SituacaoTrabalhoEnum;

  @ApiProperty({ description: 'Área de trabalho ou interesse profissional' })
  @Expose()
  area_trabalho: string;

  @ApiProperty({ description: 'Indica se há familiar apto para trabalhar na composição familiar' })
  @Expose()
  familiar_apto_trabalho: boolean;

  @ApiProperty({ description: 'Área de interesse profissional de familiares' })
  @Expose()
  area_interesse_familiar: string;

  @ApiProperty({ description: 'Indica se o beneficiario exerce atividade remunerada' })
  @Expose()
  exerce_atividade_remunerada: boolean;

  @ApiProperty({ description: 'Tipo de inserção no trabalho do beneficiario', enum: TipoInsercaoEnum, nullable: true })
  @Expose()
  tipo_insercao_beneficiario: TipoInsercaoEnum | null;

  @ApiProperty({ description: 'Nome do cônjuge', nullable: true })
  @Expose()
  nome_conjuge: string | null;

  @ApiProperty({ description: 'Ocupação ou profissão do cônjuge', nullable: true })
  @Expose()
  ocupacao_conjuge: string | null;

  @ApiProperty({ description: 'Indica se o cônjuge exerce atividade remunerada', nullable: true })
  @Expose()
  exerce_atividade_remunerada_conjuge: boolean | null;

  @ApiProperty({ description: 'Tipo de inserção no trabalho do cônjuge', enum: TipoInsercaoEnum, nullable: true })
  @Expose()
  tipo_insercao_conjuge: TipoInsercaoEnum | null;

  @ApiProperty({ description: 'Observações adicionais sobre a situação social' })
  @Expose()
  observacoes: string;

  @ApiProperty({ description: 'Data de criação do registro' })
  @Expose()
  created_at: Date;

  @ApiProperty({ description: 'Data da última atualização' })
  @Expose()
  updated_at: Date;
}