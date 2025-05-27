import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToOne,
} from 'typeorm';
import { IsNotEmpty, IsOptional, IsNumber, Min, IsEnum, Length, Validate } from 'class-validator';
import { Cidadao } from './cidadao.entity';
import { EscolaridadeEnum } from './dados-sociais.entity';
import { CPFValidator } from '../validators/cpf-validator';

export enum Parentesco {
  CONJUGE = 'conjuge',
  FILHO = 'filho',
  PAI = 'pai',
  MAE = 'mae',
  IRMAO = 'irmao',
  AVO = 'avo',
  NETO = 'neto',
  TIO = 'tio',
  SOBRINHO = 'sobrinho',
  OUTRO = 'outro',
}

@Entity('composicao_familiar')
@Index(['cidadao_id', 'nome'], { unique: true })
export class ComposicaoFamiliar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  cidadao_id: string;

  @ManyToOne(() => Cidadao, (cidadao) => cidadao.composicao_familiar, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @Column({ nullable: false })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @Length(11, 14, { message: 'CPF deve ter entre 11 e 14 caracteres' })
  @Validate(CPFValidator, { message: 'CPF inválido' })
  cpf: string;

  @Column({ nullable: true })
  @IsNotEmpty({ message: 'NIS do parente é obrigatório' })
  nis: string;

  @Column('integer')
  @IsNotEmpty({ message: 'Idade do parente é obrigatório' })
  @IsNumber({}, { message: 'Idade deve ser um número' })
  @Min(0, { message: 'Idade não pode ser negativa' })
  idade: number;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  ocupacao: string;

  @Column({
    type: 'enum',
    enum: EscolaridadeEnum,
    enumName: 'escolaridade_enum',
    nullable: false,
  })
  @IsNotEmpty({ message: 'Escolaridade é obrigatória' })
  @IsEnum(EscolaridadeEnum, { message: 'Escolaridade inválida' })
  escolaridade: EscolaridadeEnum;

  @Column({
    type: 'enum',
    enum: Parentesco,
    enumName: 'parentesco',
    default: Parentesco.OUTRO,
  })
  @IsNotEmpty({ message: 'Parentesco é obrigatório' })
  parentesco: Parentesco;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Renda deve ser um número' })
  @Min(0, { message: 'Renda não pode ser negativa' })
  renda: number;

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


