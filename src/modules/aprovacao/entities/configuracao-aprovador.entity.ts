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
import { AcaoAprovacao } from './acao-aprovacao.entity';
import { Status } from '../../../enums/status.enum';

/**
 * Entidade para configuração de aprovadores
 * Define quem pode aprovar determinadas ações
 */
@Entity('configuracao_aprovadores')
@Index(['usuario_id', 'acao_aprovacao_id'], { unique: true })
export class ConfiguracaoAprovador {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'uuid',
    comment: 'ID do usuário aprovador'
  })
  usuario_id: string;

  @Column({
    type: 'integer',
    default: 1,
    comment: 'Ordem de aprovação (1 = primeiro aprovador)'
  })
  ordem_aprovacao: number;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.ATIVO,
    comment: 'Status do aprovador na configuração'
  })
  status: Status;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Observações sobre a configuração do aprovador'
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
  @ManyToOne(() => AcaoAprovacao, acao => acao.configuracao_aprovadores)
  @JoinColumn({ name: 'acao_aprovacao_id' })
  acao_aprovacao: AcaoAprovacao;

  @Column({
    type: 'uuid',
    comment: 'ID da ação de aprovação'
  })
  acao_aprovacao_id: string;

  /**
   * Verifica se a configuração está ativa
   */
  estaAtivo(): boolean {
    return this.status === Status.ATIVO;
  }

  /**
   * Ativa a configuração do aprovador
   */
  ativar(): void {
    this.status = Status.ATIVO;
  }

  /**
   * Desativa a configuração do aprovador
   */
  desativar(): void {
    this.status = Status.INATIVO;
  }
}