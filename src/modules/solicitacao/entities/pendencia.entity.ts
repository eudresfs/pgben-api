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
import { IsNotEmpty, IsOptional } from 'class-validator';
import { Solicitacao } from './solicitacao.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';

export enum StatusPendencia {
  ABERTA = 'aberta',
  RESOLVIDA = 'resolvida',
  CANCELADA = 'cancelada',
}

@Entity('pendencias')
@Index(['solicitacao_id', 'created_at'])
export class Pendencia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Solicitação é obrigatória' })
  solicitacao_id: string;

  @ManyToOne(() => Solicitacao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @Column('text')
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  descricao: string;

  @Column()
  @IsNotEmpty({ message: 'Usuário que registrou é obrigatório' })
  registrado_por_id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'registrado_por_id' })
  registrado_por: Usuario;

  @Column({
    type: 'enum',
    enum: StatusPendencia,
    default: StatusPendencia.ABERTA
  })
  status: StatusPendencia;

  @Column({ nullable: true })
  resolvido_por_id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'resolvido_por_id' })
  resolvido_por: Usuario;

  @Column({ type: 'timestamp', nullable: true })
  data_resolucao: Date;

  @Column('text', { nullable: true })
  @IsOptional()
  observacao_resolucao: string;

  @Column({ type: 'date', nullable: true })
  @IsOptional()
  prazo_resolucao: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}