import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import {
  IsEmail,
  IsNotEmpty,
  Length,
  IsOptional,
  IsEnum,
  Validate,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CPFValidator } from '../validators/cpf-validator';
import { NISValidator } from '../validators/nis-validator';
import { TelefoneValidator } from '../validators/telefone-validator';
import { PapelCidadao } from './papel-cidadao.entity';
import { ComposicaoFamiliar } from './composicao-familiar.entity';

export enum Sexo {
  MASCULINO = 'MASCULINO',
  FEMININO = 'FEMININO',
  OUTRO = 'OUTRO',
}

@Entity('cidadao')
@Index(['cpf'], { unique: true })
@Index(['nis'], { unique: true, where: 'nis IS NOT NULL' })
@Index(['nome', 'ativo'])
@Index(['created_at', 'ativo'])
export class Cidadao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  nome: string;

  @Column()
  @IsOptional()
  nome_social: string;

  @Column({ unique: true })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @Length(11, 14, { message: 'CPF deve ter entre 11 e 14 caracteres' })
  @Validate(CPFValidator, { message: 'CPF inválido' })
  cpf: string;

  @Column()
  @IsNotEmpty({ message: 'RG é obrigatório' })
  rg: string;

  @Column({ unique: true, nullable: false })
  @Length(11, 11, { message: 'NIS deve ter 11 caracteres' })
  @Validate(NISValidator, { message: 'NIS inválido' })
  nis: string;

  @Column({ unique: true })
  @IsNotEmpty({ message: 'Nome da mãe é obrigatório' })
  @IsString({ message: 'Nome da mãe deve ser uma string' })
  @MinLength(3, { message: 'Nome da mãe deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Nome da mãe deve ter no máximo 100 caracteres' })
  nome_mae: string;

  @Column({ unique: true })
  @IsNotEmpty({ message: 'Naturalidade é obrigatório' })
  naturalidade: string;

  @Column({ nullable: false })
  @IsNotEmpty({ message: 'Prontuario SUAS é obrigatório' })
  prontuario_suas: string;

  @Column({ type: 'date' })
  @IsNotEmpty({ message: 'Data de nascimento é obrigatória' })
  data_nascimento: Date;

  @OneToMany(() => PapelCidadao, (papelCidadao) => papelCidadao.cidadao, {
    eager: true,
  })
  papeis: PapelCidadao[];

  @OneToMany(() => ComposicaoFamiliar, (composicaoFamiliar) => composicaoFamiliar.cidadao, {
    eager: true,
  })
  composicao_familiar: ComposicaoFamiliar[];

  @Column({
    type: 'enum',
    enum: Sexo,
    enumName: 'sexo_enum',
  })
  @IsEnum(Sexo, { message: 'Sexo inválido' })
  @IsNotEmpty({ message: 'Sexo é obrigatório' })
  sexo: Sexo;

  @Column({ nullable: false })
  @IsNotEmpty({ message: 'Telefone é obrigatório' })
  @Validate(TelefoneValidator, { message: 'Telefone inválido' })
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

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
