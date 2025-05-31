import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Index } from 'typeorm';
import { IsNotEmpty, IsUUID, IsOptional } from 'class-validator';
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
@Index(['permissao_id', 'grupo_id'], { unique: true })
@Index(['permissao_id'])
@Index(['grupo_id'])
@Index(['criado_por'])
@Index(['created_at'])
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
   * Referência ao grupo
   */
  @Column({ type: 'uuid', name: 'grupo_id' })
  @IsNotEmpty({ message: 'ID do grupo é obrigatório' })
  @IsUUID('4', { message: 'ID do grupo inválido' })
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
  @IsOptional()
  @IsUUID('4', { message: 'ID do criador inválido' })
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

  /**
   * Verifica se o mapeamento foi criado por um usuário específico
   * @param usuarioId ID do usuário
   * @returns true se foi criado pelo usuário
   */
  foiCriadoPor(usuarioId: string): boolean {
    return this.criado_por === usuarioId;
  }

  /**
   * Obtém uma chave única para o mapeamento
   * @returns chave única baseada em permissão e grupo
   */
  getUniqueKey(): string {
    return `${this.permissao_id}:${this.grupo_id}`;
  }

  /**
   * Verifica se o mapeamento é válido
   * @returns true se tem permissão e grupo válidos
   */
  isValido(): boolean {
    return !!(this.permissao_id && this.grupo_id);
  }

  /**
   * Define o criador do mapeamento
   * @param usuarioId ID do usuário criador
   */
  definirCriador(usuarioId: string): void {
    this.criado_por = usuarioId;
  }

  /**
   * Verifica se o mapeamento pertence a um grupo específico
   * @param grupoId ID do grupo
   * @returns true se pertence ao grupo
   */
  pertenceAoGrupo(grupoId: string): boolean {
    return this.grupo_id === grupoId;
  }

  /**
   * Verifica se o mapeamento contém uma permissão específica
   * @param permissaoId ID da permissão
   * @returns true se contém a permissão
   */
  contemPermissao(permissaoId: string): boolean {
    return this.permissao_id === permissaoId;
  }

  /**
   * Verifica se o mapeamento foi criado recentemente (últimas 24 horas)
   * @returns true se foi criado recentemente
   */
  isCriadoRecentemente(): boolean {
    if (!this.created_at) return false;
    
    const agora = new Date();
    const umDiaAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
    
    return this.created_at > umDiaAtras;
  }

  /**
   * Calcula a idade do mapeamento em dias
   * @returns idade em dias
   */
  getIdadeEmDias(): number {
    if (!this.created_at) return 0;
    
    const agora = new Date();
    const diffTime = Math.abs(agora.getTime() - this.created_at.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Verifica se o mapeamento tem criador definido
   * @returns true se tem criador
   */
  temCriador(): boolean {
    return !!this.criado_por;
  }

  /**
   * Obtém informações resumidas do mapeamento
   * @returns objeto com informações resumidas
   */
  getSummary(): {
    id: string;
    permissao_id: string;
    grupo_id: string;
    criado_por: string | null;
    created_at: Date;
    idadeEmDias: number;
    permissaoNome?: string;
    grupoNome?: string;
  } {
    return {
      id: this.id,
      permissao_id: this.permissao_id,
      grupo_id: this.grupo_id,
      criado_por: this.criado_por,
      created_at: this.created_at,
      idadeEmDias: this.getIdadeEmDias(),
      permissaoNome: this.permissao?.nome,
      grupoNome: this.grupo?.nome
    };
  }

  /**
   * Verifica se o mapeamento é compatível com outro mapeamento
   * @param otherMapping Outro mapeamento
   * @returns true se são compatíveis (mesmo grupo)
   */
  isCompatibleWith(otherMapping: PermissionGroupMapping): boolean {
    return this.grupo_id === otherMapping.grupo_id;
  }

  /**
   * Gera uma chave única estendida para o mapeamento
   * @returns chave única estendida
   */
  getExtendedUniqueKey(): string {
    return `permission_group_mapping_${this.permissao_id}_${this.grupo_id}_${this.id}`;
  }

  /**
   * Verifica se o mapeamento está em estado consistente
   * @returns true se está consistente
   */
  isConsistente(): boolean {
    return (
      !!this.id &&
      !!this.permissao_id &&
      !!this.grupo_id &&
      !!this.created_at
    );
  }

  /**
   * Obtém uma descrição legível do mapeamento
   * @returns descrição formatada
   */
  getDescricao(): string {
    const permissaoNome = this.permissao?.nome || 'Permissão não carregada';
    const grupoNome = this.grupo?.nome || 'Grupo não carregado';
    return `Grupo "${grupoNome}" -> Permissão: ${permissaoNome}`;
  }

  /**
   * Verifica se o mapeamento pode ser removido
   * @returns true se pode ser removido
   */
  podeSerRemovido(): boolean {
    // Por padrão, todos os mapeamentos podem ser removidos
    // Esta lógica pode ser expandida conforme regras de negócio
    return true;
  }

  /**
   * Clona o mapeamento (sem ID e data)
   * @returns mapeamento clonado
   */
  clone(): Partial<PermissionGroupMapping> {
    return {
      permissao_id: this.permissao_id,
      grupo_id: this.grupo_id,
      criado_por: this.criado_por
    };
  }

  /**
   * Verifica se o mapeamento é para uma permissão de administrador
   * @returns true se é permissão de admin
   */
  isAdminPermission(): boolean {
    return this.permissao?.isAdminPermission() || false;
  }

  /**
   * Verifica se o mapeamento é para uma permissão de sistema
   * @returns true se é permissão de sistema
   */
  isSystemPermission(): boolean {
    return this.permissao?.isSystemPermission() || false;
  }

  /**
   * Obtém o nível de criticidade baseado na permissão
   * @returns nível de criticidade
   */
  getCriticalityLevel(): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    return this.permissao?.getCriticalityLevel() || 'LOW';
  }

  /**
   * Verifica se o grupo está ativo
   * @returns true se o grupo está ativo
   */
  isGrupoAtivo(): boolean {
    return this.grupo?.isAtivo() || false;
  }

  /**
   * Verifica se a permissão está ativa
   * @returns true se a permissão está ativa
   */
  isPermissaoAtiva(): boolean {
    return this.permissao?.isAtiva() || false;
  }

  /**
   * Verifica se tanto o grupo quanto a permissão estão ativos
   * @returns true se ambos estão ativos
   */
  isAtivo(): boolean {
    return this.isGrupoAtivo() && this.isPermissaoAtiva();
  }

  /**
   * Formata a data de criação para exibição
   * @returns data formatada
   */
  getCriacaoFormatada(): string {
    return this.created_at.toLocaleString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Remove informações sensíveis para logs
   * @returns objeto sanitizado
   */
  toSafeLog(): {
    id: string;
    permissao_id: string;
    grupo_id: string;
    criado_por: string | null;
    created_at: Date;
    isAtivo: boolean;
    criticalityLevel: string;
  } {
    return {
      id: this.id,
      permissao_id: this.permissao_id,
      grupo_id: this.grupo_id,
      criado_por: this.criado_por,
      created_at: this.created_at,
      isAtivo: this.isAtivo(),
      criticalityLevel: this.getCriticalityLevel()
    };
  }
}