import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import {
  StatusSolicitacaoAprovacao,
  PrioridadeAprovacao,
} from '../enums/aprovacao.enums';
import { AcaoCritica } from './acao-critica.entity';
import { ConfiguracaoAprovacao } from './configuracao-aprovacao.entity';
import { HistoricoAprovacao } from './historico-aprovacao.entity';

/**
 * Entidade que representa uma solicitação específica de aprovação
 *
 * Contém todos os dados de uma solicitação de aprovação, incluindo
 * contexto, justificativa, status e metadados do processo.
 */
@Entity('solicitacoes_aprovacao')
@Index(['status', 'created_at'])
@Index(['usuario_solicitante_id', 'status'])
@Index(['acao_critica_id', 'status'])
@Index(['prioridade', 'created_at'])
@Index(['data_expiracao'])
export class SolicitacaoAprovacao {
  /**
   * Identificador único da solicitação
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Código sequencial único para referência externa
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  codigo: string;

  /**
   * Status atual da solicitação
   */
  @Column({
    type: 'enum',
    enum: StatusSolicitacaoAprovacao,
    default: StatusSolicitacaoAprovacao.PENDENTE,
  })
  status: StatusSolicitacaoAprovacao;

  /**
   * Prioridade da solicitação
   */
  @Column({
    type: 'enum',
    enum: PrioridadeAprovacao,
    default: PrioridadeAprovacao.NORMAL,
  })
  prioridade: PrioridadeAprovacao;

  /**
   * ID do usuário solicitante
   */
  @Column({ type: 'uuid' })
  usuario_solicitante_id: string;

  /**
   * Nome do usuário solicitante (desnormalizado para performance)
   */
  @Column({ type: 'varchar', length: 200 })
  usuario_solicitante_nome: string;

  /**
   * Email do usuário solicitante
   */
  @Column({ type: 'varchar', length: 200 })
  usuario_solicitante_email: string;

  /**
   * Perfil do usuário solicitante
   */
  @Column({ type: 'varchar', length: 100 })
  perfil_solicitante: string;

  /**
   * Unidade organizacional do solicitante
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  unidade_solicitante?: string;

  /**
   * Justificativa da solicitação
   */
  @Column({ type: 'text' })
  justificativa: string;

  /**
   * Contexto adicional da solicitação em formato JSON
   */
  @Column({ type: 'jsonb' })
  contexto: Record<string, any>;

  /**
   * Dados originais antes da alteração (para auditoria)
   */
  @Column({ type: 'jsonb', nullable: true })
  dados_originais?: Record<string, any>;

  /**
   * Dados propostos para alteração
   */
  @Column({ type: 'jsonb', nullable: true })
  dados_propostos?: Record<string, any>;

  /**
   * Valor monetário envolvido (se aplicável)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valor_envolvido?: number;

  /**
   * Número de aprovações recebidas
   */
  @Column({ type: 'integer', default: 0 })
  aprovacoes_recebidas: number;

  /**
   * Número de rejeições recebidas
   */
  @Column({ type: 'integer', default: 0 })
  rejeicoes_recebidas: number;

  /**
   * Número mínimo de aprovações necessárias
   */
  @Column({ type: 'integer', default: 1 })
  aprovacoes_necessarias: number;

  /**
   * Data limite para aprovação
   */
  @Column({ type: 'timestamp' })
  data_expiracao: Date;

  /**
   * Data da primeira aprovação
   */
  @Column({ type: 'timestamp', nullable: true })
  data_primeira_aprovacao?: Date;

  /**
   * Data da conclusão (aprovação final ou rejeição)
   */
  @Column({ type: 'timestamp', nullable: true })
  data_conclusao?: Date;

  /**
   * Data do último lembrete enviado
   */
  @Column({ type: 'timestamp', nullable: true })
  data_ultimo_lembrete?: Date;

  /**
   * Data da última escalação
   */
  @Column({ type: 'timestamp', nullable: true })
  data_ultima_escalacao?: Date;

  /**
   * Número de escalações realizadas
   */
  @Column({ type: 'integer', default: 0 })
  numero_escalacoes: number;

  /**
   * Número de lembretes enviados
   */
  @Column({ type: 'integer', default: 0 })
  numero_lembretes: number;

  /**
   * IP do solicitante
   */
  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_solicitante?: string;

  /**
   * User Agent do solicitante
   */
  @Column({ type: 'text', nullable: true })
  user_agent?: string;

  /**
   * Sessão do usuário
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  sessao_id?: string;

  /**
   * Anexos da solicitação (URLs ou IDs)
   */
  @Column({ type: 'simple-array', nullable: true })
  anexos?: string[];

  /**
   * Tags para categorização
   */
  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  /**
   * Metadados adicionais
   */
  @Column({ type: 'jsonb', nullable: true })
  metadados?: Record<string, any>;

  /**
   * Observações internas
   */
  @Column({ type: 'text', nullable: true })
  observacoes_internas?: string;

  /**
   * Indica se a solicitação foi processada automaticamente
   */
  @Column({ type: 'boolean', default: false })
  processamento_automatico: boolean;

  /**
   * Tempo total de processamento (em segundos)
   */
  @Column({ type: 'integer', nullable: true })
  tempo_processamento_segundos?: number;

