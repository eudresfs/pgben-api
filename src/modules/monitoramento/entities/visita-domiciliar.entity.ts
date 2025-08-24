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
import { Usuario, Cidadao, Unidade } from '../../../entities';
import { AgendamentoVisita } from './agendamento-visita.entity';
import { AvaliacaoVisita } from './avaliacao-visita.entity';
import {
  StatusVisita,
  TipoVisita,
  ResultadoVisita,
  PrioridadeVisita,
} from '../enums';

@Entity('visita_domiciliar')
export class VisitaDomiciliar {
  @ApiProperty({
    description: 'ID único da visita',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Data e hora de início da visita',
    example: '2024-01-15T10:00:00Z',
  })
  @Column({ type: 'timestamp' })
  data_inicio: Date;

  @ApiProperty({
    description: 'Data e hora de conclusão da visita',
    example: '2024-01-15T11:30:00Z',
    required: false,
  })
  @Column({ type: 'timestamp', nullable: true })
  data_conclusao?: Date;

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
    description: 'Status atual da visita',
    enum: StatusVisita,
    example: StatusVisita.EM_ANDAMENTO,
  })
  @Column({
    type: 'enum',
    enum: StatusVisita,
    default: StatusVisita.AGENDADA,
  })
  status: StatusVisita;

  @ApiProperty({
    description: 'Resultado da visita',
    enum: ResultadoVisita,
    example: ResultadoVisita.REALIZADA_COM_SUCESSO,
    required: false,
  })
  @Column({
    type: 'enum',
    enum: ResultadoVisita,
    nullable: true,
  })
  resultado?: ResultadoVisita;

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
    description: 'Observações gerais da visita',
    example: 'Família receptiva, condições habitacionais adequadas',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  observacoes?: string;

  @ApiProperty({
    description: 'Recomendações feitas durante a visita',
    example: 'Orientações sobre documentação necessária para renovação',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  recomendacoes?: string;

  @ApiProperty({
    description: 'Indica se a visita recomenda renovação do benefício',
    example: true,
    required: false,
  })
  @Column({ type: 'boolean', default: false })
  recomenda_renovacao: boolean;

  @ApiProperty({
    description: 'Indica se é necessária uma nova visita',
    example: false,
    required: false,
  })
  @Column({ type: 'boolean', default: false })
  necessita_nova_visita: boolean;

  @ApiProperty({
    description: 'Indica se há problemas de elegibilidade',
    example: false,
    required: false,
  })
  @Column({ type: 'boolean', default: false })
  problemas_elegibilidade: boolean;

  @ApiProperty({
    description: 'Motivo de problemas de elegibilidade',
    example: 'Renda familiar acima do limite estabelecido',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  motivo_problemas_elegibilidade?: string;

  @ApiProperty({
    description: 'Endereço onde foi realizada a visita',
    example: 'Rua das Flores, 123 - Apto 45',
    required: false,
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
  endereco_visitado?: string;

  @ApiProperty({
    description: 'Dados complementares em formato JSON',
    example: { temperatura_ambiente: 25, pessoas_presentes: 3 },
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  dados_complementares?: Record<string, any>;

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
    description: 'Data da remoção',
    example: '2024-01-01T10:00:00Z',
    required: false,
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  removed_at: Date;

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
    description: 'ID do agendamento relacionado',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  agendamento_id?: string;

  @ManyToOne(() => AgendamentoVisita, (agendamento) => agendamento.visitas)
  @JoinColumn({ name: 'agendamento_id' })
  agendamento?: AgendamentoVisita;

  @OneToMany(() => AvaliacaoVisita, (avaliacao) => avaliacao.visita)
  avaliacoes: AvaliacaoVisita[];

  // Propriedades adicionais para compatibilidade
  @Column({ type: 'date', nullable: true })
  data_visita?: Date;

  @Column({ type: 'boolean', default: true })
  beneficiario_presente: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pessoa_atendeu?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  relacao_pessoa_atendeu?: string;

  @Column({ type: 'jsonb', nullable: true })
  condicoes_habitacionais?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  situacao_socioeconomica?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  composicao_familiar_observada?: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  criterios_elegibilidade_mantidos: boolean;

  @Column({ type: 'text', nullable: true })
  observacoes_criterios?: string;

  @Column({ type: 'jsonb', nullable: true })
  necessidades_identificadas?: string[];

  @Column({ type: 'jsonb', nullable: true })
  encaminhamentos_realizados?: string[];

  @Column({ type: 'text', nullable: true })
  parecer_tecnico?: string;

  @Column({ type: 'text', nullable: true })
  justificativa_recomendacao?: string;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  nota_avaliacao?: number;

  @Column({ type: 'text', nullable: true })
  observacoes_gerais?: string;

  @Column({ type: 'text', nullable: true })
  motivo_nao_realizacao?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  prazo_proxima_visita?: string;

  @Column({ type: 'integer', nullable: true })
  pontuacao_risco?: number;

  // Métodos de negócio
  calcularPontuacaoRisco(): number {
    let pontuacao = 0;
    
    // Lógica de cálculo de risco baseada nos critérios
    if (!this.criterios_elegibilidade_mantidos) {
      pontuacao += 30;
    }
    
    if (this.problemas_elegibilidade) {
      pontuacao += 25;
    }
    
    if (!this.recomenda_renovacao) {
      pontuacao += 20;
    }
    
    if (this.necessita_nova_visita) {
      pontuacao += 15;
    }
    
    return Math.min(pontuacao, 100);
  }

  verificarConformidadeCriterios(): boolean {
    return this.criterios_elegibilidade_mantidos && !this.problemas_elegibilidade;
  }

  necessitaAcaoImediata(): boolean {
    return !this.criterios_elegibilidade_mantidos || 
           this.problemas_elegibilidade || 
           (this.pontuacao_risco && this.pontuacao_risco > 70);
  }
}

export { StatusVisita } from '../enums';