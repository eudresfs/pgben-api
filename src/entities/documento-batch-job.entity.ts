import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Usuario } from '@/entities/usuario.entity';
import { Unidade } from '@/entities/unidade.entity';

/**
 * Enum para status do job de download em lote
 */
export enum StatusDownloadLoteEnum {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Entidade para gerenciar jobs de download em lote de documentos
 */
@Entity('documento_batch_jobs')
@Index(['usuario_id', 'status'])
@Index(['created_at'])
@Index(['status', 'created_at'])
export class DocumentoBatchJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: StatusDownloadLoteEnum,
    default: StatusDownloadLoteEnum.PENDING,
  })
  status: StatusDownloadLoteEnum;

  @Column('uuid')
  usuario_id: string;

  @Column('uuid', { nullable: true })
  unidade_id: string;

  @Column('jsonb')
  filtros: Record<string, any>;

  @Column('jsonb', { nullable: true })
  metadados: Record<string, any>;

  @Column('int', { default: 0 })
  total_documentos: number;

  @Column('int', { default: 0 })
  documentos_processados: number;

  @Column('bigint', { nullable: true })
  tamanho_estimado: number;

  @Column('bigint', { nullable: true })
  tamanho_real: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  progresso: number;

  @Column('text', { nullable: true })
  caminho_arquivo: string;

  @Column('text', { nullable: true })
  nome_arquivo: string;

  @Column('text', { nullable: true })
  erro_detalhes: string;

  @Column('timestamp', { nullable: true })
  iniciado_em: Date;

  @Column('timestamp', { nullable: true })
  concluido_em: Date;

  @Column('timestamp', { nullable: true })
  expira_em: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relacionamentos
  @ManyToOne(() => Usuario, { eager: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @ManyToOne(() => Unidade, { eager: false })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  // Métodos auxiliares
  isCompleted(): boolean {
    return this.status === StatusDownloadLoteEnum.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === StatusDownloadLoteEnum.FAILED;
  }

  isProcessing(): boolean {
    return this.status === StatusDownloadLoteEnum.PROCESSING;
  }

  isPending(): boolean {
    return this.status === StatusDownloadLoteEnum.PENDING;
  }

  isCancelled(): boolean {
    return this.status === StatusDownloadLoteEnum.CANCELLED;
  }

  isExpired(): boolean {
    return this.expira_em && new Date() > this.expira_em;
  }

  getProgressPercentage(): number {
    return Math.min(Math.max(Number(this.progresso), 0), 100);
  }

  getDurationInSeconds(): number | null {
    if (!this.iniciado_em) return null;
    const endTime = this.concluido_em || new Date();
    return Math.floor((endTime.getTime() - this.iniciado_em.getTime()) / 1000);
  }

  getEstimatedTimeRemaining(): number | null {
    if (!this.iniciado_em || this.progresso <= 0) return null;

    const elapsed = Date.now() - this.iniciado_em.getTime();
    const progressRatio = Number(this.progresso) / 100;
    const estimatedTotal = elapsed / progressRatio;
    const remaining = estimatedTotal - elapsed;

    return Math.max(0, Math.floor(remaining / 1000));
  }
}
