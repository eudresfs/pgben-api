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
import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
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
@Index(['destinatario_id', 'created_at'])
@Index(['status', 'created_at'])
export class NotificacaoSistema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'destinatario_id' })
  @IsNotEmpty({ message: 'ID do destinatário é obrigatório' })
  @IsUUID('4', { message: 'ID do destinatário inválido' })
  destinatario_id: string;

  @ManyToOne(() => NotificationTemplate)
  @JoinColumn({ name: 'template_id' })
  template: NotificationTemplate;

  @Column({ name: 'template_id' })
  @IsNotEmpty({ message: 'ID do template é obrigatório' })
  @IsUUID('4', { message: 'ID do template inválido' })
  template_id: string;

  @Column({ type: 'jsonb', name: 'dados_contexto' })
  dados_contexto: Record<string, any>;

  @Column({
    type: 'enum',
    enum: StatusNotificacaoProcessamento,
    enumName: 'status_notificacao_processamento',
    default: StatusNotificacaoProcessamento.PENDENTE,
  })
  @IsEnum(StatusNotificacaoProcessamento, { message: 'Status inválido' })
  status: StatusNotificacaoProcessamento;

  @Column({ type: 'jsonb', name: 'tentativas_entrega', nullable: true })
  tentativas_entrega: TentativaEntrega[];

  @Column({ type: 'jsonb', name: 'dados_envio', nullable: true })
  dados_envio: Record<string, any>;

  @Column({ name: 'ultima_tentativa', nullable: true })
  ultima_tentativa: Date;

  @Column({ name: 'tentativas_envio', default: 0 })
  @IsNumber({}, { message: 'Tentativas de envio deve ser um número' })
  @Min(0, { message: 'Tentativas de envio não pode ser negativo' })
  tentativas_envio: number;

  @Column({ name: 'proxima_tentativa', nullable: true })
  proxima_tentativa: Date;

  @Column({ name: 'numero_tentativas', default: 0 })
  @IsNumber({}, { message: 'Número de tentativas deve ser um número' })
  @Min(0, { message: 'Número de tentativas não pode ser negativo' })
  numero_tentativas: number;

  @Column({ name: 'data_entrega', nullable: true })
  @IsOptional()
  data_entrega: Date;

  @Column({ name: 'data_envio', nullable: true })
  @IsOptional()
  data_envio: Date;

  @Column({ name: 'data_agendamento', nullable: true })
  @IsOptional()
  data_agendamento: Date;

  @Column({ name: 'data_leitura', nullable: true })
  @IsOptional()
  data_leitura: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
