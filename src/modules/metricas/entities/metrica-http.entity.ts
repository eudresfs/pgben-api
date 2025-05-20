import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * Entidade que representa métricas de requisições HTTP
 * 
 * Esta entidade armazena informações sobre requisições HTTP realizadas no sistema,
 * incluindo endpoint, método, código de status, duração e informações do usuário.
 */
@Entity('metricas_http')
export class MetricaHttp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Index('idx_metricas_http_timestamp')
  timestamp: Date;

  @Column({ length: 255 })
  @Index('idx_metricas_http_endpoint')
  endpoint: string;

  @Column({ length: 10 })
  metodo: string;

  @Column({ type: 'integer' })
  @Index('idx_metricas_http_status')
  codigo_status: number;

  @Column({ type: 'integer' })
  duracao_ms: number;

  @Column({ type: 'integer', nullable: true })
  tamanho_resposta_bytes: number;

  @Column({ length: 45, nullable: true })
  ip_origem: string;

  @Column({ type: 'uuid', nullable: true })
  @Index('idx_metricas_http_usuario')
  usuario_id: string;

  @Column({ length: 50, nullable: true })
  perfil_usuario: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @Column({ type: 'jsonb', nullable: true })
  detalhes: Record<string, any>;
}
