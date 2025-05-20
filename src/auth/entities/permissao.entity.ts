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
import { RolePermissao } from './role-permissao.entity';

/**
 * Entidade de Permissão
 *
 * Representa uma permissão específica no sistema, que pode ser associada a roles.
 * Cada permissão define uma capacidade específica dentro de um módulo.
 */
@Entity('permissao')
@Index(['modulo'])
@Index(['nome'])
export class Permissao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column()
  descricao: string;

  @Column()
  modulo: string;

  @Column()
  acao: string;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;

  /**
   * Relacionamento com as associações entre roles e esta permissão
   */
  @OneToMany(() => RolePermissao, rolePermissao => rolePermissao.permissao)
  rolePermissoes: RolePermissao[];
}
