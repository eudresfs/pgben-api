import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { Permission } from './permission.entity';
import { Usuario } from './usuario.entity';

/**
 * Enum que define os tipos de escopo para permissões
 */
export enum TipoEscopo {
  /**
   * Escopo global (acesso a todos os recursos)
   */
  GLOBAL = 'global',

  /**
   * Escopo limitado a uma unidade específica
   */
  UNIDADE = 'unidade',

  /**
   * Escopo limitado ao próprio usuário
   */
  PROPRIO = 'proprio',
}

// Mapeamento para compatibilidade com código existente
export const ScopeType = {
  GLOBAL: TipoEscopo.GLOBAL,
  UNIT: TipoEscopo.UNIDADE,
  SELF: TipoEscopo.PROPRIO,
};

/**
 * Entidade que representa permissões atribuídas diretamente a usuários.
 *
 * Estas permissões podem sobrepor-se às permissões da role do usuário,
 * permitindo conceder ou revogar permissões específicas.
 */
@Entity('usuario_permissao')
@Index(['usuario_id', 'permissao_id'], { unique: true })
@Index(['usuario_id'])
@Index(['permissao_id'])
@Index(['tipo_escopo'])
@Index(['escopo_id'])
@Index(['criado_por'])
@Index(['created_at'])
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
  @IsNotEmpty({ message: 'ID do usuário é obrigatório' })
  @IsUUID('4', { message: 'ID do usuário inválido' })
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
  @IsNotEmpty({ message: 'ID da permissão é obrigatório' })
  @IsUUID('4', { message: 'ID da permissão inválido' })
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
    default: TipoEscopo.GLOBAL,
  })
  @IsEnum(TipoEscopo, { message: 'Tipo de escopo inválido' })
  tipo_escopo: TipoEscopo;

  /**
   * ID do escopo (ex: ID da unidade)
   */
  @Column({ type: 'uuid', nullable: true, name: 'escopo_id' })
  @IsOptional()
  @IsUUID('4', { message: 'ID do escopo inválido' })
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
  @IsOptional()
  @IsUUID('4', { message: 'ID do criador inválido' })
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
  @IsOptional()
  @IsUUID('4', { message: 'ID do atualizador inválido' })
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

  /**
   * Verifica se a permissão foi criada por um usuário específico
   * @param usuarioId ID do usuário
   * @returns true se foi criada pelo usuário
   */
  foiCriadaPor(usuarioId: string): boolean {
    return this.criado_por === usuarioId;
  }

  /**
   * Verifica se a permissão foi atualizada por um usuário específico
   * @param usuarioId ID do usuário
   * @returns true se foi atualizada pelo usuário
   */
  foiAtualizadaPor(usuarioId: string): boolean {
    return this.atualizado_por === usuarioId;
  }

  /**
   * Verifica se a permissão ainda é válida (não expirou)
   * @returns true se ainda é válida
   */
  isValida(): boolean {
    if (!this.valido_ate) return true;
    return new Date() <= this.valido_ate;
  }

  /**
   * Verifica se a permissão expirou
   * @returns true se expirou
   */
  isExpirada(): boolean {
    return !this.isValida();
  }

  /**
   * Verifica se a permissão tem escopo global
   * @returns true se é global
   */
  isGlobal(): boolean {
    return this.tipo_escopo === TipoEscopo.GLOBAL;
  }

  /**
   * Verifica se a permissão tem escopo de unidade
   * @returns true se é por unidade
   */
  isPorUnidade(): boolean {
    return this.tipo_escopo === TipoEscopo.UNIDADE;
  }

  /**
   * Verifica se a permissão tem escopo próprio
   * @returns true se é própria
   */
  isPropria(): boolean {
    return this.tipo_escopo === TipoEscopo.PROPRIO;
  }

  /**
   * Verifica se a permissão pertence a um usuário específico
   * @param usuarioId ID do usuário
   * @returns true se pertence ao usuário
   */
  pertenceAoUsuario(usuarioId: string): boolean {
    return this.usuario_id === usuarioId;
  }

  /**
   * Verifica se a permissão é para uma permissão específica
   * @param permissaoId ID da permissão
   * @returns true se é para a permissão
   */
  isParaPermissao(permissaoId: string): boolean {
    return this.permissao_id === permissaoId;
  }

  /**
   * Verifica se a permissão tem escopo específico
   * @param escopoId ID do escopo
   * @returns true se tem o escopo
   */
  temEscopo(escopoId: string): boolean {
    return this.escopo_id === escopoId;
  }

  /**
   * Define a data de validade da permissão
   * @param data Data de validade
   */
  definirValidade(data: Date): void {
    this.valido_ate = data;
  }

  /**
   * Remove a data de validade (torna permanente)
   */
  tornarPermanente(): void {
    this.valido_ate = null;
  }

  /**
   * Atualiza o usuário que modificou a permissão
   * @param usuarioId ID do usuário
   */
  atualizarPor(usuarioId: string): void {
    this.atualizado_por = usuarioId;
  }

  /**
   * Obtém uma chave única para a permissão
   * @returns chave única baseada em usuário e permissão
   */
  getUniqueKey(): string {
    return `${this.usuario_id}:${this.permissao_id}`;
  }

  /**
   * Obtém o tempo restante até a expiração em dias
   * @returns dias até expiração ou null se permanente
   */
  getDiasAteExpiracao(): number | null {
    if (!this.valido_ate) return null;
    const now = new Date();
    const diffMs = this.valido_ate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  /**
   * Verifica se a permissão expira em breve
   * @param dias Número de dias para considerar "em breve"
   * @returns true se expira em breve
   */
  expiraEmBreve(dias: number = 7): boolean {
    const diasRestantes = this.getDiasAteExpiracao();
    return diasRestantes !== null && diasRestantes <= dias;
  }
}