  /**
   * Hash dos dados para verificação de integridade
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  hash_integridade?: string;

  /**
   * Data de criação do registro
   */
  @CreateDateColumn()
  created_at: Date;

  /**
   * Data da última atualização
   */
  @UpdateDateColumn()
  updated_at: Date;

  // Relacionamentos

  /**
   * Ação crítica associada
   */
  @ManyToOne(() => AcaoCritica, (acao) => acao.solicitacoes_aprovacao, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'acao_critica_id' })
  acao_critica: AcaoCritica;

  /**
   * ID da ação crítica (chave estrangeira)
   */
  @Column({ type: 'uuid' })
  acao_critica_id: string;

  /**
   * Configuração de aprovação utilizada
   */
  @ManyToOne(() => ConfiguracaoAprovacao, (config) => config.solicitacoes, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'configuracao_aprovacao_id' })
  configuracao_aprovacao: ConfiguracaoAprovacao;

  /**
   * ID da configuração de aprovação (chave estrangeira)
   */
  @Column({ type: 'uuid' })
  configuracao_aprovacao_id: string;

  /**
   * Histórico de aprovações/rejeições
   */
  @OneToMany(
    () => HistoricoAprovacao,
    (historico) => historico.solicitacao_aprovacao,
  )
  historico_aprovacoes: HistoricoAprovacao[];

  // Métodos auxiliares

  /**
   * Verifica se a solicitação está pendente
   */
  isPendente(): boolean {
    return this.status === StatusSolicitacaoAprovacao.PENDENTE;
  }

  /**
   * Verifica se a solicitação foi aprovada
   */
  isAprovada(): boolean {
    return this.status === StatusSolicitacaoAprovacao.APROVADA;
  }

  /**
   * Verifica se a solicitação foi rejeitada
   */
  isRejeitada(): boolean {
    return this.status === StatusSolicitacaoAprovacao.REJEITADA;
  }

  /**
   * Verifica se a solicitação expirou
   */
  isExpirada(): boolean {
    return (
      this.status === StatusSolicitacaoAprovacao.EXPIRADA ||
      new Date() > this.data_expiracao
    );
  }

  /**
   * Verifica se a solicitação foi cancelada
   */
  isCancelada(): boolean {
    return this.status === StatusSolicitacaoAprovacao.CANCELADA;
  }

  /**
   * Verifica se a solicitação pode ser processada
   */
  podeSerProcessada(): boolean {
    return this.isPendente() && !this.isExpirada();
  }

  /**
   * Verifica se tem aprovações suficientes
   */
  temAprovacoessuficientes(): boolean {
    return this.aprovacoes_recebidas >= this.aprovacoes_necessarias;
  }

  /**
   * Calcula o tempo restante em milissegundos
   */
  getTempoRestanteMs(): number {
    const agora = new Date();
    return Math.max(0, this.data_expiracao.getTime() - agora.getTime());
  }

  /**
   * Calcula o tempo decorrido desde a criação
   */
  getTempoDecorridoMs(): number {
    const agora = new Date();
    return agora.getTime() - this.created_at.getTime();
  }

  /**
   * Verifica se é de alta prioridade
   */
  isAltaPrioridade(): boolean {
    return (
      this.prioridade === PrioridadeAprovacao.ALTA ||
      this.prioridade === PrioridadeAprovacao.CRITICA ||
      this.prioridade === PrioridadeAprovacao.EMERGENCIAL
    );
  }

  /**
   * Retorna o percentual de aprovação
   */
  getPercentualAprovacao(): number {
    if (this.aprovacoes_necessarias === 0) return 0;
    return (this.aprovacoes_recebidas / this.aprovacoes_necessarias) * 100;
  }

  /**
   * Verifica se precisa de escalação
   */
  precisaEscalacao(tempoLimiteEscalacao?: number): boolean {
    if (!tempoLimiteEscalacao) return false;

    const tempoDecorrido = this.getTempoDecorridoMs();
    return tempoDecorrido >= tempoLimiteEscalacao && this.isPendente();
  }

  /**
   * Verifica se precisa de lembrete
   */
  precisaLembrete(intervaloLembrete: number): boolean {
    if (!this.isPendente()) return false;

    if (!this.data_ultimo_lembrete) return true;

    const tempoUltimoLembrete =
      new Date().getTime() - this.data_ultimo_lembrete.getTime();
    return tempoUltimoLembrete >= intervaloLembrete;
  }

  /**
   * Adiciona uma tag
   */
  adicionarTag(tag: string): void {
    if (!this.tags) this.tags = [];
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  /**
   * Remove uma tag
   */
  removerTag(tag: string): void {
    if (this.tags) {
      this.tags = this.tags.filter((t) => t !== tag);
    }
  }

  /**
   * Verifica se possui uma tag
   */
  hasTag(tag: string): boolean {
    return this.tags?.includes(tag) ?? false;
  }

  /**
   * Atualiza o tempo de processamento
   */
  atualizarTempoProcessamento(): void {
    if (this.data_conclusao) {
      this.tempo_processamento_segundos = Math.floor(
        (this.data_conclusao.getTime() - this.created_at.getTime()) / 1000,
      );
    }
  }

  /**
   * Gera um resumo da solicitação
   */
  getResumo(): string {
    return `${this.codigo} - ${this.acao_critica?.nome || 'Ação'} solicitada por ${this.usuario_solicitante_nome} (${this.status})`;
  }
}
