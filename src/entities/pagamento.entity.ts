import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsDecimal,
} from 'class-validator';
import { StatusPagamentoEnum } from '../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../enums/metodo-pagamento.enum';
import { Usuario } from './usuario.entity';
import { Solicitacao } from './solicitacao.entity';
import { InfoBancaria } from './info-bancaria.entity';

/**
 * Entidade que representa um pagamento de benefício no sistema.
 *
 * Esta entidade armazena informações sobre pagamentos liberados para beneficiários,
 * incluindo valores, métodos de pagamento, status e histórico de liberação.
 *
 * @author Equipe PGBen
 */
@Entity('pagamento')
@Index('idx_pagamento_status_created_at', ['status', 'created_at'])
@Index('idx_pagamento_solicitacao_id', ['solicitacaoId'])
@Index('idx_pagamento_info_bancaria_id', ['infoBancariaId'], { 
  where: 'info_bancaria_id IS NOT NULL' 
})
@Index('idx_pagamento_liberado_por', ['liberadoPor'])
@Index('idx_pagamento_data_liberacao', ['dataLiberacao'])
@Index('idx_pagamento_status_data_liberacao', ['status', 'dataLiberacao'])
@Index('idx_pagamento_metodo_pagamento', ['metodoPagamento'])
@Index('idx_pagamento_valor_status', ['valor', 'status'], {
  where: "status IN ('PROCESSADO', 'PAGO', 'LIBERADO')"
})
@Index('idx_pagamento_removed_at', ['removed_at'], {
  where: 'removed_at IS NULL'
})
@Index('idx_pagamento_liberado_por_created_at', ['liberadoPor', 'created_at'])
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
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  @IsUUID('4', { message: 'ID da solicitação inválido' })
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
  @IsNotEmpty({ message: 'Valor é obrigatório' })
  @IsDecimal(
    { decimal_digits: '2' },
    { message: 'Valor deve ter no máximo 2 casas decimais' },
  )
  @Min(0.01, { message: 'Valor deve ser maior que zero' })
  valor: number;

  /**
   * Data efetiva da liberação do pagamento
   */
  @Column({ name: 'data_liberacao', type: 'date' })
  @IsNotEmpty({ message: 'Data de liberação é obrigatória' })
  dataLiberacao: Date;

  /**
   * Status atual do pagamento no sistema
   */
  @Column({
    type: 'enum',
    enum: StatusPagamentoEnum,
    default: StatusPagamentoEnum.AGENDADO,
  })
  @IsEnum(StatusPagamentoEnum, { message: 'Status inválido' })
  status: StatusPagamentoEnum;

  /**
   * Método utilizado para realizar o pagamento
   */
  @Column({
    name: 'metodo_pagamento',
    type: 'enum',
    enum: MetodoPagamentoEnum,
  })
  @IsEnum(MetodoPagamentoEnum, { message: 'Método de pagamento inválido' })
  metodoPagamento: MetodoPagamentoEnum;

  /**
   * Referência ao usuário que liberou o pagamento
   */
  @Column({ name: 'liberado_por' })
  @IsNotEmpty({ message: 'ID do responsável pela liberação é obrigatório' })
  @IsUUID('4', { message: 'ID do responsável pela liberação inválido' })
  liberadoPor: string;

  /**
   * Observações adicionais sobre o pagamento
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
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
   * Data de remoção lógica (soft delete)
   */
  @DeleteDateColumn({ name: 'removed_at' })
  removed_at: Date;

  /**
   * Relacionamentos com outras entidades
   */
  @ManyToOne(() => Solicitacao)
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @ManyToOne(() => InfoBancaria)
  @JoinColumn({ name: 'info_bancaria_id' })
  infoBancaria: InfoBancaria; 

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
