import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { MetricaDefinicao, GranularidadeTemporal } from './metrica-definicao.entity';

/**
 * Snapshot de valor de uma métrica
 * 
 * Esta entidade armazena os valores coletados ou calculados para cada métrica
 * ao longo do tempo, mantendo um histórico completo para análise e visualização.
 */
@Entity('metrica_snapshot')
@Index(['definicao_id', 'periodo_inicio', 'periodo_fim', 'dimensoes_hash'], { unique: true })
@Index(['periodo_inicio', 'periodo_fim'])
export class MetricaSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Referência para a definição da métrica
   */
  @Column({ type: 'uuid' })
  definicao_id: string;

  /**
   * Relacionamento com a definição da métrica
   * 
   * Usando lazy loading para evitar dependências circulares
   */
  @ManyToOne(() => MetricaDefinicao, (definicao) => definicao.snapshots, { onDelete: 'CASCADE', lazy: true })
  @JoinColumn({ name: 'definicao_id' })
  definicao: Promise<MetricaDefinicao>;

  /**
   * Início do período de referência
   */
  @Column({ type: 'timestamp' })
  periodo_inicio: Date;

  /**
   * Fim do período de referência
   */
  @Column({ type: 'timestamp' })
  periodo_fim: Date;

  /**
   * Granularidade temporal do snapshot
   */
  @Column({
    type: 'enum',
    enum: GranularidadeTemporal,
    enumName: 'granularidade_temporal',
  })
  granularidade: GranularidadeTemporal;

  /**
   * Valor numérico da métrica
   */
  @Column({ type: 'decimal', precision: 20, scale: 6 })
  valor: number;

  /**
   * Valor formatado conforme configurações de exibição da métrica
   */
  @Column({ length: 100, nullable: true })
  valor_formatado: string;

  /**
   * Dimensões ou filtros aplicados na coleta do valor
   * Exemplo: { "regiao": "nordeste", "faixa_etaria": "18-25" }
   */
  @Column({ type: 'jsonb', default: {} })
  dimensoes: Record<string, any>;

  /**
   * Hash das dimensões para garantir unicidade
   * Gerado a partir do objeto de dimensões
   */
  @Column({ length: 64, default: '' })
  dimensoes_hash: string;

  /**
   * Metadados adicionais sobre o snapshot
   * Exemplo: fonte de dados específica, contexto da coleta
   */
  @Column({ type: 'jsonb', nullable: true })
  metadados: Record<string, any>;

  /**
   * Flag indicando se o valor foi validado após a coleta
   */
  @Column({ default: true })
  validado: boolean;

  /**
   * Versão da definição da métrica utilizada no cálculo
   */
  @Column({ default: 1 })
  versao_definicao: number;

  /**
   * Data e hora da coleta/cálculo do valor
   */
  @CreateDateColumn()
  created_at: Date;

  /**
   * Duração em milissegundos do processo de coleta/cálculo
   */
  @Column({ default: 0 })
  duracao_processamento_ms: number;

  /**
   * Status da coleta
   * 'sucesso', 'erro', 'parcial'
   */
  @Column({ length: 20, default: 'sucesso' })
  status_coleta: string;

  /**
   * Mensagem de erro ou informação adicional sobre o status
   */
  @Column({ type: 'text', nullable: true })
  mensagem_status: string;
}
