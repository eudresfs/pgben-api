import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Concessao } from './concessao.entity';
import { StatusConcessao } from '../enums/status-concessao.enum';

/**
 * Histórico de alterações de status da Concessão.
 * Registra suspensões, bloqueios, renovações, encerramentos, etc.
 */
@Entity('historico_concessao')
@Index('idx_historico_concessao_concessao_id', ['concessaoId'])
export class HistoricoConcessao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'concessao_id' })
  @IsUUID('4')
  concessaoId: string;

  @ManyToOne(() => Concessao, (c) => c.historicos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'concessao_id' })
  concessao: Concessao;

  @Column({
    name: 'status_anterior',
    type: 'enum',
    enum: StatusConcessao,
    enumName: 'status_concessao_enum',
  })
  @IsEnum(StatusConcessao)
  statusAnterior: StatusConcessao;

  @Column({
    name: 'status_novo',
    type: 'enum',
    enum: StatusConcessao,
    enumName: 'status_concessao_enum',
  })
  @IsEnum(StatusConcessao)
  statusNovo: StatusConcessao;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  motivo: string | null;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  observacoes: string | null;

  @Column({ name: 'alterado_por', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4')
  alteradoPor: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
