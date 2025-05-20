import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

/**
 * Níveis de alerta para métricas de segurança
 */
export enum NivelAlertaEnum {
  INFO = 'info',
  AVISO = 'aviso',
  CRITICO = 'critico',
  EMERGENCIA = 'emergencia',
}

/**
 * Entidade que representa métricas de segurança específicas para LGPD
 * 
 * Esta entidade armazena eventos de segurança relacionados à LGPD,
 * incluindo acessos a dados sensíveis, tentativas de autenticação,
 * e outras operações relevantes para conformidade.
 */
@Entity('metricas_seguranca')
export class MetricaSeguranca {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  @Index('idx_metricas_seguranca_tipo')
  tipo_evento: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Index('idx_metricas_seguranca_timestamp')
  timestamp: Date;

  @Column({ type: 'uuid', nullable: true })
  @Index('idx_metricas_seguranca_usuario')
  usuario_id: string;

  @Column({ length: 50, nullable: true })
  perfil_usuario: string;

  @Column({ length: 45, nullable: true })
  @Index('idx_metricas_seguranca_ip')
  ip_origem: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @Column({ length: 255, nullable: true })
  endpoint: string;

  @Column({ type: 'jsonb', nullable: true })
  dados_acessados: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  detalhes: Record<string, any>;

  @Column({
    type: 'enum',
    enum: NivelAlertaEnum,
    default: NivelAlertaEnum.INFO
  })
  @Index('idx_metricas_seguranca_nivel')
  nivel: NivelAlertaEnum;
}
