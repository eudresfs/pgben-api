import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany
} from 'typeorm';
import { TipoAcaoCritica, EstrategiaAprovacao } from '../enums';
import { SolicitacaoAprovacao } from './solicitacao-aprovacao.entity';
import { ConfiguracaoAprovador } from './configuracao-aprovador.entity';
import { Status } from '../../../enums/status.enum';

/**
 * Entidade que combina configuração de ação crítica e suas regras de aprovação
 * Simplifica a arquitetura anterior que separava AcaoCritica e ConfiguracaoAprovacao
 */
@Entity('acoes_aprovacao')
export class AcaoAprovacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TipoAcaoCritica,
    comment: 'Tipo da ação crítica que requer aprovação'
  })
  tipo_acao: TipoAcaoCritica;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Nome descritivo da ação'
  })
  nome: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Descrição detalhada da ação'
  })
  descricao?: string;

  @Column({
    type: 'enum',
    enum: EstrategiaAprovacao,
    default: EstrategiaAprovacao.SIMPLES,
    comment: 'Estratégia de aprovação a ser utilizada'
  })
  estrategia: EstrategiaAprovacao;

  @Column({
    type: 'int',
    default: 1,
    comment: 'Número mínimo de aprovadores necessários'
  })
  min_aprovadores: number;

  @Column({
    type: 'text',
    array: true,
    nullable: true,
    comment: 'Lista de perfis necessários para autoaprovação (usado com AUTOAPROVACAO_PERFIL)'
  })
  perfil_auto_aprovacao?: string[];

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Setor/unidade para escalonamento (usado com ESCALONAMENTO_SETOR)'
  })
  setor_escalonamento?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Permissão necessária para aprovação no setor'
  })
  permissao_aprovacao?: string;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.ATIVO,
    comment: 'Status da configuração de aprovação'
  })
  status: Status;

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
  @OneToMany(() => SolicitacaoAprovacao, solicitacao => solicitacao.acao_aprovacao)
  solicitacoes: SolicitacaoAprovacao[];

  @OneToMany(() => ConfiguracaoAprovador, configuracao => configuracao.acao_aprovacao)
  configuracao_aprovadores: ConfiguracaoAprovador[];
}