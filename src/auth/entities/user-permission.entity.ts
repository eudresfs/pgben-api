import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Permission } from './permission.entity';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';

/**
 * Enum que define os tipos de escopo para permissões
 */
export enum ScopeType {
  /**
   * Escopo global (acesso a todos os recursos)
   */
  GLOBAL = 'GLOBAL',
  
  /**
   * Escopo limitado a uma unidade específica
   */
  UNIT = 'UNIT',
  
  /**
   * Escopo limitado ao próprio usuário
   */
  SELF = 'SELF'
}

/**
 * Entidade que representa permissões atribuídas diretamente a usuários.
 * 
 * Estas permissões podem sobrepor-se às permissões da role do usuário,
 * permitindo conceder ou revogar permissões específicas.
 */
@Entity('user_permission')
export class UserPermission {
  /**
   * Identificador único do mapeamento
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Referência ao usuário
   */
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  /**
   * Relação com o usuário
   */
  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Usuario;

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
   * Se a permissão é concedida (true) ou revogada (false)
   */
  @Column({ type: 'boolean', default: true })
  granted: boolean;

  /**
   * Tipo de escopo (GLOBAL, UNIT, SELF)
   */
  @Column({
    type: 'varchar',
    length: 20,
    name: 'scope_type',
    default: ScopeType.GLOBAL
  })
  scopeType: ScopeType;

  /**
   * ID do escopo (ex: ID da unidade)
   */
  @Column({ type: 'uuid', nullable: true, name: 'scope_id' })
  scopeId: string | null;

  /**
   * Data de validade (para permissões temporárias)
   */
  @Column({ type: 'timestamp', nullable: true, name: 'valid_until' })
  validUntil: Date | null;

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
