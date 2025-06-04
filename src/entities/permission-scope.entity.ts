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
import { IsNotEmpty, IsUUID, IsEnum, IsOptional } from 'class-validator';
import { Permission } from './permission.entity';
import { Usuario } from './usuario.entity';
import { TipoEscopo } from './user-permission.entity';

/**
 * Entidade que define regras de escopo padrão para permissões.
 *
 * Esta entidade permite definir o tipo de escopo padrão para cada permissão,
 * facilitando a atribuição de permissões com escopo adequado.
 */
@Entity('escopo_permissao')
@Index(['permissao_id'], { unique: true })
@Index(['tipo_escopo_padrao'])
@Index(['criado_por'])
@Index(['created_at'])
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
   * Tipo de escopo padrão (GLOBAL, UNIDADE, PROPRIO)
   */
  @Column({
    type: 'enum',
    enum: ['GLOBAL', 'UNIDADE', 'PROPRIO'],
    default: 'PROPRIO',
  })
  @IsEnum(['GLOBAL', 'UNIDADE', 'PROPRIO'], {
    message: 'Tipo de escopo deve ser GLOBAL, UNIDADE ou PROPRIO',
  })
  tipo_escopo_padrao: 'GLOBAL' | 'UNIDADE' | 'PROPRIO';

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
  criado_por?: string;

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

  get defaultScopeType(): 'GLOBAL' | 'UNIDADE' | 'PROPRIO' {
    return this.tipo_escopo_padrao;
  }

  set defaultScopeType(value: 'GLOBAL' | 'UNIDADE' | 'PROPRIO') {
    this.tipo_escopo_padrao = value;
  }

  get createdAt(): Date {
    return this.created_at;
  }

  get updatedAt(): Date {
    return this.updated_at;
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
   * Verifica se o escopo foi criado por um usuário específico
   * @param usuarioId ID do usuário
   * @returns true se foi criado pelo usuário
   */
  foiCriadoPor(usuarioId: string): boolean {
    return this.criado_por === usuarioId;
  }

  /**
   * Verifica se o escopo foi atualizado por um usuário específico
   * @param usuarioId ID do usuário
   * @returns true se foi atualizado pelo usuário
   */
  foiAtualizadoPor(usuarioId: string): boolean {
    return this.atualizado_por === usuarioId;
  }

  /**
   * Verifica se o escopo é global
   * @returns true se o escopo é global
   */
  isGlobal(): boolean {
    return this.tipo_escopo_padrao === 'GLOBAL';
  }

  /**
   * Verifica se o escopo é por unidade
   * @returns true se o escopo é por unidade
   */
  isPorUnidade(): boolean {
    return this.tipo_escopo_padrao === 'UNIDADE';
  }

  /**
   * Verifica se o escopo é próprio
   * @returns true se o escopo é próprio
   */
  isProprio(): boolean {
    return this.tipo_escopo_padrao === 'PROPRIO';
  }

  /**
   * Define o tipo de escopo padrão
   * @param tipo Tipo de escopo
   */
  definirTipoEscopo(tipo: 'GLOBAL' | 'UNIDADE' | 'PROPRIO'): void {
    this.tipo_escopo_padrao = tipo;
  }

  /**
   * Atualiza o usuário que modificou o escopo
   * @param usuarioId ID do usuário
   */
  atualizarPor(usuarioId: string): void {
    this.atualizado_por = usuarioId;
  }

  /**
   * Verifica se o escopo pertence a uma permissão específica
   * @param permissaoId ID da permissão
   * @returns true se pertence à permissão
   */
  pertenceAPermissao(permissaoId: string): boolean {
    return this.permissao_id === permissaoId;
  }

  /**
   * Obtém uma descrição legível do tipo de escopo
   * @returns descrição do escopo
   */
  getDescricaoEscopo(): string {
    const descricoes = {
      GLOBAL: 'Acesso global ao sistema',
      UNIDADE: 'Acesso restrito à unidade do usuário',
      PROPRIO: 'Acesso apenas aos próprios dados',
    };
    return descricoes[this.tipo_escopo_padrao];
  }

  /**
   * Verifica se o escopo foi criado recentemente (últimas 24 horas)
   * @returns true se foi criado nas últimas 24 horas
   */
  isCriadoRecentemente(): boolean {
    const agora = new Date();
    const umDiaAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
    return this.created_at > umDiaAtras;
  }

  /**
   * Calcula a idade do escopo em dias
   * @returns número de dias desde a criação
   */
  getIdadeEmDias(): number {
    const agora = new Date();
    const diffTime = Math.abs(agora.getTime() - this.created_at.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Verifica se tem criador definido
   * @returns true se tem criador
   */
  temCriador(): boolean {
    return this.criado_por !== null && this.criado_por !== undefined;
  }

  /**
   * Verifica se foi atualizado recentemente (últimas 24 horas)
   * @returns true se foi atualizado nas últimas 24 horas
   */
  foiAtualizadoRecentemente(): boolean {
    const agora = new Date();
    const umDiaAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
    return this.updated_at > umDiaAtras;
  }

  /**
   * Obtém um resumo das informações do escopo
   * @returns objeto com resumo das informações
   */
  getSummary(): {
    id: string;
    permissaoId: string;
    tipoEscopo: string;
    descricaoEscopo: string;
    criadoEm: Date;
    atualizadoEm: Date;
    temCriador: boolean;
    temAtualizador: boolean;
  } {
    return {
      id: this.id,
      permissaoId: this.permissao_id,
      tipoEscopo: this.tipo_escopo_padrao,
      descricaoEscopo: this.getDescricaoEscopo(),
      criadoEm: this.created_at,
      atualizadoEm: this.updated_at,
      temCriador: this.temCriador(),
      temAtualizador: this.atualizado_por !== null,
    };
  }

  /**
   * Verifica se é compatível com outro escopo (mesmo tipo)
   * @param outroEscopo outro escopo para comparar
   * @returns true se são compatíveis
   */
  isCompatibleWith(outroEscopo: PermissionScope): boolean {
    return this.tipo_escopo_padrao === outroEscopo.tipo_escopo_padrao;
  }

  /**
   * Gera uma chave única para o escopo
   * @returns chave única
   */
  getUniqueKey(): string {
    return `permission_scope_${this.permissao_id}`;
  }

  /**
   * Verifica se o estado do escopo é consistente
   * @returns true se está consistente
   */
  isConsistente(): boolean {
    return (
      this.id !== null &&
      this.permissao_id !== null &&
      this.tipo_escopo_padrao !== null &&
      this.created_at !== null &&
      this.updated_at !== null &&
      this.created_at <= this.updated_at
    );
  }

  /**
   * Obtém uma descrição completa do escopo
   * @returns descrição completa
   */
  getDescricaoCompleta(): string {
    const permissaoInfo = this.permissao
      ? this.permissao.nome
      : 'Permissão não carregada';
    return `Escopo ${this.tipo_escopo_padrao} para permissão: ${permissaoInfo}`;
  }

  /**
   * Verifica se pode ser removido (não tem dependências críticas)
   * @returns true se pode ser removido
   */
  podeSerRemovido(): boolean {
    // Lógica básica - pode ser expandida conforme regras de negócio
    return true;
  }

  /**
   * Clona o escopo (sem ID)
   * @returns nova instância do escopo
   */
  clone(): PermissionScope {
    const novoEscopo = new PermissionScope();
    novoEscopo.permissao_id = this.permissao_id;
    novoEscopo.tipo_escopo_padrao = this.tipo_escopo_padrao;
    novoEscopo.criado_por = this.criado_por;
    return novoEscopo;
  }

  /**
   * Verifica se é um escopo de alta criticidade (GLOBAL)
   * @returns true se é de alta criticidade
   */
  isAltaCriticidade(): boolean {
    return this.tipo_escopo_padrao === 'GLOBAL';
  }

  /**
   * Verifica se é um escopo de média criticidade (UNIDADE)
   * @returns true se é de média criticidade
   */
  isMediaCriticidade(): boolean {
    return this.tipo_escopo_padrao === 'UNIDADE';
  }

  /**
   * Verifica se é um escopo de baixa criticidade (PROPRIO)
   * @returns true se é de baixa criticidade
   */
  isBaixaCriticidade(): boolean {
    return this.tipo_escopo_padrao === 'PROPRIO';
  }

  /**
   * Obtém o nível de criticidade como número
   * @returns nível de criticidade (1-3)
   */
  getNivelCriticidade(): number {
    const niveis = {
      PROPRIO: 1,
      UNIDADE: 2,
      GLOBAL: 3,
    };
    return niveis[this.tipo_escopo_padrao];
  }

  /**
   * Verifica se o escopo permite acesso amplo
   * @returns true se permite acesso amplo
   */
  permiteAcessoAmplo(): boolean {
    return (
      this.tipo_escopo_padrao === 'GLOBAL' ||
      this.tipo_escopo_padrao === 'UNIDADE'
    );
  }

  /**
   * Verifica se o escopo é restritivo
   * @returns true se é restritivo
   */
  isRestritivo(): boolean {
    return this.tipo_escopo_padrao === 'PROPRIO';
  }

  /**
   * Formata a data de criação
   * @returns data formatada
   */
  getCriacaoFormatada(): string {
    return this.created_at.toLocaleString('pt-BR');
  }

  /**
   * Formata a data de atualização
   * @returns data formatada
   */
  getAtualizacaoFormatada(): string {
    return this.updated_at.toLocaleString('pt-BR');
  }

  /**
   * Remove informações sensíveis para logs
   * @returns versão segura para logs
   */
  toSafeLog(): object {
    return {
      id: this.id,
      permissaoId: this.permissao_id,
      tipoEscopo: this.tipo_escopo_padrao,
      criadoEm: this.created_at,
      atualizadoEm: this.updated_at,
      temCriador: this.temCriador(),
    };
  }

  /**
   * Verifica se o escopo requer aprovação especial para mudanças
   * @returns true se requer aprovação especial
   */
  requerAprovacaoEspecial(): boolean {
    return this.tipo_escopo_padrao === 'GLOBAL';
  }

  /**
   * Obtém sugestões de melhoria de segurança
   * @returns array de sugestões
   */
  getSugestoesMelhoria(): string[] {
    const sugestoes: string[] = [];

    if (this.tipo_escopo_padrao === 'GLOBAL') {
      sugestoes.push('Considere restringir o escopo se possível');
      sugestoes.push('Monitore o uso desta permissão global');
    }

    if (!this.temCriador()) {
      sugestoes.push('Defina um criador para auditoria');
    }

    return sugestoes;
  }
}
