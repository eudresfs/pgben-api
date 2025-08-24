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
import { Concessao } from './concessao.entity';
import { InfoBancaria } from './info-bancaria.entity';
import { Documento } from './documento.entity';

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
@Index('idx_pagamento_solicitacao_id', ['solicitacao_id'])
@Index('idx_pagamento_concessao_id', ['concessao_id'])
@Index('idx_pagamento_info_bancaria_id', ['info_bancaria_id'], {
  where: 'info_bancaria_id IS NOT NULL',
})
@Index('idx_pagamento_liberado_por', ['liberado_por'])
@Index('idx_pagamento_data_liberacao', ['data_liberacao'])
@Index('idx_pagamento_status_data_liberacao', ['status', 'data_liberacao'])
@Index('idx_pagamento_metodo_pagamento', ['metodo_pagamento'])
@Index('idx_pagamento_valor_status', ['valor', 'status'], {
  where: "status IN ('PROCESSADO', 'PAGO', 'LIBERADO')",
})
@Index('idx_pagamento_removed_at', ['removed_at'], {
  where: 'removed_at IS NULL',
})
@Index('idx_pagamento_liberado_por_created_at', ['liberado_por', 'created_at'])
export class Pagamento {
  /**
   * Identificador único do pagamento
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Referência à solicitação aprovada que originou este pagamento
   */
  @Column({ name: 'solicitacao_id', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'ID da solicitação inválido' })
  solicitacao_id: string | null;

  /**
   * Referência à concessão que originou este pagamento
   */
  @Column({ name: 'concessao_id', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'ID da concessão inválido' })
  concessao_id: string | null;

  /**
   * Referência às informações bancárias/PIX utilizadas para o pagamento
   */
  @Column({ name: 'info_bancaria_id', nullable: true })
  @IsOptional()
  info_bancaria_id: string;

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
  @Column({ name: 'data_liberacao', type: 'date', nullable: true })
  @IsOptional()
  data_liberacao: Date;

  /**
   * Data prevista para liberação do pagamento
   */
  @Column({ name: 'data_prevista_liberacao', type: 'date', nullable: true })
  @IsOptional()
  data_prevista_liberacao: Date;

  /**
   * Data de agendamento do pagamento
   */
  @Column({ name: 'data_agendamento', type: 'date', nullable: true })
  @IsOptional()
  data_agendamento: Date;

  /**
   * Data efetiva do pagamento
   */
  @Column({ name: 'data_pagamento', type: 'date', nullable: true })
  @IsOptional()
  data_pagamento: Date;

  /**
   * Data de conclusão do pagamento
   */
  @Column({ name: 'data_conclusao', type: 'date', nullable: true })
  @IsOptional()
  data_conclusao: Date;

  /**
   * Data de vencimento do pagamento (específico para Aluguel Social)
   */
  @Column({ name: 'data_vencimento', type: 'date', nullable: true })
  @IsOptional()
  data_vencimento: Date;

  /**
   * Data de regularização do pagamento vencido
   */
  @Column({ name: 'data_regularizacao', type: 'date', nullable: true })
  @IsOptional()
  data_regularizacao: Date;

  /**
   * Status atual do pagamento no sistema
   */
  @Column({
    type: 'enum',
    enum: StatusPagamentoEnum,
    default: StatusPagamentoEnum.PENDENTE,
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
  metodo_pagamento: MetodoPagamentoEnum;

  /**
   * Referência ao usuário que liberou o pagamento
   */
  @Column({ name: 'liberado_por', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'ID do responsável pela liberação inválido' })
  liberado_por: string;

  /**
   * Referência ao usuário que criou o pagamento
   */
  @Column({ name: 'criado_por', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'ID do criador inválido' })
  criado_por: string;

  /**
   * ID do comprovante de pagamento
   */
  @Column({ name: 'comprovante_id', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'ID do comprovante inválido' })
  comprovante_id: string;

  /**
   * Número da parcela atual (para pagamentos com múltiplas parcelas)
   */
  @Column({ name: 'numero_parcela', default: 1 })
  @IsNumber({}, { message: 'Número da parcela deve ser um valor numérico' })
  @Min(1, { message: 'Número da parcela deve ser maior ou igual a 1' })
  numero_parcela: number;

  /**
   * Total de parcelas previstas para o benefício
   */
  @Column({ name: 'total_parcelas', default: 1 })
  @IsNumber({}, { message: 'Total de parcelas deve ser um valor numérico' })
  @Min(1, { message: 'Total de parcelas deve ser maior ou igual a 1' })
  total_parcelas: number;

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

  @ManyToOne(() => Concessao)
  @JoinColumn({ name: 'concessao_id' })
  concessao: Concessao;

  @ManyToOne(() => InfoBancaria)
  @JoinColumn({ name: 'info_bancaria_id' })
  info_bancaria: InfoBancaria;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'liberado_por' })
  responsavel_liberacao: Usuario;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'criado_por' })
  criador: Usuario;

  /**
   * Comprovantes anexados a este pagamento (via documento)
   */
  // @OneToMany(() => Documento, (documento) => documento.pagamento, {
  //   cascade: true,
  // })
  // comprovantes: Documento[];

  /**
   * Confirmação de recebimento deste pagamento
   */
  @OneToMany('ConfirmacaoRecebimento', 'pagamento')
  confirmacoes: any[];
}
