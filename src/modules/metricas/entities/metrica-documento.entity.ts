import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * Entidade que representa métricas de operações com documentos
 * 
 * Esta entidade armazena informações sobre operações realizadas com documentos,
 * como upload, download, visualização e exclusão, incluindo metadados como
 * tamanho, duração da operação e status.
 */
@Entity('metricas_documentos')
export class MetricaDocumento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  @Index('idx_metricas_documentos_operacao')
  operacao: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Index('idx_metricas_documentos_timestamp')
  timestamp: Date;

  @Column({ type: 'uuid', nullable: true })
  @Index('idx_metricas_documentos_documento')
  documento_id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index('idx_metricas_documentos_usuario')
  usuario_id: string;

  @Column({ type: 'bigint', nullable: true })
  tamanho_bytes: number;

  @Column({ type: 'integer', nullable: true })
  duracao_ms: number;

  @Column({ length: 50, nullable: true })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  detalhes: Record<string, any>;
}
