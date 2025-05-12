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

  @Column({ nullable: true })
  sigla: string;

  @Column({
    type: 'enum',
    enum: TipoUnidade,
    default: TipoUnidade.CRAS,
  })
  @IsEnum(TipoUnidade, { message: 'Tipo de unidade inválido' })
  tipo: TipoUnidade;

  @Column('json', { nullable: true })
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };

  @Column({ nullable: true })
  telefone: string;

  @Column({ nullable: true })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @Column({
    type: 'enum',
    enum: StatusUnidade,
    default: StatusUnidade.ATIVO,
  })
  @IsEnum(StatusUnidade, { message: 'Status inválido' })
  status: StatusUnidade;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'removed_at' })
  removedAt: Date;
}
