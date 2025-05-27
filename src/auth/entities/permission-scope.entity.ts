import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Permission } from './permission.entity';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';
import { TipoEscopo } from './user-permission.entity';

/**
 * Entidade que define regras de escopo padrão para permissões.
 * 
 * Esta entidade permite definir o tipo de escopo padrão para cada permissão,
 * facilitando a atribuição de permissões com escopo adequado.
 */
@Entity('escopo_permissao')
export class PermissionScope {
  /**
   * Identificador único do mapeamento
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Referência à permissão
   */
  @Column({ type: 'uuid', name: 'permissao_id' })
  permissao_id: string;

  /**
   * Relação com a permissão
   */
  @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permissao_id' })
  permissao: Permission;

  /**
   * Tipo de escopo padrão (GLOBAL, UNIDADE, PROPRIO)
   */
  @Column({
    type: 'varchar',
    length: 20,
    name: 'tipo_escopo_padrao',
    default: TipoEscopo.GLOBAL
  })
  tipo_escopo_padrao: TipoEscopo;

  /**
   * Data de criação
   */
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  /**
   * Data de última atualização
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  /**
   * Usuário que criou o mapeamento
   */
  @Column({ type: 'uuid', nullable: true, name: 'criado_por' })
  criado_por: string | null;

  /**
   * Relação com o usuário que criou o mapeamento
   */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'criado_por' })
  usuario_criador: Usuario | null;

  /**
   * Usuário que atualizou o mapeamento por último
   */
  @Column({ type: 'uuid', nullable: true, name: 'atualizado_por' })
  atualizado_por: string | null;

  /**
   * Relação com o usuário que atualizou o mapeamento por último
   */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'atualizado_por' })
  usuario_atualizador: Usuario | null;

  // Getters e setters para compatibilidade com código existente
  get permissionId(): string {
    return this.permissao_id;
  }

  set permissionId(value: string) {
    this.permissao_id = value;
  }

  get permission(): Permission {
    return this.permissao;
  }

  set permission(value: Permission) {
    this.permissao = value;
  }

  get defaultScopeType(): TipoEscopo {
    return this.tipo_escopo_padrao;
  }

  set defaultScopeType(value: TipoEscopo) {
    this.tipo_escopo_padrao = value;
  }

  get createdAt(): Date {
    return this.created_at;
  }

  get updatedAt(): Date {
    return this.updated_at;
  }

  get createdBy(): string | null {
    return this.criado_por;
  }

  set createdBy(value: string | null) {
    this.criado_por = value;
  }

  get creator(): Usuario | null {
    return this.usuario_criador;
  }

  set creator(value: Usuario | null) {
    this.usuario_criador = value;
  }

  get updatedBy(): string | null {
    return this.atualizado_por;
  }

  set updatedBy(value: string | null) {
    this.atualizado_por = value;
  }

  get updater(): Usuario | null {
    return this.usuario_atualizador;
  }

  set updater(value: Usuario | null) {
    this.usuario_atualizador = value;
  }
}
