import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { TipoOperacao } from '../enums/tipo-operacao.enum';

/**
 * Entidade LogAuditoria
 * 
 * Responsável por armazenar os logs de auditoria do sistema,
 * registrando todas as operações realizadas pelos usuários.
 * Essencial para compliance com LGPD e segurança.
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
    comment: 'Tipo de operação (CREATE, READ, UPDATE, DELETE, ACCESS, etc.)' 
  })
  tipo_operacao: TipoOperacao;

  /**
   * Entidade afetada pela operação
   * Ex: Usuario, Cidadao, Solicitacao, etc.
   */
  @Column({ 
    type: 'varchar', 
    length: 100, 
    comment: 'Nome da entidade afetada pela operação' 
  })
  entidade_afetada: string;

  /**
   * ID da entidade afetada
   */
  @Column({ 
    type: 'varchar', 
    length: 36, 
    nullable: true, 
    comment: 'ID da entidade afetada pela operação' 
  })
  entidade_id: string;

  /**
   * Dados anteriores à operação (em caso de update ou delete)
   */
  @Column({ 
    type: 'jsonb', 
    nullable: true, 
    comment: 'Dados anteriores à operação (em caso de update ou delete)' 
  })
  dados_anteriores: any;

  /**
   * Dados após a operação (em caso de create ou update)
   */
  @Column({ 
    type: 'jsonb', 
    nullable: true, 
    comment: 'Dados após a operação (em caso de create ou update)' 
  })
  dados_novos: any;

  /**
   * ID do usuário que realizou a operação
   */
  @Column({ 
    name: 'usuario_id', 
    nullable: true, 
    comment: 'ID do usuário que realizou a operação' 
  })
  usuario_id: string;

  /**
   * Relação com o usuário que realizou a operação
   */
  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  /**
   * IP do usuário que realizou a operação
   */
  @Column({ 
    type: 'varchar', 
    length: 45, 
    nullable: true, 
    comment: 'IP do usuário que realizou a operação' 
  })
  ip_origem: string;

  /**
   * User-Agent do navegador do usuário
   */
  @Column({ 
    type: 'text', 
    nullable: true, 
    comment: 'User-Agent do navegador do usuário' 
  })
  user_agent: string;

  /**
   * Endpoint acessado
   */
  @Column({ 
    type: 'varchar', 
    length: 255, 
    nullable: true, 
    comment: 'Endpoint acessado' 
  })
  endpoint: string;

  /**
   * Método HTTP utilizado
   */
  @Column({ 
    type: 'varchar', 
    length: 10, 
    nullable: true, 
    comment: 'Método HTTP utilizado' 
  })
  metodo_http: string;

  /**
   * Dados sensíveis acessados (para compliance com LGPD)
   */
  @Column({ 
    type: 'jsonb', 
    nullable: true, 
    comment: 'Dados sensíveis acessados (para compliance com LGPD)' 
  })
  dados_sensiveis_acessados: any;

  /**
   * Motivo da operação (útil para operações administrativas)
   */
  @Column({ 
    type: 'text', 
    nullable: true, 
    comment: 'Motivo da operação (útil para operações administrativas)' 
  })
  motivo: string;

  /**
   * Descrição da operação
   */
  @Column({ 
    type: 'text', 
    nullable: true, 
    comment: 'Descrição detalhada da operação realizada' 
  })
  descricao: string;

  /**
   * Data e hora da operação (pode ser definida manualmente)
   */
  @Column({ 
    type: 'timestamptz', 
    nullable: true,
    comment: 'Data e hora da operação (definida manualmente)' 
  })
  data_hora: Date;

  /**
   * Data e hora de criação do registro
   */
  @CreateDateColumn({ 
    type: 'timestamptz', 
    comment: 'Data e hora de criação do registro' 
  })
  created_at: Date;
}
