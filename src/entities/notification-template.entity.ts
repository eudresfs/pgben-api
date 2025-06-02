import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Enum para os canais de notificação suportados
 */
export enum CanalNotificacao {
  EMAIL = 'email',
  IN_APP = 'in_app',
  SMS = 'sms',
  PUSH = 'push',
}

/**
 * Entidade que representa um template de notificação
 * Usado para definir a estrutura e conteúdo de diferentes tipos de notificações
 */
@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nome: string;

  @Column({ length: 255 })
  descricao: string;

  @Column({ length: 150 })
  assunto: string;

  @Column({ type: 'text' })
  template_conteudo: string;

  @Column({
    type: 'enum',
    enum: CanalNotificacao,
    enumName: 'canal_notificacao',
    array: true,
    default: [CanalNotificacao.EMAIL],
  })
  canais_suportados: CanalNotificacao[];

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
