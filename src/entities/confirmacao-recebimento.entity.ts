import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsEnum,
  IsString,
  MaxLength,
} from 'class-validator';
import { Pagamento } from './pagamento.entity';
import { Usuario } from './usuario.entity';
import { MetodoConfirmacaoEnum } from '../enums/metodo-confirmacao.enum';
import { Cidadao } from './cidadao.entity';

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
  @IsNotEmpty({ message: 'ID do pagamento é obrigatório' })
  @IsUUID('4', { message: 'ID do pagamento deve ser um UUID válido' })
  pagamento_id: string;

  /**
   * Data em que a confirmação foi registrada
   */
  @Column({ name: 'data_confirmacao', type: 'timestamp' })
  @IsNotEmpty({ message: 'Data de confirmação é obrigatória' })
  data_confirmacao: Date;

  /**
   * Método utilizado para confirmar o recebimento
   */
  @Column({
    name: 'metodo_confirmacao',
    type: 'enum',
    enum: MetodoConfirmacaoEnum,
  })
  @IsNotEmpty({ message: 'Método de confirmação é obrigatório' })
  @IsEnum(MetodoConfirmacaoEnum, { message: 'Método de confirmação inválido' })
  metodo_confirmacao: MetodoConfirmacaoEnum;

  /**
   * Referência ao usuário (técnico ou beneficiário) que registrou a confirmação
   */
  @Column({ name: 'confirmado_por' })
  @IsNotEmpty({ message: 'ID do usuário que confirmou é obrigatório' })
  @IsUUID('4', { message: 'ID do usuário deve ser um UUID válido' })
  confirmado_por: string;

  /**
   * Referência ao cidadão que recebeu o benefício, se diferente do beneficiário original
   */
  @Column({ name: 'destinatario_id', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'ID do destinatário deve ser um UUID válido' })
  destinatario_id: string;

  /**
   * Observações adicionais sobre a confirmação
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Observações devem ser uma string' })
  @MaxLength(1000, {
    message: 'Observações devem ter no máximo 1000 caracteres',
  })
  observacoes: string;

  /**
   * Data de criação do registro
   */
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  /**
   * Data da última atualização do registro
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  /**
   * Relacionamento com a entidade Pagamento
   */
  @ManyToOne(() => Pagamento, (pagamento) => pagamento.id)
  @JoinColumn({ name: 'pagamento_id' })
  pagamento: Pagamento;

  /**
   * Relacionamentos com outras entidades serão implementados após a criação das entidades relacionadas
   */
  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'confirmado_por' })
  @JoinColumn({ name: 'confirmado_por' })
  responsavel_confirmacao: Usuario;

  @ManyToOne(() => Cidadao)
  @JoinColumn({ name: 'destinatario_id' })
  destinatario: Cidadao;
}
