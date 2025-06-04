import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsNumber,
  Min,
  IsEnum,
  IsString,
} from 'class-validator';
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

  @Column({ type: 'uuid' })
  @Index('idx_alertas_metricas_metrica_id')
  @IsNotEmpty({ message: 'ID da métrica é obrigatório' })
  @IsUUID('4', { message: 'ID da métrica inválido' })
  metrica_id: string;

  @ManyToOne(() => Metrica)
  @JoinColumn({ name: 'metrica_id' })
  metrica: Metrica;

  @CreateDateColumn({ name: 'created_at' })
  @Index('idx_alertas_metricas_timestamp')
  created_at: Date;

  @Column({
    type: 'enum',
    enum: NivelAlertaEnum,
  })
  @Index('idx_alertas_metricas_nivel')
  @IsEnum(NivelAlertaEnum, { message: 'Nível de alerta inválido' })
  nivel: NivelAlertaEnum;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  @IsNotEmpty({ message: 'Valor atual é obrigatório' })
  @IsNumber({}, { message: 'Valor atual deve ser um número' })
  valor_atual: number;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  @IsNotEmpty({ message: 'Limiar violado é obrigatório' })
  @IsNumber({}, { message: 'Limiar violado deve ser um número' })
  limiar_violado: number;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Mensagem deve ser uma string' })
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
