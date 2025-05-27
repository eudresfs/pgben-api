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
import { Usuario } from '../../modules/usuario/entities/usuario.entity';

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
}