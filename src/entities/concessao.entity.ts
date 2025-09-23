import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import {
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsOptional,
  IsDate,
} from 'class-validator';
import { Solicitacao } from './solicitacao.entity';
import { Pagamento } from './pagamento.entity';
import { StatusConcessao } from '../enums/status-concessao.enum';
import { TipoConcessaoEnum } from '../enums';
import { HistoricoConcessao } from './historico-concessao.entity';
import { ResultadoBeneficioCessado } from './resultado-beneficio-cessado.entity';

/**
 * Entidade que representa a concessão de um benefício ativo.
 *
 * Após a aprovação da `Solicitacao`, uma `Concessao` é criada para
 * gerenciar o ciclo de vida do benefício (ativação, suspensão, bloqueio, encerramento)
 * independentemente de pagamentos específicos.
 */
@Entity('concessao')
@Index('idx_concessao_status', ['status'])
@Index('idx_concessao_data_inicio', ['dataInicio'])
@Index('idx_concessao_solicitacao_id', ['solicitacaoId'], { unique: true })
export class Concessao {
  /** Identificador único da concessão */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Referência à solicitação aprovada que originou a concessão */
  @Column({ name: 'solicitacao_id', unique: false })
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  @IsUUID('4', { message: 'ID da solicitação inválido' })
  solicitacaoId: string;

  @OneToOne(() => Solicitacao, (solicitacao) => solicitacao.concessao)
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  /** Tipo da concessão (original ou renovação) */
  @Column({
    type: 'enum',
    enum: TipoConcessaoEnum,
    enumName: 'tipo_concessao_enum',
    default: TipoConcessaoEnum.ORIGINAL,
    comment: 'Tipo da concessão: original ou renovação'
  })
  @IsEnum(TipoConcessaoEnum)
  tipo: TipoConcessaoEnum;

  /** ID da concessão original (para renovações) */
  @Column({ name: 'concessao_renovada_id', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'ID da concessão renovada inválido' })
  concessaoRenovadaId: string | null;

  /** Relacionamento com a concessão original (para renovações) */
  @OneToOne(() => Concessao, (concessao) => concessao.renovacao, { nullable: true })
  @JoinColumn({ name: 'concessao_renovada_id' })
  concessaoRenovada: Concessao | null;

  /** Relacionamento com a renovação desta concessão */
  @OneToOne(() => Concessao, (concessao) => concessao.concessaoRenovada, { nullable: true })
  renovacao: Concessao | null;

  /** Status atual da concessão */
  @Column({
    type: 'enum',
    enum: StatusConcessao,
    enumName: 'status_concessao_enum',
    default: StatusConcessao.APTO,
  })
  @IsEnum(StatusConcessao)
  status: StatusConcessao;

  /** Prioridade de atendimento dentro da fila de concessões */
  @Column({ name: 'ordem_prioridade', type: 'integer', default: 3 })
  ordemPrioridade: number;

  /** Flag de determinação judicial herdada da solicitação */
  @Column({
    name: 'determinacao_judicial_flag',
    type: 'boolean',
    default: false,
  })
  determinacaoJudicialFlag: boolean;

  /** Data de início da concessão */
  @Column({ name: 'data_inicio', type: 'date' })
  @IsDate()
  dataInicio: Date;

  /** Data de encerramento do benefício */
  @Column({ name: 'data_encerramento', type: 'date', nullable: true })
  @IsOptional()
  dataEncerramento: Date | null;

  /** Motivo do encerramento */
  @Column({ name: 'motivo_encerramento', type: 'text', nullable: true })
  @IsOptional()
  motivoEncerramento: string | null;

  /** Campos para controle de suspensão */
  @Column({ name: 'motivo_suspensao', type: 'text', nullable: true })
  @IsOptional()
  motivoSuspensao: string | null;

  @Column({ name: 'data_revisao_suspensao', type: 'date', nullable: true })
  @IsOptional()
  @IsDate()
  dataRevisaoSuspensao: Date | null;

  /** Campos para controle de bloqueio/desbloqueio */
  @Column({ name: 'motivo_bloqueio', type: 'text', nullable: true })
  @IsOptional()
  motivoBloqueio: string | null;

  @Column({ name: 'data_bloqueio', type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDate()
  dataBloqueio: Date | null;

  @Column({ name: 'motivo_desbloqueio', type: 'text', nullable: true })
  @IsOptional()
  motivoDesbloqueio: string | null;

  @Column({ name: 'data_desbloqueio', type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDate()
  dataDesbloqueio: Date | null;

  /** Datas de auditoria */
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'removed_at' })
  removed_at: Date;

  /** Pagamentos vinculados a esta concessão */
  @OneToMany(() => Pagamento, (pagamento) => pagamento.concessao)
  pagamentos: Pagamento[];

  /** Histórico de alterações de status */
  @OneToMany(() => HistoricoConcessao, (hist) => hist.concessao)
  historicos: HistoricoConcessao[];

  /**
   * Resultado do benefício cessado (se aplicável)
   * Relacionamento com informações sobre o encerramento do benefício
   * Temporariamente comentado para resolver problemas de metadata
   */
  @OneToOne(() => ResultadoBeneficioCessado, (resultado) => resultado.concessao, { nullable: true })
  resultadoBeneficioCessado: ResultadoBeneficioCessado | null;
}
