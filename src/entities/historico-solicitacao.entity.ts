import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { Solicitacao } from './solicitacao.entity';
import { Usuario } from './usuario.entity';
import { StatusSolicitacao } from '../enums/status-solicitacao.enum';

@Entity('historico_status_solicitacao')
@Index(['solicitacao_id', 'created_at'])
export class HistoricoSolicitacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Solicitação é obrigatória' })
  solicitacao_id: string;

  @ManyToOne(() => Solicitacao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @Column({
    type: 'enum',
    enum: StatusSolicitacao,
    enumName: 'status_historico_solicitacao_anterior',
  })
  @IsNotEmpty({ message: 'Status anterior é obrigatório' })
  status_anterior: StatusSolicitacao;

  @Column({
    type: 'enum',
    enum: StatusSolicitacao,
    enumName: 'status_historico_solicitacao_atual',
  })
  @IsNotEmpty({ message: 'Status atual é obrigatório' })
  status_atual: StatusSolicitacao;

  @Column()
  @IsNotEmpty({ message: 'Usuário que realizou a alteração é obrigatório' })
  usuario_id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column('text', { nullable: true })
  observacao: string | null;

  @Column('jsonb', { nullable: true })
  dados_alterados: Record<string, any> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_usuario: string | null;

  @CreateDateColumn()
  created_at: Date;
}
