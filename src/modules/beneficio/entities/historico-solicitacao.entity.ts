import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { SolicitacaoBeneficio } from './solicitacao-beneficio.entity';

/**
 * Entidade de Histórico de Solicitação de Benefício
 * 
 * Armazena o histórico de mudanças de status das solicitações de benefícios,
 * permitindo rastrear todo o fluxo de aprovação.
 */
@Entity('historico_solicitacao')
export class HistoricoSolicitacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'solicitacao_id', type: 'uuid' })
  solicitacao_id: string;

  @ManyToOne(() => SolicitacaoBeneficio)
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: SolicitacaoBeneficio;

  @Column({ name: 'status_anterior', type: 'varchar', length: 50, nullable: true })
  status_anterior: string;

  @Column({ name: 'status_novo', type: 'varchar', length: 50 })
  status_novo: string;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuario_id: string;

  @Column({ type: 'text', nullable: true })
  justificativa: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
