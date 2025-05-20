import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Metrica } from './metrica.entity';

/**
 * Entidade que representa um registro de métrica
 * 
 * Esta entidade armazena os valores coletados para uma métrica específica,
 * incluindo o timestamp da coleta e detalhes adicionais.
 * 
 * A tabela é particionada por tempo para otimizar o desempenho em consultas
 * com grandes volumes de dados.
 */
@Entity('registros_metricas')
export class RegistroMetrica {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index('idx_registros_metricas_metrica_id')
  metrica_id: string;

  @ManyToOne(() => Metrica, (metrica) => metrica.registros)
  @JoinColumn({ name: 'metrica_id' })
  metrica: Metrica;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  valor: number;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  @Index('idx_registros_metricas_timestamp')
  timestamp: Date;

  @Column({ type: 'jsonb', nullable: true })
  detalhes: Record<string, any>;

  @Column({ length: 45, nullable: true })
  ip_origem: string;

  @Column({ type: 'uuid', nullable: true })
  @Index('idx_registros_metricas_usuario_id')
  usuario_id: string;

  @Column({ length: 255, nullable: true })
  endpoint: string;
}
