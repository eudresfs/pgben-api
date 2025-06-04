import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  IsNotEmpty,
  IsUUID,
  IsBoolean,
  IsOptional,
  IsString,
  IsNumber,
  Length,
  Min,
  Max,
} from 'class-validator';
import { Usuario } from './usuario.entity';

/**
 * Entidade para Tokens de Recuperação de Senha
 *
 * Armazena tokens temporários para recuperação de senha com:
 * - Associação ao usuário
 * - Token único e seguro
 * - Controle de expiração
 * - Rastreamento de uso
 * - Auditoria de tentativas
 */
@Entity('password_reset_tokens')
@Index(['token'], { unique: true })
@Index(['usuario_id', 'is_used'])
@Index(['expires_at'])
@Index(['used_at'])
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Token único para recuperação de senha
   * Gerado com alta entropia para segurança
   */
  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: false,
    comment: 'Token único para recuperação de senha',
  })
  @IsNotEmpty({ message: 'Token é obrigatório' })
  @IsString({ message: 'Token deve ser uma string' })
  @Length(10, 255, { message: 'Token deve ter entre 10 e 255 caracteres' })
  token: string;

  /**
   * Hash do token para verificação segura
   * Armazenamos o hash para evitar exposição do token original
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Hash do token para verificação segura',
  })
  @IsNotEmpty({ message: 'Hash do token é obrigatório' })
  @IsString({ message: 'Hash do token deve ser uma string' })
  @Length(32, 255, {
    message: 'Hash do token deve ter entre 32 e 255 caracteres',
  })
  token_hash: string;

  /**
   * Usuário associado ao token
   */
  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({
    type: 'uuid',
    nullable: false,
    comment: 'ID do usuário associado ao token',
  })
  @IsNotEmpty({ message: 'ID do usuário é obrigatório' })
  @IsUUID('4', { message: 'ID do usuário inválido' })
  usuario_id: string;

  /**
   * Data e hora de expiração do token
   * Padrão: 15 minutos após criação
   */
  @Column({
    type: 'timestamp',
    nullable: false,
    comment: 'Data e hora de expiração do token',
  })
  expires_at: Date;

  /**
   * Indica se o token já foi utilizado
   * Tokens são de uso único
   */
  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    comment: 'Indica se o token já foi utilizado',
  })
  @IsBoolean({ message: 'Campo is_used deve ser um boolean' })
  is_used: boolean;

  /**
   * Data e hora em que o token foi utilizado
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Data e hora em que o token foi utilizado',
  })
  used_at: Date;

  /**
   * IP do cliente que solicitou o token
   * Para auditoria e segurança
   */
  @Column({
    type: 'varchar',
    length: 45, // IPv6 max length
    nullable: true,
    comment: 'IP do cliente que solicitou o token',
  })
  @IsOptional()
  @IsString({ message: 'IP do cliente deve ser uma string' })
  @Length(7, 45, { message: 'IP do cliente deve ter entre 7 e 45 caracteres' })
  client_ip: string;

  /**
   * User Agent do cliente que solicitou o token
   * Para auditoria e detecção de anomalias
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: 'User Agent do cliente que solicitou o token',
  })
  @IsOptional()
  @IsString({ message: 'User Agent deve ser uma string' })
  user_agent: string;

  /**
   * Número de tentativas de uso do token
   * Para detectar ataques de força bruta
   */
  @Column({
    type: 'integer',
    default: 0,
    nullable: false,
    comment: 'Número de tentativas de uso do token',
  })
  @IsNumber({}, { message: 'Número de tentativas deve ser um número' })
  @Min(0, { message: 'Número de tentativas não pode ser negativo' })
  @Max(100, { message: 'Número de tentativas não pode exceder 100' })
  attempts: number;

  /**
   * Data da última tentativa de uso
   */
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Data da última tentativa de uso',
  })
  last_attempt_at: Date;

  /**
   * Motivo da invalidação (se aplicável)
   * Ex: 'expired', 'used', 'revoked', 'suspicious_activity'
   */
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Motivo da invalidação do token',
  })
  @IsOptional()
  @IsString({ message: 'Motivo da invalidação deve ser uma string' })
  @Length(3, 50, {
    message: 'Motivo da invalidação deve ter entre 3 e 50 caracteres',
  })
  invalidation_reason: string;

  /**
   * Metadados adicionais em formato JSON
   * Para informações extras de auditoria
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Metadados adicionais para auditoria',
  })
  metadata: Record<string, any>;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Data de criação do registro',
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    comment: 'Data da última atualização do registro',
  })
  updated_at: Date;

  /**
   * Verifica se o token está válido
   * @returns true se o token não expirou e não foi usado
   */
  isValid(): boolean {
    const now = new Date();
    return !this.is_used && this.expires_at > now;
  }

  /**
   * Verifica se o token expirou
   * @returns true se o token expirou
   */
  isExpired(): boolean {
    const now = new Date();
    return this.expires_at <= now;
  }

  /**
   * Marca o token como usado
   * @param reason Motivo da invalidação
   */
  markAsUsed(reason: string = 'used'): void {
    this.is_used = true;
    this.used_at = new Date();
    this.invalidation_reason = reason;
  }

  /**
   * Incrementa o contador de tentativas
   */
  incrementAttempts(): void {
    this.attempts += 1;
    this.last_attempt_at = new Date();
  }

  /**
   * Calcula o tempo restante até a expiração em minutos
   * @returns Minutos restantes ou 0 se expirado
   */
  getMinutesUntilExpiration(): number {
    const now = new Date();
    if (this.expires_at <= now) {
      return 0;
    }
    return Math.ceil((this.expires_at.getTime() - now.getTime()) / (1000 * 60));
  }

  /**
   * Verifica se o token pertence a um usuário específico
   * @param usuarioId ID do usuário
   * @returns true se pertence ao usuário
   */
  belongsToUser(usuarioId: string): boolean {
    return this.usuario_id === usuarioId;
  }

  /**
   * Verifica se o token foi criado recentemente (últimas 24 horas)
   * @returns true se foi criado recentemente
   */
  isRecentlyCreated(): boolean {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return this.created_at > oneDayAgo;
  }

  /**
   * Verifica se há muitas tentativas de uso (possível ataque)
   * @param maxAttempts Número máximo de tentativas permitidas
   * @returns true se excedeu o limite
   */
  hasTooManyAttempts(maxAttempts: number = 5): boolean {
    return this.attempts >= maxAttempts;
  }

  /**
   * Verifica se o token expira em breve (próximos 5 minutos)
   * @param minutes Minutos para considerar como "em breve"
   * @returns true se expira em breve
   */
  expiresWithin(minutes: number = 5): boolean {
    const now = new Date();
    const futureTime = new Date(now.getTime() + minutes * 60 * 1000);
    return this.expires_at <= futureTime;
  }

  /**
   * Calcula há quantos minutos o token foi criado
   * @returns minutos desde a criação
   */
  getMinutesSinceCreation(): number {
    const now = new Date();
    const diffMs = now.getTime() - this.created_at.getTime();
    return Math.floor(diffMs / (1000 * 60));
  }

  /**
   * Obtém o status atual do token
   * @returns status do token
   */
  getStatus(): 'valid' | 'expired' | 'used' | 'too_many_attempts' {
    if (this.is_used) return 'used';
    if (this.isExpired()) return 'expired';
    if (this.hasTooManyAttempts()) return 'too_many_attempts';
    return 'valid';
  }

  /**
   * Verifica se tem informações de cliente (IP e User Agent)
   * @returns true se tem informações de cliente
   */
  hasClientInfo(): boolean {
    return !!(this.client_ip || this.user_agent);
  }

  /**
   * Adiciona metadados ao token
   * @param key Chave do metadado
   * @param value Valor do metadado
   */
  addMetadata(key: string, value: any): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
  }

  /**
   * Obtém um metadado específico
   * @param key Chave do metadado
   * @returns Valor do metadado ou undefined
   */
  getMetadata(key: string): any {
    return this.metadata?.[key];
  }

  /**
   * Obtém informações resumidas do token
   * @returns objeto com informações resumidas
   */
  getSummary(): {
    id: string;
    usuario_id: string;
    is_used: boolean;
    expires_at: Date;
    created_at: Date;
    attempts: number;
    status: string;
    minutesUntilExpiration: number;
    hasClientInfo: boolean;
  } {
    return {
      id: this.id,
      usuario_id: this.usuario_id,
      is_used: this.is_used,
      expires_at: this.expires_at,
      created_at: this.created_at,
      attempts: this.attempts,
      status: this.getStatus(),
      minutesUntilExpiration: this.getMinutesUntilExpiration(),
      hasClientInfo: this.hasClientInfo(),
    };
  }

  /**
   * Invalida o token com um motivo específico
   * @param reason Motivo da invalidação
   */
  invalidate(reason: string): void {
    this.is_used = true;
    this.used_at = new Date();
    this.invalidation_reason = reason;
  }

  /**
   * Verifica se o token foi invalidado por motivos de segurança
   * @returns true se foi invalidado por segurança
   */
  isSecurityInvalidated(): boolean {
    const securityReasons = [
      'suspicious_activity',
      'too_many_attempts',
      'security_breach',
      'admin_revoke',
    ];

    return securityReasons.includes(this.invalidation_reason);
  }

  /**
   * Gera uma chave única para o token
   * @returns chave única
   */
  getUniqueKey(): string {
    return `password_reset_${this.usuario_id}_${this.id}`;
  }

  /**
   * Verifica se o token está em estado consistente
   * @returns true se está consistente
   */
  isConsistent(): boolean {
    return (
      !!this.id &&
      !!this.token &&
      !!this.token_hash &&
      !!this.usuario_id &&
      !!this.expires_at &&
      !!this.created_at &&
      typeof this.is_used === 'boolean' &&
      typeof this.attempts === 'number'
    );
  }

  /**
   * Remove informações sensíveis para logs
   * @returns objeto sanitizado
   */
  toSafeLog(): {
    id: string;
    usuario_id: string;
    token_preview: string;
    is_used: boolean;
    expires_at: Date;
    created_at: Date;
    attempts: number;
    status: string;
    hasClientInfo: boolean;
  } {
    return {
      id: this.id,
      usuario_id: this.usuario_id,
      token_preview: this.token.substring(0, 8) + '...',
      is_used: this.is_used,
      expires_at: this.expires_at,
      created_at: this.created_at,
      attempts: this.attempts,
      status: this.getStatus(),
      hasClientInfo: this.hasClientInfo(),
    };
  }

  /**
   * Formata a data de expiração para exibição
   * @returns data formatada
   */
  getExpiracaoFormatada(): string {
    return this.expires_at.toLocaleString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      minute: '2-digit',
    });
  }

  /**
   * Verifica se o token pode ser usado para reset de senha
   * @returns true se pode ser usado
   */
  canBeUsedForReset(): boolean {
    return (
      this.isValid() &&
      !this.hasTooManyAttempts() &&
      !this.isSecurityInvalidated()
    );
  }
}
