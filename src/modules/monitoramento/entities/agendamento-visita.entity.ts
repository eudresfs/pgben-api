import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { VisitaDomiciliar } from './visita-domiciliar.entity';
import {
  StatusAgendamento,
  TipoVisita,
  PrioridadeVisita,
} from '../enums';
import { Pagamento } from '../../../entities/pagamento.entity';
import { Usuario } from '@/entities';

@Entity('agendamento_visita')
export class AgendamentoVisita {
  @ApiProperty({
    description: 'ID único do agendamento',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Data e hora agendada para a visita',
    example: '2024-01-15T10:00:00Z',
  })
  @Column({ type: 'timestamp' })
  data_agendamento: Date;

  @ApiProperty({
    description: 'Tipo da visita',
    enum: TipoVisita,
    example: TipoVisita.INICIAL,
  })
  @Column({
    type: 'enum',
    enum: TipoVisita,
  })
  tipo_visita: TipoVisita;

  @ApiProperty({
    description: 'Status atual do agendamento',
    enum: StatusAgendamento,
    example: StatusAgendamento.AGENDADO,
  })
  @Column({
    type: 'enum',
    enum: StatusAgendamento,
    default: StatusAgendamento.AGENDADO,
  })
  status: StatusAgendamento;

  @ApiProperty({
    description: 'Prioridade da visita',
    enum: PrioridadeVisita,
    example: PrioridadeVisita.MEDIA,
  })
  @Column({
    type: 'enum',
    enum: PrioridadeVisita,
    default: PrioridadeVisita.MEDIA,
  })
  prioridade: PrioridadeVisita;

  @ApiProperty({
    description: 'Observações sobre o agendamento',
    example: 'Beneficiário solicitou visita pela manhã',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  observacoes?: string;

  @ApiProperty({
    description: 'Endereço específico para a visita',
    example: 'Rua das Flores, 123 - Apto 45',
    required: false,
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
  endereco_visita?: string;

  @ApiProperty({
    description: 'Dados complementares em formato JSON',
    example: { contato_emergencia: '11999999999', preferencia_horario: 'manhã' },
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  dados_complementares?: Record<string, any>;

  @ApiProperty({
    description: 'Motivo do cancelamento (se aplicável)',
    example: 'Beneficiário não estava disponível',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  motivo_cancelamento?: string;

  @ApiProperty({
    description: 'ID do usuário que cancelou o agendamento',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  cancelado_por?: string;

  @ApiProperty({
    description: 'Data do cancelamento',
    example: '2024-01-01T10:00:00Z',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  data_cancelamento?: Date;

  @ApiProperty({
    description: 'ID do usuário que criou o agendamento',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  created_by?: string;

  @ApiProperty({
    description: 'ID do usuário que atualizou o agendamento',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  updated_by?: string;

  @ManyToOne(() => Usuario, { eager: true })
  @JoinColumn({ name: 'updated_by' })
  atualizado_por: Usuario;

  @ManyToOne(() => Usuario, { eager: true })
  @JoinColumn({ name: 'created_by' })
  criado_por: Usuario;

  @ApiProperty({
    description: 'Data de criação do registro',
    example: '2024-01-01T10:00:00Z',
  })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2024-01-01T10:00:00Z',
  })
  @UpdateDateColumn()
  updated_at: Date;

  @ApiProperty({
    description: 'Se deve notificar o beneficiário',
    example: true,
  })
  @Column({ type: 'boolean', default: false })
  notificar_beneficiario: boolean;

  // Relacionamentos
  @ApiProperty({
    description: 'ID do pagamento vinculado ao agendamento',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid' })
  pagamento_id: string;

  @ManyToOne(() => Pagamento, { eager: true })
  @JoinColumn({ name: 'pagamento_id' })
  pagamento: Pagamento;

  @OneToMany(() => VisitaDomiciliar, (visita) => visita.agendamento)
  visitas: VisitaDomiciliar[];
}

export { StatusAgendamento } from '../enums';