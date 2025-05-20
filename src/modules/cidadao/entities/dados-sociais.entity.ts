import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsOptional, IsNumber, Min, IsEnum, ValidateIf, IsString, IsBoolean } from 'class-validator';
import { Cidadao } from './cidadao.entity';

export enum EscolaridadeEnum {
  ANALFABETO = 'analfabeto',
  FUNDAMENTAL_INCOMPLETO = 'fundamental_incompleto',
  FUNDAMENTAL_COMPLETO = 'fundamental_completo',
  MEDIO_INCOMPLETO = 'medio_incompleto',
  MEDIO_COMPLETO = 'medio_completo',
  SUPERIOR_INCOMPLETO = 'superior_incompleto',
  SUPERIOR_COMPLETO = 'superior_completo',
  POS_GRADUACAO = 'pos_graduacao',
}

export enum SituacaoTrabalhoEnum {
  DESEMPREGADO = 'desempregado',
  EMPREGADO_FORMAL = 'empregado_formal',
  EMPREGADO_INFORMAL = 'empregado_informal',
  AUTONOMO = 'autonomo',
  APOSENTADO = 'aposentado',
  PENSIONISTA = 'pensionista',
  BENEFICIARIO_BPC = 'beneficiario_bpc',
  OUTRO = 'outro',
}

export enum TipoTrabalhoEnum {
  FORMAL = 'formal',
  INFORMAL = 'informal',
  AUTONOMO = 'autonomo',
  EMPREGADOR = 'empregador',
  NAO_TRABALHA = 'nao_trabalha',
}

@Entity('dados_sociais')
@Index(['cidadao_id'], { unique: true })
export class DadosSociais {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  cidadao_id: string;

  @OneToOne(() => Cidadao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  @Column({
    type: 'enum',
    enum: EscolaridadeEnum,
    enumName: 'escolaridade_enum',
    nullable: false,
  })
  @IsNotEmpty({ message: 'Escolaridade é obrigatória' })
  @IsEnum(EscolaridadeEnum, { message: 'Escolaridade inválida' })
  escolaridade: EscolaridadeEnum;

  @Column({ nullable: true })
  @IsOptional()
  @IsBoolean({ message: 'O campo publico_prioritario deve ser um true ou false' })
  publico_prioritario: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Renda deve ser um número' })
  @Min(0, { message: 'Renda não pode ser negativa' })
  renda: number;

  @Column({ nullable: true })
  @IsOptional()
  ocupacao: string;

  @Column({ default: false })
  @IsBoolean({ message: 'O campo recebe_pbf deve ser um valor booleano' })
  recebe_pbf: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor PBF deve ser um número' })
  @Min(0, { message: 'Valor do PBF não pode ser negativa' })
  valor_pbf: number;

  @Column({ default: false })
  @IsBoolean({ message: 'O campo recebe_bpc deve ser um valor booleano' })
  recebe_bpc: boolean;

  @Column({ nullable: true })
  @IsOptional()
  @IsString({ message: 'O campo tipo_bpc deve ser um texto' })
  tipo_bpc: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor do BPC deve Rendaser um número' })
  @Min(0, { message: 'Valor do BPC não pode ser negativa' })
  valor_bpc: number;

  @Column({ nullable: true })
  @IsOptional()
  @IsString({ message: 'O campo curso_profissionalizante deve ser um texto' })
  curso_profissionalizante: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsBoolean({ message: 'O campo interesse_curso_profissionalizante deve ser um true ou false' })
  interesse_curso_profissionalizante: boolean;

  @Column({
    type: 'enum',
    enum: SituacaoTrabalhoEnum,
    enumName: 'situacao_trabalho_enum',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(SituacaoTrabalhoEnum, { message: 'Situação de trabalho inválida' })
  situacao_trabalho: SituacaoTrabalhoEnum;

  @Column({ nullable: true })
  @IsOptional()
  @IsString({ message: 'O campo area_trabalho deve ser um texto' })
  area_trabalho: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsBoolean({ message: 'O campo familiar_apto_trabalho deve ser um true ou false' })
  familiar_apto_trabalho: boolean;

  @Column({ nullable: true })
  @IsOptional()
  @IsString({ message: 'O campo area_interesse_familiar deve ser um texto' })
  area_interesse_familiar: string;

  @Column({ nullable: true })
  @IsOptional()
  observacoes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
