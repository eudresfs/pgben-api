import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { IsEmail, IsNotEmpty, IsEnum } from 'class-validator';
import { Setor } from './setor.entity';
import { Usuario } from './usuario.entity';

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
@Index(['nome'])
@Index(['codigo'], { unique: true })
@Index(['tipo'])
@Index(['status'])
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

  @Column({
    type: 'enum',
    enum: TipoUnidade,
    enumName: 'tipo_unidade',
    default: TipoUnidade.CRAS,
  })
  tipo: TipoUnidade;

  @Column({ nullable: true })
  endereco: string;

  @Column({ nullable: true })
  telefone: string;

  @Column({ nullable: true })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @Column({ nullable: true })
  responsavel_matricula: string;

  @Column({
    type: 'enum',
    enum: StatusUnidade,
    enumName: 'status_unidade',
    default: StatusUnidade.ATIVO,
  })
  status: StatusUnidade;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;

  /**
   * Relacionamento com os setores da unidade
   */
  @OneToMany(() => Setor, (setor) => setor.unidade)
  setores: Setor[];

  /**
   * Relacionamento com os usuários da unidade
   */
  @OneToMany(() => Usuario, (usuario) => usuario.unidade)
  usuarios: Usuario[];
}
