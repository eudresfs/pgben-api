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

  // Nota: As propriedades e relacionamentos hierárquicos foram removidos
  // pois não existem no banco de dados.

  // Nota: As colunas criado_por e atualizado_por foram removidas 
  // pois não existem no banco de dados atual.

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

  // Getters e setters para hierarquia foram removidos pois não existem no banco de dados
  // Método para determinar se é uma permissão composta pelo nome
  isHierarchical(): boolean {
    return this.nome ? this.nome.includes('.*') : false;
  }
  
  // Método para obter o módulo de uma permissão pelo nome
  getModule(): string {
    if (!this.nome) {return '';}
    const parts = this.nome.split('.');
    return parts.length > 0 ? parts[0] : '';
  }
  
  // Método para verificar se uma permissão é parte de um módulo
  isPartOfModule(moduleName: string): boolean {
    return this.nome ? this.nome.startsWith(`${moduleName}.`) : false;
  }

  get createdAt(): Date {
    return this.created_at;
  }

  get updatedAt(): Date {
    return this.updated_at;
  }

  // Métodos getters e setters para criado_por e atualizado_por foram removidos
  // pois as colunas não existem no banco de dados atual.
}
