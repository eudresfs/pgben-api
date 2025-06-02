import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';
import { IsNotEmpty, IsUUID, IsOptional, IsNumber, Min, IsString, MaxLength, IsEnum } from 'class-validator';

/**
 * Entidade que representa métricas de operações com documentos
 * 
 * Esta entidade armazena informações sobre operações realizadas com documentos,
 * como upload, download, visualização e exclusão, incluindo metadados como
 * tamanho, duração da operação e status.
 */
@Entity('metricas_documentos')
export class MetricaDocumento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  @Index('idx_metricas_documentos_operacao')
  @IsNotEmpty({ message: 'Operação é obrigatória' })
  @IsString({ message: 'Operação deve ser uma string' })
  @MaxLength(50, { message: 'Operação deve ter no máximo 50 caracteres' })
  operacao: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index('idx_metricas_documentos_timestamp')
  created_at: Date;

  @Column({ type: 'uuid', nullable: true })
  @Index('idx_metricas_documentos_documento')
  @IsOptional()
  @IsUUID('4', { message: 'ID do documento inválido' })
  documento_id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index('idx_metricas_documentos_usuario')
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário inválido' })
  usuario_id: string;

  @Column({ type: 'bigint', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Tamanho em bytes deve ser um número' })
  @Min(0, { message: 'Tamanho em bytes não pode ser negativo' })
  tamanho_bytes: number;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Duração deve ser um número' })
  @Min(0, { message: 'Duração não pode ser negativa' })
  duracao_ms: number;

  @Column({ length: 20, nullable: true })
  @IsOptional()
  @IsString({ message: 'Status deve ser uma string' })
  @MaxLength(20, { message: 'Status deve ter no máximo 20 caracteres' })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  detalhes: Record<string, any>;
}
