import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../../auth/enums/role.enum';

/**
 * Entidade de usuário
 * 
 * Representa um usuário do sistema com suas informações básicas e permissões
 */
@Entity('usuario')
export class Usuario {
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
    default: Role.TECNICO_UNIDADE,
  })
  role: Role;

  @Column({ name: 'unidade_id', nullable: true })
  unidadeId: string;

  @Column({ name: 'setor_id', nullable: true })
  setorId: string;

  @Column({
    type: 'enum',
    enum: ['ativo', 'inativo'],
    default: 'ativo',
  })
  status: string;

  @Column({ name: 'primeiro_acesso', default: true })
  primeiro_acesso: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
