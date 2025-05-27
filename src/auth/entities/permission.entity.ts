import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';

/**
 * Entidade que representa uma permissão no sistema.
 * 
 * As permissões seguem o formato `modulo.recurso.operacao` e podem ser compostas
 * (ex: `modulo.*` para representar todas as permissões de um módulo).
 */
@Entity('permissao')
export class Permission {
  /**
   * Identificador único da permissão
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Nome da permissão no formato `modulo.recurso.operacao`
   */
  @Column({ type: 'varchar', length: 100, unique: true, name: 'nome' })
  nome: string;

  /**
   * Descrição da permissão
   */
  @Column({ type: 'varchar', length: 255, name: 'descricao' })
  descricao: string;

  /**
   * Módulo ao qual a permissão pertence
   */
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'modulo' })
  modulo: string | null;

  /**
   * Ação permitida pela permissão
   */
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'acao' })
  acao: string | null;
  
  // Propriedade virtual para compatibilidade com código existente
  composta: boolean;

  /**
   * Referência à permissão pai (para permissões compostas)
   */
  @Column({ type: 'uuid', nullable: true, name: 'permissao_pai_id' })
  permissao_pai_id: string | null;

  /**
   * Relação com a permissão pai
   */
  @ManyToOne(() => Permission, { nullable: true })
  @JoinColumn({ name: 'permissao_pai_id' })
  permissao_pai: Permission | null;

  /**
   * Permissões filhas (para permissões compostas)
   */
  @OneToMany(() => Permission, permissao => permissao.permissao_pai)
  permissoes_filhas: Permission[];

  /**
   * Usuário que criou a permissão
   */
  @Column({ type: 'uuid', nullable: true, name: 'criado_por' })
  criado_por: string | null;

  /**
   * Relação com o usuário que criou a permissão
   */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'criado_por' })
  usuario_criador: Usuario | null;

  /**
   * Usuário que atualizou a permissão por último
   */
  @Column({ type: 'uuid', nullable: true, name: 'atualizado_por' })
  atualizado_por: string | null;

  /**
   * Relação com o usuário que atualizou a permissão por último
   */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'atualizado_por' })
  usuario_atualizador: Usuario | null;

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

  get isComposite(): boolean {
    // Determinar se é uma permissão composta pelo nome (contendo '*')
    return this.nome ? this.nome.includes('*') : false;
  }

  set isComposite(value: boolean) {
    // Propriedade virtual apenas para compatibilidade
    this.composta = value;
  }

  get parentId(): string | null {
    return this.permissao_pai_id;
  }

  set parentId(value: string | null) {
    this.permissao_pai_id = value;
  }

  get parent(): Permission | null {
    return this.permissao_pai;
  }

  set parent(value: Permission | null) {
    this.permissao_pai = value;
  }

  get children(): Permission[] {
    return this.permissoes_filhas;
  }

  set children(value: Permission[]) {
    this.permissoes_filhas = value;
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
