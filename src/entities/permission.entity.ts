import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, Index } from 'typeorm';
import { IsNotEmpty, IsString, Length, IsOptional, IsEnum } from 'class-validator';
import { Status } from '../enums/status.enum';
import { Usuario } from './usuario.entity';

/**
 * Entidade que representa uma permissão no sistema.
 * 
 * As permissões seguem o formato `modulo.recurso.operacao` e podem ser compostas
 * (ex: `modulo.*` para representar todas as permissões de um módulo).
 */
@Entity('permissao')
@Index(['nome'], { unique: true })
@Index(['modulo'])
@Index(['acao'])
@Index(['status'])
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
  @IsNotEmpty({ message: 'Nome da permissão é obrigatório' })
  @IsString({ message: 'Nome deve ser uma string' })
  @Length(3, 100, { message: 'Nome deve ter entre 3 e 100 caracteres' })
  nome: string;

  /**
   * Descrição da permissão
   */
  @Column({ type: 'varchar', length: 255, name: 'descricao' })
  @IsNotEmpty({ message: 'Descrição da permissão é obrigatória' })
  @IsString({ message: 'Descrição deve ser uma string' })
  @Length(5, 255, { message: 'Descrição deve ter entre 5 e 255 caracteres' })
  descricao: string;

  /**
   * Módulo ao qual a permissão pertence
   */
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'modulo' })
  @IsOptional()
  @IsString({ message: 'Módulo deve ser uma string' })
  @Length(2, 50, { message: 'Módulo deve ter entre 2 e 50 caracteres' })
  modulo: string | null;

  /**
   * Ação permitida pela permissão
   */
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'acao' })
  @IsOptional()
  @IsString({ message: 'Ação deve ser uma string' })
  @Length(2, 50, { message: 'Ação deve ter entre 2 e 50 caracteres' })
  acao: string | null;

  /**
   * Status da permissão (ativo/inativo)
   */
  @Column({ 
    type: 'enum', 
    enum: Status, 
    default: Status.ATIVO,
    name: 'status'
  })
  @IsEnum(Status, { message: 'Status deve ser ATIVO ou INATIVO' })
  status: Status;

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

  // Métodos utilitários para gerenciar status
  /**
   * Verifica se a permissão está ativa
   */
  isAtiva(): boolean {
    return this.status === Status.ATIVO;
  }

  /**
   * Ativa a permissão
   */
  ativar(): void {
    this.status = Status.ATIVO;
  }

  /**
   * Desativa a permissão
   */
  desativar(): void {
    this.status = Status.INATIVO;
  }

  /**
   * Verifica se a permissão pode ser deletada
   * (implementar lógica específica conforme regras de negócio)
   */
  podeSerDeletada(): boolean {
    // Por enquanto, permite deletar apenas permissões inativas
    return this.status === Status.INATIVO;
  }

  /**
   * Valida o formato do nome da permissão
   */
  validarFormatoNome(): boolean {
    if (!this.nome) return false;
    
    // Formato esperado: modulo.recurso.operacao ou modulo.*
    const regex = /^[a-zA-Z][a-zA-Z0-9_-]*\.[a-zA-Z*][a-zA-Z0-9_.*-]*$/;
    return regex.test(this.nome);
  }

  /**
   * Extrai informações estruturadas do nome da permissão
   */
  getPermissionInfo(): { modulo: string; recurso?: string; operacao?: string } {
    if (!this.nome) {
      return { modulo: '' };
    }

    const parts = this.nome.split('.');
    
    if (parts.length === 2 && parts[1] === '*') {
      return { modulo: parts[0] };
    }
    
    if (parts.length >= 3) {
      return {
        modulo: parts[0],
        recurso: parts[1],
        operacao: parts.slice(2).join('.')
      };
    }
    
    return { modulo: parts[0] };
  }

  /**
   * Verifica se a permissão é uma permissão de administrador
   */
  isAdminPermission(): boolean {
    return this.nome ? this.nome.startsWith('admin.') : false;
  }

  /**
   * Verifica se a permissão é uma permissão de sistema
   */
  isSystemPermission(): boolean {
    return this.nome ? this.nome.startsWith('system.') : false;
  }

  /**
   * Verifica se a permissão é uma permissão de leitura
   */
  isReadPermission(): boolean {
    return this.nome ? this.nome.includes('.read') || this.nome.includes('.view') || this.nome.includes('.list') : false;
  }

  /**
   * Verifica se a permissão é uma permissão de escrita
   */
  isWritePermission(): boolean {
    return this.nome ? this.nome.includes('.write') || this.nome.includes('.create') || this.nome.includes('.update') || this.nome.includes('.delete') : false;
  }

  /**
   * Verifica se a permissão é uma permissão global (com wildcard)
   */
  isGlobalPermission(): boolean {
    return this.nome ? this.nome.endsWith('.*') : false;
  }

  /**
   * Obtém o nível de criticidade da permissão
   */
  getCriticalityLevel(): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (this.isSystemPermission() || this.isAdminPermission()) {
      return 'CRITICAL';
    }
    
    if (this.isGlobalPermission()) {
      return 'HIGH';
    }
    
    if (this.isWritePermission()) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  /**
   * Verifica se a permissão é compatível com outra permissão
   */
  isCompatibleWith(otherPermission: Permission): boolean {
    if (!this.nome || !otherPermission.nome) {
      return false;
    }
    
    // Permissões do mesmo módulo são compatíveis
    return this.getModule() === otherPermission.getModule();
  }

  /**
   * Gera uma chave única para a permissão
   */
  getUniqueKey(): string {
    return `permission_${this.nome}_${this.id}`;
  }

  /**
   * Verifica se a permissão inclui outra permissão (para permissões hierárquicas)
   */
  includes(otherPermission: Permission): boolean {
    if (!this.nome || !otherPermission.nome) {
      return false;
    }
    
    // Se esta permissão é global para um módulo, inclui todas as permissões do módulo
    if (this.isGlobalPermission()) {
      const thisModule = this.getModule();
      const otherModule = otherPermission.getModule();
      return thisModule === otherModule;
    }
    
    // Caso contrário, só inclui se for exatamente a mesma permissão
    return this.nome === otherPermission.nome;
  }

  /**
   * Obtém uma descrição amigável da permissão
   */
  getFriendlyDescription(): string {
    const info = this.getPermissionInfo();
    
    if (this.isGlobalPermission()) {
      return `Todas as permissões do módulo ${info.modulo}`;
    }
    
    if (info.recurso && info.operacao) {
      return `${info.operacao} em ${info.recurso} do módulo ${info.modulo}`;
    }
    
    return this.descricao || this.nome;
  }

  /**
   * Valida se a permissão está em um estado consistente
   */
  isValid(): boolean {
    return (
      !!this.nome &&
      !!this.descricao &&
      this.validarFormatoNome() &&
      Object.values(Status).includes(this.status)
    );
  }

  // Métodos getters e setters para criado_por e atualizado_por foram removidos
  // pois as colunas não existem no banco de dados atual.
}
