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
  EstrategiaAprovacao,
  StatusConfiguracaoAprovacao,
  PrioridadeAprovacao,
} from '../enums/aprovacao.enums';
import { AcaoCritica } from './acao-critica.entity';
import { Aprovador } from './aprovador.entity';
import { SolicitacaoAprovacao } from './solicitacao-aprovacao.entity';

/**
 * Entidade que representa a configuração de aprovação para uma ação crítica
 *
 * Define como uma ação específica deve ser aprovada, incluindo estratégia,
 * aprovadores, prazos e condições especiais.
 */
@Entity('configuracoes_aprovacao')
@Index(['acao_critica_id', 'perfil_solicitante', 'status'])
@Index(['status', 'ativa'])
@Index(['prioridade'])
export class ConfiguracaoAprovacao {
  /**
   * Identificador único da configuração
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Nome descritivo da configuração
   */
  @Column({ type: 'varchar', length: 200 })
  nome: string;

  /**
   * Descrição detalhada da configuração
   */
  @Column({ type: 'text', nullable: true })
  descricao?: string;

  /**
   * Estratégia de aprovação a ser utilizada
   */
  @Column({
    type: 'enum',
    enum: EstrategiaAprovacao,
    default: EstrategiaAprovacao.MAIORIA,
  })
  estrategia: EstrategiaAprovacao;

  /**
   * Status da configuração
   */
  @Column({
    type: 'enum',
    enum: StatusConfiguracaoAprovacao,
    default: StatusConfiguracaoAprovacao.ATIVA,
  })
  status: StatusConfiguracaoAprovacao;

  /**
   * Indica se a configuração está ativa
   */
  @Column({ type: 'boolean', default: true, name: 'ativa' })
  ativa: boolean;

  /**
   * Perfil do usuário solicitante (null = todos os perfis)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  perfil_solicitante?: string;

  /**
   * Unidade organizacional (null = todas as unidades)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  unidade?: string;

  /**
   * Prioridade da configuração (maior valor = maior prioridade)
   */
  @Column({
    type: 'enum',
    enum: PrioridadeAprovacao,
    default: PrioridadeAprovacao.NORMAL,
  })
  prioridade: PrioridadeAprovacao;

  /**
   * Número mínimo de aprovações necessárias
   */
  @Column({ type: 'integer', default: 1 })
  min_aprovacoes: number;

  /**
   * Número máximo de aprovações permitidas
   */
  @Column({ type: 'integer', nullable: true })
  max_aprovacoes?: number;

  /**
   * Tempo limite para aprovação (em horas)
   */
  @Column({ type: 'integer', default: 24 })
  tempo_limite_horas: number;

  /**
   * Tempo para primeiro lembrete (em horas)
   */
  @Column({ type: 'integer', default: 4 })
  tempo_lembrete_horas: number;

  /**
   * Tempo para escalação automática (em horas)
   */
  @Column({ type: 'integer', nullable: true })
  tempo_escalacao_horas?: number;

  /**
   * Indica se permite aprovação paralela
   */
  @Column({ type: 'boolean', default: true })
  permite_aprovacao_paralela: boolean;

  /**
   * Indica se permite auto-aprovação pelo solicitante
   */
  @Column({ type: 'boolean', default: false })
  permite_auto_aprovacao: boolean;

  /**
   * Indica se requer justificativa na aprovação
   */
  @Column({ type: 'boolean', default: false })
  requer_justificativa_aprovacao: boolean;

  /**
   * Indica se requer justificativa na rejeição
   */
  @Column({ type: 'boolean', default: true })
  requer_justificativa_rejeicao: boolean;

  /**
   * Valor mínimo que aciona esta configuração
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valor_minimo?: number;

  /**
   * Valor máximo que aciona esta configuração
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valor_maximo?: number;

  /**
   * Condições adicionais em formato JSON
   */
  @Column({ type: 'jsonb', nullable: true })
  condicoes_adicionais?: Record<string, any>;

  /**
   * Configuração da estratégia personalizada
   */
  @Column({ type: 'jsonb', nullable: true })
  configuracao_estrategia?: Record<string, any>;

  /**
   * Canais de notificação preferenciais
   */
  @Column({ type: 'simple-array', nullable: true })
  canais_notificacao?: string[];

  /**
   * Template de notificação específico
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  template_notificacao?: string;

  /**
   * Horário de funcionamento (formato JSON)
   */
  @Column({ type: 'jsonb', nullable: true })
  horario_funcionamento?: {
    dias_semana: number[]; // 0-6 (domingo-sábado)
    hora_inicio: string; // HH:mm
    hora_fim: string; // HH:mm
    fuso_horario?: string;
  };

  /**
   * Feriados que devem ser considerados
   */
  @Column({ type: 'simple-array', nullable: true })
  feriados_considerados?: string[];

