import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { TipoAcaoCritica } from '../enums/aprovacao.enums';
import { ConfiguracaoAprovacao } from './configuracao-aprovacao.entity';
import { SolicitacaoAprovacao } from './solicitacao-aprovacao.entity';

/**
 * Entidade que representa uma ação crítica que pode ser configurada para aprovação
 *
 * Define os tipos de operações que requerem aprovação no sistema,
 * como cancelamento de solicitações, suspensão de benefícios, etc.
 */
@Entity('acoes_criticas')
@Index(['tipo', 'ativo'])
@Index(['codigo'])
export class AcaoCritica {
  /**
   * Identificador único da ação crítica
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Código único identificador da ação (usado para referência no sistema)
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  codigo: string;

  /**
   * Tipo da ação crítica (enum)
   */
  @Column({
    type: 'enum',
    enum: TipoAcaoCritica,
  })
  tipo: TipoAcaoCritica;

  /**
   * Nome descritivo da ação
   */
  @Column({ type: 'varchar', length: 200 })
  nome: string;

  /**
   * Descrição detalhada da ação crítica
   */
  @Column({ type: 'text', nullable: true })
  descricao?: string;

  /**
   * Módulo do sistema onde a ação é executada
   */
  @Column({ type: 'varchar', length: 100 })
  modulo: string;

  /**
   * Entidade alvo da ação (ex: Solicitacao, Beneficio, Cidadao, etc.)
   */
  @Column({ type: 'varchar', length: 100 })
  entidade_alvo: string;

  /**
   * Controlador responsável pela ação
   */
  @Column({ type: 'varchar', length: 100 })
  controlador: string;

  /**
   * Método/endpoint específico da ação
   */
  @Column({ type: 'varchar', length: 100 })
  metodo: string;

  /**
   * Indica se a ação está ativa para aprovação
   */
  @Column({ type: 'boolean', default: true, name: 'ativo' })
  ativo: boolean;

  /**
   * Indica se a ação requer justificativa obrigatória
   */
  @Column({ type: 'boolean', default: true })
  requer_justificativa: boolean;

  /**
   * Indica se a ação permite anexos na solicitação
   */
  @Column({ type: 'boolean', default: false })
  permite_anexos: boolean;

  /**
   * Nível de criticidade da ação (1-5, sendo 5 o mais crítico)
   */
  @Column({ type: 'integer', default: 3 })
  nivel_criticidade: number;

  /**
   * Tempo limite padrão para aprovação (em horas)
   */
  @Column({ type: 'integer', default: 24 })
  tempo_limite_horas: number;

  /**
   * Indica se a ação permite escalação automática
   */
  @Column({ type: 'boolean', default: true })
  permite_escalacao: boolean;

  /**
   * Indica se a ação permite delegação de aprovação
   */
  @Column({ type: 'boolean', default: false })
  permite_delegacao: boolean;

  /**
   * Configuração adicional em formato JSON
   */
  @Column({ type: 'jsonb', nullable: true })
  configuracao_adicional?: Record<string, any>;

  /**
   * Template de notificação específico para esta ação
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  template_notificacao?: string;

  /**
   * Campos obrigatórios que devem ser preenchidos na solicitação
   */
  @Column({ type: 'jsonb', nullable: true })
  campos_obrigatorios?: string[];

  /**
   * Regras de validação específicas da ação
   */
  @Column({ type: 'jsonb', nullable: true })
  regras_validacao?: Record<string, any>;

  /**
   * Ordem de exibição na interface
   */
  @Column({ type: 'integer', default: 0 })
  ordem: number;

  /**
   * Tags para categorização e busca
   */
  @Column({ type: 'text', array: true, nullable: true })
  tags?: string[];

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
   * Configurações de aprovação para esta ação
   */
  @OneToMany(() => ConfiguracaoAprovacao, (config) => config.acao_critica)
  configuracoes_aprovacao: ConfiguracaoAprovacao[];

  /**
   * Solicitações de aprovação para esta ação
   */
  @OneToMany(
    () => SolicitacaoAprovacao,
    (solicitacao) => solicitacao.acao_critica,
  )
  solicitacoes_aprovacao: SolicitacaoAprovacao[];

  // Métodos auxiliares

  /**
   * Verifica se a ação está ativa e pode receber solicitações
   */
  isAtiva(): boolean {
    return this.ativo;
  }

  /**
   * Verifica se a ação requer justificativa
   */
  requerJustificativa(): boolean {
    return this.requer_justificativa;
  }

  /**
   * Verifica se a ação permite anexos
   */
  permiteAnexos(): boolean {
    return this.permite_anexos;
  }

  /**
   * Retorna o tempo limite em milissegundos
   */
  getTempoLimiteMs(): number {
    return this.tempo_limite_horas * 60 * 60 * 1000;
  }

  /**
   * Verifica se é uma ação de alta criticidade (nível 4 ou 5)
   */
  isAltaCriticidade(): boolean {
    return this.nivel_criticidade >= 4;
  }

  /**
   * Retorna a configuração adicional ou valor padrão
   */
  getConfiguracao<T>(chave: string, padrao?: T): T {
    return this.configuracao_adicional?.[chave] ?? padrao;
  }

  /**
   * Verifica se um campo é obrigatório
   */
  isCampoObrigatorio(campo: string): boolean {
    return this.campos_obrigatorios?.includes(campo) ?? false;
  }

  /**
   * Retorna as tags como array
   */
  getTags(): string[] {
    return this.tags ?? [];
  }

  /**
   * Verifica se a ação possui uma tag específica
   */
  hasTag(tag: string): boolean {
    return this.getTags().includes(tag);
  }
}
