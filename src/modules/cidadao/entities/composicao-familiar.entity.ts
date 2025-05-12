import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { Cidadao } from './cidadao.entity';

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

  @ManyToOne(() => Cidadao, cidadao => cidadao.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @Column({
    type: 'enum',
    enum: Parentesco,
    default: Parentesco.OUTRO
  })
  @IsNotEmpty({ message: 'Parentesco é obrigatório' })
  parentesco: Parentesco;

  @Column({ type: 'date' })
  @IsNotEmpty({ message: 'Data de nascimento é obrigatória' })
  data_nascimento: Date;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Renda deve ser um número' })
  @Min(0, { message: 'Renda não pode ser negativa' })
  renda: number;

  @Column({ nullable: true })
  @IsOptional()
  cpf: string;

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