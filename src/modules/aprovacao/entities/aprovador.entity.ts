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
import { TipoAprovador } from '../enums/aprovacao.enums';
import { ConfiguracaoAprovacao } from './configuracao-aprovacao.entity';
import { HistoricoAprovacao } from './historico-aprovacao.entity';

/**
 * Entidade que representa um aprovador configurado para uma regra de aprovação
 * 
 * Define quem pode aprovar uma determinada ação crítica, incluindo
 * usuários específicos, perfis, unidades ou hierarquias.
 */
@Entity('aprovador')
@Index(['configuracao_aprovacao_id', 'ativo'])
@Index(['tipo', 'referencia_id'])
@Index(['usuario_id', 'ativo'])
@Index(['perfil', 'ativo'])
@Index(['ordem_aprovacao'])
export class Aprovador {
  /**
   * Identificador único do aprovador
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tipo de aprovador (usuário, perfil, unidade, hierarquia)
   */
  @Column({
    type: 'enum',
    enum: TipoAprovador,
  })
  tipo: TipoAprovador;

  /**
   * ID do usuário específico (quando tipo = USUARIO)
   */
  @Column({ type: 'uuid', nullable: true })
  usuario_id?: string;

  /**
   * Nome do usuário (desnormalizado para performance)
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  usuario_nome?: string;

  /**
   * Email do usuário (desnormalizado para performance)
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  usuario_email?: string;

  /**
   * Perfil do aprovador (quando tipo = PERFIL)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  perfil?: string;

  /**
   * Unidade organizacional (quando tipo = UNIDADE)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  unidade?: string;

  /**
   * Nível hierárquico (quando tipo = HIERARQUIA)
   */
  @Column({ type: 'integer', nullable: true })
  nivel_hierarquico?: number;

  /**
   * ID de referência genérico para outros tipos
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  referencia_id?: string;

  /**
   * Descrição adicional do aprovador
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  descricao?: string;

  /**
   * Indica se o aprovador está ativo
   */
  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  /**
   * Ordem de aprovação (para estratégias hierárquicas)
   */
  @Column({ type: 'integer', default: 0 })
  ordem_aprovacao: number;

  /**
   * Peso da aprovação (para estratégias ponderadas)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  peso_aprovacao: number;

  /**
   * Indica se é um aprovador obrigatório
   */
  @Column({ type: 'boolean', default: false })
  obrigatorio: boolean;

  /**
   * Indica se pode delegar a aprovação
   */
  @Column({ type: 'boolean', default: false })
  pode_delegar: boolean;

  /**
   * Indica se pode escalar a aprovação
   */
  @Column({ type: 'boolean', default: false })
  pode_escalar: boolean;

  /**
   * Valor mínimo que este aprovador pode aprovar
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valor_minimo_aprovacao?: number;

  /**
   * Valor máximo que este aprovador pode aprovar
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valor_maximo_aprovacao?: number;

  /**
   * Horário de funcionamento específico do aprovador
   */
  @Column({ type: 'jsonb', nullable: true })
  horario_funcionamento?: {
    dias_semana: number[]; // 0-6 (domingo-sábado)
    hora_inicio: string;   // HH:mm
    hora_fim: string;      // HH:mm
    fuso_horario?: string;
  };

  /**
   * Canais de notificação preferenciais
   */
  @Column({ type: 'simple-array', nullable: true })
  canais_notificacao?: string[];

  /**
   * Configurações específicas do aprovador
   */
  @Column({ type: 'jsonb', nullable: true })
  configuracoes?: Record<string, any>;

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
   * Aprovador substituto (ID)
   */
  @Column({ type: 'uuid', nullable: true })
  aprovador_substituto_id?: string;

  /**
   * Motivo da substituição
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  motivo_substituicao?: string;

  /**
   * Data da última atividade
   */
  @Column({ type: 'timestamp', nullable: true })
  data_ultima_atividade?: Date;

  /**
   * Número total de aprovações realizadas
   */
  @Column({ type: 'integer', default: 0 })
  total_aprovacoes: number;

  /**
   * Número total de rejeições realizadas
   */
  @Column({ type: 'integer', default: 0 })
  total_rejeicoes: number;

  /**
   * Tempo médio de resposta (em minutos)
   */
  @Column({ type: 'integer', nullable: true })
  tempo_medio_resposta_minutos?: number;

