import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Usuario } from '../../../entities/usuario.entity';
import { Cidadao } from '../../../entities/cidadao.entity';
import { Unidade } from '../../../entities/unidade.entity';
import { VisitaDomiciliar } from './visita-domiciliar.entity';
import {
  StatusAgendamento,
  TipoVisita,
  PrioridadeVisita,
} from '../enums';
import { Concessao } from '@/entities';

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
    description: 'ID do técnico responsável',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid' })
  tecnico_id: string;

  @ManyToOne(() => Usuario, { eager: true })
  @JoinColumn({ name: 'tecnico_id' })
  tecnico_responsavel: Usuario;

  @ApiProperty({
    description: 'ID do beneficiário',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid' })
  beneficiario_id: string;

  @ManyToOne(() => Cidadao, { eager: true })
  @JoinColumn({ name: 'beneficiario_id' })
  beneficiario: Cidadao;

  @ApiProperty({
    description: 'ID da unidade responsável',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid' })
  unidade_id: string;

  @ManyToOne(() => Unidade, { eager: true })
  @JoinColumn({ name: 'unidade_id' })
  unidade: Unidade;

  @ApiProperty({
    description: 'ID da concessão',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Column({ type: 'uuid' })
  concessao_id: string;

  @ManyToOne(() => Concessao, { eager: true })
  @JoinColumn({ name: 'concessao_id' })
  concessao: Concessao;

  @OneToMany(() => VisitaDomiciliar, (visita) => visita.agendamento)
  visitas: VisitaDomiciliar[];
}

export { StatusAgendamento } from '../enums';