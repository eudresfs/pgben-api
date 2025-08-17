import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AcaoAprovacao, MotivoRejeicao } from '../enums/aprovacao.enums';
import { SolicitacaoAprovacao } from './solicitacao-aprovacao.entity';
import { Aprovador } from './aprovador.entity';

/**
 * Entidade que registra o histórico de todas as ações de aprovação
 *
 * Mantém um log completo de todas as aprovações, rejeições, delegações
 * e outras ações realizadas no processo de aprovação.
 */
@Entity('historico_aprovacao')
@Index(['solicitacao_aprovacao_id', 'created_at'])
@Index(['aprovador_id', 'acao'])
@Index(['usuario_id', 'acao'])
@Index(['acao', 'created_at'])
@Index(['created_at'])
export class HistoricoAprovacao {
  /**
   * Identificador único do registro de histórico
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Ação realizada (aprovar, rejeitar, delegar, etc.)
   */
  @Column({
    type: 'enum',
    enum: AcaoAprovacao,
  })
  acao: AcaoAprovacao;

  /**
   * ID do usuário que realizou a ação
   */
  @Column({ type: 'uuid' })
  usuario_id: string;

  /**
   * Nome do usuário (desnormalizado para performance)
   */
  @Column({ type: 'varchar', length: 200 })
  usuario_nome: string;

  /**
   * Email do usuário (desnormalizado para performance)
   */
  @Column({ type: 'varchar', length: 200 })
  usuario_email: string;

  /**
   * Perfil do usuário no momento da ação
   */
  @Column({ type: 'varchar', length: 100 })
  perfil_usuario: string;

  /**
   * Unidade organizacional do usuário
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  unidade_usuario?: string;

  /**
   * Justificativa da ação
   */
  @Column({ type: 'text', nullable: true })
  justificativa?: string;

  /**
   * Motivo da rejeição (quando aplicável)
   */
  @Column({
    type: 'enum',
    enum: MotivoRejeicao,
    nullable: true,
  })
  motivo_rejeicao?: MotivoRejeicao;

  /**
   * Observações adicionais
   */
  @Column({ type: 'text', nullable: true })
  observacoes?: string;

  /**
   * Dados contextuais da ação em formato JSON
   */
  @Column({ type: 'jsonb', nullable: true })
  dados_contexto?: Record<string, any>;

  /**
   * IP do usuário que realizou a ação
   */
  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_usuario?: string;

  /**
   * User Agent do usuário
   */
  @Column({ type: 'text', nullable: true })
  user_agent?: string;

  /**
   * Sessão do usuário
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  sessao_id?: string;

  /**
   * Localização geográfica (se disponível)
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  localizacao?: string;

  /**
   * Dispositivo utilizado
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  dispositivo?: string;

  /**
   * Tempo de resposta (em segundos) desde a notificação
   */
  @Column({ type: 'integer', nullable: true })
  tempo_resposta_segundos?: number;

  /**
   * Indica se a ação foi realizada automaticamente
   */
  @Column({ type: 'boolean', default: false })
  acao_automatica: boolean;

  /**
   * Sistema ou processo que realizou a ação automática
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  sistema_automatico?: string;

  /**
   * ID do usuário para quem foi delegada (se aplicável)
   */
  @Column({ type: 'uuid', nullable: true })
  delegado_para_usuario_id?: string;

  /**
   * Nome do usuário para quem foi delegada
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  delegado_para_usuario_nome?: string;

  /**
   * Motivo da delegação
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  motivo_delegacao?: string;

  /**
   * Nível de escalação (se aplicável)
   */
  @Column({ type: 'integer', nullable: true })
  nivel_escalacao?: number;

  /**
   * Motivo da escalação
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  motivo_escalacao?: string;

  /**
   * Anexos relacionados à ação
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
   * Hash para verificação de integridade
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  hash_integridade?: string;

  /**
   * Versão do sistema no momento da ação
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  versao_sistema?: string;

  /**
   * Indica se o registro foi auditado
   */
  @Column({ type: 'boolean', default: false })
  auditado: boolean;

  /**
   * Data da auditoria
   */
  @Column({ type: 'timestamp', nullable: true })
  data_auditoria?: Date;

  /**
   * ID do auditor
   */
  @Column({ type: 'uuid', nullable: true })
  auditor_id?: string;

  /**
   * Observações da auditoria
   */
  @Column({ type: 'text', nullable: true })
  observacoes_auditoria?: string;

  /**
   * Data de criação do registro
   */
  @CreateDateColumn()
  created_at: Date;

  // Relacionamentos

