import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Permission } from './permission.entity';
import { PermissionGroup } from './permission-group.entity';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';

/**
 * Entidade que representa o relacionamento muitos-para-muitos entre permissões e grupos.
 * 
 * Esta entidade permite associar permissões a grupos, facilitando a organização
 * e atribuição de permissões relacionadas.
 */
@Entity('permission_group_mapping')
export class PermissionGroupMapping {
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
   * Referência ao grupo
   */
  @Column({ type: 'uuid', name: 'group_id' })
  groupId: string;

  /**
   * Relação com o grupo
   */
  @ManyToOne(() => PermissionGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: PermissionGroup;

  /**
   * Data de criação
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

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
}
