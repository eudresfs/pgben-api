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
import { IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
import { Permission } from './permission.entity';
import { Usuario } from './usuario.entity';

/**
 * Entidade que representa o relacionamento entre roles e permissões.
 *
 * Esta entidade permite mapear as permissões granulares para as roles existentes,
 * facilitando a transição do modelo baseado em roles para o modelo de permissões granulares.
 */
@Entity('role_permissao')
@Index(['role_id'])
@Index(['permissao_id'])
@Index(['role_id', 'permissao_id'], { unique: true })
@Index(['criado_por'])
export class RolePermission {
  /**
   * Identificador único do mapeamento
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Referência à role
   */
  @Column({ type: 'uuid', name: 'role_id' })
  @IsNotEmpty({ message: 'ID da role é obrigatório' })
  @IsUUID('4', { message: 'ID da role inválido' })
  role_id: string;

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
   * Data de criação
   */
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  /**
   * Data de atualização
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  /**
   * Usuário que criou o mapeamento
   */
  @Column({ type: 'uuid', nullable: true, name: 'criado_por' })
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário criador inválido' })
  criado_por: string | null;

  /**
   * Relação com o usuário que criou o mapeamento
   */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'criado_por' })
  usuario_criador: Usuario | null;

  // Getters e setters para compatibilidade com código existente
  get roleId(): string {
    return this.role_id;
  }

  set roleId(value: string) {
    this.role_id = value;
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

  // Métodos utilitários
  /**
   * Verifica se o mapeamento foi criado por um usuário específico
   */
  foiCriadoPor(usuarioId: string): boolean {
    return this.criado_por === usuarioId;
  }

  /**
   * Cria uma chave única para o mapeamento
   */
  getUniqueKey(): string {
    return `${this.role_id}-${this.permissao_id}`;
  }

  /**
   * Verifica se o mapeamento é válido
   */
  isValido(): boolean {
    return !!(this.role_id && this.permissao_id);
  }

  /**
   * Define o criador do mapeamento
   */
  definirCriador(usuarioId: string): void {
    this.criado_por = usuarioId;
  }

  /**
   * Verifica se o mapeamento pertence a uma role específica
   */
  pertenceARole(roleId: string): boolean {
    return this.role_id === roleId;
  }

  /**
   * Verifica se o mapeamento contém uma permissão específica
   */
  contemPermissao(permissaoId: string): boolean {
    return this.permissao_id === permissaoId;
  }

  /**
   * Verifica se o mapeamento foi criado recentemente (últimas 24 horas)
   */
  isCriadoRecentemente(): boolean {
    if (!this.created_at) {return false;}

    const agora = new Date();
    const umDiaAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);

    return this.created_at > umDiaAtras;
  }

  /**
   * Calcula a idade do mapeamento em dias
   */
  getIdadeEmDias(): number {
    if (!this.created_at) {return 0;}

    const agora = new Date();
    const diffTime = Math.abs(agora.getTime() - this.created_at.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Verifica se o mapeamento tem criador definido
   */
  temCriador(): boolean {
    return !!this.criado_por;
  }

  /**
   * Obtém informações resumidas do mapeamento
   */
  getSummary(): {
    id: string;
    role_id: string;
    permissao_id: string;
    criado_por: string | null;
    created_at: Date;
    idadeEmDias: number;
  } {
    return {
      id: this.id,
      role_id: this.role_id,
      permissao_id: this.permissao_id,
      criado_por: this.criado_por,
      created_at: this.created_at,
      idadeEmDias: this.getIdadeEmDias(),
    };
  }

  /**
   * Verifica se o mapeamento é compatível com outro mapeamento
   */
  isCompatibleWith(otherMapping: RolePermission): boolean {
    // Mapeamentos são compatíveis se pertencem à mesma role
    return this.role_id === otherMapping.role_id;
  }

  /**
   * Gera uma chave única mais robusta para o mapeamento
   */
  getExtendedUniqueKey(): string {
    return `role_permission_${this.role_id}_${this.permissao_id}_${this.id}`;
  }

  /**
   * Verifica se o mapeamento está em estado consistente
   */
  isConsistente(): boolean {
    return (
      !!this.id && !!this.role_id && !!this.permissao_id && !!this.created_at
    );
  }

  /**
   * Obtém uma descrição legível do mapeamento
   */
  getDescricao(): string {
    const permissaoNome = this.permissao?.nome || 'Permissão não carregada';
    return `Role ${this.role_id} -> Permissão: ${permissaoNome}`;
  }

  /**
   * Verifica se o mapeamento pode ser removido
   */
  podeSerRemovido(): boolean {
    // Por padrão, todos os mapeamentos podem ser removidos
    // Esta lógica pode ser expandida conforme regras de negócio
    return true;
  }

  /**
   * Clona o mapeamento (sem ID e datas)
   */
  clone(): Partial<RolePermission> {
    return {
      role_id: this.role_id,
      permissao_id: this.permissao_id,
      criado_por: this.criado_por,
    };
  }

  /**
   * Verifica se o mapeamento é para uma permissão de administrador
   */
  isAdminPermission(): boolean {
    return this.permissao?.isAdminPermission() || false;
  }

  /**
   * Verifica se o mapeamento é para uma permissão de sistema
   */
  isSystemPermission(): boolean {
    return this.permissao?.isSystemPermission() || false;
  }

  /**
   * Obtém o nível de criticidade do mapeamento baseado na permissão
   */
  getCriticalityLevel(): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    return this.permissao?.getCriticalityLevel() || 'LOW';
  }

  /**
   * Formata a data de criação para exibição
   */
  getCriacaoFormatada(): string {
    return this.created_at.toLocaleString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
