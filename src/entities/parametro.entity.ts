import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ParametroTipoEnum } from '../enums';

/**
 * Entidade que representa um parâmetro de configuração do sistema.
 * Os parâmetros permitem personalizar o comportamento do sistema sem
 * necessidade de alterações no código fonte.
 */
@Entity('configuracao_parametro')
export class Parametro {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Chave única que identifica o parâmetro.
   * Usada para buscar o valor do parâmetro no sistema.
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  @Index('idx_parametro_chave')
  chave: string;

  /**
   * Valor do parâmetro armazenado como string.
   * Será convertido para o tipo correto durante o acesso.
   */
  @Column({ type: 'text' })
  valor: string;

  /**
   * Tipo do parâmetro, que determina como o valor será convertido.
   */
  @Column({
    type: 'enum',
    enum: ParametroTipoEnum,
    default: ParametroTipoEnum.STRING
  })
  tipo: ParametroTipoEnum;

  /**
   * Descrição do parâmetro, explicando seu propósito e uso.
   */
  @Column({ type: 'varchar', length: 500 })
  descricao: string;

  /**
   * Categoria para agrupamento lógico dos parâmetros.
   */
  @Column({ type: 'varchar', length: 100 })
  @Index('idx_parametro_categoria')
  categoria: string;

  /**
   * Data de criação do parâmetro.
   */
  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  /**
   * Data da última atualização do parâmetro.
   */
  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  /**
   * ID do usuário que realizou a última atualização.
   */
  @Column({ type: 'uuid', nullable: true })
  updated_by: string;
}
