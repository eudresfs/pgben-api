import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { AcaoAprovacao } from './acao-aprovacao.entity';
import { SolicitacaoAprovacao } from './solicitacao-aprovacao.entity';

/**
 * Entidade simplificada para aprovadores
 * Remove complexidade de delegação e hierarquia
 */
@Entity('aprovadores')
export class Aprovador {
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
    type: 'boolean',
    default: true,
    comment: 'Indica se o aprovador está ativo'
  })
  ativo: boolean;

  @CreateDateColumn({
    type: 'timestamp',
    comment: 'Data de criação do registro'
  })
  criado_em: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    comment: 'Data da última atualização'
  })
  atualizado_em: Date;

  // Relacionamentos
  @ManyToOne(() => AcaoAprovacao, acao => acao.aprovadores)
  @JoinColumn({ name: 'acao_aprovacao_id' })
  acao_aprovacao: AcaoAprovacao;

  @Column({
    type: 'uuid',
    comment: 'ID da ação de aprovação'
  })
  acao_aprovacao_id: string;

  @ManyToOne(() => SolicitacaoAprovacao, solicitacao => solicitacao.aprovadores)
  @JoinColumn({ name: 'solicitacao_aprovacao_id' })
  solicitacao_aprovacao: SolicitacaoAprovacao;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'ID da solicitação específica (quando aplicável)'
  })
  solicitacao_aprovacao_id?: string;

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
  }[]): void {
    this.aprovado = true;
    this.justificativa_decisao = justificativa;
    this.anexos_decisao = anexos;
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
  }[]): void {
    this.aprovado = false;
    this.justificativa_decisao = justificativa;
    this.anexos_decisao = anexos;
    this.decidido_em = new Date();
  }
}