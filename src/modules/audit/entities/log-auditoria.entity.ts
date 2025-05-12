import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { User } from '../../../user/entities/user.entity';

export enum TipoOperacao {
  CRIACAO = 'criacao',
  LEITURA = 'leitura',
  ATUALIZACAO = 'atualizacao',
  REMOCAO = 'remocao',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORTACAO = 'exportacao',
}

export enum EntidadeAfetada {
  USUARIO = 'usuario',
  UNIDADE = 'unidade',
  SETOR = 'setor',
  CIDADAO = 'cidadao',
  TIPO_BENEFICIO = 'tipo_beneficio',
  SOLICITACAO = 'solicitacao',
  DOCUMENTO = 'documento',
  RELATORIO = 'relatorio',
}

@Entity('logs_auditoria')
@Index(['usuario_id', 'created_at'])
@Index(['entidade_afetada', 'created_at'])
@Index(['tipo_operacao', 'created_at'])
export class LogAuditoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  usuario_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: User;

  @Column({
    type: 'enum',
    enum: TipoOperacao,
  })
  tipo_operacao: TipoOperacao;

  @Column({
    type: 'enum',
    enum: EntidadeAfetada,
  })
  entidade_afetada: EntidadeAfetada;

  @Column({ nullable: true })
  entidade_id: string;

  @Column('jsonb', { nullable: true })
  dados_anteriores: Record<string, any>;

  @Column('jsonb', { nullable: true })
  dados_novos: Record<string, any>;

  @Column({ nullable: true })
  ip_usuario: string;

  @Column({ nullable: true })
  user_agent: string;

  @Column({ nullable: true })
  endpoint: string;

  @Column('text', { nullable: true })
  descricao: string;

  @CreateDateColumn()
  created_at: Date;
}