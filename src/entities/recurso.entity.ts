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
import { Solicitacao } from './solicitacao.entity';
import { Usuario } from './usuario.entity';
import { Setor } from './setor.entity';
import { RecursoHistorico } from './recurso-historico.entity';

export enum StatusRecurso {
  PENDENTE = 'pendente',
  EM_ANALISE = 'em_analise',
  DEFERIDO = 'deferido',
  INDEFERIDO = 'indeferido',
  CANCELADO = 'cancelado',
}

@Entity('recurso')
@Index(['solicitacao_id'])
@Index(['status'])
@Index(['status', 'setor_responsavel_id'])
@Index(['created_at'])
export class Recurso {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Solicitação é obrigatória' })
  solicitacao_id: string;

  @ManyToOne(() => Solicitacao, { eager: false })
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @Column('text')
  @IsNotEmpty({ message: 'Justificativa é obrigatória' })
  justificativa: string;

  @Column({
    type: 'enum',
    enum: StatusRecurso,
    enumName: 'status_recurso',
    default: StatusRecurso.PENDENTE,
  })
  status: StatusRecurso;

  @Column({ type: 'timestamp' })
  @IsNotEmpty({ message: 'Data de criação é obrigatória' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  data_analise: Date;

  @Column({ nullable: true })
  analista_id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'analista_id' })
  analista: Usuario;

  @Column('text', { nullable: true })
  @IsOptional()
  parecer: string;

  @Column('jsonb', { nullable: true })
  documentos_adicionais: Record<string, any>;

  @Column({ nullable: true, length: 100 })
  motivo_indeferimento: string;

  @Column({ default: 5 })
  prazo_analise: number;

  @Column({ nullable: true })
  setor_responsavel_id: string;

  @ManyToOne(() => Setor)
  @JoinColumn({ name: 'setor_responsavel_id' })
  setor_responsavel: Setor;

  @OneToMany(() => RecursoHistorico, (historico) => historico.recurso, {
    cascade: ['insert', 'update'],
  })
  historicos: RecursoHistorico[];

  // Campos para controle de alteração de status
  @Column({ select: false, insert: false, update: false })
  private statusAnterior: StatusRecurso;

  @Column({ select: false, insert: false, update: false })
  private usuarioAlteracao: string;

  @Column({ select: false, insert: false, update: false })
  private observacaoAlteracao: string;

  @Column({ select: false, insert: false, update: false })
  private ipUsuario: string;

  /**
   * Prepara a alteração de status para posterior registro no histórico
   * @param novoStatus Novo status do recurso
   * @param usuario ID do usuário que realizou a alteração
   * @param observacao Observação sobre a alteração
   * @param ip IP do usuário que realizou a alteração
   */
  prepararAlteracaoStatus(
    novoStatus: StatusRecurso,
    usuario: string,
    observacao: string,
    ip: string,
  ) {
    this.statusAnterior = this.status;
    this.status = novoStatus;
    this.usuarioAlteracao = usuario;
    this.observacaoAlteracao = observacao;
    this.ipUsuario = ip;
  }

  // REMOVIDO: @AfterUpdate logStatusChange()
  // O logging de histórico agora é feito diretamente nos serviços
  // que têm acesso ao DataSource e repositórios adequados.
  // Isso evita o erro ConnectionNotFoundError que ocorria quando
  // o método tentava usar getRepository() sem contexto de conexão.

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
