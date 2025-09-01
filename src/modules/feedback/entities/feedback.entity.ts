import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  Index
} from 'typeorm';
import { Usuario } from '../../../entities/usuario.entity';
import { TipoFeedbackEnum, TipoFeedbackLabels, PrioridadeFeedbackEnum, PrioridadeFeedbackCores, PrioridadeFeedbackLabels } from '../enums';
import { FeedbackAnexo } from './feedback-anexo.entity';
import { Tag } from './tag.entity';

/**
 * Entidade principal para armazenar feedbacks dos usuários
 */
@Entity('feedbacks')
@Index(['tipo', 'prioridade'])
@Index(['usuario_id', 'created_at'])
@Index(['prioridade', 'created_at'])
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TipoFeedbackEnum,
    comment: 'Tipo do feedback (sugestao, reclamacao, elogio, bug, melhoria)'
  })
  @Index()
  tipo: TipoFeedbackEnum;

  @Column({
    type: 'varchar',
    length: 200,
    comment: 'Título do feedback'
  })
  titulo: string;

  @Column({
    type: 'text',
    comment: 'Descrição detalhada do feedback'
  })
  descricao: string;

  @Column({
    type: 'enum',
    enum: PrioridadeFeedbackEnum,
    default: PrioridadeFeedbackEnum.MEDIA,
    comment: 'Prioridade do feedback (baixa, media, alta, critica)'
  })
  @Index()
  prioridade: PrioridadeFeedbackEnum;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Página ou seção do sistema onde o feedback foi gerado'
  })
  pagina_origem: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Versão do sistema quando o feedback foi enviado'
  })
  versao_sistema: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Informações técnicas adicionais (user agent, resolução, etc.)'
  })
  informacoes_tecnicas: string;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'Endereço IP do usuário que enviou o feedback'
  })
  ip_origem: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Indica se o feedback foi lido pela equipe'
  })
  @Index()
  lido: boolean;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Indica se o feedback foi resolvido'
  })
  @Index()
  resolvido: boolean;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Resposta da equipe ao feedback'
  })
  resposta: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Data e hora da resposta ao feedback'
  })
  data_resposta: Date;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'ID do usuário que respondeu ao feedback'
  })
  respondido_por: string;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Data e hora de criação do feedback'
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    comment: 'Data e hora da última atualização'
  })
  updated_at: Date;

  // Relacionamentos
  @Column({
    type: 'uuid',
    comment: 'ID do usuário que enviou o feedback'
  })
  @Index()
  usuario_id: string;

  @ManyToOne(() => Usuario, { eager: false })
  usuario: Usuario;

  @OneToMany(() => FeedbackAnexo, anexo => anexo.feedback, {
    cascade: true,
    eager: false
  })
  anexos: FeedbackAnexo[];

  @ManyToMany(() => Tag, tag => tag.feedbacks, {
    cascade: false,
    eager: false
  })
  @JoinTable({
    name: 'feedback_tags',
    joinColumn: {
      name: 'feedback_id',
      referencedColumnName: 'id'
    },
    inverseJoinColumn: {
      name: 'tag_id',
      referencedColumnName: 'id'
    }
  })
  tags: Tag[];

  /**
   * Obtém a cor associada à prioridade do feedback
   */
  getPrioridadeCor(): string {
    return PrioridadeFeedbackCores[this.prioridade] || '#6c757d';
  }

  /**
   * Obtém o label do tipo de feedback
   */
  getTipoLabel(): string {
    return TipoFeedbackLabels[this.tipo];
  }

  /**
   * Obtém o label da prioridade
   */
  getPrioridadeLabel(): string {
    return PrioridadeFeedbackLabels[this.prioridade];
  }
}