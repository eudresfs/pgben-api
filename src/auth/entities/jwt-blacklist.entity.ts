import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsUUID, IsString, IsEnum, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Entidade JWT Blacklist
 * 
 * Armazena tokens JWT invalidados para prevenir reutilização
 * de tokens comprometidos ou revogados
 */
@Entity('jwt_blacklist')
@Index(['jti'], { unique: true })
@Index(['usuario_id'])
@Index(['expires_at'])
@Index(['created_at'])
export class JwtBlacklist {
  @ApiProperty({
    description: 'ID único do registro',
    example: 'uuid-v4',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'JWT ID (jti) - Identificador único do token',
    example: 'jti-uuid-v4',
  })
  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  @IsNotEmpty({ message: 'JTI é obrigatório' })
  @IsString({ message: 'JTI deve ser uma string' })
  @Length(10, 255, { message: 'JTI deve ter entre 10 e 255 caracteres' })
  jti: string;

  @ApiProperty({
    description: 'ID do usuário proprietário do token',
    example: 'user-uuid-v4',
  })
  @Column({ type: 'uuid' })
  @IsNotEmpty({ message: 'ID do usuário é obrigatório' })
  @IsUUID('4', { message: 'ID do usuário inválido' })
  usuario_id: string;

  @ApiProperty({
    description: 'Tipo do token (access, refresh)',
    example: 'access',
  })
  @Column({ 
    type: 'enum', 
    enum: ['access', 'refresh'],
    default: 'access'
  })
  @IsEnum(['access', 'refresh'], { message: 'Tipo de token deve ser access ou refresh' })
  token_type: 'access' | 'refresh';

  @ApiProperty({
    description: 'Data de expiração original do token',
    example: '2024-01-15T10:30:00Z',
  })
  @Column({ type: 'timestamp with time zone' })
  expires_at: Date;

  @ApiProperty({
    description: 'Motivo da invalidação',
    example: 'user_logout',
  })
  @Column({ type: 'varchar', length: 100 })
  @IsNotEmpty({ message: 'Motivo da invalidação é obrigatório' })
  @IsString({ message: 'Motivo deve ser uma string' })
  @Length(3, 100, { message: 'Motivo deve ter entre 3 e 100 caracteres' })
  reason: string;

  @ApiProperty({
    description: 'IP do cliente quando o token foi invalidado',
    example: '192.168.1.100',
    required: false,
  })
  @Column({ type: 'varchar', length: 45, nullable: true })
  @IsOptional()
  @IsString({ message: 'IP do cliente deve ser uma string' })
  @Length(7, 45, { message: 'IP do cliente deve ter entre 7 e 45 caracteres' })
  client_ip?: string;

  @ApiProperty({
    description: 'User Agent do cliente',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'User Agent deve ser uma string' })
  user_agent?: string;

