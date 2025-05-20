import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Permissao } from './permissao.entity';
import { Role } from '../../shared/enums/role.enum';

/**
 * Entidade de Associação entre Role e Permissão
 *
 * Representa a relação entre uma role (cargo/perfil) e uma permissão específica.
 * Permite definir quais permissões estão associadas a cada papel no sistema.
 */
@Entity('role_permissao')
@Index(['role'])
@Index(['permissao_id'])
export class RolePermissao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: Role,
    enumName: 'role',
  })
  role: Role;

  @Column({ name: 'permissao_id' })
  permissao_id: string;

  @ManyToOne(() => Permissao, permissao => permissao.rolePermissoes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'permissao_id' })
  permissao: Permissao;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