  /**
   * Solicitação de aprovação associada
   */
  @ManyToOne(
    () => SolicitacaoAprovacao,
    (solicitacao) => solicitacao.historico_aprovacoes,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'solicitacao_aprovacao_id' })
  solicitacao_aprovacao: SolicitacaoAprovacao;

  /**
   * ID da solicitação de aprovação (chave estrangeira)
   */
  @Column({ type: 'uuid' })
  solicitacao_aprovacao_id: string;

  /**
   * Aprovador que realizou a ação (se aplicável)
   */
  @ManyToOne(() => Aprovador, (aprovador) => aprovador.historico_aprovacoes, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'aprovador_id' })
  aprovador?: Aprovador;

  /**
   * ID do aprovador (chave estrangeira)
   */
  @Column({ type: 'uuid', nullable: true })
  aprovador_id?: string;

  // Métodos auxiliares

  /**
   * Verifica se é uma ação de aprovação
   */
  isAprovacao(): boolean {
    return this.acao === AcaoAprovacao.APROVAR;
  }

  /**
   * Verifica se é uma ação de rejeição
   */
  isRejeicao(): boolean {
    return this.acao === AcaoAprovacao.REJEITAR;
  }

  /**
   * Verifica se é uma ação de delegação
   */
  isDelegacao(): boolean {
    return this.acao === AcaoAprovacao.DELEGAR;
  }

  /**
   * Verifica se é uma ação de escalação
   */
  isEscalacao(): boolean {
    return this.acao === AcaoAprovacao.ESCALAR;
  }

  /**
   * Verifica se é uma solicitação de informações
   */
  isSolicitacaoInformacoes(): boolean {
    return this.acao === AcaoAprovacao.SOLICITAR_INFORMACOES;
  }

  /**
   * Verifica se a ação foi realizada automaticamente
   */
  isAcaoAutomatica(): boolean {
    return this.acao_automatica;
  }

  /**
   * Verifica se foi delegada para alguém
   */
  foiDelegada(): boolean {
    return !!this.delegado_para_usuario_id;
  }

  /**
   * Verifica se é uma escalação
   */
  isEscalada(): boolean {
    return this.nivel_escalacao !== null && this.nivel_escalacao !== undefined;
  }

  /**
   * Retorna o tempo de resposta em formato legível
   */
  getTempoRespostaLegivel(): string {
    if (!this.tempo_resposta_segundos) {
      return 'N/A';
    }

    const segundos = this.tempo_resposta_segundos;
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;

    if (horas > 0) {
      return `${horas}h ${minutos}m ${segs}s`;
    } else if (minutos > 0) {
      return `${minutos}m ${segs}s`;
    } else {
      return `${segs}s`;
    }
  }

  /**
   * Retorna uma descrição da ação
   */
  getDescricaoAcao(): string {
    const acoes = {
      [AcaoAprovacao.APROVAR]: 'Aprovação',
      [AcaoAprovacao.REJEITAR]: 'Rejeição',
      [AcaoAprovacao.DELEGAR]: 'Delegação',
      [AcaoAprovacao.ESCALAR]: 'Escalação',
      [AcaoAprovacao.SOLICITAR_INFORMACOES]: 'Solicitação de Informações',
    };
    return acoes[this.acao] || 'Ação Desconhecida';
  }

  /**
   * Verifica se possui anexos
   */
  temAnexos(): boolean {
    return this.anexos && this.anexos.length > 0;
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
   * Retorna um resumo da ação
   */
  getResumo(): string {
    const acao = this.getDescricaoAcao();
    const usuario = this.usuario_nome || this.usuario_email;
    const data = this.created_at.toLocaleDateString('pt-BR');

    return `${acao} por ${usuario} em ${data}`;
  }

  /**
   * Verifica se o registro foi auditado
   */
  foiAuditado(): boolean {
    return this.auditado;
  }

  /**
   * Marca o registro como auditado
   */
  marcarComoAuditado(auditorId: string, observacoes?: string): void {
    this.auditado = true;
    this.data_auditoria = new Date();
    this.auditor_id = auditorId;
    if (observacoes) {
      this.observacoes_auditoria = observacoes;
    }
  }

  /**
   * Retorna dados para auditoria
   */
  getDadosAuditoria(): Record<string, any> {
    return {
      id: this.id,
      acao: this.acao,
      usuario: {
        id: this.usuario_id,
        nome: this.usuario_nome,
        email: this.usuario_email,
        perfil: this.perfil_usuario,
      },
      solicitacao_id: this.solicitacao_aprovacao_id,
      aprovador_id: this.aprovador_id,
      justificativa: this.justificativa,
      data_acao: this.created_at,
      ip: this.ip_usuario,
      automatica: this.acao_automatica,
    };
  }
}
