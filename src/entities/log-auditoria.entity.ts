import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  UpdateDateColumn,
} from 'typeorm';
import { TipoOperacao } from '../enums/tipo-operacao.enum';

/**
 * Entidade LogAuditoria - Versão MVP
 *
 * Responsável por armazenar os logs de auditoria do sistema,
 * registrando operações críticas realizadas pelos usuários.
 * Implementação simplificada para o MVP com foco em rastreabilidade básica.
 */
@Entity('logs_auditoria')
@Index(['usuario_id', 'created_at'])
@Index(['entidade_afetada', 'created_at'])
@Index(['tipo_operacao', 'created_at'])
export class LogAuditoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tipo de operação realizada
   * Utiliza o enum TipoOperacao para padronização
   */
  @Column({
    type: 'varchar',
    length: 20,
    comment: 'Tipo de operação (CREATE, READ, UPDATE, DELETE, ACCESS, etc.)',
  })
  tipo_operacao: TipoOperacao;

  /**
   * Entidade afetada pela operação
   * Ex: Usuario, Cidadao, Solicitacao, etc.
   */
  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Nome da entidade afetada pela operação',
  })
  entidade_afetada: string;

  /**
   * ID da entidade afetada
   */
  @Column({
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: 'ID da entidade afetada pela operação',
  })
  entidade_id: string;

  /**
   * Dados anteriores à operação
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Dados anteriores à operação, armazenados em formato JSON',
  })
  dados_anteriores: Record<string, any>;

  /**
   * Novos dados após a operação
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Novos dados após a operação, armazenados em formato JSON',
  })
  dados_novos: Record<string, any>;

  /**
   * ID do usuário que realizou a operação
   */
  @Column({
    name: 'usuario_id',
    nullable: true,
    comment: 'ID do usuário que realizou a operação',
  })
  usuario_id: string;

  // Relação com usuário removida para simplificar o MVP

  /**
   * Descrição da operação realizada
   */
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Descrição textual da operação realizada',
  })
  descricao: string;

  /**
   * Endereço IP de origem da requisição
   */
  @Column({
    type: 'varchar',
    length: 45, // Suporte para IPv4 e IPv6
    nullable: true,
    comment: 'Endereço IP de origem que realizou a requisição',
  })
  ip_origem: string;

  /**
   * User-Agent do navegador ou cliente
   */
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'User-Agent do navegador ou cliente que realizou a requisição',
  })
  user_agent: string;

  /**
   * Dados sensíveis que foram acessados (LGPD)
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    comment:
      'Array de campos sensíveis que foram acessados, para compliance com LGPD',
  })
  dados_sensiveis_acessados: string[];

  /**
   * Endpoint acessado
   */
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Endpoint acessado',
  })
  endpoint: string;

  /**
   * Método HTTP utilizado
   */
  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: 'Método HTTP utilizado',
  })
  metodo_http: string;

  // Campos não essenciais para o MVP foram removidos

  /**
   * Nível de risco da operação
   */
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: 'Nível de risco da operação (LOW, MEDIUM, HIGH, CRITICAL)',
  })
  nivel_risco: string;

  /**
   * Data e hora da operação
   */
  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: 'Data e hora em que a operação foi realizada',
  })
  data_hora: Date;

  /**
   * Data e hora de criação do registro
   */
  @CreateDateColumn({
    type: 'timestamptz',
    comment: 'Data e hora de criação do registro',
  })
  created_at: Date;

  /**
   * Data e hora da última atualização do registro
   */
  @UpdateDateColumn({
    type: 'timestamptz',
    comment: 'Data e hora da última atualização do registro',
  })
  updated_at: Date;
}
