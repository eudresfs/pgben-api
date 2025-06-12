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
@Entity('notification_template')
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  codigo: string;

  @Column({ length: 200 })
  nome: string;

  @Column({ length: 50, default: 'sistema' })
  tipo: string;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({ length: 255 })
  assunto: string;

  @Column({ type: 'text' })
  corpo: string;

  @Column({ type: 'text', nullable: true })
  corpo_html: string;

  @Column('text', { array: true, default: () => "'{email}'" })
  canais_disponiveis: string[];

  @Column('jsonb', { name: 'variaveis_requeridas', default: '[]' })
  variaveis_requeridas: string;

  @Column({ default: true })
  ativo: boolean;

  @Column({ length: 100, nullable: true })
  categoria: string;

  @Column({ length: 20, default: 'normal' })
  prioridade: string;

  @Column({ type: 'uuid', nullable: true })
  criado_por: string;

  @Column({ type: 'uuid', nullable: true })
  atualizado_por: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
