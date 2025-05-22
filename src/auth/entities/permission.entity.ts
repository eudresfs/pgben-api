import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';

/**
 * Entidade que representa uma permissão no sistema.
 * 
 * As permissões seguem o formato `modulo.recurso.operacao` e podem ser compostas
 * (ex: `modulo.*` para representar todas as permissões de um módulo).
 */
@Entity('permission')
export class Permission {
  /**
   * Identificador único da permissão
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Nome da permissão no formato `modulo.recurso.operacao`
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  /**
   * Descrição da permissão
   */
  @Column({ type: 'varchar', length: 255 })
  description: string;

  /**
   * Indica se é uma permissão composta (ex: `modulo.*`)
   */
  @Column({ type: 'boolean', default: false, name: 'is_composite' })
  isComposite: boolean;

  /**
   * Referência à permissão pai (para permissões compostas)
   */
  @Column({ type: 'uuid', nullable: true, name: 'parent_id' })
  parentId: string | null;

  /**
   * Relação com a permissão pai
   */
  @ManyToOne(() => Permission, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Permission | null;

  /**
   * Permissões filhas (para permissões compostas)
   */
  @OneToMany(() => Permission, permission => permission.parent)
  children: Permission[];

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
   * Usuário que criou a permissão
   */
  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy: string | null;

  /**
   * Relação com o usuário que criou a permissão
   */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: Usuario | null;

  /**
   * Usuário que atualizou a permissão por último
   */
  @Column({ type: 'uuid', nullable: true, name: 'updated_by' })
  updatedBy: string | null;

  /**
   * Relação com o usuário que atualizou a permissão por último
   */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater: Usuario | null;
}
