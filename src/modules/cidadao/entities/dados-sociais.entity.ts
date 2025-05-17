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
import { IsNotEmpty, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
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
    nullable: true,
  })
  @IsOptional()
  @IsEnum(EscolaridadeEnum, { message: 'Escolaridade inválida' })
  escolaridade: EscolaridadeEnum;

  @Column({
    type: 'enum',
    enum: SituacaoTrabalhoEnum,
    enumName: 'situacao_trabalho_enum',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(SituacaoTrabalhoEnum, { message: 'Situação de trabalho inválida' })
  situacao_trabalho: SituacaoTrabalhoEnum;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Renda familiar deve ser um número' })
  @Min(0, { message: 'Renda familiar não pode ser negativa' })
  renda_familiar: number;

  @Column({ nullable: true })
  @IsOptional()
  profissao: string;

  @Column({ nullable: true })
  @IsOptional()
  tempo_residencia_municipio: number;

  @Column({ default: false })
  inscrito_cadunico: boolean;

  @Column({ nullable: true })
  @IsOptional()
  numero_nis: string;

  @Column('jsonb', { nullable: true })
  @IsOptional()
  beneficios_sociais: {
    tipo: string;
    valor: number;
    data_inicio: Date;
    data_fim?: Date;
  }[];

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
