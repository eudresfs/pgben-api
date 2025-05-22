import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Permission } from './permission.entity';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';
import { ScopeType } from './user-permission.entity';

/**
 * Entidade que define regras de escopo padrão para permissões.
 * 
 * Esta entidade permite definir o tipo de escopo padrão para cada permissão,
 * facilitando a atribuição de permissões com escopo adequado.
 */
@Entity('permission_scope')
export class PermissionScope {
  /**
   * Identificador único do mapeamento
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Referência à permissão
   */
  @Column({ type: 'uuid', name: 'permission_id' })
  permissionId: string;

  /**
   * Relação com a permissão
   */
  @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;

  /**
   * Tipo de escopo padrão (GLOBAL, UNIT, SELF)
   */
  @Column({
    type: 'varchar',
    length: 20,
    name: 'default_scope_type',
    default: ScopeType.GLOBAL
  })
  defaultScopeType: ScopeType;

  /**
   * Data de criação
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Data de última atualização
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Usuário que criou o mapeamento
   */
  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy: string | null;

  /**
   * Relação com o usuário que criou o mapeamento
   */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: Usuario | null;

  /**
   * Usuário que atualizou o mapeamento por último
   */
  @Column({ type: 'uuid', nullable: true, name: 'updated_by' })
  updatedBy: string | null;

  /**
   * Relação com o usuário que atualizou o mapeamento por último
   */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater: Usuario | null;
}
