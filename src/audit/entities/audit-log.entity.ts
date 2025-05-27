import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_REVOKE = 'TOKEN_REVOKE',
  EXPORT_DATA = 'EXPORT_DATA',
  IMPORT_DATA = 'IMPORT_DATA',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
}

export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('audit_logs')
@Index(['usuario_id', 'created_at'])
@Index(['action', 'created_at'])
@Index(['severity', 'created_at'])
@Index(['resource_type', 'resource_id'])
@Index(['client_ip', 'created_at'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  usuario_id: string;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ type: 'varchar', length: 100 })
  resource_type: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resource_id: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: AuditSeverity,
    default: AuditSeverity.LOW,
  })
  severity: AuditSeverity;

  @Column({ type: 'inet', nullable: true })
  client_ip: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  user_agent: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  session_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  request_method: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  request_url: string;

  @Column({ type: 'integer', nullable: true })
  response_status: number;

  @Column({ type: 'integer', nullable: true })
  response_time_ms: number;

  @Column({ type: 'jsonb', nullable: true })
  old_values: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  new_values: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @Column({ type: 'text', nullable: true })
  stack_trace: string;

  @CreateDateColumn()
  created_at: Date;

  // Métodos utilitários
  isSecurityEvent(): boolean {
    const securityActions = [
      AuditAction.LOGIN,
      AuditAction.LOGOUT,
      AuditAction.LOGIN_FAILED,
      AuditAction.PASSWORD_RESET,
      AuditAction.PASSWORD_CHANGE,
      AuditAction.PERMISSION_DENIED,
      AuditAction.TOKEN_REFRESH,
      AuditAction.TOKEN_REVOKE,
    ];
    return securityActions.includes(this.action);
  }

  isCritical(): boolean {
    return this.severity === AuditSeverity.CRITICAL;
  }

  isHighRisk(): boolean {
    return [
      AuditSeverity.HIGH,
      AuditSeverity.CRITICAL,
    ].includes(this.severity);
  }

  getFormattedMessage(): string {
    const user = this.usuario ? `${this.usuario.nome} (${this.usuario.email})` : 'Sistema';
    const resource = this.resource_id ? `${this.resource_type}:${this.resource_id}` : this.resource_type;
    return `${user} executou ${this.action} em ${resource}`;
  }
}