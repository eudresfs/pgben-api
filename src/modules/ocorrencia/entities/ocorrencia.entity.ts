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
import { Cidadao } from '../../cidadao/entities/cidadao.entity';
import { Solicitacao } from '../../solicitacao/entities/solicitacao.entity';
import { DemandaMotivo } from './demanda-motivo.entity';

export enum TipoOcorrencia {
  DENUNCIA = 'denuncia',
  RECLAMACAO = 'reclamacao',
  SUGESTAO = 'sugestao',
  ELOGIO = 'elogio',
  INFORMACAO = 'informacao',
  IRREGULARIDADE = 'irregularidade',
  OUTRO = 'outro',
}

export enum StatusOcorrencia {
  ABERTA = 'aberta',
  EM_ANALISE = 'em_analise',
  RESOLVIDA = 'resolvida',
  CONCLUIDA = 'concluida',
  CANCELADA = 'cancelada',
}

@Entity('ocorrencia')
@Index(['cidadao_id', 'created_at'])
@Index(['status', 'created_at'])
export class Ocorrencia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Tipo de ocorrência é obrigatório' })
  tipo: TipoOcorrencia;

  @Column({ nullable: true })
  @IsOptional()
  cidadao_id: string;

  @ManyToOne(() => Cidadao, { nullable: true })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  @Column({ nullable: true })
  @IsOptional()
  solicitacao_id: string;

  @ManyToOne(() => Solicitacao, { nullable: true })
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @Column()
  @IsNotEmpty({ message: 'Título é obrigatório' })
  titulo: string;

  @Column('text')
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  descricao: string;

  @Column()
  @IsNotEmpty({ message: 'Registrado por é obrigatório' })
  registrado_por_id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'registrado_por_id' })
  registrado_por: Usuario;

  @Column({ nullable: true })
  @IsOptional()
  demanda_motivo_id: string;

  @ManyToOne(() => DemandaMotivo, { nullable: true })
  @JoinColumn({ name: 'demanda_motivo_id' })
  demanda_motivo: DemandaMotivo;

  @Column({
    type: 'enum',
    enum: StatusOcorrencia,
    default: StatusOcorrencia.ABERTA
  })
  status: StatusOcorrencia;

  @Column({ nullable: true })
  @IsOptional()
  responsavel_id: string;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'responsavel_id' })
  responsavel: Usuario;

  @Column('text', { nullable: true })
  @IsOptional()
  parecer: string;

  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  data_resolucao: Date;

  @Column({ nullable: true })
  @IsOptional()
  prioridade: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
  usuario_id: string;
}