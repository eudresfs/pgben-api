import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Usuario } from './usuario.entity';
import { TipoNotificacao } from './notification.entity';

/**
 * Status do agendamento de notificação
 */
export enum StatusAgendamento {
  AGENDADA = 'AGENDADA',
  PROCESSANDO = 'PROCESSANDO',
  ENVIADA = 'ENVIADA',
  FALHOU = 'FALHOU',
  CANCELADA = 'CANCELADA',
  EXPIRADA = 'EXPIRADA',
}

/**
 * Entidade para agendamento de notificações
 * 
 * Permite agendar notificações para serem enviadas em momentos específicos,
 * como acompanhamentos pós-liberação, lembretes de prazos, etc.
 */
@Entity('agendamento_notificacao')
@Index(['data_agendamento', 'status'])
@Index(['usuario_id', 'status'])
@Index(['tipo_notificacao', 'data_agendamento'])
export class AgendamentoNotificacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Usuário que receberá a notificação
   */
  @Column({ type: 'uuid' })
  usuario_id: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  /**
   * Tipo da notificação a ser enviada
   */
  @Column({
    type: 'enum',
    enum: TipoNotificacao,
    default: TipoNotificacao.SISTEMA,
  })
  tipo_notificacao: TipoNotificacao;

  /**
   * Título da notificação
   */
  @Column({ type: 'varchar', length: 255 })
  titulo: string;

  /**
   * Conteúdo/mensagem da notificação
   */
  @Column({ type: 'text' })
  conteudo: string;

  /**
   * Data e hora agendada para envio
   */
  @Column({ type: 'timestamp with time zone' })
  @Index()
  data_agendamento: Date;

  /**
   * Status atual do agendamento
   */
  @Column({
    type: 'enum',
    enum: StatusAgendamento,
    default: StatusAgendamento.AGENDADA,
  })
  @Index()
  status: StatusAgendamento;

  /**
   * Número de tentativas de envio
   */
  @Column({ type: 'int', default: 0 })
  tentativas: number;

  /**
   * Máximo de tentativas permitidas
   */
  @Column({ type: 'int', default: 3 })
  max_tentativas: number;

  /**
   * Data da última tentativa de envio
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  ultima_tentativa: Date;

  /**
   * Data de expiração do agendamento
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  data_expiracao: Date;

  /**
   * Dados contextuais para a notificação
   */
  @Column({ type: 'jsonb', nullable: true })
  dados_contexto: Record<string, any>;

  /**
   * Configurações específicas do agendamento
   */
  @Column({ type: 'jsonb', nullable: true })
  configuracoes: {
    canal_preferido?: 'sse' | 'email' | 'sms' | 'push';
    prioridade?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
    retry_delay_minutes?: number;
    allow_retry?: boolean;
    silent_mode?: boolean;
  };

  /**
   * Mensagem de erro da última tentativa (se houver)
   */
  @Column({ type: 'text', nullable: true })
  erro_ultima_tentativa: string;

  /**
   * ID da notificação enviada (se bem-sucedida)
   */
  @Column({ type: 'uuid', nullable: true })
  notificacao_enviada_id: string;

  /**
   * Metadados adicionais
   */
  @Column({ type: 'jsonb', nullable: true })
  metadados: {
    origem?: string;
    categoria?: string;
    tags?: string[];
    referencias?: {
      solicitacao_id?: string;
      pagamento_id?: string;
      pendencia_id?: string;
    };
  };

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // ==========================================
  // MÉTODOS DE CONVENIÊNCIA
  // ==========================================

  /**
   * Verifica se o agendamento está vencido
   */
  isVencido(): boolean {
    return new Date() > this.data_agendamento;
  }

  /**
   * Verifica se o agendamento está expirado
   */
  isExpirado(): boolean {
    return this.data_expiracao ? new Date() > this.data_expiracao : false;
  }

  /**
   * Verifica se ainda pode tentar enviar
   */
  podeReitentar(): boolean {
    return (
      this.tentativas < this.max_tentativas &&
      this.status === StatusAgendamento.FALHOU &&
      !this.isExpirado()
    );
  }

  /**
   * Verifica se está pronto para processamento
   */
  isProntoParaProcessamento(): boolean {
    return (
      this.status === StatusAgendamento.AGENDADA &&
      this.isVencido() &&
      !this.isExpirado()
    );
  }

  /**
   * Incrementa contador de tentativas
   */
  incrementarTentativas(): void {
    this.tentativas += 1;
    this.ultima_tentativa = new Date();
    
    if (this.tentativas >= this.max_tentativas) {
      this.status = StatusAgendamento.EXPIRADA;
    }
  }

  /**
   * Marca como enviado com sucesso
   */
  marcarComoEnviado(notificacaoId: string): void {
    this.status = StatusAgendamento.ENVIADA;
    this.notificacao_enviada_id = notificacaoId;
    this.ultima_tentativa = new Date();
  }

  /**
   * Marca como falhou
   */
  marcarComoFalhou(erro: string): void {
    this.status = StatusAgendamento.FALHOU;
    this.erro_ultima_tentativa = erro;
    this.incrementarTentativas();
  }

  /**
   * Cancela o agendamento
   */
  cancelar(motivo?: string): void {
    this.status = StatusAgendamento.CANCELADA;
    if (motivo) {
      this.erro_ultima_tentativa = `Cancelado: ${motivo}`;
    }
  }

  /**
   * Cria configurações padrão
   */
  static criarConfiguracoesPadrao(): AgendamentoNotificacao['configuracoes'] {
    return {
      canal_preferido: 'sse',
      prioridade: 'MEDIA',
      retry_delay_minutes: 30,
      allow_retry: true,
      silent_mode: false,
    };
  }

  /**
   * Calcula próxima tentativa baseada no delay configurado
   */
  calcularProximaTentativa(): Date {
    const delayMinutos = this.configuracoes?.retry_delay_minutes || 30;
    const proximaTentativa = new Date();
    proximaTentativa.setMinutes(proximaTentativa.getMinutes() + delayMinutos);
    return proximaTentativa;
  }
}