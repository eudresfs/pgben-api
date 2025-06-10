import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { DadosSociais } from '../../../entities/dados-sociais.entity';
import { EscolaridadeEnum } from '../../../enums/escolaridade.enum';
import { SituacaoTrabalhoEnum } from '../../../enums/situacao-trabalho.enum';
import { ModalidadeBpcEnum } from '../../../enums/modalidade-bpc.enum';
import { TipoInsercaoEnum } from '../../../enums/tipo-insercao.enum';

/**
 * DTO de resposta para dados sociais de um cidadão
 *
 * Padroniza o formato de retorno dos dados sociais, incluindo
 * campos calculados e formatação adequada para o frontend.
 */
export class DadosSociaisResponseDto {
  @ApiProperty({
    description: 'ID único dos dados sociais',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'ID do cidadão proprietário dos dados sociais',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @Expose()
  cidadao_id: string;

  @ApiProperty({
    description: 'Nível de escolaridade do cidadão',
    enum: EscolaridadeEnum,
    example: EscolaridadeEnum.MEDIO_COMPLETO,
  })
  @Expose()
  escolaridade: EscolaridadeEnum;

  @ApiProperty({
    description: 'Indica se o cidadão faz parte de público prioritário',
    example: true,
  })
  @Expose()
  publico_prioritario: boolean;

  @ApiProperty({
    description: 'Renda mensal do cidadão em reais',
    example: 1500.5,
    type: 'number',
    format: 'decimal',
    nullable: true,
  })
  @Expose()
  @Transform(({ value }) => (value ? parseFloat(value) : null))
  renda: number | null;

  @ApiProperty({
    description: 'Ocupação ou profissão do beneficiário',
    example: 'Auxiliar de limpeza',
  })
  @Expose()
  ocupacao_beneficiario: string;

  @ApiProperty({
    description: 'Indica se o cidadão recebe Programa Bolsa Família',
    example: false,
  })
  @Expose()
  recebe_pbf: boolean;

  @ApiProperty({
    description: 'Valor mensal recebido do Programa Bolsa Família',
    example: 400.0,
    type: 'number',
    format: 'decimal',
    nullable: true,
  })
  @Expose()
  @Transform(({ value }) => (value ? parseFloat(value) : null))
  valor_pbf: number | null;

  @ApiProperty({
    description: 'Indica se o cidadão recebe Benefício de Prestação Continuada',
    example: false,
  })
  @Expose()
  recebe_bpc: boolean;

  @ApiProperty({
    description: 'Modalidade do BPC recebido',
    enum: ModalidadeBpcEnum,
    example: ModalidadeBpcEnum.PCD,
  })
  @Expose()
  modalidade_bpc: ModalidadeBpcEnum;

  @ApiProperty({
    description: 'Valor mensal recebido do BPC',
    example: 1320.0,
    type: 'number',
    format: 'decimal',
    nullable: true,
  })
  @Expose()
  @Transform(({ value }) => (value ? parseFloat(value) : null))
  valor_bpc: number | null;

  @ApiProperty({
    description: 'Indica se o cidadão recebe Tributo Criança',
    example: false,
  })
  @Expose()
  recebe_tributo_crianca: boolean;

  @ApiProperty({
    description: 'Valor mensal recebido do Tributo Criança',
    example: 150.0,
    type: 'number',
    format: 'decimal',
    nullable: true,
  })
  @Expose()
  @Transform(({ value }) => (value ? parseFloat(value) : null))
  valor_tributo_crianca: number | null;

  @ApiProperty({
    description: 'Indica se o cidadão recebe pensão por morte',
    example: false,
  })
  @Expose()
  pensao_morte: boolean;

  @ApiProperty({
    description: 'Indica se o cidadão é aposentado',
    example: false,
  })
  @Expose()
  aposentadoria: boolean;

  @ApiProperty({
    description: 'Indica se o cidadão recebe outros benefícios',
    example: false,
  })
  @Expose()
  outros_beneficios: boolean;

  @ApiProperty({
    description: 'Descrição dos outros benefícios recebidos',
    example: 'Auxílio emergencial municipal',
    nullable: true,
  })
  @Expose()
  descricao_outros_beneficios: string | null;

  @ApiProperty({
    description:
      'Curso profissionalizante que o cidadão possui ou está cursando',
    example: 'Técnico em Informática',
  })
  @Expose()
  curso_profissionalizante: string;

  @ApiProperty({
    description:
      'Indica se o cidadão tem interesse em fazer curso profissionalizante',
    example: true,
  })
  @Expose()
  interesse_curso_profissionalizante: boolean;

  @ApiProperty({
    description: 'Situação atual de trabalho do cidadão',
    enum: SituacaoTrabalhoEnum,
    example: SituacaoTrabalhoEnum.DESEMPREGADO,
  })
  @Expose()
  situacao_trabalho: SituacaoTrabalhoEnum;

  @ApiProperty({
    description: 'Área de trabalho ou interesse profissional',
    example: 'Serviços gerais',
  })
  @Expose()
  area_trabalho: string;

  @ApiProperty({
    description:
      'Indica se há familiar apto para trabalhar na composição familiar',
    example: true,
  })
  @Expose()
  familiar_apto_trabalho: boolean;

  @ApiProperty({
    description: 'Área de interesse profissional de familiares',
    example: 'Construção civil',
  })
  @Expose()
  area_interesse_familiar: string;

  @ApiProperty({
    description: 'Indica se o beneficiario exerce atividade remunerada',
    example: true,
  })
  @Expose()
  exerce_atividade_remunerada: boolean;

  @ApiProperty({
    description: 'Tipo de inserção no trabalho do beneficiario',
    enum: TipoInsercaoEnum,
    example: TipoInsercaoEnum.FORMAL,
    nullable: true,
  })
  @Expose()
  tipo_insercao_beneficiario: TipoInsercaoEnum | null;

  @ApiProperty({
    description: 'Nome do cônjuge',
    example: 'Maria Silva Santos',
    nullable: true,
  })
  @Expose()
  nome_conjuge: string | null;

  @ApiProperty({
    description: 'Ocupação ou profissão do cônjuge',
    example: 'Diarista',
    nullable: true,
  })
  @Expose()
  ocupacao_conjuge: string | null;

  @ApiProperty({
    description: 'Indica se o cônjuge exerce atividade remunerada',
    example: false,
    nullable: true,
  })
  @Expose()
  exerce_atividade_remunerada_conjuge: boolean | null;

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
  })
  @Expose()
  observacoes: string;

