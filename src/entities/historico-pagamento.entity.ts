import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
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
import { StatusPagamentoEnum } from '../enums/status-pagamento.enum';
import { TipoEventoHistoricoEnum } from '../enums/tipo-evento-historico.enum';

/**
 * Entidade que representa o histórico de eventos de um pagamento.
 *
 * Esta entidade armazena de forma imutável todos os eventos que ocorrem
 * durante o ciclo de vida de um pagamento, garantindo rastreabilidade
 * e auditoria completa das operações.
 *
 * @author Equipe PGBen
 */
@Entity('historico_pagamento')
@Index('idx_historico_pagamento_id', ['pagamento_id'])
@Index('idx_historico_data_evento', ['data_evento'])
@Index('idx_historico_tipo_evento', ['tipo_evento'])
@Index('idx_historico_usuario_id', ['usuario_id'])
@Index('idx_historico_pagamento_data', ['pagamento_id', 'data_evento'])
@Index('idx_historico_status_anterior', ['status_anterior'])
@Index('idx_historico_status_atual', ['status_atual'])
export class HistoricoPagamento {
  /**
   * Identificador único do registro de histórico
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Referência ao pagamento que gerou este evento
   */
  @Column({ name: 'pagamento_id', type: 'uuid' })
  @IsNotEmpty({ message: 'ID do pagamento é obrigatório' })
  @IsUUID('4', { message: 'ID do pagamento inválido' })
  pagamento_id: string;

  /**
   * Data e hora em que o evento ocorreu
   */
  @Column({ name: 'data_evento', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @IsNotEmpty({ message: 'Data do evento é obrigatória' })
  data_evento: Date;

  /**
   * Usuário responsável pelo evento (pode ser nulo para eventos automáticos do sistema)
   */
  @Column({ name: 'usuario_id', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário inválido' })
  usuario_id: string | null;

  /**
   * Tipo do evento que ocorreu
   */
  @Column({
    name: 'tipo_evento',
    type: 'enum',
    enum: TipoEventoHistoricoEnum,
  })
  @IsEnum(TipoEventoHistoricoEnum, { message: 'Tipo de evento inválido' })
  tipo_evento: TipoEventoHistoricoEnum;

  /**
   * Status anterior do pagamento (antes do evento)
   */
  @Column({
    name: 'status_anterior',
    type: 'enum',
    enum: StatusPagamentoEnum,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(StatusPagamentoEnum, { message: 'Status anterior inválido' })
  status_anterior: StatusPagamentoEnum | null;

  /**
   * Status atual do pagamento (após o evento)
   */
  @Column({
    name: 'status_atual',
    type: 'enum',
    enum: StatusPagamentoEnum,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(StatusPagamentoEnum, { message: 'Status atual inválido' })
  status_atual: StatusPagamentoEnum | null;

  /**
   * Observações sobre o evento
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Observação deve ser um texto' })
  @MaxLength(1000, { message: 'Observação deve ter no máximo 1000 caracteres' })
  observacao: string | null;

  /**
   * Dados contextuais do evento em formato JSON
   * Pode conter informações específicas do tipo de evento
   */
  @Column({ name: 'dados_contexto', type: 'jsonb', nullable: true })
  @IsOptional()
  dados_contexto: Record<string, any> | null;

  /**
   * Data de criação do registro (imutável)
   */
  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  /**
   * Relacionamentos com outras entidades
   */
  @ManyToOne(() => Pagamento, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pagamento_id' })
  pagamento: Pagamento;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;
}