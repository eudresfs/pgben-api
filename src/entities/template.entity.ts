import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TemplateTipoEnum } from '../enums';

/**
 * Entidade que representa um template do sistema.
 * Os templates são utilizados para gerar conteúdo dinâmico para emails,
 * notificações e documentos com base em dados variáveis.
 */
@Entity('configuracao_template')
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Código único que identifica o template.
   * Usado para referenciar o template em outros módulos.
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  @Index('idx_template_codigo')
  codigo: string;

  /**
   * Nome descritivo do template.
   */
  @Column({ type: 'varchar', length: 200 })
  nome: string;

  /**
   * Tipo do template, que determina seu contexto de uso.
   */
  @Column({
    type: 'enum',
    enum: TemplateTipoEnum,
  })
  @Index('idx_template_tipo')
  tipo: TemplateTipoEnum;

  /**
   * Assunto do template, utilizado principalmente para emails.
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  assunto?: string;

  /**
   * Conteúdo do template em formato HTML ou texto com placeholders.
   * Os placeholders são substituídos durante a renderização.
   */
  @Column({ type: 'text' })
  conteudo: string;

  /**
   * Lista de variáveis disponíveis para substituição no template.
   * Armazenada como JSON.
   */
  @Column({ type: 'jsonb', default: '[]' })
  variaveis: string[];

  /**
   * Status ativo/inativo do template.
   */
  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  /**
   * Data de criação do template.
   */
  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  /**
   * Data da última atualização do template.
   */
  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  /**
   * ID do usuário que realizou a última atualização.
   */
  @Column({ type: 'uuid', nullable: true })
  updated_by: string;
}
