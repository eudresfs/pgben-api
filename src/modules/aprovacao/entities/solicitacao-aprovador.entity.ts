import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { SolicitacaoAprovacao } from './solicitacao-aprovacao.entity';

/**
 * Entidade para aprovadores específicos de uma solicitação
 * Rastreia quem deve/está aprovando uma solicitação específica
 */
@Entity('solicitacao_aprovadores')
@Index(['usuario_id', 'solicitacao_aprovacao_id'], { unique: true })
export class SolicitacaoAprovador {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    comment: 'ID do usuário aprovador'
  })
  usuario_id: string;

  @Column({
    type: 'boolean',
    nullable: true,
    comment: 'Decisão do aprovador: true=aprovado, false=rejeitado, null=pendente'
  })
  aprovado?: boolean;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Justificativa da decisão'
  })
  justificativa_decisao?: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Lista de anexos/documentos da decisão'
  })
  anexos_decisao?: {
    nome: string;
    url: string;
    tipo: string;
    tamanho: number;
    uploadedAt: Date;
  }[];

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Data da decisão'
  })
  decidido_em?: Date;

  @Column({
    type: 'integer',
    default: 1,
    comment: 'Ordem de aprovação (1 = primeiro aprovador)'
  })
  ordem_aprovacao: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Indica se o aprovador está ativo para esta solicitação'
  })
  ativo: boolean;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Observações sobre a aprovação'
  })
  observacoes?: string;

  @CreateDateColumn({
    type: 'timestamp',
    comment: 'Data de criação do registro'
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    comment: 'Data da última atualização'
  })
  updated_at: Date;

  // Relacionamentos
  @ManyToOne(() => SolicitacaoAprovacao, solicitacao => solicitacao.solicitacao_aprovadores)
  @JoinColumn({ name: 'solicitacao_aprovacao_id' })
  solicitacao_aprovacao: SolicitacaoAprovacao;

  @Column({
    type: 'uuid',
    comment: 'ID da solicitação de aprovação'
  })
  solicitacao_aprovacao_id: string;

  /**
   * Verifica se o aprovador já tomou uma decisão
   */
  jaDecidiu(): boolean {
    return this.aprovado !== null && this.aprovado !== undefined;
  }

  /**
   * Aprova a solicitação
   */
  aprovar(justificativa?: string, anexos?: {
    nome: string;
    url: string;
    tipo: string;
    tamanho: number;
    uploadedAt: Date;
  }[], observacoes?: string): void {
    this.aprovado = true;
    this.justificativa_decisao = justificativa;
    this.anexos_decisao = anexos;
    this.observacoes = observacoes;
    this.decidido_em = new Date();
  }

  /**
   * Rejeita a solicitação
   */
  rejeitar(justificativa: string, anexos?: {
    nome: string;
    url: string;
    tipo: string;
    tamanho: number;
    uploadedAt: Date;
  }[], observacoes?: string): void {
    this.aprovado = false;
    this.justificativa_decisao = justificativa;
    this.anexos_decisao = anexos;
    this.observacoes = observacoes;
    this.decidido_em = new Date();
  }

  /**
   * Verifica se a aprovação está pendente
   */
  estaPendente(): boolean {
    return !this.jaDecidiu();
  }

  /**
   * Verifica se foi aprovado
   */
  foiAprovado(): boolean {
    return this.aprovado === true;
  }

  /**
   * Verifica se foi rejeitado
   */
  foiRejeitado(): boolean {
    return this.aprovado === false;
  }
}