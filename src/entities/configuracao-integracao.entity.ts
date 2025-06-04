import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { IntegracaoTipoEnum } from '../enums';

/**
 * Entidade que representa uma configuração de integração com sistemas externos.
 * Armazena informações necessárias para conectar o sistema a serviços como
 * email, storage, SMS e APIs externas.
 */
@Entity('configuracao_integracao')
export class ConfiguracaoIntegracao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Código único que identifica a configuração de integração.
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  @Index('idx_integracao_codigo')
  codigo: string;

  /**
   * Tipo de integração, que determina o serviço externo.
   */
  @Column({
    type: 'enum',
    enum: IntegracaoTipoEnum,
  })
  @Index('idx_integracao_tipo')
  tipo: IntegracaoTipoEnum;

  /**
   * Nome descritivo da configuração de integração.
   */
  @Column({ type: 'varchar', length: 200 })
  nome: string;

  /**
   * Descrição detalhada da configuração de integração.
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  descricao?: string;

  /**
   * Status ativo/inativo da integração.
   */
  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  /**
   * Parâmetros específicos da integração, armazenados como JSON.
   * Pode incluir URLs, endpoints, configurações técnicas, etc.
   */
  @Column({ type: 'jsonb', default: '{}' })
  parametros: Record<string, string>;

  /**
   * Alias para o campo parametros, utilizado em diferentes partes do código
   */
  get configuracao(): Record<string, string> {
    return this.parametros;
  }

  set configuracao(value: Record<string, string>) {
    this.parametros = value;
  }

  /**
   * Credenciais sensíveis para autenticação com o serviço externo.
   * Armazenado de forma criptografada.
   */
  @Column({ type: 'text', nullable: true })
  credenciais?: string;

  /**
   * Data de criação da configuração.
   */
  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  /**
   * Data da última atualização da configuração.
   */
  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  /**
   * ID do usuário que realizou a última atualização.
   */
  @Column({ type: 'uuid', nullable: true })
  updated_by: string;
}
