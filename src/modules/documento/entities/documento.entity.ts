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
import { Solicitacao } from '../../solicitacao/entities/solicitacao.entity';
import { TipoDocumento } from '../../beneficio/entities/requisito-documento.entity';

@Entity('documentos')
@Index(['solicitacao_id', 'tipo'])
@Index(['usuario_upload'])
@Index(['data_upload'])
@Index(['verificado'])
export class Documento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Solicitação é obrigatória' })
  solicitacao_id: string;

  @ManyToOne(() => Solicitacao, (solicitacao) => solicitacao.documentos)
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @Column({
    type: 'enum',
    enum: TipoDocumento,
    enumName: 'tipo_documento',
  })
  @IsNotEmpty({ message: 'Tipo de documento é obrigatório' })
  tipo: TipoDocumento;

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
  descricao: string;

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
  usuario_upload: string;

  // Temporariamente comentado até que a entidade User seja criada
  // @ManyToOne(() => User)
  // @JoinColumn({ name: 'usuario_upload' })
  // uploader: User;

  @Column({ default: false })
  @IsBoolean()
  verificado: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  @IsOptional()
  @IsDate()
  data_verificacao: Date;

  @Column({ nullable: true })
  @IsOptional()
  @IsUUID()
  usuario_verificacao: string;

  @Column({ nullable: true })
  @IsOptional()
  @IsString()
  observacoes_verificacao: string;

  @Column('jsonb', { nullable: true })
  metadados: {
    hash?: string;
    validade?: Date | string;
    verificado?: boolean;
    observacoes?: string;
    criptografado?: boolean;
    criptografia?: {
      iv: string;
      authTag: string;
      algoritmo: string;
    };
    deteccao_mime?: {
      mime_declarado: string;
      mime_detectado: string;
      extensao_detectada: string;
    };
    upload_info?: {
      data: string;
      usuario_id: string;
      ip: string;
      user_agent: string;
    };
    verificacao?: {
      data: string;
      usuario_id: string;
      observacoes: string;
    };
    verificacao_malware?: {
      verificado_em?: string;
      resultado?: string;
      detalhes?: string;
    };
    ultima_atualizacao?: {
      data: string;
      usuario_id: string;
    };
  };

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
