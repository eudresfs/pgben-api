import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PapelCidadao } from './papel-cidadao.entity';

/**
 * Entidade de Regra de Conflito de Papel
 *
 * Armazena as regras que definem conflitos entre papéis no sistema,
 * garantindo a integridade das regras de negócio.
 */
@Entity('regra_conflito_papel')
export class RegraConflitoPapel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'papel_origem_id', type: 'uuid' })
  papel_origem_id: string;

  @ManyToOne(() => PapelCidadao)
  @JoinColumn({ name: 'papel_origem_id' })
  papel_origem: PapelCidadao;

  @Column({ name: 'papel_destino_id', type: 'uuid' })
  papel_destino_id: string;

  @ManyToOne(() => PapelCidadao)
  @JoinColumn({ name: 'papel_destino_id' })
  papel_destino: PapelCidadao;

  @Column({ type: 'varchar', length: 255 })
  descricao: string;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updated_by: string;
}
