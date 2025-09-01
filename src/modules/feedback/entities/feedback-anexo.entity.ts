import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { Feedback } from './feedback.entity';

/**
 * Entidade para armazenar anexos dos feedbacks
 */
@Entity('feedback_anexos')
@Index(['feedback_id', 'created_at'])
@Index(['tipo_mime'])
export class FeedbackAnexo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Nome original do arquivo'
  })
  nome_original: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Nome do arquivo no sistema de armazenamento'
  })
  nome_arquivo: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Tipo MIME do arquivo'
  })
  @Index()
  tipo_mime: string;

  @Column({
    type: 'bigint',
    comment: 'Tamanho do arquivo em bytes'
  })
  tamanho: number;

  @Column({
    type: 'varchar',
    length: 500,
    comment: 'Caminho completo do arquivo no sistema de armazenamento'
  })
  caminho_arquivo: string;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: 'Hash SHA-256 do arquivo para verificação de integridade'
  })
  hash_arquivo: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'URL pública para acesso ao arquivo (se aplicável)'
  })
  url_publica: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Indica se o arquivo está ativo/disponível'
  })
  @Index()
  ativo: boolean;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Metadados adicionais do arquivo (dimensões, duração, etc.)'
  })
  metadados: string;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Data e hora do upload do arquivo'
  })
  created_at: Date;

  // Relacionamentos
  @Column({
    type: 'uuid',
    comment: 'ID do feedback ao qual o anexo pertence'
  })
  @Index()
  feedback_id: string;

  @ManyToOne(() => Feedback, feedback => feedback.anexos, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'feedback_id' })
  feedback: Feedback;

  // Métodos auxiliares
  /**
   * Verifica se o arquivo é uma imagem
   */
  isImagem(): boolean {
    return this.tipo_mime.startsWith('image/');
  }

  /**
   * Verifica se o arquivo é um vídeo
   */
  isVideo(): boolean {
    return this.tipo_mime.startsWith('video/');
  }

  /**
   * Verifica se o arquivo é um documento
   */
  isDocumento(): boolean {
    const tiposDocumento = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    return tiposDocumento.includes(this.tipo_mime);
  }

  /**
   * Retorna o tamanho formatado em formato legível
   */
  getTamanhoFormatado(): string {
    const bytes = this.tamanho;
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}