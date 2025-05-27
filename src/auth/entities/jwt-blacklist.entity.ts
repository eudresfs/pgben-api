import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
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
  jti: string;

  @ApiProperty({
    description: 'ID do usuário proprietário do token',
    example: 'user-uuid-v4',
  })
  @Column({ type: 'uuid' })
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
  reason: string;

  @ApiProperty({
    description: 'IP do cliente quando o token foi invalidado',
    example: '192.168.1.100',
    required: false,
  })
  @Column({ type: 'varchar', length: 45, nullable: true })
  client_ip?: string;

  @ApiProperty({
    description: 'User Agent do cliente',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
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
}