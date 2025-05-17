import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Setor } from './setor.entity';
import { Unidade } from './unidade.entity';

@Entity('setor_unidade')
export class SetorUnidade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'setor_id' })
  setorId: string;

  @ManyToOne(() => Setor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'setor_id' })
  setor: Setor;

  @Column({ name: 'unidade_id' })
  unidadeId: string;

  @ManyToOne(() => Unidade, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
