import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Usuario } from './usuario.entity';

/**
 * Entidade de Role (Papel)
 *
 * Representa um papel/função que um usuário pode ter no sistema,
 * substituindo o antigo enum Role. Esta entidade permite relacionamentos
 * com permissões e outros recursos do sistema.
 */
@Entity('role')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  nome: string;

  @Column({ nullable: true })
  descricao: string;

  @Column({ default: true })
  ativo: boolean;

  @OneToMany(() => Usuario, (usuario) => usuario.role)
  usuarios: Usuario[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
