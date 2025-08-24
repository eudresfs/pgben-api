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
  Length,
  Min,
  Max,
} from 'class-validator';
import { Usuario } from '../../../entities/usuario.entity';
import { Cidadao } from '../../../entities/cidadao.entity';
import { Solicitacao } from '../../../entities/solicitacao.entity';
import { UploadSession } from './upload-session.entity';

/**
 * Enum para status do token de upload
 */
export enum UploadTokenStatus {
  ATIVO = 'ativo',
  USADO = 'usado',
  EXPIRADO = 'expirado',
  CANCELADO = 'cancelado',
}

/**
 * Entidade UploadToken
 *
 * Representa um token de upload gerado para permitir
 * o envio de documentos via QR Code de forma segura.
 *
 * Funcionalidades:
 * - Controle de acesso temporário para upload
 * - Vinculação com solicitação e cidadão
 * - Configuração de limites e documentos obrigatórios
 * - Rastreamento de uso e expiração
 */
@Entity('upload_tokens')
@Index(['token'], { unique: true })
@Index(['usuario_id'])
@Index(['solicitacao_id'])
@Index(['cidadao_id'])
@Index(['status'])
@Index(['expires_at'])
@Index(['created_at'])
@Index(['usuario_id', 'status'])
@Index(['solicitacao_id', 'status'])
export class UploadToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id', type: 'uuid', nullable: false })
  @IsNotEmpty({ message: 'ID do usuário é obrigatório' })
  @IsUUID('4', { message: 'ID do usuário inválido' })
  usuario_id: string;

  @Column({ name: 'solicitacao_id', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'ID da solicitação inválido' })
  solicitacao_id: string | null;

  @Column({ name: 'cidadao_id', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'ID do cidadão inválido' })
  cidadao_id: string | null;

  @Column({ type: 'varchar', length: 255, unique: true })
  @IsNotEmpty({ message: 'Token é obrigatório' })
  @IsString({ message: 'Token deve ser uma string' })
  @Length(32, 255, { message: 'Token deve ter entre 32 e 255 caracteres' })
  token: string;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  @IsNotEmpty({ message: 'Data de expiração é obrigatória' })
  expires_at: Date;

  @Column({
    type: 'enum',
    enum: UploadTokenStatus,
    default: UploadTokenStatus.ATIVO,
  })
  @IsEnum(UploadTokenStatus, { message: 'Status inválido' })
  status: UploadTokenStatus;

  @Column({ name: 'max_files', type: 'integer', default: 10 })
  @IsNumber({}, { message: 'Máximo de arquivos deve ser um número' })
  @Min(1, { message: 'Máximo de arquivos deve ser pelo menos 1' })
  @Max(50, { message: 'Máximo de arquivos não pode exceder 50' })
  max_files: number;

  @Column({
    name: 'required_documents',
    type: 'jsonb',
    nullable: true,
    comment: 'Lista de tipos de documentos obrigatórios',
  })
  @IsOptional()
  @IsJSON({ message: 'Documentos obrigatórios deve ser um JSON válido' })
  required_documents: string[] | null;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Metadados adicionais do token',
  })
  @IsOptional()
  @IsJSON({ message: 'Metadados deve ser um JSON válido' })
  metadata: Record<string, any> | null;

  @Column({
    name: 'used_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  used_at: Date | null;

  @Column({
    name: 'cancelled_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  cancelled_at: Date | null;

  @Column({
    name: 'cancelled_by',
    type: 'uuid',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário que cancelou inválido' })
  cancelled_by: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updated_at: Date;

  // Relacionamentos
  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id', referencedColumnName: 'id' })
  usuario: Usuario;

  @ManyToOne(() => Solicitacao, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'solicitacao_id', referencedColumnName: 'id' })
  solicitacao: Solicitacao | null;

  @ManyToOne(() => Cidadao, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'cidadao_id', referencedColumnName: 'id' })
  cidadao: Cidadao | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'cancelled_by', referencedColumnName: 'id' })
  cancelledByUser: Usuario | null;

  @OneToMany(() => UploadSession, (session) => session.uploadToken)
  sessions: UploadSession[];
  cancelado_em: Date;
  cancelado_por_id: string;
  motivo_cancelamento: string;

  // Métodos utilitários
  /**
   * Verifica se o token está expirado
   */
  isExpired(): boolean {
    return new Date() > this.expires_at;
  }

  /**
   * Verifica se o token está ativo e pode ser usado
   */
  isActive(): boolean {
    return this.status === UploadTokenStatus.ATIVO && !this.isExpired();
  }

  /**
   * Verifica se o token foi usado
   */
  isUsed(): boolean {
    return this.status === UploadTokenStatus.USADO;
  }

  /**
   * Verifica se o token foi cancelado
   */
  isCancelled(): boolean {
    return this.status === UploadTokenStatus.CANCELADO;
  }

  /**
   * Marca o token como usado
   */
  markAsUsed(): void {
    this.status = UploadTokenStatus.USADO;
    this.used_at = new Date();
  }

  /**
   * Marca o token como expirado
   */
  markAsExpired(): void {
    this.status = UploadTokenStatus.EXPIRADO;
  }

  /**
   * Cancela o token
   */
  cancel(cancelledBy: string): void {
    this.status = UploadTokenStatus.CANCELADO;
    this.cancelled_at = new Date();
    this.cancelled_by = cancelledBy;
  }

  /**
   * Retorna o tempo restante em minutos até a expiração
   */
  getTimeToExpiration(): number {
    const now = new Date();
    const diffMs = this.expires_at.getTime() - now.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
  }

  /**
   * Verifica se um tipo de documento é obrigatório
   */
  isDocumentRequired(documentType: string): boolean {
    if (!this.required_documents) {
      return false;
    }
    return this.required_documents.includes(documentType);
  }
}
