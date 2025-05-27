import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { StatusPagamentoEnum } from '../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../enums/metodo-pagamento.enum';
import { Usuario } from '../../../modules/usuario/entities/usuario.entity';
import { Solicitacao } from '../../../modules/solicitacao/entities/solicitacao.entity';

/**
 * Entidade que representa um pagamento de benefício no sistema.
 * 
 * Esta entidade armazena informações sobre pagamentos liberados para beneficiários,
 * incluindo valores, métodos de pagamento, status e histórico de liberação.
 * 
 * @author Equipe PGBen
 */
@Entity('pagamento')
export class Pagamento {
  /**
   * Identificador único do pagamento
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Referência à solicitação aprovada que originou este pagamento
   */
  @Column({ name: 'solicitacao_id' })
  solicitacaoId: string;

  /**
   * Referência às informações bancárias/PIX utilizadas para o pagamento
   */
  @Column({ name: 'info_bancaria_id', nullable: true })
  infoBancariaId: string;

  /**
   * Valor liberado do benefício
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor: number;

  /**
   * Data efetiva da liberação do pagamento
   */
  @Column({ name: 'data_liberacao', type: 'timestamp' })
  dataLiberacao: Date;

  /**
   * Status atual do pagamento no sistema
   */
  @Column({
    type: 'enum',
    enum: StatusPagamentoEnum,
    default: StatusPagamentoEnum.AGENDADO
  })
  status: StatusPagamentoEnum;

  /**
   * Método utilizado para realizar o pagamento
   */
  @Column({
    name: 'metodo_pagamento',
    type: 'enum',
    enum: MetodoPagamentoEnum
  })
  metodoPagamento: MetodoPagamentoEnum;

  /**
   * Referência ao usuário que liberou o pagamento
   */
  @Column({ name: 'liberado_por' })
  liberadoPor: string;

  /**
   * Observações adicionais sobre o pagamento
   */
  @Column({ type: 'text', nullable: true })
  observacoes: string;

  /**
   * Data de criação do registro
   */
  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  /**
   * Data da última atualização do registro
   */
  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  /**
   * Data de remoção lógica (soft delete)
   */
  @Column({ name: 'removed_at', type: 'timestamp', nullable: true })
  removedAt: Date;

  /**
   * Relacionamentos com outras entidades
   */
  @ManyToOne(() => Solicitacao)
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  /* @ManyToOne(() => InfoBancaria)
  @JoinColumn({ name: 'info_bancaria_id' })
  infoBancaria: InfoBancaria; */

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'liberado_por' })
  responsavelLiberacao: Usuario;

  /**
   * Comprovantes anexados a este pagamento
   */
  @OneToMany('ComprovantePagamento', 'pagamento')
  comprovantes: any[];

  /**
   * Confirmação de recebimento deste pagamento
   */
  @OneToMany('ConfirmacaoRecebimento', 'pagamento')
  confirmacoes: any[];
}
