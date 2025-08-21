import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Usuario } from '../../../entities/usuario.entity';
import { Cidadao } from '../../../entities/cidadao.entity';
import { AgendamentoVisita } from './agendamento-visita.entity';
import { VisitaDomiciliar } from './visita-domiciliar.entity';
import { AvaliacaoVisita } from './avaliacao-visita.entity';

/**
 * Enum para tipos de ação no histórico
 */
export enum TipoAcaoHistorico {
  AGENDAMENTO_CRIADO = 'agendamento_criado',
  AGENDAMENTO_CONFIRMADO = 'agendamento_confirmado',
  AGENDAMENTO_REAGENDADO = 'agendamento_reagendado',
  AGENDAMENTO_CANCELADO = 'agendamento_cancelado',
  VISITA_INICIADA = 'visita_iniciada',
  VISITA_FINALIZADA = 'visita_finalizada',
  VISITA_CANCELADA = 'visita_cancelada',
  AVALIACAO_CRIADA = 'avaliacao_criada',
  AVALIACAO_ATUALIZADA = 'avaliacao_atualizada',
  OBSERVACAO_ADICIONADA = 'observacao_adicionada',
  STATUS_ALTERADO = 'status_alterado',
  DADOS_ATUALIZADOS = 'dados_atualizados',
}

/**
 * Enum para categorias de histórico
 */
export enum CategoriaHistorico {
  AGENDAMENTO = 'agendamento',
  VISITA = 'visita',
  AVALIACAO = 'avaliacao',
  SISTEMA = 'sistema',
}

/**
 * Entidade para rastreamento de histórico e auditoria do módulo de monitoramento
 * Registra todas as ações e mudanças realizadas no sistema
 */
@Entity('historico_monitoramento')
@Index(['cidadao_id', 'created_at'])
@Index(['tipo_acao', 'created_at'])
@Index(['categoria', 'created_at'])
@Index(['usuario_id', 'created_at'])
export class HistoricoMonitoramento {
  /**
   * Identificador único do registro de histórico
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tipo de ação realizada
   */
  @Column({
    type: 'enum',
    enum: TipoAcaoHistorico,
    comment: 'Tipo de ação realizada no sistema',
  })
  tipo_acao: TipoAcaoHistorico;

  /**
   * Categoria da ação para agrupamento
   */
  @Column({
    type: 'enum',
    enum: CategoriaHistorico,
    comment: 'Categoria da ação para organização',
  })
  categoria: CategoriaHistorico;

  /**
   * Descrição detalhada da ação
   */
  @Column({
    type: 'text',
    comment: 'Descrição detalhada da ação realizada',
  })
  descricao: string;

  /**
   * Dados anteriores (antes da mudança)
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Estado anterior dos dados (para auditoria)',
  })
  dados_anteriores: Record<string, any>;

  /**
   * Dados novos (após a mudança)
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Estado novo dos dados (para auditoria)',
  })
  dados_novos: Record<string, any>;

  /**
   * Metadados adicionais da ação
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Metadados adicionais (IP, user agent, etc.)',
  })
  metadados: Record<string, any>;

  /**
   * Observações adicionais
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: 'Observações adicionais sobre a ação',
  })
  observacoes: string;

  /**
   * Indica se a ação foi bem-sucedida
   */
  @Column({
    type: 'boolean',
    default: true,
    comment: 'Indica se a ação foi executada com sucesso',
  })
  sucesso: boolean;

  /**
   * Mensagem de erro (se houver)
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: 'Mensagem de erro caso a ação tenha falhado',
  })
  erro: string;

  /**
   * Duração da ação em milissegundos
   */
  @Column({
    type: 'integer',
    nullable: true,
    comment: 'Duração da ação em milissegundos',
  })
  duracao_ms: number;

  /**
   * Data e hora da ação
   */
  @CreateDateColumn({
    type: 'timestamp with time zone',
    comment: 'Data e hora da ação',
  })
  created_at: Date;

  // Relacionamentos

