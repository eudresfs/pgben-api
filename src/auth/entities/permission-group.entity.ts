import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';

/**
 * Entidade que representa um grupo de permissões no sistema.
 * 
 * Os grupos permitem organizar permissões logicamente (ex: "Gerenciamento de Cidadãos")
 * e facilitar a atribuição de múltiplas permissões relacionadas.
 */
@Entity('permission_group')
export class PermissionGroup {
  /**
   * Identificador único do grupo
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Nome do grupo
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  /**
   * Descrição do grupo
   */
  @Column({ type: 'varchar', length: 255 })
  description: string;

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
   * Usuário que criou o grupo
   */
  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy: string | null;

  /**
   * Relação com o usuário que criou o grupo
   */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: Usuario | null;

  /**
   * Usuário que atualizou o grupo por último
   */
  @Column({ type: 'uuid', nullable: true, name: 'updated_by' })
  updatedBy: string | null;

  /**
   * Relação com o usuário que atualizou o grupo por último
   */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater: Usuario | null;
}