  /**
   * Ordem de prioridade para múltiplas configurações
   */
  @Column({ type: 'integer', default: 0 })
  ordem_prioridade: number;

  /**
   * Data de início de vigência
   */
  @Column({ type: 'timestamp', nullable: true })
  data_inicio_vigencia?: Date;

  /**
   * Data de fim de vigência
   */
  @Column({ type: 'timestamp', nullable: true })
  data_fim_vigencia?: Date;

  /**
   * Observações adicionais
   */
  @Column({ type: 'text', nullable: true })
  observacoes?: string;

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
  @ManyToOne(() => AcaoCritica, (acao) => acao.configuracoes_aprovacao, {
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
   * Aprovadores configurados para esta regra
   */
  @OneToMany(() => Aprovador, (aprovador) => aprovador.configuracao_aprovacao)
  aprovadores: Aprovador[];

  /**
   * Solicitações que utilizaram esta configuração
   */
  @OneToMany(
    () => SolicitacaoAprovacao,
    (solicitacao) => solicitacao.configuracao_aprovacao,
  )
  solicitacoes: SolicitacaoAprovacao[];

  // Métodos auxiliares

  /**
   * Verifica se a configuração está ativa e vigente
   */
  isAtiva(): boolean {
    if (!this.ativa || this.status !== StatusConfiguracaoAprovacao.ATIVA) {
      return false;
    }

    const agora = new Date();

    if (this.data_inicio_vigencia && agora < this.data_inicio_vigencia) {
      return false;
    }

    if (this.data_fim_vigencia && agora > this.data_fim_vigencia) {
      return false;
    }

    return true;
  }

  /**
   * Verifica se um valor está dentro do range configurado
   */
  isValorValido(valor?: number): boolean {
    if (valor === undefined || valor === null) {
      return this.valor_minimo === null && this.valor_maximo === null;
    }

    if (this.valor_minimo !== null && valor < this.valor_minimo) {
      return false;
    }

    if (this.valor_maximo !== null && valor > this.valor_maximo) {
      return false;
    }

    return true;
  }

  /**
   * Verifica se um perfil é válido para esta configuração
   */
  isPerfilValido(perfil: string): boolean {
    return !this.perfil_solicitante || this.perfil_solicitante === perfil;
  }

  /**
   * Verifica se uma unidade é válida para esta configuração
   */
  isUnidadeValida(unidade?: string): boolean {
    return !this.unidade || this.unidade === unidade;
  }

  /**
   * Retorna o tempo limite em milissegundos
   */
  getTempoLimiteMs(): number {
    return this.tempo_limite_horas * 60 * 60 * 1000;
  }

  /**
   * Retorna o tempo de lembrete em milissegundos
   */
  getTempoLembreteMs(): number {
    return this.tempo_lembrete_horas * 60 * 60 * 1000;
  }

  /**
   * Retorna o tempo de escalação em milissegundos
   */
  getTempoEscalacaoMs(): number | null {
    return this.tempo_escalacao_horas
      ? this.tempo_escalacao_horas * 60 * 60 * 1000
      : null;
  }

  /**
   * Verifica se está no horário de funcionamento
   */
  isHorarioFuncionamento(data: Date = new Date()): boolean {
    if (!this.horario_funcionamento) {
      return true; // Se não configurado, sempre funciona
    }

    const diaSemana = data.getDay();
    const hora = data.getHours();
    const minuto = data.getMinutes();
    const horaAtual = hora * 60 + minuto;

    const { dias_semana, hora_inicio, hora_fim } = this.horario_funcionamento;

    if (!dias_semana.includes(diaSemana)) {
      return false;
    }

    const [horaIni, minIni] = hora_inicio.split(':').map(Number);
    const [horaFim, minFim] = hora_fim.split(':').map(Number);
    const inicioMinutos = horaIni * 60 + minIni;
    const fimMinutos = horaFim * 60 + minFim;

    return horaAtual >= inicioMinutos && horaAtual <= fimMinutos;
  }

  /**
   * Retorna os canais de notificação ou padrão
   */
  getCanaisNotificacao(): string[] {
    return this.canais_notificacao ?? ['email', 'sistema'];
  }

  /**
   * Verifica se permite auto-aprovação
   */
  permiteAutoAprovacao(): boolean {
    return this.permite_auto_aprovacao;
  }

  /**
   * Calcula a prioridade numérica
   */
  getPrioridadeNumerica(): number {
    const prioridades = {
      [PrioridadeAprovacao.BAIXA]: 1,
      [PrioridadeAprovacao.NORMAL]: 2,
      [PrioridadeAprovacao.ALTA]: 3,
      [PrioridadeAprovacao.CRITICA]: 4,
      [PrioridadeAprovacao.EMERGENCIAL]: 5,
    };
    return prioridades[this.prioridade] || 2;
  }
}
