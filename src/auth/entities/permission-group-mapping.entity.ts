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
@Entity('mapeamento_grupo_permissao')
export class PermissionGroupMapping {
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
   * Referência ao grupo
   */
  @Column({ type: 'uuid', name: 'grupo_id' })
  grupo_id: string;

  /**
   * Relação com o grupo
   */
  @ManyToOne(() => PermissionGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'grupo_id' })
  grupo: PermissionGroup;

  /**
   * Data de criação
   */
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

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

  get groupId(): string {
    return this.grupo_id;
  }

  set groupId(value: string) {
    this.grupo_id = value;
  }

  get group(): PermissionGroup {
    return this.grupo;
  }

  set group(value: PermissionGroup) {
    this.grupo = value;
  }

  get createdAt(): Date {
    return this.created_at;
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
}
