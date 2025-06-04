import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { MetricaSnapshot } from './metrica-snapshot.entity';
import { MetricaConfiguracao } from './metrica-configuracao.entity';

/**
 * Tipos de métricas suportados pelo sistema
 */
export enum TipoMetrica {
  /** Contagem simples de ocorrências */
  CONTAGEM = 'contagem',

  /** Soma de valores */
  SOMA = 'soma',

  /** Média de valores */
  MEDIA = 'media',

  /** Valor mínimo */
  MINIMO = 'minimo',

  /** Valor máximo */
  MAXIMO = 'maximo',

  /** Métrica calculada a partir de outras métricas usando fórmula personalizada */
  COMPOSTA = 'composta',

  /** Percentil (requer parâmetro adicional) */
  PERCENTIL = 'percentil',

  /** Contagem de valores distintos */
  CARDINALIDADE = 'cardinalidade',

  /** Taxa de variação entre períodos */
  TAXA_VARIACAO = 'taxa_variacao',
}

/**
 * Categorias de métricas para organização
 */
export enum CategoriaMetrica {
  FINANCEIRO = 'financeiro',
  OPERACIONAL = 'operacional',
  DESEMPENHO = 'desempenho',
  QUALIDADE = 'qualidade',
  USUARIO = 'usuario',
  BENEFICIO = 'beneficio',
  PROCESSAMENTO = 'processamento',
  SISTEMA = 'sistema',
}

/**
 * Granularidades temporais suportadas para agregação
 */
export enum GranularidadeTemporal {
  MINUTO = 'minuto',
  HORA = 'hora',
  DIA = 'dia',
  SEMANA = 'semana',
  MES = 'mes',
  TRIMESTRE = 'trimestre',
  ANO = 'ano',
}

/**
 * Definição de uma métrica no sistema
 *
 * Esta entidade armazena a definição de cada métrica, incluindo sua fórmula
 * de cálculo, tipo, categoria, e configurações de coleta e armazenamento.
 */
@Entity('metrica_definicao')
@Index(['codigo'], { unique: true })
export class MetricaDefinicao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Código único da métrica (snake_case)
   * Exemplo: 'tempo_medio_processamento_beneficio'
   */
  @Column({ length: 100, unique: true })
  codigo: string;

  /**
   * Nome de exibição da métrica
   * Exemplo: 'Tempo Médio de Processamento de Benefício'
   */
  @Column({ length: 100 })
  nome: string;

  /**
   * Descrição detalhada da métrica
   */
  @Column({ type: 'text' })
  descricao: string;

  /**
   * Tipo da métrica (contagem, soma, média, etc.)
   */
  @Column({
    type: 'enum',
    enum: TipoMetrica,
    enumName: 'tipo_metrica',
    default: TipoMetrica.CONTAGEM,
  })
  tipo: TipoMetrica;

  /**
   * Categoria da métrica para organização
   */
  @Column({
    type: 'enum',
    enum: CategoriaMetrica,
    enumName: 'categoria_metrica',
    default: CategoriaMetrica.OPERACIONAL,
  })
  categoria: CategoriaMetrica;

  /**
   * Unidade de medida da métrica
   * Exemplo: 'segundos', 'reais', 'percentual', 'quantidade'
   */
  @Column({ length: 50, nullable: true })
  unidade: string;

  /**
   * Prefixo a ser exibido antes do valor
   * Exemplo: 'R$', '$'
   */
  @Column({ length: 10, nullable: true })
  prefixo: string;

  /**
   * Sufixo a ser exibido após o valor
   * Exemplo: '%', 'ms'
   */
  @Column({ length: 10, nullable: true })
  sufixo: string;

  /**
   * Número de casas decimais a serem exibidas
   */
  @Column({ default: 2 })
  casas_decimais: number;

  /**
   * Consulta SQL para coletar dados (para métricas baseadas em banco de dados)
   */
  @Column({ type: 'text', nullable: true })
  sql_consulta: string;

  /**
   * Fórmula para cálculo (para métricas compostas)
   * Pode referenciar outras métricas usando seus códigos
   * Exemplo: 'metrica_a / metrica_b * 100'
   */
  @Column({ type: 'text', nullable: true })
  formula_calculo: string;

  /**
   * Fonte de dados da métrica
   * Exemplo: 'banco_dados', 'api', 'evento', 'arquivo'
   */
  @Column({ length: 50, default: 'banco_dados' })
  fonte_dados: string;

  /**
   * Especificação de como agregar os dados em diferentes períodos
   * Exemplo: 'soma', 'media', 'ultimo', 'primeiro'
   */
  @Column({ length: 20, default: 'soma' })
  agregacao_temporal: string;

  /**
   * Granularidade mínima de coleta/armazenamento
   */
  @Column({
    type: 'enum',
    enum: GranularidadeTemporal,
    enumName: 'granularidade_temporal',
    default: GranularidadeTemporal.DIA,
  })
  granularidade: GranularidadeTemporal;

  /**
   * Referência a outras métricas utilizadas no cálculo (caso seja composta)
   * Armazenado como array de códigos de métricas
   */
  @Column('simple-array', { nullable: true })
  metricas_dependentes: string[];

  /**
   * Flag que indica se a métrica está ativa para coleta
   */
  @Column({ default: true })
  ativa: boolean;

  /**
   * Parâmetros específicos para o tipo de métrica
   * Armazenado como JSON
   * Exemplo para PERCENTIL: { "percentil": 95 }
   */
  @Column({ type: 'jsonb', nullable: true })
  parametros_especificos: Record<string, any>;

  /**
   * Tags para filtrar e categorizar métricas
   */
  @Column('simple-array', { nullable: true })
  tags: string[];

  /**
   * Versão atual da definição da métrica
   */
  @Column({ default: 1 })
  versao: number;

  /**
   * Data da última coleta bem-sucedida
   */
  @Column({ type: 'timestamp', nullable: true })
  ultima_coleta: Date;

  /**
   * Flag que indica se a métrica é calculada em tempo real ou pré-calculada
   */
  @Column({ default: false })
  calculo_tempo_real: boolean;

  /**
   * Usuário que criou a métrica
   */
  @Column({ length: 100, nullable: true })
  criado_por: string;

  /**
   * Usuário que atualizou a métrica pela última vez
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

  /**
   * Relacionamento com snapshots históricos da métrica
   *
   * Usando lazy loading para evitar dependências circulares
   */
  @OneToMany(() => MetricaSnapshot, (snapshot) => snapshot.definicao, {
    lazy: true,
  })
  snapshots: Promise<MetricaSnapshot[]>;

  /**
   * Relacionamento com configurações de coleta e armazenamento
   *
   * Usando lazy loading para evitar dependências circulares
   */
  @OneToMany(() => MetricaConfiguracao, (config) => config.metrica, {
    lazy: true,
  })
  configuracoes: Promise<MetricaConfiguracao[]>;
}
