import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { NotificationTemplate } from './notification-template.entity';

/**
 * Enum para os tipos de notificação
 */
export enum TipoNotificacao {
  SISTEMA = 'sistema',
  SOLICITACAO = 'solicitacao',
  PENDENCIA = 'pendencia',
  APROVACAO = 'aprovacao',
  LIBERACAO = 'liberacao',
  ALERTA = 'alerta',
}

/**
 * Enum para os possíveis estados de uma notificação do sistema
 */
export enum StatusNotificacaoProcessamento {
  PENDENTE = 'pendente',
  EM_PROCESSAMENTO = 'em_processamento',
  ENVIADA = 'enviada',
  FALHA = 'falha',
  CANCELADA = 'cancelada',
  NAO_LIDA = 'nao_lida',
  LIDA = 'lida',
  ARQUIVADA = 'arquivada',
}

/**
 * Interface para registrar tentativas de entrega
 */
export interface TentativaEntrega {
  data_tentativa: Date;
  canal: string;
  sucesso: boolean;
  mensagem_erro?: string;
  dados_resposta?: Record<string, any>;
}

/**
 * Entidade que representa uma notificação para um destinatário específico
 */
@Entity('notificacoes_sistema')
// Nome da classe alterado para evitar conflitos com a entidade Notificacao
@Index(['destinatario_id', 'criado_em'])
@Index(['status', 'criado_em'])
export class NotificacaoSistema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'destinatario_id' })
  destinatario_id: string;

  @ManyToOne(() => NotificationTemplate)
  @JoinColumn({ name: 'template_id' })
  template: NotificationTemplate;

  @Column({ name: 'template_id' })
  template_id: string;

  @Column({ type: 'jsonb', name: 'dados_contexto' })
  dados_contexto: Record<string, any>;

  @Column({
    type: 'enum',
    enum: StatusNotificacaoProcessamento,
    enumName: 'status_notificacao_processamento',
    default: StatusNotificacaoProcessamento.PENDENTE,
  })
  status: StatusNotificacaoProcessamento;

  @Column({ type: 'jsonb', name: 'tentativas_entrega', nullable: true })
  tentativas_entrega: TentativaEntrega[];

  @Column({ type: 'jsonb', name: 'dados_envio', nullable: true })
  dados_envio: Record<string, any>;

  @Column({ name: 'ultima_tentativa', nullable: true })
  ultima_tentativa: Date;

  @Column({ name: 'tentativas_envio', default: 0 })
  tentativas_envio: number;

  @Column({ name: 'proxima_tentativa', nullable: true })
  proxima_tentativa: Date;

  @Column({ name: 'numero_tentativas', default: 0 })
  numero_tentativas: number;

  @Column({ name: 'data_entrega', nullable: true })
  data_entrega: Date;

  @Column({ name: 'data_envio', nullable: true })
  data_envio: Date;

  @Column({ name: 'data_agendamento', nullable: true })
  data_agendamento: Date;

  @Column({ name: 'data_leitura', nullable: true })
  data_leitura: Date;

  @CreateDateColumn({ name: 'criado_em' })
  criado_em: Date;

  @UpdateDateColumn({ name: 'atualizado_em' })
  atualizado_em: Date;
}
