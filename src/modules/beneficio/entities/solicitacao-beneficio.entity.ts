import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { TipoBeneficio } from './tipo-beneficio.entity';

/**
 * Entidade de Solicitação de Benefício
 * 
 * Armazena as solicitações de benefícios com suporte a dados dinâmicos
 * específicos para cada tipo de benefício.
 */
@Entity('solicitacao_beneficio')
export class SolicitacaoBeneficio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cidadao_id', type: 'uuid' })
  cidadao_id: string;

  @Column({ name: 'tipo_beneficio_id', type: 'uuid' })
  tipo_beneficio_id: string;

  @ManyToOne(() => TipoBeneficio)
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column({ type: 'text', nullable: true })
  observacoes: string;

  @Column({ name: 'dados_dinamicos', type: 'jsonb' })
  dados_dinamicos: any;

  @Column({ name: 'versao_schema', type: 'integer' })
  versao_schema: number;

  @Column({ 
    name: 'status', 
    type: 'varchar', 
    length: 50,
    default: 'PENDENTE'
  })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
