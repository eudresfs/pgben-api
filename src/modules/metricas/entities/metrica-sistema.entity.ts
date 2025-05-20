import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * Entidade que representa métricas de sistema
 * 
 * Esta entidade armazena informações sobre o desempenho do sistema,
 * incluindo uso de CPU, memória, disco e carga do sistema.
 */
@Entity('metricas_sistema')
export class MetricaSistema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Index('idx_metricas_sistema_timestamp')
  timestamp: Date;

  @Column({ length: 100 })
  @Index('idx_metricas_sistema_servidor')
  servidor: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  uso_cpu_percentual: number;

  @Column({ type: 'integer', nullable: true })
  uso_memoria_mb: number;

  @Column({ type: 'integer', nullable: true })
  memoria_total_mb: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  uso_disco_percentual: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  carga_sistema: number;

  @Column({ type: 'jsonb', nullable: true })
  detalhes: Record<string, any>;
}
