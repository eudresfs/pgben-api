import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Permission } from './permission.entity';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';

/**
 * Entidade que representa o relacionamento entre roles e permissões.
 * 
 * Esta entidade permite mapear as permissões granulares para as roles existentes,
 * facilitando a transição do modelo baseado em roles para o modelo de permissões granulares.
 */
@Entity('role_permission')
export class RolePermission {
  /**
   * Identificador único do mapeamento
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Referência à role
   */
  @Column({ type: 'uuid', name: 'role_id' })
  roleId: string;

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
