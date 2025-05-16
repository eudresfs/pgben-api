import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { Cidadao } from './cidadao.entity';

/**
 * Enum para tipos de papéis que um cidadão pode assumir
 */
export enum TipoPapel {
  BENEFICIARIO = 'beneficiario',
  REQUERENTE = 'requerente',
  REPRESENTANTE_LEGAL = 'representante_legal'
}

/**
 * Entidade de Papel do Cidadão
 * 
 * Estabelece uma relação N:M entre cidadãos e os papéis que podem assumir no sistema.
 * Um mesmo cidadão pode ter múltiplos papéis em diferentes contextos.
 */
@Entity('papel_cidadao')
@Index(['cidadao_id', 'tipo_papel'], { unique: true })
export class PapelCidadao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cidadao_id', type: 'uuid' })
  cidadao_id: string;

  @ManyToOne(() => Cidadao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  @Column({
    name: 'tipo_papel',
    type: 'enum',
    enum: TipoPapel
  })
  tipo_papel: TipoPapel;

  @Column({ type: 'jsonb', nullable: true })
  metadados: {
    grau_parentesco?: string;
    documento_representacao?: string;
    data_validade_representacao?: Date;
    [key: string]: any;
  };

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'removed_at' })
  removed_at: Date;
}
