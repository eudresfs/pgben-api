import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import {
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsString,
  IsDate,
} from 'class-validator';
import { Solicitacao } from './solicitacao.entity';
import { Usuario } from './usuario.entity';
import { Cidadao } from './cidadao.entity';
import { TipoDocumentoEnum } from '../enums';
import { UploadSession } from '../modules/easy-upload/entities/upload-session.entity';
import { Pendencia } from './pendencia.entity';

/**
 * Entidade Documento
 *
 * Representa documentos anexados pelos cidadãos, podendo estar vinculados
 * a uma solicitação específica ou serem documentos gerais reutilizáveis.
 * Todos os documentos são sempre vinculados a um cidadão.
 */
@Entity('documentos')
@Index(['cidadao_id'])
@Index(['solicitacao_id'])
@Index(['pendencia_id'])
@Index(['tipo'])
@Index(['usuario_upload_id'])
@Index(['data_upload'])
@Index(['verificado'])
@Index(['reutilizavel'])
export class Documento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'ID da solicitação deve ser um UUID válido' })
  solicitacao_id?: string;

  @ManyToOne(() => Solicitacao, (solicitacao) => solicitacao.documentos, {
    nullable: true,
  })
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao?: Solicitacao;

  @Column({ nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'ID da pendência deve ser um UUID válido' })
  pendencia_id?: string;

  @ManyToOne(() => Pendencia, (pendencia) => pendencia.documentos, {
    nullable: true,
  })
  @JoinColumn({ name: 'pendencia_id' })
  pendencia?: Pendencia;

  @Column()
  @IsNotEmpty({ message: 'Cidadão é obrigatório' })
  @IsUUID('4', { message: 'ID do cidadão deve ser um UUID válido' })
  cidadao_id: string;

  @ManyToOne(() => Cidadao, { nullable: false })
  @JoinColumn({ name: 'cidadao_id' })
  cidadao: Cidadao;

  @Column({
    type: 'enum',
    enum: TipoDocumentoEnum,
    enumName: 'tipo_documento_enum',
  })
  @IsNotEmpty({ message: 'Tipo de documento é obrigatório' })
  tipo: TipoDocumentoEnum;

  @Column()
  @IsNotEmpty({ message: 'Nome do arquivo é obrigatório' })
  nome_arquivo: string;

  @Column()
  @IsNotEmpty({ message: 'Nome original do arquivo é obrigatório' })
  nome_original: string;

  @Column()
  @IsNotEmpty({ message: 'Caminho do arquivo é obrigatório' })
  caminho: string;

  @Column({ nullable: true })
  @IsOptional()
  thumbnail?: string;

  @Column({ nullable: true })
  @IsOptional()
  descricao?: string;

  @Column()
  @IsNumber({}, { message: 'Tamanho deve ser um número' })
  @Min(0, { message: 'Tamanho não pode ser negativo' })
  tamanho: number;

  @Column()
  @IsNotEmpty({ message: 'Tipo MIME é obrigatório' })
  mimetype: string;

  @Column({ type: 'timestamp' })
  @IsNotEmpty({ message: 'Data de upload é obrigatória' })
  data_upload: Date;

  @Column()
  @IsNotEmpty({ message: 'Usuário que fez upload é obrigatório' })
  @IsUUID('4', { message: 'ID do usuário deve ser um UUID válido' })
  usuario_upload_id: string;

  @ManyToOne(() => Usuario, { nullable: false })
  @JoinColumn({ name: 'usuario_upload_id' })
  usuario_upload: Usuario;

  @Column({ default: false })
  @IsBoolean()
  verificado: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  @IsOptional()
  @IsDate()
  data_verificacao: Date;

  @Column({ nullable: true })
  @IsOptional()
  @IsUUID('4', {
    message: 'ID do usuário de verificação deve ser um UUID válido',
  })
  usuario_verificacao_id?: string;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_verificacao_id' })
  usuario_verificacao?: Usuario;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  observacoes_verificacao?: string;

  @Column({ default: false })
  @IsBoolean()
  reutilizavel: boolean;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  hash_arquivo?: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'ID da sessão de upload deve ser um UUID válido' })
  upload_session_id?: string;

  @ManyToOne(() => UploadSession, (session) => session.documentos, {
    nullable: true,
  })
  @JoinColumn({ name: 'upload_session_id' })
  upload_session?: UploadSession;

  @Column({ nullable: true, type: 'date' })
  @IsOptional()
  @IsDate()
  data_validade?: Date;

  @Column('jsonb', { nullable: true })
  metadados?: {
    deteccao_mime?: {
      mime_declarado: string;
      mime_detectado: string;
      extensao_detectada: string;
    };
    upload_info?: {
      ip: string;
      user_agent: string;
    };
  };

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  url_publica?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
