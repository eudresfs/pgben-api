import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Cidadao } from './cidadao.entity';
import { TipoPapel, PaperType } from '../enums/tipo-papel.enum';

/**
 * Entidade de Histórico de Conversão de Papel
 *
 * Registra o histórico de conversões de papéis de cidadãos no sistema,
 * permitindo rastrear quando um cidadão foi convertido de um papel para outro.
 */
@Entity('historico_conversao_papel')
@Index(['cidadao_id', 'created_at'])
export class HistoricoConversaoPapel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cidadao_id', type: 'uuid' })
  cidadao_id: string;

  @ManyToOne(() => Cidadao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  @Column({
    name: 'papel_anterior',
    type: 'enum',
    enum: TipoPapel,
    enumName: 'tipo_papel',
  })
  papel_anterior: PaperType;

  @Column({
    name: 'papel_novo',
    type: 'enum',
    enum: TipoPapel,
    enumName: 'tipo_papel',
  })
  papel_novo: PaperType;

  @Column({ name: 'composicao_familiar_id', type: 'uuid', nullable: true })
  composicao_familiar_id: string;

  @Column({ name: 'usuario_id', type: 'uuid' })
  usuario_id: string;

  @Column({ name: 'justificativa', type: 'text' })
  justificativa: string;

  @Column({ name: 'notificacao_enviada', type: 'boolean', default: false })
  notificacao_enviada: boolean;

  @Column({ name: 'tecnico_notificado_id', type: 'uuid', nullable: true })
  tecnico_notificado_id: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
