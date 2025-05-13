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
import { Usuario } from '../../usuario/entities/usuario.entity';

export enum TipoNotificacao {
  SISTEMA = 'sistema',
  SOLICITACAO = 'solicitacao',
  PENDENCIA = 'pendencia',
  APROVACAO = 'aprovacao',
  LIBERACAO = 'liberacao',
  ALERTA = 'alerta',
}

export enum StatusNotificacao {
  NAO_LIDA = 'nao_lida',
  LIDA = 'lida',
  ARQUIVADA = 'arquivada',
}

@Entity('notificacao')
@Index(['destinatario_id', 'created_at'])
@Index(['status', 'created_at'])
export class Notificacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Destinatário é obrigatório' })
  destinatario_id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'destinatario_id' })
  destinatario: Usuario;

  @Column({
    type: 'enum',
    enum: TipoNotificacao,
    default: TipoNotificacao.SISTEMA
  })
  tipo: TipoNotificacao;

  @Column()
  @IsNotEmpty({ message: 'Título é obrigatório' })
  titulo: string;

  @Column('text')
  @IsNotEmpty({ message: 'Conteúdo é obrigatório' })
  conteudo: string;

  @Column({
    type: 'enum',
    enum: StatusNotificacao,
    default: StatusNotificacao.NAO_LIDA
  })
  status: StatusNotificacao;

  @Column({ nullable: true })
  @IsOptional()
  entidade_relacionada_id: string;

  @Column({ nullable: true })
  @IsOptional()
  entidade_tipo: string;

  @Column({ nullable: true })
  @IsOptional()
  link: string;

  @Column({ type: 'timestamp', nullable: true })
  data_leitura: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}