  @ApiProperty({
    description: 'Renda per capita calculada automaticamente',
    example: 375.12,
    type: 'number',
    format: 'decimal',
  })
  @Expose()
  @Transform(({ obj }) => {
    // Calcula renda per capita baseada na composição familiar
    // Este cálculo será implementado no service
    return obj.renda_per_capita || null;
  })
  renda_per_capita: number;

  @ApiProperty({
    description: 'Total de benefícios recebidos (PBF + BPC + Tributo Criança)',
    example: 1870.0,
    type: 'number',
    format: 'decimal',
    nullable: true,
  })
  @Expose()
  @Transform(({ obj }) => {
    let total = 0;
    if (obj.valor_pbf) {total += parseFloat(obj.valor_pbf);}
    if (obj.valor_bpc) {total += parseFloat(obj.valor_bpc);}
    if (obj.valor_tributo_crianca) {total += parseFloat(obj.valor_tributo_crianca);}
    return total > 0 ? total : null;
  })
  total_beneficios: number | null;

  @ApiProperty({
    description: 'Renda total (renda + benefícios)',
    example: 3370.0,
    type: 'number',
    format: 'decimal',
    nullable: true,
  })
  @Expose()
  @Transform(({ obj }) => {
    let total = 0;
    if (obj.renda) {total += parseFloat(obj.renda);}
    if (obj.valor_pbf) {total += parseFloat(obj.valor_pbf);}
    if (obj.valor_bpc) {total += parseFloat(obj.valor_bpc);}
    if (obj.valor_tributo_crianca) {total += parseFloat(obj.valor_tributo_crianca);}
    return total > 0 ? total : null;
  })
  renda_total: number | null;

