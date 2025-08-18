import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany
} from 'typeorm';
import { StatusSolicitacao } from '../enums';
import { AcaoAprovacao } from './acao-aprovacao.entity';
import { Aprovador } from './aprovador.entity';

/**
 * Entidade simplificada para solicitações de aprovação
 * Remove campos desnormalizados e mantém apenas dados essenciais
 */
@Entity('solicitacoes_aprovacao')
export class SolicitacaoAprovacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
    comment: 'Código único da solicitação'
  })
  codigo: string;

  @Column({
    type: 'enum',
    enum: StatusSolicitacao,
    default: StatusSolicitacao.PENDENTE,
    comment: 'Status atual da solicitação'
  })
  status: StatusSolicitacao;

  @Column({
    type: 'uuid',
    comment: 'ID do usuário solicitante'
  })
  solicitante_id: string;

  @Column({
    type: 'text',
    comment: 'Justificativa para a solicitação'
  })
  justificativa: string;

  @Column({
    type: 'jsonb',
    comment: 'Dados da ação a ser executada após aprovação'
  })
  dados_acao: Record<string, any>;

  @Column({
    type: 'varchar',
    length: 200,
    comment: 'Método/endpoint que será executado após aprovação'
  })
  metodo_execucao: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Data limite para aprovação'
  })
  prazo_aprovacao?: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Data de processamento da solicitação'
  })
  processado_em?: Date;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'ID do usuário que processou a solicitação'
  })
  processado_por?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Observações do processamento'
  })
  observacoes?: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Lista de anexos/documentos da solicitação'
  })
  anexos?: {
    nome: string;
    url: string;
    tipo: string;
    tamanho: number;
    uploadedAt: Date;
  }[];

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Data de execução da ação aprovada'
  })
  executado_em?: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Mensagem de erro caso a execução falhe'
  })
  erro_execucao?: string;

  @CreateDateColumn({
    type: 'timestamp',
    comment: 'Data de criação da solicitação',
    name: 'created_at'
  })
  criado_em: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    comment: 'Data da última atualização',
    name: 'updated_at'
  })
  atualizado_em: Date;

  // Relacionamentos
  @ManyToOne(() => AcaoAprovacao, acao => acao.solicitacoes)
  @JoinColumn({ name: 'acao_aprovacao_id' })
  acao_aprovacao: AcaoAprovacao;

  @Column({
    type: 'uuid',
    comment: 'ID da ação de aprovação'
  })
  acao_aprovacao_id: string;

  @OneToMany(() => Aprovador, aprovador => aprovador.solicitacao_aprovacao)
  aprovadores: Aprovador[];

  /**
   * Calcula o número de aprovações necessárias baseado na estratégia
   */
  calcularAprovacoesNecessarias(): number {
    const totalAprovadores = this.aprovadores?.length || 0;
    
    if (this.acao_aprovacao.estrategia === 'simples') {
      return 1;
    }
    
    if (this.acao_aprovacao.estrategia === 'maioria') {
      return Math.ceil(totalAprovadores / 2);
    }
    
    return this.acao_aprovacao.min_aprovadores;
  }

  /**
   * Verifica se a solicitação pode ser aprovada
   */
  podeSerAprovada(): boolean {
    const aprovacoes = this.aprovadores?.filter(a => a.aprovado === true).length || 0;
    return aprovacoes >= this.calcularAprovacoesNecessarias();
  }

  /**
   * Verifica se a solicitação foi rejeitada
   */
  foiRejeitada(): boolean {
    return this.aprovadores?.some(a => a.aprovado === false) || false;
  }
}