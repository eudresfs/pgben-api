import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index
} from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { Ocorrencia } from './ocorrencia.entity';

export enum TipoDemanda {
  DENUNCIA = 'denuncia',
  RECLAMACAO = 'reclamacao',
  SUGESTAO = 'sugestao',
  ELOGIO = 'elogio',
  INFORMACAO = 'informacao',
  OUTRO = 'outro',
}

@Entity('demanda_motivos')
@Index(['tipo', 'nome'], { unique: true })
export class DemandaMotivo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TipoDemanda,
  })
  @IsNotEmpty({ message: 'Tipo de demanda é obrigatório' })
  tipo: TipoDemanda;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @Column('text', { nullable: true })
  descricao: string;

  @Column({ default: true })
  ativo: boolean;

  @OneToMany(() => Ocorrencia, ocorrencia => ocorrencia.demanda_motivo)
  ocorrencia: Ocorrencia[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}