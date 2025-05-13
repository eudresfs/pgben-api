import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { IsEmail, IsNotEmpty, IsEnum } from 'class-validator';

export enum TipoUnidade {
  CRAS = 'cras',
  CREAS = 'creas',
  CENTRO_POP = 'centro_pop',
  SEMTAS = 'semtas',
  OUTRO = 'outro',
}

export enum StatusUnidade {
  ATIVO = 'ativo',
  INATIVO = 'inativo',
}

@Entity('unidade')
export class Unidade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @Column({ unique: true })
  @IsNotEmpty({ message: 'Código é obrigatório' })
  codigo: string;

  @Column({ nullable: true })
  sigla: string;

  @Column({ nullable: true, default: 'cras' })
  tipo: string;

  @Column({ nullable: true })
  tipo_unidade: string;

  @Column({ nullable: true })
  endereco: string;

  @Column({ nullable: true })
  telefone: string;

  @Column({ nullable: true })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @Column({ nullable: true })
  responsavel: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
