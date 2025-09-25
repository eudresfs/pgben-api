import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
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
  IsString,
  IsDate,
  MaxLength,
  IsUrl,
  IsNumber,
  Min,
} from 'class-validator';
import { ResultadoBeneficioCessado } from './resultado-beneficio-cessado.entity';
import { Usuario } from './usuario.entity';
import { TipoDocumentoComprobatorio } from '../enums/tipo-documento-comprobatorio.enum';

/**
 * Entidade que representa documentos comprobatórios anexados ao resultado
 * de benefício cessado.
 * 
 * Conforme Lei de Benefícios Eventuais do SUAS, esta entidade armazena
 * as provas sociais como fotos e documentos que comprovem a situação
 * relatada no encerramento do benefício.
 * 
 * Atende aos requisitos de documentação comprobatória estabelecidos
 * pela LOAS e regulamentações do SUAS.
 */
@Entity('documento_comprobatorio')
@Index('idx_documento_resultado_id', ['resultadoBeneficioCessadoId'])
@Index('idx_documento_tipo', ['tipo'])
@Index('idx_documento_data_upload', ['dataUpload'])
@Index('idx_documento_usuario_upload', ['usuarioUploadId'])
export class DocumentoComprobatorio {
  /** Identificador único do documento */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Referência ao resultado de benefício cessado */
  @Column({ name: 'resultado_beneficio_cessado_id', type: 'uuid' })
  @IsNotEmpty({ message: 'ID do resultado de benefício cessado é obrigatório' })
  @IsUUID('4', { message: 'ID do resultado de benefício cessado inválido' })
  resultadoBeneficioCessadoId: string;

  @ManyToOne(() => ResultadoBeneficioCessado, (resultado) => resultado.documentosComprobatorios)
  @JoinColumn({ name: 'resultado_beneficio_cessado_id' })
  resultadoBeneficioCessado: ResultadoBeneficioCessado;

  /** Tipo do documento comprobatório */
  @Column({
    name: 'tipo',
    type: 'enum',
    enum: TipoDocumentoComprobatorio,
    enumName: 'tipo_documento_comprobatorio_enum',
  })
  @IsEnum(TipoDocumentoComprobatorio, { 
    message: 'Tipo de documento comprobatório inválido' 
  })
  tipo: TipoDocumentoComprobatorio;

  /** Nome original do arquivo */
  @Column({ name: 'nome_arquivo' })
  @IsNotEmpty({ message: 'Nome do arquivo é obrigatório' })
  @IsString({ message: 'Nome do arquivo deve ser um texto' })
  @MaxLength(255, { message: 'Nome do arquivo não pode exceder 255 caracteres' })
  nomeArquivo: string;

  /** Caminho ou URL do arquivo no sistema de armazenamento */
  @Column({ name: 'caminho_arquivo' })
  @IsNotEmpty({ message: 'Caminho do arquivo é obrigatório' })
  @IsString({ message: 'Caminho do arquivo deve ser um texto' })
  @MaxLength(500, { message: 'Caminho do arquivo não pode exceder 500 caracteres' })
  caminhoArquivo: string;

  /** Tipo MIME do arquivo */
  @Column({ name: 'tipo_mime' })
  @IsNotEmpty({ message: 'Tipo MIME é obrigatório' })
  @IsString({ message: 'Tipo MIME deve ser um texto' })
  @MaxLength(100, { message: 'Tipo MIME não pode exceder 100 caracteres' })
  tipoMime: string;

  /** Tamanho do arquivo em bytes */
  @Column({ name: 'tamanho_arquivo', type: 'bigint' })
  @IsNotEmpty({ message: 'Tamanho do arquivo é obrigatório' })
  @IsNumber({}, { message: 'Tamanho do arquivo deve ser um número' })
  @Min(1, { message: 'Tamanho do arquivo deve ser maior que zero' })
  tamanhoArquivo: number;

  /** 
   * Descrição do documento
   * Explica o que o documento comprova em relação ao resultado
   */
  @Column({ name: 'descricao', type: 'text' })
  @IsNotEmpty({ message: 'Descrição do documento é obrigatória' })
  @IsString({ message: 'Descrição deve ser um texto' })
  @MaxLength(500, { message: 'Descrição não pode exceder 500 caracteres' })
  descricao: string;

  /** 
   * Observações adicionais sobre o documento
   * Informações complementares sobre o contexto do documento
   */
  @Column({ name: 'observacoes', type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Observações devem ser um texto' })
  @MaxLength(300, { message: 'Observações não podem exceder 300 caracteres' })
  observacoes: string | null;

  /** Data de upload do documento */
  @Column({ name: 'data_upload', type: 'timestamp' })
  @IsNotEmpty({ message: 'Data de upload é obrigatória' })
  @IsDate({ message: 'Data de upload inválida' })
  dataUpload: Date;

  /** Usuário que fez o upload do documento */
  @Column({ name: 'usuario_upload_id', type: 'uuid' })
  @IsNotEmpty({ message: 'ID do usuário de upload é obrigatório' })
  @IsUUID('4', { message: 'ID do usuário de upload inválido' })
  usuarioUploadId: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_upload_id' })
  usuarioUpload: Usuario;

  /** 
   * Hash do arquivo para verificação de integridade
   * Garante que o arquivo não foi alterado após o upload
   */
  @Column({ name: 'hash_arquivo', nullable: true })
  @IsOptional()
  @IsString({ message: 'Hash do arquivo deve ser um texto' })
  @MaxLength(128, { message: 'Hash do arquivo não pode exceder 128 caracteres' })
  hashArquivo: string | null;

  /** 
   * Indica se o documento foi validado pelo técnico
   * Controle de qualidade da documentação
   */
  @Column({ name: 'validado', type: 'boolean', default: false })
  validado: boolean;

  /** Data de validação do documento */
  @Column({ name: 'data_validacao', type: 'timestamp', nullable: true })
  @IsOptional()
  @IsDate({ message: 'Data de validação inválida' })
  dataValidacao: Date | null;

  /** Usuário que validou o documento (opcional) */
  @Column({ name: 'usuario_validacao_id', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário de validação inválido' })
  usuarioValidacaoId: string | null;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_validacao_id' })
  usuarioValidacao: Usuario | null;

  /** Campos de auditoria */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}