  @ApiProperty({
    description: 'Metadados adicionais em formato JSON',
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Data de criação do registro',
    example: '2024-01-01T10:00:00Z',
  })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2024-01-01T10:00:00Z',
  })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  /**
   * Verifica se o token ainda está na blacklist (não expirou)
   * @returns true se ainda está blacklisted
   */
  isStillBlacklisted(): boolean {
    return new Date() < this.expires_at;
  }

  /**
   * Verifica se o token pode ser removido da blacklist
   * @returns true se pode ser removido
   */
  canBeRemoved(): boolean {
    return new Date() >= this.expires_at;
  }

  /**
   * Obtém o tempo restante até a expiração em minutos
   * @returns minutos até expiração
   */
  getMinutesUntilExpiration(): number {
    const now = new Date();
    const diffMs = this.expires_at.getTime() - now.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
  }

  /**
   * Adiciona metadados ao registro
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
   * Verifica se o token pertence a um usuário específico
   * @param usuarioId ID do usuário
   * @returns true se pertence ao usuário
   */
  belongsToUser(usuarioId: string): boolean {
    return this.usuario_id === usuarioId;
  }

  /**
   * Verifica se é um token de acesso
   * @returns true se é access token
   */
  isAccessToken(): boolean {
    return this.token_type === 'access';
  }

  /**
   * Verifica se é um token de refresh
   * @returns true se é refresh token
   */
  isRefreshToken(): boolean {
    return this.token_type === 'refresh';
  }

  /**
   * Verifica se o token foi invalidado recentemente (últimas 24 horas)
   * @returns true se foi invalidado recentemente
   */
  wasRecentlyBlacklisted(): boolean {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return this.created_at > oneDayAgo;
  }

  /**
   * Calcula há quantos minutos o token foi blacklisted
   * @returns minutos desde a blacklist
   */
  getMinutesSinceBlacklisted(): number {
    const now = new Date();
    const diffMs = now.getTime() - this.created_at.getTime();
    return Math.floor(diffMs / (1000 * 60));
  }

  /**
   * Verifica se o token expira em breve (próximas 2 horas)
   * @returns true se expira em breve
   */
  expiresWithin(hours: number = 2): boolean {
    const now = new Date();
    const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return this.expires_at <= futureTime;
  }

  /**
   * Obtém informações resumidas do token blacklisted
   * @returns objeto com informações resumidas
   */
  getSummary(): {
    id: string;
    jti: string;
    usuario_id: string;
    token_type: string;
    reason: string;
    expires_at: Date;
    created_at: Date;
    isStillBlacklisted: boolean;
    minutesUntilExpiration: number;
  } {
    return {
      id: this.id,
      jti: this.jti,
      usuario_id: this.usuario_id,
      token_type: this.token_type,
      reason: this.reason,
      expires_at: this.expires_at,
      created_at: this.created_at,
      isStillBlacklisted: this.isStillBlacklisted(),
      minutesUntilExpiration: this.getMinutesUntilExpiration()
    };
  }

  /**
   * Verifica se tem informações de cliente (IP e User Agent)
   * @returns true se tem informações de cliente
   */
  hasClientInfo(): boolean {
    return !!(this.client_ip || this.user_agent);
  }

  /**
   * Obtém uma descrição legível do motivo da blacklist
   * @returns descrição formatada
   */
  getReasonDescription(): string {
    const reasonMap: Record<string, string> = {
      'user_logout': 'Logout do usuário',
      'token_compromised': 'Token comprometido',
      'password_changed': 'Senha alterada',
      'account_suspended': 'Conta suspensa',
      'security_breach': 'Violação de segurança',
      'admin_revoke': 'Revogado pelo administrador',
      'expired': 'Token expirado',
      'invalid_use': 'Uso inválido'
    };
    
    return reasonMap[this.reason] || this.reason;
  }

  /**
   * Verifica se o token foi blacklisted por motivos de segurança
   * @returns true se foi por motivos de segurança
   */
  isSecurityRelated(): boolean {
    const securityReasons = [
      'token_compromised',
      'password_changed',
      'account_suspended',
      'security_breach',
      'admin_revoke'
    ];
    
    return securityReasons.includes(this.reason);
  }

  /**
   * Gera uma chave única para o token blacklisted
   * @returns chave única
   */
  getUniqueKey(): string {
    return `blacklist_${this.jti}_${this.usuario_id}`;
  }

  /**
   * Verifica se o registro está em estado consistente
   * @returns true se está consistente
   */
  isConsistent(): boolean {
    return (
      !!this.id &&
      !!this.jti &&
      !!this.usuario_id &&
      !!this.token_type &&
      !!this.reason &&
      !!this.expires_at &&
      !!this.created_at
    );
  }

  /**
   * Remove metadados sensíveis para logs
   * @returns objeto sanitizado
   */
  toSafeLog(): {
    id: string;
    jti: string;
    usuario_id: string;
    token_type: string;
    reason: string;
    expires_at: Date;
    created_at: Date;
    hasClientInfo: boolean;
  } {
    return {
      id: this.id,
      jti: this.jti.substring(0, 8) + '...',
      usuario_id: this.usuario_id,
      token_type: this.token_type,
      reason: this.reason,
      expires_at: this.expires_at,
      created_at: this.created_at,
      hasClientInfo: this.hasClientInfo()
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
      minute: '2-digit'
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
      minute: '2-digit'
    });
  }
}