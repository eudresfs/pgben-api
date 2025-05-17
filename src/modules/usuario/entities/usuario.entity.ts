import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../../../shared/enums/role.enum';
import { RefreshToken } from '../../../auth/entities/refresh-token.entity';
import { Unidade } from '../../unidade/entities/unidade.entity';
import { Setor } from '../../unidade/entities/setor.entity';

/**
 * Entidade de usuário
 *
 * Representa um usuário do sistema com suas informações básicas e permissões
 */
@Entity('usuario')
@Index(['email'], { unique: true })
@Index(['cpf'], { unique: true })
@Index(['matricula'], { unique: true })
@Index(['unidadeId'])
@Index(['setorId'])
@Index(['role'])
@Index(['status'])
export class Usuario {
  [x: string]: any;
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'senha_hash' })
  @Exclude()
  senhaHash: string;

  @Column({ unique: true, nullable: true })
  cpf: string;

  @Column({ nullable: true })
  telefone: string;

  @Column({ unique: true, nullable: true })
  matricula: string;

  @Column({
    type: 'enum',
    enum: Role,
    enumName: 'role',
    default: Role.TECNICO_UNIDADE,
  })
  role: Role;

  @Column({ name: 'unidade_id', nullable: true })
  unidadeId: string;

  @ManyToOne(() => Unidade, (unidade) => unidade.usuarios)
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @Column({ name: 'setor_id', nullable: true })
  setorId: string;

  @ManyToOne(() => Setor, (setor) => setor.usuarios)
  @JoinColumn({ name: 'setor_id' })
  setor: Setor;

  @Column({
    type: 'enum',
    enum: ['ativo', 'inativo'],
    default: 'ativo',
  })
  status: string;

  @Column({ name: 'primeiro_acesso', default: true })
  primeiro_acesso: boolean;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.usuario)
  refreshTokens: RefreshToken[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
