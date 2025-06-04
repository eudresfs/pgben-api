import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkflowAcaoEnum } from '../enums';

/**
 * Entidade que representa um workflow de aprovação para um tipo de benefício.
 * Define a sequência de etapas, setores responsáveis e prazos para cada
 * tipo de benefício no sistema.
 */
@Entity('configuracao_workflow_beneficio')
export class WorkflowBeneficio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Referência ao tipo de benefício ao qual este workflow se aplica.
   */
  @Column({ type: 'uuid' })
  @Index('idx_workflow_tipo_beneficio')
  tipo_beneficio_id: string;

  /**
   * Nome descritivo do workflow.
   */
  @Column({ type: 'varchar', length: 200 })
  nome: string;

  /**
   * Descrição detalhada do workflow.
   */
  @Column({ type: 'varchar', length: 500 })
  descricao: string;

  /**
   * Lista de etapas do workflow, armazenada como JSON.
   * Cada etapa contém informações sobre ordem, descrição, setor, ação, etc.
   */
  @Column({ type: 'jsonb' })
  etapas: {
    ordem: number;
    descricao: string;
    setor_id: string;
    acao: WorkflowAcaoEnum;
    prazo_sla: number;
    template_notificacao_id?: string;
  }[];

  /**
   * Versão do workflow, incrementada a cada atualização.
   */
  @Column({ type: 'integer', default: 1 })
  version: number;

  /**
   * SLA total do workflow em horas, calculado como a soma dos SLAs de todas as etapas.
   */
  @Column({ type: 'float', default: 0 })
  sla_total: number;

  /**
   * Status ativo/inativo do workflow.
   */
  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  /**
   * Data de criação do workflow.
   */
  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  /**
   * Data da última atualização do workflow.
   */
  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  /**
   * ID do usuário que realizou a última atualização.
   */
  @Column({ type: 'uuid', nullable: true })
  updated_by: string;
}
