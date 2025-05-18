import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Pagamento } from './pagamento.entity';
import { MetodoConfirmacaoEnum } from '../enums/metodo-confirmacao.enum';

/**
 * Entidade que representa uma confirmação de recebimento de pagamento.
 * 
 * Esta entidade armazena informações sobre as confirmações de recebimento
 * dos benefícios pelos beneficiários, incluindo método de confirmação e dados do destinatário.
 * 
 * @author Equipe PGBen
 */
@Entity('confirmacao_recebimento')
export class ConfirmacaoRecebimento {
  /**
   * Identificador único da confirmação
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Referência ao pagamento confirmado
   */
  @Column({ name: 'pagamento_id' })
  pagamentoId: string;

  /**
   * Data em que a confirmação foi registrada
   */
  @Column({ name: 'data_confirmacao', type: 'timestamp' })
  dataConfirmacao: Date;

  /**
   * Método utilizado para confirmar o recebimento
   */
  @Column({
    name: 'metodo_confirmacao',
    type: 'enum',
    enum: MetodoConfirmacaoEnum
  })
  metodoConfirmacao: MetodoConfirmacaoEnum;

  /**
   * Referência ao usuário (técnico ou beneficiário) que registrou a confirmação
   */
  @Column({ name: 'confirmado_por' })
  confirmadoPor: string;

  /**
   * Referência ao cidadão que recebeu o benefício, se diferente do beneficiário original
   */
  @Column({ name: 'destinatario_id', nullable: true })
  destinatarioId: string;

  /**
   * Observações adicionais sobre a confirmação
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
   * Relacionamento com a entidade Pagamento
   */
  @ManyToOne(() => Pagamento, pagamento => pagamento.id)
  @JoinColumn({ name: 'pagamento_id' })
  pagamento: Pagamento;

  /**
   * Relacionamentos com outras entidades serão implementados após a criação das entidades relacionadas
   */
  // @ManyToOne(() => Usuario)
  // @JoinColumn({ name: 'confirmado_por' })
  // responsavelConfirmacao: Usuario;

  // @ManyToOne(() => Cidadao)
  // @JoinColumn({ name: 'destinatario_id' })
  // destinatario: Cidadao;
}
