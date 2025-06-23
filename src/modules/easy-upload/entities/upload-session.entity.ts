import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import {
  IsNotEmpty,
  IsUUID,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsJSON,
  IsIP,
  Length,
  Min,
  Max,
} from 'class-validator';
import { UploadToken } from './upload-token.entity';
import { Documento } from '../../../entities/documento.entity';

/**
 * Enum para status da sessão de upload
 */
export enum UploadSessionStatus {
  INICIADA = 'iniciada',
  ATIVA = 'ativa',
  COMPLETADA = 'completada',
  EXPIRADA = 'expirada',
  CANCELADA = 'cancelada',
  ERRO = 'erro',
  TIMEOUT = 'timeout',
  CONCLUIDA = 'concluida',
}

/**
 * Entidade UploadSession
 * 
 * Representa uma sessão de upload ativa, controlando
 * o processo de envio de arquivos via token.
 * 
 * Funcionalidades:
 * - Controle de sessão de upload
 * - Rastreamento de atividade e progresso
 * - Monitoramento de segurança (IP, User-Agent)
 * - Histórico de arquivos enviados
 * - Controle de limites e timeouts
 */
@Entity('upload_sessions')
@Index(['token_id'])
@Index(['status'])
@Index(['ip_address'])
@Index(['started_at'])
@Index(['last_activity_at'])
@Index(['completed_at'])
@Index(['token_id', 'status'])
@Index(['ip_address', 'started_at'])
export class UploadSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'token_id', type: 'uuid', nullable: false })
  @IsNotEmpty({ message: 'ID do token é obrigatório' })
  @IsUUID('4', { message: 'ID do token inválido' })
  token_id: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  @IsOptional()
  @IsIP(undefined, { message: 'Endereço IP inválido' })
  ip_address: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'User-Agent deve ser uma string' })
  @Length(0, 1000, { message: 'User-Agent deve ter no máximo 1000 caracteres' })
  user_agent: string | null;

  @Column({
    name: 'device_fingerprint',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Hash único do dispositivo para identificação',
  })
  @IsOptional()
  @IsString({ message: 'Device fingerprint deve ser uma string' })
  @Length(0, 255, { message: 'Device fingerprint deve ter no máximo 255 caracteres' })
  device_fingerprint: string | null;

  @Column({ name: 'files_uploaded', type: 'integer', default: 0 })
  @IsNumber({}, { message: 'Número de arquivos deve ser um número' })
  @Min(0, { message: 'Número de arquivos não pode ser negativo' })
  files_uploaded: number;

  @Column({ name: 'total_size_bytes', type: 'bigint', default: 0 })
  @IsNumber({}, { message: 'Tamanho total deve ser um número' })
  @Min(0, { message: 'Tamanho total não pode ser negativo' })
  total_size_bytes: number;

  @Column({ name: 'started_at', type: 'timestamp with time zone' })
  @IsNotEmpty({ message: 'Data de início é obrigatória' })
  started_at: Date;

  @Column({
    name: 'last_activity_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  last_activity_at: Date | null;

  @Column({
    name: 'completed_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  completed_at: Date | null;

  @Column({
    type: 'enum',
    enum: UploadSessionStatus,
    default: UploadSessionStatus.INICIADA,
  })
  @IsEnum(UploadSessionStatus, { message: 'Status inválido' })
  status: UploadSessionStatus;

  @Column({
    name: 'error_message',
    type: 'text',
    nullable: true,
    comment: 'Mensagem de erro em caso de falha',
  })
  @IsOptional()
  @IsString({ message: 'Mensagem de erro deve ser uma string' })
  error_message: string | null;

  @Column({
    name: 'session_metadata',
    type: 'jsonb',
    nullable: true,
    comment: 'Metadados adicionais da sessão',
  })
  @IsOptional()
  @IsJSON({ message: 'Metadados da sessão deve ser um JSON válido' })
  session_metadata: Record<string, any> | null;

  @Column({
    name: 'upload_progress',
    type: 'jsonb',
    nullable: true,
    comment: 'Progresso detalhado do upload',
  })
  @IsOptional()
  @IsJSON({ message: 'Progresso do upload deve ser um JSON válido' })
  upload_progress: {
    current_file?: number;
    total_files?: number;
    bytes_uploaded?: number;
    percentage?: number;
    files_completed?: string[];
    files_failed?: string[];
  } | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updated_at: Date;

  // Relacionamentos
  @ManyToOne(() => UploadToken, (token) => token.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'token_id', referencedColumnName: 'id' })
  uploadToken: UploadToken;

  @OneToMany(() => Documento, (documento) => documento.upload_session)
  documentos: Documento[];

  // Métodos utilitários
  /**
   * Verifica se a sessão está ativa
   */
  isActive(): boolean {
    return this.status === UploadSessionStatus.ATIVA;
  }

  /**
   * Verifica se a sessão foi completada
   */
  isCompleted(): boolean {
    return this.status === UploadSessionStatus.COMPLETADA;
  }

  /**
   * Verifica se a sessão expirou
   */
  isExpired(): boolean {
    return this.status === UploadSessionStatus.EXPIRADA;
  }

  /**
   * Verifica se a sessão foi cancelada
   */
  isCancelled(): boolean {
    return this.status === UploadSessionStatus.CANCELADA;
  }

  /**
   * Verifica se a sessão teve erro
   */
  hasError(): boolean {
    return this.status === UploadSessionStatus.ERRO;
  }

  /**
   * Atualiza a última atividade
   */
  updateActivity(): void {
    this.last_activity_at = new Date();
    if (this.status === UploadSessionStatus.INICIADA) {
      this.status = UploadSessionStatus.ATIVA;
    }
  }

  /**
   * Incrementa o contador de arquivos enviados
   */
  incrementFilesUploaded(fileSize: number = 0): void {
    this.files_uploaded += 1;
    this.total_size_bytes += fileSize;
    this.updateActivity();
  }

  /**
   * Marca a sessão como completada
   */
  complete(): void {
    this.status = UploadSessionStatus.COMPLETADA;
    this.completed_at = new Date();
    this.updateActivity();
  }

  /**
   * Marca a sessão como expirada
   */
  expire(): void {
    this.status = UploadSessionStatus.EXPIRADA;
  }

  /**
   * Cancela a sessão
   */
  cancel(): void {
    this.status = UploadSessionStatus.CANCELADA;
  }

  /**
   * Marca a sessão com erro
   */
  setError(errorMessage: string): void {
    this.status = UploadSessionStatus.ERRO;
    this.error_message = errorMessage;
    this.updateActivity();
  }

  /**
   * Calcula a duração da sessão em minutos
   */
  getDurationInMinutes(): number {
    const endTime = this.completed_at || this.last_activity_at || new Date();
    const diffMs = endTime.getTime() - this.started_at.getTime();
    return Math.floor(diffMs / (1000 * 60));
  }

  /**
   * Verifica se a sessão está inativa há muito tempo
   */
  isInactive(timeoutMinutes: number = 30): boolean {
    if (!this.last_activity_at) {
      return false;
    }
    const now = new Date();
    const diffMs = now.getTime() - this.last_activity_at.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    return diffMinutes > timeoutMinutes;
  }

  /**
   * Atualiza o progresso do upload
   */
  updateProgress(progress: Partial<UploadSession['upload_progress']>): void {
    this.upload_progress = {
      ...this.upload_progress,
      ...progress,
    };
    this.updateActivity();
  }

  /**
   * Calcula a porcentagem de progresso
   */
  getProgressPercentage(): number {
    if (this.upload_progress?.total_files && this.upload_progress?.current_file) {
      return Math.round(
        (this.upload_progress.current_file / this.upload_progress.total_files) * 100
      );
    }
    return 0;
  }
}