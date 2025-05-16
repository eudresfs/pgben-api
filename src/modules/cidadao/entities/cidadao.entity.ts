import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany
} from 'typeorm';
import { IsEmail, IsNotEmpty, Length, IsOptional, IsEnum, Validate } from 'class-validator';
import { CPFValidator } from '../validators/cpf-validator';
import { NISValidator } from '../validators/nis-validator';
import { PapelCidadao } from './papel-cidadao.entity';

export enum Sexo {
  MASCULINO = 'masculino',
  FEMININO = 'feminino',
  OUTRO = 'outro',
}

@Entity('cidadao')
@Index(['cpf'], { unique: true })
@Index(['nis'], { unique: true, where: "nis IS NOT NULL" })
@Index(['nome', 'ativo'])
@Index(['created_at', 'ativo'])
export class Cidadao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @Column({ unique: true })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @Length(11, 14, { message: 'CPF deve ter entre 11 e 14 caracteres' })
  @Validate(CPFValidator, { message: 'CPF inválido' })
  cpf: string;

  @Column()
  @IsNotEmpty({ message: 'RG é obrigatório' })
  rg: string;

  @Column({ type: 'date' })
  @IsNotEmpty({ message: 'Data de nascimento é obrigatória' })
  data_nascimento: Date;

  @OneToMany(() => PapelCidadao, papelCidadao => papelCidadao.cidadao, { eager: true })
  papeis: PapelCidadao[];

  @Column({
    type: 'enum',
    enum: Sexo,
  })
  @IsEnum(Sexo, { message: 'Sexo inválido' })
  @IsNotEmpty({ message: 'Sexo é obrigatório' })
  sexo: Sexo;

  @Column({ nullable: true, unique: true })
  @IsOptional()
  @Length(11, 11, { message: 'NIS deve ter 11 caracteres' })
  @Validate(NISValidator, { message: 'NIS inválido' })
  nis: string;

  @Column({ nullable: true })
  @IsOptional()
  telefone: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @Column('jsonb')
  @IsNotEmpty({ message: 'Endereço é obrigatório' })
  @Index()
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  renda: number;

  @Column('jsonb', { nullable: true })
  @IsOptional()
  @Index()
  composicao_familiar: {
    nome: string;
    parentesco: string;
    data_nascimento: Date;
    renda?: number;
  }[];

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}