  /**
   * Observações sobre o aprovador
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
   * Configuração de aprovação associada
   */
  @ManyToOne(() => ConfiguracaoAprovacao, config => config.aprovadores, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'configuracao_aprovacao_id' })
  configuracao_aprovacao: ConfiguracaoAprovacao;

  /**
   * ID da configuração de aprovação (chave estrangeira)
   */
  @Column({ type: 'uuid' })
  configuracao_aprovacao_id: string;

  /**
   * Histórico de aprovações realizadas por este aprovador
   */
  @OneToMany(() => HistoricoAprovacao, historico => historico.aprovador)
  historico_aprovacoes: HistoricoAprovacao[];

  // Métodos auxiliares

  /**
   * Verifica se o aprovador está ativo e vigente
   */
  isAtivo(): boolean {
    if (!this.ativo) {
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
   * Verifica se pode aprovar um valor específico
   */
  podeAprovarValor(valor?: number): boolean {
    if (valor === undefined || valor === null) {
      return true; // Se não há valor, pode aprovar
    }

    if (this.valor_minimo_aprovacao !== null && valor < this.valor_minimo_aprovacao) {
      return false;
    }

    if (this.valor_maximo_aprovacao !== null && valor > this.valor_maximo_aprovacao) {
      return false;
    }

    return true;
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
   * Verifica se corresponde a um usuário específico
   */
  correspondeUsuario(usuarioId: string): boolean {
    if (this.tipo === TipoAprovador.USUARIO) {
      return this.usuario_id === usuarioId;
    }
    return false;
  }

  /**
   * Verifica se corresponde a um perfil específico
   */
  correspondePerfil(perfil: string): boolean {
    if (this.tipo === TipoAprovador.PERFIL) {
      return this.perfil === perfil;
    }
    return false;
  }

  /**
   * Verifica se corresponde a uma unidade específica
   */
  correspondeUnidade(unidade: string): boolean {
    if (this.tipo === TipoAprovador.UNIDADE) {
      return this.unidade === unidade;
    }
    return false;
  }

  /**
   * Verifica se corresponde a um nível hierárquico
   */
  correspondeHierarquia(nivel: number): boolean {
    if (this.tipo === TipoAprovador.HIERARQUIA) {
      return this.nivel_hierarquico === nivel;
    }
    return false;
  }

  /**
   * Retorna os canais de notificação ou padrão
   */
  getCanaisNotificacao(): string[] {
    return this.canais_notificacao ?? ['email', 'sistema'];
  }

  /**
   * Calcula a taxa de aprovação
   */
  getTaxaAprovacao(): number {
    const total = this.total_aprovacoes + this.total_rejeicoes;
    if (total === 0) return 0;
    return (this.total_aprovacoes / total) * 100;
  }

  /**
   * Atualiza estatísticas após uma aprovação
   */
  atualizarEstatisticasAprovacao(tempoResposta?: number): void {
    this.total_aprovacoes++;
    this.data_ultima_atividade = new Date();
    
    if (tempoResposta) {
      if (this.tempo_medio_resposta_minutos) {
        // Média móvel simples
        this.tempo_medio_resposta_minutos = Math.round(
          (this.tempo_medio_resposta_minutos + tempoResposta) / 2
        );
      } else {
        this.tempo_medio_resposta_minutos = tempoResposta;
      }
    }
  }

  /**
   * Atualiza estatísticas após uma rejeição
   */
  atualizarEstatisticasRejeicao(tempoResposta?: number): void {
    this.total_rejeicoes++;
    this.data_ultima_atividade = new Date();
    
    if (tempoResposta) {
      if (this.tempo_medio_resposta_minutos) {
        // Média móvel simples
        this.tempo_medio_resposta_minutos = Math.round(
          (this.tempo_medio_resposta_minutos + tempoResposta) / 2
        );
      } else {
        this.tempo_medio_resposta_minutos = tempoResposta;
      }
    }
  }

  /**
   * Verifica se é um aprovador obrigatório
   */
  isObrigatorio(): boolean {
    return this.obrigatorio;
  }

  /**
   * Verifica se pode delegar
   */
  podeDelegar(): boolean {
    return this.pode_delegar;
  }

  /**
   * Verifica se pode escalar
   */
  podeEscalar(): boolean {
    return this.pode_escalar;
  }

  /**
   * Retorna uma descrição legível do aprovador
   */
  getDescricaoLegivel(): string {
    switch (this.tipo) {
      case TipoAprovador.USUARIO:
        return `Usuário: ${this.usuario_nome || this.usuario_email || this.usuario_id}`;
      case TipoAprovador.PERFIL:
        return `Perfil: ${this.perfil}`;
      case TipoAprovador.UNIDADE:
        return `Unidade: ${this.unidade}`;
      case TipoAprovador.HIERARQUIA:
        return `Hierarquia Nível: ${this.nivel_hierarquico}`;
      default:
        return `Aprovador: ${this.referencia_id || this.id}`;
    }
  }

  /**
   * Verifica se tem substituto configurado
   */
  temSubstituto(): boolean {
    return !!this.aprovador_substituto_id;
  }
}