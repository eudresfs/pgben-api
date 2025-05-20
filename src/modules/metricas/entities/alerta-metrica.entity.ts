import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Metrica } from './metrica.entity';
import { NivelAlertaEnum } from './metrica-seguranca.entity';

/**
 * Entidade que representa alertas gerados com base em métricas
 * 
 * Esta entidade armazena informações sobre alertas gerados quando uma métrica
 * ultrapassa um limiar definido, incluindo o nível do alerta, valor atual,
 * limiar violado e status de resolução.
 */
@Entity('alertas_metricas')
export class AlertaMetrica {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index('idx_alertas_metricas_metrica')
  metrica_id: string;

  @ManyToOne(() => Metrica)
  @JoinColumn({ name: 'metrica_id' })
  metrica: Metrica;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Index('idx_alertas_metricas_timestamp')
  timestamp: Date;

  @Column({
    type: 'enum',
    enum: NivelAlertaEnum
  })
  @Index('idx_alertas_metricas_nivel')
  nivel: NivelAlertaEnum;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  valor_atual: number;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  limiar_violado: number;

  @Column({ type: 'text' })
  mensagem: string;

  @Column({ type: 'jsonb', nullable: true })
  detalhes: Record<string, any>;

  @Column({ default: false })
  @Index('idx_alertas_metricas_resolvido')
  resolvido: boolean;

  @Column({ type: 'timestamp', nullable: true })
  data_resolucao: Date;

  @Column({ default: false })
  notificacao_enviada: boolean;
}
