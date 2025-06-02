// src/auth/entities/refresh-token.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsUUID, IsBoolean, IsOptional, IsString, IsDateString, Length } from 'class-validator';
import { Usuario } from './usuario.entity';

@Entity('refresh_tokens')
@Index(['usuario_id'])
@Index(['token'], { unique: true })
@Index(['expires_at'])
@Index(['revoked'])
@Index(['usuario_id', 'revoked'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id', type: 'uuid', nullable: false })
  @IsNotEmpty({ message: 'ID do usuário é obrigatório' })
  @IsUUID('4', { message: 'ID do usuário inválido' })
  usuario_id: string;

  @Column({ type: 'varchar', length: 500, unique: true })
  @IsNotEmpty({ message: 'Token é obrigatório' })
  @IsString({ message: 'Token deve ser uma string' })
  @Length(10, 500, { message: 'Token deve ter entre 10 e 500 caracteres' })
  token: string;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expires_at: Date;

  @Column({ type: 'boolean', default: false })
  @IsBoolean({ message: 'Revoked deve ser um boolean' })
  revoked: boolean;

  @Column({
    name: 'revoked_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  revoked_at: Date | null;

  @Column({
    name: 'revoked_by_ip',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'IP deve ser uma string' })
  @Length(7, 45, { message: 'IP deve ter entre 7 e 45 caracteres' })
  revokedByIp: string | null;

  @Column({
    name: 'replaced_by_token',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'Token de substituição deve ser uma string' })
  @Length(10, 500, { message: 'Token de substituição deve ter entre 10 e 500 caracteres' })
  replacedByToken: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updated_at: Date;

  @ManyToOne(() => Usuario, (usuario) => usuario.refreshTokens, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'usuario_id', referencedColumnName: 'id' })
  usuario: Usuario;

  // Métodos utilitários
  /**
   * Verifica se o token está expirado
   */
  isExpired(): boolean {
    return new Date() > this.expires_at;
  }

  /**
   * Verifica se o token está ativo (não revogado e não expirado)
   */
  isActive(): boolean {
    return !this.revoked && !this.isExpired();
  }

  /**
   * Revoga o token
   */
  revoke(ip?: string, replacedByToken?: string): void {
    this.revoked = true;
    this.revoked_at = new Date();
    if (ip) {
      this.revokedByIp = ip;
    }
    if (replacedByToken) {
      this.replacedByToken = replacedByToken;
    }
  }

  /**
   * Verifica se o token foi revogado
   */
  isRevoked(): boolean {
    return this.revoked;
  }

  /**
   * Calcula o tempo restante até a expiração em milissegundos
   */
  getTimeToExpiration(): number {
    const now = new Date().getTime();
    const expiration = this.expires_at.getTime();
    return Math.max(0, expiration - now);
  }

  /**
   * Verifica se o token expira em breve (próximos X minutos)
   */
  isExpiringWithin(minutes: number): boolean {
    const timeToExpiration = this.getTimeToExpiration();
    const minutesInMs = minutes * 60 * 1000;
    return timeToExpiration <= minutesInMs && timeToExpiration > 0;
  }

  /**
   * Obtém informações de status do token
   */
  getStatus(): {
    isActive: boolean;
    isExpired: boolean;
    isRevoked: boolean;
    timeToExpiration: number;
  } {
    return {
      isActive: this.isActive(),
      isExpired: this.isExpired(),
      isRevoked: this.isRevoked(),
      timeToExpiration: this.getTimeToExpiration(),
    };
  }

  /**
   * Verifica se o token pertence a um usuário específico
   */
  belongsToUser(userId: string): boolean {
    return this.usuario_id === userId;
  }

  /**
   * Gera uma chave única para o token
   */
  getUniqueKey(): string {
    return `refresh_token_${this.usuario_id}_${this.id}`;
  }

  /**
   * Verifica se o token foi criado recentemente (últimas X horas)
   */
  isCriadoRecentemente(horas: number = 1): boolean {
    if (!this.created_at) return false;
    
    const agora = new Date();
    const horasAtras = new Date(agora.getTime() - horas * 60 * 60 * 1000);
    
    return this.created_at > horasAtras;
  }

  /**
   * Calcula a idade do token em horas
   */
  getIdadeEmHoras(): number {
    if (!this.created_at) return 0;
    
    const agora = new Date();
    const diffTime = Math.abs(agora.getTime() - this.created_at.getTime());
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    
    return diffHours;
  }

  /**
   * Calcula quantos minutos restam até a expiração
   */
  getMinutosAteExpiracao(): number {
    const timeToExpiration = this.getTimeToExpiration();
    return Math.floor(timeToExpiration / (1000 * 60));
  }

  /**
   * Verifica se o token foi substituído por outro
   */
  foiSubstituido(): boolean {
    return !!this.replacedByToken;
  }

  /**
   * Verifica se o token foi revogado por IP específico
   */
  foiRevogadoPorIp(ip: string): boolean {
    return this.isRevoked() && this.revokedByIp === ip;
  }

  /**
   * Obtém informações detalhadas do token
   */
  getDetalhes(): {
    id: string;
    usuario_id: string;
    ativo: boolean;
    expirado: boolean;
    revogado: boolean;
    criadoEm: Date;
    expiraEm: Date;
    minutosRestantes: number;
    idadeEmHoras: number;
    foiSubstituido: boolean;
  } {
    return {
      id: this.id,
      usuario_id: this.usuario_id,
      ativo: this.isActive(),
      expirado: this.isExpired(),
      revogado: this.isRevoked(),
      criadoEm: this.created_at,
      expiraEm: this.expires_at,
      minutosRestantes: this.getMinutosAteExpiracao(),
      idadeEmHoras: this.getIdadeEmHoras(),
      foiSubstituido: this.foiSubstituido()
    };
  }

  /**
   * Verifica se o token está em estado válido
   */
  isValido(): boolean {
    return (
      !!this.token &&
      !!this.usuario_id &&
      !!this.expires_at &&
      this.expires_at > new Date()
    );
  }

  /**
   * Verifica se o token pode ser renovado
   */
  podeSerRenovado(): boolean {
    return this.isActive() && !this.isExpiringWithin(5); // Não renova se expira em menos de 5 minutos
  }

  /**
   * Obtém o tempo de vida útil do token em horas
   */
  getTempoVidaUtil(): number {
    if (!this.created_at || !this.expires_at) return 0;
    
    const diffTime = this.expires_at.getTime() - this.created_at.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60));
  }

  /**
   * Verifica se o token está próximo da expiração (últimos 10% do tempo de vida)
   */
  isProximoExpiracao(): boolean {
    const tempoVidaUtil = this.getTempoVidaUtil();
    const tempoRestante = this.getMinutosAteExpiracao() / 60; // Converter para horas
    
    return tempoRestante <= (tempoVidaUtil * 0.1);
  }

  /**
   * Formata a data de expiração para exibição
   */
  getExpiracaoFormatada(): string {
    return this.expires_at.toLocaleString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Obtém um resumo do status do token
   */
  getStatusResumo(): string {
    if (this.isRevoked()) {
      return `Revogado em ${this.revoked_at?.toLocaleString('pt-BR')}`;
    }
    
    if (this.isExpired()) {
      return `Expirado em ${this.getExpiracaoFormatada()}`;
    }
    
    if (this.isProximoExpiracao()) {
      return `Expira em ${this.getMinutosAteExpiracao()} minutos`;
    }
    
    return 'Ativo';
  }
}
