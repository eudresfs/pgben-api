import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NivelAlertaEnum } from './metrica-seguranca.entity';

/**
 * Entidade que representa configurações de notificação para alertas
 *
 * Esta entidade define como as notificações de alertas devem ser enviadas,
 * incluindo o tipo de notificação, configurações específicas e níveis de alerta.
 */
@Entity('configuracoes_notificacao')
export class ConfiguracaoNotificacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  tipo: string;

  @Column({ length: 100 })
  nome: string;

  @Column({ type: 'jsonb' })
  configuracao: Record<string, any>;

  @Column({ type: 'enum', enum: NivelAlertaEnum, array: true })
  niveis_alerta: NivelAlertaEnum[];

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
