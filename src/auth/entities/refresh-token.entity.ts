// src/auth/entities/refresh-token.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @Column({ type: 'varchar', length: 500, unique: true })
  token: string;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  revoked: boolean;

  @Column({ name: 'revoked_at', type: 'timestamp with time zone', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'revoked_by_ip', type: 'varchar', length: 45, nullable: true })
  revokedByIp: string | null;

  @Column({ name: 'replaced_by_token', type: 'varchar', length: 500, nullable: true })
  replacedByToken: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @ManyToOne(() => Usuario, usuario => usuario.refreshTokens)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
}