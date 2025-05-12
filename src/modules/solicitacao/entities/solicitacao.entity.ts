import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  BeforeInsert,
  AfterUpdate,
} from 'typeorm';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { Cidadao } from '../../cidadao/entities/cidadao.entity';
import { TipoBeneficio } from '../../beneficio/entities/tipo-beneficio.entity';
import { User } from '../../../user/entities/user.entity';
import { Unidade } from '../../unidade/entities/unidade.entity';
import { Documento } from '../../documento/entities/documento.entity';

export enum StatusSolicitacao {
  RASCUNHO = 'rascunho',
  PENDENTE = 'pendente',
  EM_ANALISE = 'em_analise',
  AGUARDANDO_DOCUMENTOS = 'aguardando_documentos',
  APROVADA = 'aprovada',
  REPROVADA = 'reprovada',
  LIBERADA = 'liberada',
  CANCELADA = 'cancelada',
}

@Entity('solicitacao')
@Index(['protocolo'], { unique: true })
@Index(['status', 'unidade_id'])
@Index(['status', 'tipo_beneficio_id'])
@Index(['data_abertura', 'status'])
@Index(['status'], { where: "status IN ('pendente', 'em_analise')" })
export class Solicitacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsNotEmpty({ message: 'Protocolo é obrigatório' })
  protocolo: string;
  
  @BeforeInsert()
  generateProtocol() {
    const date = new Date();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.protocolo = `SOL${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${random}`;
  }
  
  @AfterUpdate()
  logStatusChange() {
    // Lógica para registrar mudança de status no histórico
    // Esta implementação depende da estrutura da tabela de histórico
    // e deve ser complementada com um serviço específico
  }

  @Column()
  @IsNotEmpty({ message: 'Beneficiário é obrigatório' })
  beneficiario_id: string;

  @ManyToOne(() => Cidadao, { eager: false })
  @JoinColumn({ name: 'beneficiario_id' })
  beneficiario: Cidadao;

  @Column()
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  tipo_beneficio_id: string;

  @ManyToOne(() => TipoBeneficio)
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column()
  @IsNotEmpty({ message: 'Unidade é obrigatória' })
  unidade_id: string;

  @ManyToOne(() => Unidade)
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @Column()
  @IsNotEmpty({ message: 'Técnico responsável é obrigatório' })
  tecnico_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'tecnico_id' })
  tecnico: User;

  @Column({ type: 'timestamp' })
  @IsNotEmpty({ message: 'Data de abertura é obrigatória' })
  data_abertura: Date;

  @Column({
    type: 'enum',
    enum: StatusSolicitacao,
    default: StatusSolicitacao.RASCUNHO,
  })
  status: StatusSolicitacao;

  @Column('text', { nullable: true })
  @IsOptional()
  parecer_semtas: string;

  @Column({ nullable: true })
  aprovador_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'aprovador_id' })
  aprovador: User;

  @Column({ type: 'timestamp', nullable: true })
  data_aprovacao: Date;

  @Column({ type: 'timestamp', nullable: true })
  data_liberacao: Date;

  @Column({ nullable: true })
  liberador_id: string;

  @ManyToOne(() => User, (user) => user.solicitacoes_liberadas)
  @JoinColumn({ name: 'liberador_id' })
  liberador: User;

  @Column('text', { nullable: true })
  @IsOptional()
  observacoes: string;

  @Column('jsonb', { nullable: true })
  dados_complementares: Record<string, any>;

  @OneToMany(() => Documento, (documento) => documento.solicitacao, {
    cascade: ['insert', 'update'],
    onDelete: 'RESTRICT'
  })
  documentos: Documento[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
