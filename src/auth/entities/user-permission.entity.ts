import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Permission } from './permission.entity';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';

/**
 * Enum que define os tipos de escopo para permissões
 */
export enum TipoEscopo {
  /**
   * Escopo global (acesso a todos os recursos)
   */
  GLOBAL = 'GLOBAL',
  
  /**
   * Escopo limitado a uma unidade específica
   */
  UNIDADE = 'UNIDADE',
  
  /**
   * Escopo limitado ao próprio usuário
   */
  PROPRIO = 'PROPRIO'
}

// Mapeamento para compatibilidade com código existente
export const ScopeType = {
  GLOBAL: TipoEscopo.GLOBAL,
  UNIT: TipoEscopo.UNIDADE,
  SELF: TipoEscopo.PROPRIO
};

/**
 * Entidade que representa permissões atribuídas diretamente a usuários.
 * 
 * Estas permissões podem sobrepor-se às permissões da role do usuário,
 * permitindo conceder ou revogar permissões específicas.
 */
@Entity('usuario_permissao')
export class UserPermission {
  /**
   * Identificador único do mapeamento
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Referência ao usuário
   */
  @Column({ type: 'uuid', name: 'usuario_id' })
  usuario_id: string;

  /**
   * Relação com o usuário
   */
  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

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
   * Se a permissão é concedida (true) ou revogada (false)
   */
  @Column({ type: 'boolean', default: true, name: 'concedida' })
  concedida: boolean;

  /**
   * Tipo de escopo (GLOBAL, UNIDADE, PROPRIO)
   */
  @Column({
    type: 'varchar',
    length: 20,
    name: 'tipo_escopo',
    default: TipoEscopo.GLOBAL
  })
  tipo_escopo: TipoEscopo;

  /**
   * ID do escopo (ex: ID da unidade)
   */
  @Column({ type: 'uuid', nullable: true, name: 'escopo_id' })
  escopo_id: string | null;

  /**
   * Data de validade (para permissões temporárias)
   */
  @Column({ type: 'timestamp', nullable: true, name: 'valido_ate' })
  valido_ate: Date | null;

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
  get userId(): string {
    return this.usuario_id;
  }

  set userId(value: string) {
    this.usuario_id = value;
  }

  get user(): Usuario {
    return this.usuario;
  }

  set user(value: Usuario) {
    this.usuario = value;
  }

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

  get granted(): boolean {
    return this.concedida;
  }

  set granted(value: boolean) {
    this.concedida = value;
  }

  get scopeType(): TipoEscopo {
    return this.tipo_escopo;
  }

  set scopeType(value: TipoEscopo) {
    this.tipo_escopo = value;
  }

  get scopeId(): string | null {
    return this.escopo_id;
  }

  set scopeId(value: string | null) {
    this.escopo_id = value;
  }

  get validUntil(): Date | null {
    return this.valido_ate;
  }

  set validUntil(value: Date | null) {
    this.valido_ate = value;
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