  /**
   * ID do usuário que realizou a ação
   */
  @Column({
    type: 'uuid',
    comment: 'ID do usuário que realizou a ação',
  })
  usuario_id: string;

  /**
   * Usuário que realizou a ação
   */
  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  /**
   * ID do cidadão relacionado (se aplicável)
   */
  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'ID do cidadão relacionado à ação',
  })
  cidadao_id: string;

  /**
   * Cidadão relacionado à ação
   */
  @ManyToOne(() => Cidadao, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  /**
   * ID do agendamento relacionado (se aplicável)
   */
  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'ID do agendamento relacionado à ação',
  })
  agendamento_id: string;

  /**
   * Agendamento relacionado à ação
   */
  @ManyToOne(() => AgendamentoVisita, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agendamento_id' })
  agendamento: AgendamentoVisita;

  /**
   * ID da visita relacionada (se aplicável)
   */
  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'ID da visita relacionada à ação',
  })
  visita_id: string;

  /**
   * Visita relacionada à ação
   */
  @ManyToOne(() => VisitaDomiciliar, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'visita_id' })
  visita: VisitaDomiciliar;

  /**
   * ID da avaliação relacionada (se aplicável)
   */
  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'ID da avaliação relacionada à ação',
  })
  avaliacao_id: string;

  /**
   * Avaliação relacionada à ação
   */
  @ManyToOne(() => AvaliacaoVisita, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'avaliacao_id' })
  avaliacao: AvaliacaoVisita;

  // Métodos de negócio

  /**
   * Verifica se a ação foi relacionada a um agendamento
   */
  isAcaoAgendamento(): boolean {
    return this.categoria === CategoriaHistorico.AGENDAMENTO;
  }

  /**
   * Verifica se a ação foi relacionada a uma visita
   */
  isAcaoVisita(): boolean {
    return this.categoria === CategoriaHistorico.VISITA;
  }

  /**
   * Verifica se a ação foi relacionada a uma avaliação
   */
  isAcaoAvaliacao(): boolean {
    return this.categoria === CategoriaHistorico.AVALIACAO;
  }

  /**
   * Verifica se a ação foi bem-sucedida
   */
  isSucesso(): boolean {
    return this.sucesso;
  }

  /**
   * Retorna um resumo da ação para logs
   */
  getResumoAcao(): string {
    const usuario = this.usuario?.nome || 'Sistema';
    const cidadao = this.cidadao?.nome || 'N/A';
    return `${usuario} - ${this.tipo_acao} - Cidadão: ${cidadao} - ${this.sucesso ? 'Sucesso' : 'Erro'}`;
  }

  /**
   * Retorna as mudanças realizadas (diff)
   */
  getMudancas(): Record<string, { anterior: any; novo: any }> {
    if (!this.dados_anteriores || !this.dados_novos) {
      return {};
    }

    const mudancas: Record<string, { anterior: any; novo: any }> = {};
    const campos = new Set([
      ...Object.keys(this.dados_anteriores),
      ...Object.keys(this.dados_novos),
    ]);

    campos.forEach((campo) => {
      const anterior = this.dados_anteriores[campo];
      const novo = this.dados_novos[campo];

      if (JSON.stringify(anterior) !== JSON.stringify(novo)) {
        mudancas[campo] = { anterior, novo };
      }
    });

    return mudancas;
  }

  /**
   * Verifica se houve mudanças nos dados
   */
  hasMudancas(): boolean {
    return Object.keys(this.getMudancas()).length > 0;
  }

  /**
   * Retorna a duração formatada
   */
  getDuracaoFormatada(): string {
    if (!this.duracao_ms) return 'N/A';

    if (this.duracao_ms < 1000) {
      return `${this.duracao_ms}ms`;
    }

    const segundos = Math.floor(this.duracao_ms / 1000);
    if (segundos < 60) {
      return `${segundos}s`;
    }

    const minutos = Math.floor(segundos / 60);
    const segundosRestantes = segundos % 60;
    return `${minutos}m ${segundosRestantes}s`;
  }
}