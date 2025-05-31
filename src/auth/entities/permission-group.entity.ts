import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, Index } from 'typeorm';
import { IsNotEmpty, IsString, Length, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { Status } from '../../shared/enums/status.enum';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';

/**
 * Entidade que representa um grupo de permissões no sistema.
 * 
 * Os grupos permitem organizar permissões logicamente (ex: "Gerenciamento de Cidadãos")
 * e facilitar a atribuição de múltiplas permissões relacionadas.
 */
@Entity('grupo_permissao')
@Index(['nome'], { unique: true })
@Index(['status'])
@Index(['criado_por'])
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
  @IsNotEmpty({ message: 'Nome do grupo é obrigatório' })
  @IsString({ message: 'Nome deve ser uma string' })
  @Length(3, 100, { message: 'Nome deve ter entre 3 e 100 caracteres' })
  nome: string;

  /**
   * Descrição do grupo
   */
  @Column({ type: 'varchar', length: 255, name: 'descricao' })
  @IsNotEmpty({ message: 'Descrição do grupo é obrigatória' })
  @IsString({ message: 'Descrição deve ser uma string' })
  @Length(5, 255, { message: 'Descrição deve ter entre 5 e 255 caracteres' })
  descricao: string;

  /**
   * Status do grupo (ativo/inativo)
   */
  @Column({ 
    type: 'enum', 
    enum: Status, 
    default: Status.ATIVO,
    name: 'status'
  })
  @IsEnum(Status, { message: 'Status deve ser ATIVO ou INATIVO' })
  status: Status;

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
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário criador inválido' })
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
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário atualizador inválido' })
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

  // Métodos utilitários para gerenciar status
  /**
   * Verifica se o grupo está ativo
   */
  isAtivo(): boolean {
    return this.status === Status.ATIVO;
  }

  /**
   * Ativa o grupo
   */
  ativar(): void {
    this.status = Status.ATIVO;
  }

  /**
   * Desativa o grupo
   */
  desativar(): void {
    this.status = Status.INATIVO;
  }

  /**
   * Verifica se o grupo pode ser deletado
   * (implementar lógica específica conforme regras de negócio)
   */
  podeSerDeletado(): boolean {
    // Por enquanto, permite deletar apenas grupos inativos
    return this.status === Status.INATIVO;
  }

  /**
   * Atualiza o usuário que modificou o grupo
   */
  atualizarPor(usuarioId: string): void {
    this.atualizado_por = usuarioId;
  }

  /**
   * Verifica se o grupo foi criado por um usuário específico
   */
  foiCriadoPor(usuarioId: string): boolean {
    return this.criado_por === usuarioId;
  }

  /**
   * Verifica se o grupo foi atualizado por um usuário específico
   */
  foiAtualizadoPor(usuarioId: string): boolean {
    return this.atualizado_por === usuarioId;
  }

  /**
   * Gera uma chave única para o grupo
   */
  getUniqueKey(): string {
    return `permission_group_${this.nome}_${this.id}`;
  }

  /**
   * Verifica se o grupo tem um nome válido
   */
  hasValidName(): boolean {
    return !!this.nome && this.nome.trim().length >= 3;
  }

  /**
   * Verifica se o grupo está em um estado válido
   */
  isValid(): boolean {
    return (
      this.hasValidName() &&
      !!this.descricao &&
      this.descricao.trim().length >= 5 &&
      Object.values(Status).includes(this.status)
    );
  }

  /**
   * Obtém informações resumidas do grupo
   */
  getSummary(): { id: string; nome: string; descricao: string; status: Status; ativo: boolean } {
    return {
      id: this.id,
      nome: this.nome,
      descricao: this.descricao,
      status: this.status,
      ativo: this.isAtivo()
    };
  }

  /**
   * Verifica se o grupo foi criado recentemente (últimas 24 horas)
   */
  isCriadoRecentemente(): boolean {
    if (!this.created_at) return false;
    
    const agora = new Date();
    const umDiaAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
    
    return this.created_at > umDiaAtras;
  }

  /**
   * Verifica se o grupo foi atualizado recentemente (últimas 24 horas)
   */
  isAtualizadoRecentemente(): boolean {
    if (!this.updated_at) return false;
    
    const agora = new Date();
    const umDiaAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
    
    return this.updated_at > umDiaAtras;
  }

  /**
   * Calcula a idade do grupo em dias
   */
  getIdadeEmDias(): number {
    if (!this.created_at) return 0;
    
    const agora = new Date();
    const diffTime = Math.abs(agora.getTime() - this.created_at.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Verifica se o grupo tem criador definido
   */
  temCriador(): boolean {
    return !!this.criado_por;
  }

  /**
   * Verifica se o grupo tem atualizador definido
   */
  temAtualizador(): boolean {
    return !!this.atualizado_por;
  }

  /**
   * Define o criador do grupo
   */
  definirCriador(usuarioId: string): void {
    this.criado_por = usuarioId;
  }

  /**
   * Obtém uma descrição formatada do grupo
   */
  getDescricaoFormatada(): string {
    const statusText = this.isAtivo() ? 'Ativo' : 'Inativo';
    return `${this.nome} (${statusText}) - ${this.descricao}`;
  }

  /**
   * Verifica se o grupo pode ser editado
   */
  podeSerEditado(): boolean {
    // Grupos ativos podem ser editados
    return this.isAtivo();
  }

  /**
   * Verifica se o nome do grupo é único (para validação)
   */
  isNomeUnico(outrosGrupos: PermissionGroup[]): boolean {
    return !outrosGrupos.some(grupo => 
      grupo.id !== this.id && 
      grupo.nome.toLowerCase() === this.nome.toLowerCase()
    );
  }

  /**
   * Clona o grupo (sem ID e datas)
   */
  clone(): Partial<PermissionGroup> {
    return {
      nome: `${this.nome} (Cópia)`,
      descricao: this.descricao,
      status: this.status,
      criado_por: this.criado_por
    };
  }
}
