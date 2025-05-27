import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';

/**
 * Entidade que representa um grupo de permissões no sistema.
 * 
 * Os grupos permitem organizar permissões logicamente (ex: "Gerenciamento de Cidadãos")
 * e facilitar a atribuição de múltiplas permissões relacionadas.
 */
@Entity('grupo_permissao')
export class PermissionGroup {
  /**
   * Identificador único do grupo
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Nome do grupo
   */
  @Column({ type: 'varchar', length: 100, unique: true, name: 'nome' })
  nome: string;

  /**
   * Descrição do grupo
   */
  @Column({ type: 'varchar', length: 255, name: 'descricao' })
  descricao: string;

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
   * Usuário que criou o grupo
   */
  @Column({ type: 'uuid', nullable: true, name: 'criado_por' })
  criado_por: string | null;

  /**
   * Relação com o usuário que criou o grupo
   */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'criado_por' })
  usuario_criador: Usuario | null;

  /**
   * Usuário que atualizou o grupo por último
   */
  @Column({ type: 'uuid', nullable: true, name: 'atualizado_por' })
  atualizado_por: string | null;

  /**
   * Relação com o usuário que atualizou o grupo por último
   */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'atualizado_por' })
  usuario_atualizador: Usuario | null;

  // Getters e setters para compatibilidade com código existente
  get name(): string {
    return this.nome;
  }

  set name(value: string) {
    this.nome = value;
  }

  get description(): string {
    return this.descricao;
  }

  set description(value: string) {
    this.descricao = value;
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
