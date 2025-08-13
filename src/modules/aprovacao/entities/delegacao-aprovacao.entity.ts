import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { SolicitacaoAprovacao } from './solicitacao-aprovacao.entity';
import { TipoAcaoCritica } from '../enums/aprovacao.enums';

/**
 * Entidade que representa uma delegação de aprovação
 * 
 * Permite que um aprovador delegue sua autoridade de aprovação
 * para outro usuário por um período específico ou para tipos
 * específicos de ações críticas.
 */
@Entity('delegacoes_aprovacao')
@Index(['aprovador_origem_id', 'ativo'])
@Index(['aprovador_delegado_id', 'ativo'])
@Index(['data_inicio', 'data_fim'])
export class DelegacaoAprovacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * ID do aprovador que está delegando sua autoridade
   */
  @Column({ type: 'uuid' })
  @Index()
  aprovador_origem_id: string;

  /**
   * ID do usuário que receberá a autoridade delegada
   */
  @Column({ type: 'uuid' })
  @Index()
  aprovador_delegado_id: string;

  /**
   * Motivo da delegação
   */
  @Column({ type: 'text' })
  motivo: string;

  /**
   * Data de início da delegação
   */
  @Column({ type: 'timestamp' })
  @Index()
  data_inicio: Date;

  /**
   * Data de fim da delegação
   */
  @Column({ type: 'timestamp' })
  @Index()
  data_fim: Date;

  /**
   * Escopo da delegação (GLOBAL, UNIDADE, DEPARTAMENTO)
   */
  @Column({ type: 'varchar', length: 50, default: 'GLOBAL' })
  escopo: string;

  /**
   * Tipos de ação crítica que podem ser aprovadas na delegação
   * Se null, permite todas as ações que o aprovador original pode aprovar
   */
  @Column({ type: 'simple-array', nullable: true })
  tipos_acao_permitidos?: TipoAcaoCritica[];

  /**
   * Valor máximo que pode ser aprovado na delegação
   * Se null, não há limite de valor
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  valor_maximo?: number;

  /**
   * Condições específicas para a delegação
   * Pode incluir regras customizadas, horários específicos, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  condicoes_especificas?: {
    horario_inicio?: string; // HH:mm
    horario_fim?: string; // HH:mm
    dias_semana?: number[]; // 0-6 (domingo-sábado)
    unidades_permitidas?: string[];
    departamentos_permitidos?: string[];
    requer_justificativa_adicional?: boolean;
    limite_aprovacoes_dia?: number;
    categorias_permitidas?: string[];
    [key: string]: any;
  };

  /**
   * Unidades organizacionais onde a delegação é válida
   * Se null, válida para todas as unidades do aprovador original
   */
  @Column({ type: 'simple-array', nullable: true })
  unidades_permitidas?: string[];

  /**
   * Se a delegação está ativa
   */
  @Column({ type: 'boolean', default: true })
  @Index()
  ativo: boolean;

  /**
   * Se deve notificar o aprovador original sobre aprovações feitas pelo delegado
   */
  @Column({ type: 'boolean', default: true })
  notificar_aprovador_origem: boolean;

  /**
   * Se deve notificar o delegado sobre novas solicitações
   */
  @Column({ type: 'boolean', default: true })
  notificar_delegado: boolean;

  /**
   * Se a delegação pode ser revogada pelo aprovador original
   */
  @Column({ type: 'boolean', default: true })
  permite_revogacao: boolean;

  /**
   * Data de revogação da delegação (se aplicável)
   */
  @Column({ type: 'timestamp', nullable: true })
  data_revogacao?: Date;

  /**
   * ID do usuário que revogou a delegação
   */
  @Column({ type: 'uuid', nullable: true })
  revogado_por?: string;

  /**
   * Motivo da revogação
   */
  @Column({ type: 'text', nullable: true })
  motivo_revogacao?: string;

  /**
   * Contador de aprovações realizadas através desta delegação
   */
  @Column({ type: 'int', default: 0 })
  total_aprovacoes_realizadas: number;

  /**
   * Data da última aprovação realizada através desta delegação
   */
  @Column({ type: 'timestamp', nullable: true })
  ultima_aprovacao_em?: Date;

  /**
   * Observações adicionais sobre a delegação
   */
  @Column({ type: 'text', nullable: true })
  observacoes?: string;

  /**
   * Metadados adicionais da delegação
   */
  @Column({ type: 'jsonb', nullable: true })
  metadados?: {
    ip_criacao?: string;
    user_agent_criacao?: string;
    localizacao_criacao?: string;
    dispositivo_criacao?: string;
    aprovacao_automatica?: boolean;
    nivel_confianca?: number;
    tags?: string[];
    [key: string]: any;
  };

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // === Relacionamentos ===

  /**
   * Solicitações de aprovação processadas através desta delegação
   */
  // @OneToMany(() => SolicitacaoAprovacao, solicitacao => solicitacao.delegacao_aprovacao)
  // solicitacoes_processadas: SolicitacaoAprovacao[];

  // === Métodos de Conveniência ===

  /**
   * Verifica se a delegação está ativa no momento atual
   */
  get estaAtiva(): boolean {
    const agora = new Date();
    return (
      this.ativo &&
      agora >= this.data_inicio &&
      agora <= this.data_fim &&
      !this.data_revogacao
    );
  }

  /**
   * Verifica se a delegação permite aprovar um tipo específico de ação
   */
  podeAprovarTipoAcao(tipoAcao: TipoAcaoCritica): boolean {
    if (!this.estaAtiva) {
      return false;
    }

    // Se não há restrição de tipos, permite todos
    if (!this.tipos_acao_permitidos || this.tipos_acao_permitidos.length === 0) {
      return true;
    }

    return this.tipos_acao_permitidos.includes(tipoAcao);
  }

  /**
   * Verifica se a delegação permite aprovar um valor específico
   */
  podeAprovarValor(valor?: number): boolean {
    if (!this.estaAtiva) {
      return false;
    }

    // Se não há limite de valor, permite qualquer valor
    if (!this.valor_maximo) {
      return true;
    }

    // Se não há valor na solicitação, permite
    if (!valor) {
      return true;
    }

    return valor <= this.valor_maximo;
  }

  /**
   * Verifica se a delegação está dentro do horário permitido
   */
  estaNoHorarioPermitido(): boolean {
    if (!this.estaAtiva || !this.condicoes_especificas) {
      return true;
    }

    const agora = new Date();
    const { horario_inicio, horario_fim, dias_semana } = this.condicoes_especificas;

    // Verifica dia da semana
    if (dias_semana && dias_semana.length > 0) {
      const diaAtual = agora.getDay();
      if (!dias_semana.includes(diaAtual)) {
        return false;
      }
    }

    // Verifica horário
    if (horario_inicio && horario_fim) {
      const horaAtual = agora.getHours() * 100 + agora.getMinutes();
      const [horaIni, minIni] = horario_inicio.split(':').map(Number);
      const [horaFim, minFim] = horario_fim.split(':').map(Number);
      const horarioIni = horaIni * 100 + minIni;
      const horarioFim = horaFim * 100 + minFim;

      if (horaAtual < horarioIni || horaAtual > horarioFim) {
        return false;
      }
    }

    return true;
  }

  /**
   * Incrementa o contador de aprovações realizadas
   */
  registrarAprovacaoRealizada(): void {
    this.total_aprovacoes_realizadas++;
    this.ultima_aprovacao_em = new Date();
  }

  /**
   * Revoga a delegação
   */
  revogar(revogadoPor: string, motivo: string): void {
    this.ativo = false;
    this.data_revogacao = new Date();
    this.revogado_por = revogadoPor;
    this.motivo_revogacao = motivo;
  }
}