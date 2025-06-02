import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Metrica } from './metrica.entity';
import { NivelAlertaEnum } from './metrica-seguranca.entity';

/**
 * Entidade que representa regras para geração de alertas
 * 
 * Esta entidade define as condições para geração de alertas com base em métricas,
 * incluindo o operador de comparação, valor limiar e mensagem de alerta.
 */
@Entity('regras_alerta')
export class RegraAlerta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nome: string;

  @Column()
  @Index('idx_regras_alerta_metrica')
  metrica_id: string;

  @ManyToOne(() => Metrica, (metrica) => metrica.regras_alerta)
  @JoinColumn({ name: 'metrica_id' })
  metrica: Metrica;

  @Column({
    type: 'enum',
    enum: NivelAlertaEnum
  })
  @Index('idx_regras_alerta_nivel')
  nivel: NivelAlertaEnum;

  @Column({ length: 10 })
  operador: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  valor_limiar: number;

  @Column({ type: 'text' })
  mensagem_alerta: string;

  @Column({ type: 'jsonb', nullable: true })
  canais_notificacao: Record<string, any>;

  @Column({ default: true })
  @Index('idx_regras_alerta_ativo')
  ativo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
