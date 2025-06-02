import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { MetricaDefinicao } from './metrica-definicao.entity';

/**
 * Tipos de agendamento de coleta de métricas
 */
export enum TipoAgendamento {
  /** Intervalo fixo em segundos */
  INTERVALO = 'intervalo',
  
  /** Expressão cron para agendamento mais complexo */
  CRON = 'cron',
  
  /** Coleta baseada em eventos específicos */
  EVENTO = 'evento',
  
  /** Coleta manual via API */
  MANUAL = 'manual',
}

/**
 * Estratégias de amostragem para coleta de dados
 */
export enum EstrategiaAmostragem {
  /** Coleta todos os dados disponíveis */
  COMPLETA = 'completa',
  
  /** Amostragem aleatória */
  ALEATORIA = 'aleatoria',
  
  /** Amostragem sistemática (a cada N registros) */
  SISTEMATICA = 'sistematica',
  
  /** Amostragem estratificada por dimensão */
  ESTRATIFICADA = 'estratificada',
}

/**
 * Configuração para coleta, armazenamento e exibição de uma métrica
 * 
 * Esta entidade permite configurar como uma métrica será coletada,
 * processada, armazenada e exibida no sistema.
 */
@Entity('metrica_configuracao')
@Index(['metrica_id'])
export class MetricaConfiguracao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Referência para a definição da métrica
   */
  @Column({ type: 'uuid' })
  metrica_id: string;

  /**
   * Relacionamento com a definição da métrica
   * 
   * Usando lazy loading para evitar dependências circulares
   */
  @ManyToOne(() => MetricaDefinicao, (definicao) => definicao.configuracoes, { onDelete: 'CASCADE', lazy: true })
  @JoinColumn({ name: 'metrica_id' })
  metrica: Promise<MetricaDefinicao>;

  /**
   * Habilita ou desabilita a coleta automática
   */
  @Column({ default: true })
  coleta_automatica: boolean;

  /**
   * Tipo de agendamento para coleta automática
   */
  @Column({
    type: 'enum',
    enum: TipoAgendamento,
    enumName: 'tipo_agendamento',
    default: TipoAgendamento.INTERVALO,
  })
  tipo_agendamento: TipoAgendamento;

  /**
   * Valor do intervalo de coleta em segundos (para tipo INTERVALO)
   */
  @Column({ default: 86400 }) // Padrão: 1 dia
  intervalo_segundos: number;

  /**
   * Expressão cron para agendamento complexo (para tipo CRON)
   * Exemplo: '0 0 * * *' (diariamente à meia-noite)
   */
  @Column({ length: 100, nullable: true })
  expressao_cron: string;

  /**
   * Nome do evento que dispara a coleta (para tipo EVENTO)
   * Exemplo: 'beneficio_aprovado', 'usuario_cadastrado'
   */
  @Column({ length: 100, nullable: true })
  nome_evento: string;

  /**
   * Número máximo de snapshots a serem mantidos
   * (0 = sem limite, mantém todo o histórico)
   */
  @Column({ default: 0 })
  max_snapshots: number;

  /**
   * Período máximo de retenção em dias
   * (0 = sem limite, mantém todo o histórico)
   */
  @Column({ default: 365 })
  periodo_retencao_dias: number;

  /**
   * Estratégia de amostragem para coleta de dados
   */
  @Column({
    type: 'enum',
    enum: EstrategiaAmostragem,
    enumName: 'estrategia_amostragem',
    default: EstrategiaAmostragem.COMPLETA,
  })
  estrategia_amostragem: EstrategiaAmostragem;

  /**
   * Tamanho da amostra (quando aplicável)
   */
  @Column({ default: 0 })
  tamanho_amostra: number;

  /**
   * Habilita ou desabilita o cacheamento dos valores
   */
  @Column({ default: true })
  cacheamento_habilitado: boolean;

  /**
   * Tempo de vida do cache em segundos
   */
  @Column({ default: 300 }) // Padrão: 5 minutos
  cache_ttl: number;

  /**
   * Configurações de alertas baseados no valor da métrica
   * Exemplo: [
   *   { "tipo": "valor_maximo", "valor": 100, "mensagem": "Valor excedeu o limite", "severidade": "alta" },
   *   { "tipo": "valor_minimo", "valor": 10, "mensagem": "Valor abaixo do mínimo", "severidade": "media" }
   * ]
   */
  @Column({ type: 'jsonb', nullable: true })
  alertas: any[];

  /**
   * Configurações de visualização
   * Exemplo: { "cor": "#FF5500", "icone": "chart-line", "destaque": true }
   */
  @Column({ type: 'jsonb', nullable: true })
  visualizacao: Record<string, any>;

  /**
   * Flag que indica se a métrica deve ser exibida em dashboards
   */
  @Column({ default: true })
  exibir_dashboard: boolean;

  /**
   * Prioridade de exibição (ordem) no dashboard (menor = mais importante)
   */
  @Column({ default: 100 })
  prioridade_dashboard: number;

  /**
   * Usuário que criou a configuração
   */
  @Column({ length: 100, nullable: true })
  criado_por: string;

  /**
   * Usuário que atualizou a configuração pela última vez
   */
  @Column({ length: 100, nullable: true })
  atualizado_por: string;

  /**
   * Data de criação do registro
   */
  @CreateDateColumn()
  created_at: Date;

  /**
   * Data da última atualização do registro
   */
  @UpdateDateColumn()
  updated_at: Date;
}