  @ApiProperty({
    description: 'Data de criação do registro',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  created_at: Date;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2024-01-20T14:45:00Z',
  })
  @Expose()
  updated_at: Date;

  constructor(dadosSociais: DadosSociais) {
    if (dadosSociais) {
      this.id = dadosSociais.id;
      this.cidadao_id = dadosSociais.cidadao_id;
      this.escolaridade = dadosSociais.escolaridade;
      this.publico_prioritario = dadosSociais.publico_prioritario;
      this.renda = dadosSociais.renda
        ? parseFloat(dadosSociais.renda.toString())
        : null;
      this.ocupacao_beneficiario = dadosSociais.ocupacao_beneficiario;
      this.recebe_pbf = dadosSociais.recebe_pbf;
      this.valor_pbf = dadosSociais.valor_pbf
        ? parseFloat(dadosSociais.valor_pbf.toString())
        : null;
      this.recebe_bpc = dadosSociais.recebe_bpc;
      this.modalidade_bpc = dadosSociais.modalidade_bpc;
      this.valor_bpc = dadosSociais.valor_bpc
        ? parseFloat(dadosSociais.valor_bpc.toString())
        : null;
      this.recebe_tributo_crianca = dadosSociais.recebe_tributo_crianca;
      this.valor_tributo_crianca = dadosSociais.valor_tributo_crianca
        ? parseFloat(dadosSociais.valor_tributo_crianca.toString())
        : null;
      this.pensao_morte = dadosSociais.pensao_morte;
      this.aposentadoria = dadosSociais.aposentadoria;
      this.outros_beneficios = dadosSociais.outros_beneficios;
      this.descricao_outros_beneficios = dadosSociais.descricao_outros_beneficios;
      this.curso_profissionalizante = dadosSociais.curso_profissionalizante;
      this.interesse_curso_profissionalizante = dadosSociais.interesse_curso_profissionalizante;
      this.situacao_trabalho = dadosSociais.situacao_trabalho;
      this.area_trabalho = dadosSociais.area_trabalho;
      this.familiar_apto_trabalho = dadosSociais.familiar_apto_trabalho;
      this.area_interesse_familiar = dadosSociais.area_interesse_familiar;
      this.exerce_atividade_remunerada = dadosSociais.exerce_atividade_remunerada;
      this.tipo_insercao_beneficiario = dadosSociais.tipo_insercao_beneficiario;
      this.nome_conjuge = dadosSociais.nome_conjuge;
      this.ocupacao_conjuge = dadosSociais.ocupacao_conjuge;
      this.exerce_atividade_remunerada_conjuge = dadosSociais.exerce_atividade_remunerada_conjuge;
      this.tipo_insercao_conjuge = dadosSociais.tipo_insercao_conjuge;
      this.observacoes = dadosSociais.observacoes;
      this.created_at = dadosSociais.created_at;
      this.updated_at = dadosSociais.updated_at;

      // Cálculos derivados
      this.total_beneficios = this.calculateTotalBeneficios();
      this.renda_total = this.calculateRendaTotal();
    }
  }

  /**
   * Calcula o total de benefícios recebidos
   */
  private calculateTotalBeneficios(): number | null {
    let total = 0;
    if (this.valor_pbf) {total += this.valor_pbf;}
    if (this.valor_bpc) {total += this.valor_bpc;}
    if (this.valor_tributo_crianca) {total += this.valor_tributo_crianca;}
    return total > 0 ? total : null;
  }

  /**
   * Calcula a renda total (renda + benefícios)
   */
  private calculateRendaTotal(): number | null {
    let total = 0;
    if (this.renda) {total += this.renda;}
    if (this.valor_pbf) {total += this.valor_pbf;}
    if (this.valor_bpc) {total += this.valor_bpc;}
    if (this.valor_tributo_crianca) {total += this.valor_tributo_crianca;}
    return total > 0 ? total : null;
  }
}
