import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { VisitaDomiciliar } from './visita-domiciliar.entity';

/**
 * Entidade para armazenar avaliações específicas realizadas durante visitas domiciliares
 *
 * Esta entidade permite uma estrutura flexível para diferentes tipos de avaliação,
 * possibilitando que cada visita tenha múltiplas avaliações específicas conforme
 * os critérios estabelecidos pela SEMTAS.
 *
 * Exemplos de avaliações:
 * - Avaliação de condições habitacionais
 * - Avaliação socioeconômica
 * - Avaliação de elegibilidade para renovação
 * - Avaliação de riscos sociais
 */
@Entity('avaliacao_visita')
export class AvaliacaoVisita {
  @ApiProperty({
    description: 'Identificador único da avaliação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'ID da visita domiciliar relacionada',
    example: '456e7890-e89b-12d3-a456-426614174000',
  })
  @Column('uuid', { name: 'visita_id' })
  visitaId: string;

  @ApiProperty({
    description: 'Tipo de avaliação realizada',
    example: 'condicoes_habitacionais',
    enum: [
      'condicoes_habitacionais',
      'situacao_socioeconomica',
      'elegibilidade_renovacao',
      'riscos_sociais',
      'cumprimento_contrapartidas',
      'necessidades_encaminhamento',
    ],
  })
  @Column({
    type: 'enum',
    enum: [
      'condicoes_habitacionais',
      'situacao_socioeconomica',
      'elegibilidade_renovacao',
      'riscos_sociais',
      'cumprimento_contrapartidas',
      'necessidades_encaminhamento',
    ],
    name: 'tipo_avaliacao',
  })
  tipoAvaliacao: string;

  @ApiProperty({
    description: 'Critério específico avaliado dentro do tipo',
    example: 'adequacao_estrutural',
  })
  @Column({ name: 'criterio_avaliado', length: 100 })
  criterioAvaliado: string;

  @ApiProperty({
    description: 'Resultado da avaliação',
    example: 'adequado',
    enum: ['adequado', 'inadequado', 'parcialmente_adequado', 'nao_aplicavel'],
  })
  @Column({
    type: 'enum',
    enum: ['adequado', 'inadequado', 'parcialmente_adequado', 'nao_aplicavel'],
    name: 'resultado_avaliacao',
  })
  resultadoAvaliacao: string;

  @ApiProperty({
    description: 'Nota numérica da avaliação (0-10)',
    example: 8,
    minimum: 0,
    maximum: 10,
  })
  @Column({
    type: 'decimal',
    precision: 3,
    scale: 1,
    name: 'nota_avaliacao',
    nullable: true,
  })
  notaAvaliacao?: number;

  @ApiProperty({
    description: 'Observações detalhadas sobre a avaliação',
    example: 'Casa em bom estado de conservação, com saneamento básico adequado',
  })
  @Column({ type: 'text', nullable: true })
  observacoes?: string;

  @ApiProperty({
    description: 'Evidências coletadas (URLs de fotos, documentos)',
    example: ['foto_fachada.jpg', 'comprovante_renda.pdf'],
  })
  @Column({ type: 'jsonb', nullable: true })
  evidencias?: string[];

  @ApiProperty({
    description: 'Indica se a avaliação requer ação imediata',
    example: false,
  })
  @Column({ name: 'requer_acao_imediata', default: false })
  requerAcaoImediata: boolean;

  @ApiProperty({
    description: 'Descrição da ação necessária, se aplicável',
    example: 'Encaminhar para programa habitacional',
  })
  @Column({ name: 'acao_necessaria', type: 'text', nullable: true })
  acaoNecessaria?: string;

  @ApiProperty({
    description: 'Prazo para execução da ação necessária',
    example: '2025-02-15T00:00:00Z',
  })
  @Column({ name: 'prazo_acao', type: 'timestamp', nullable: true })
  prazoAcao?: Date;

  @ApiProperty({
    description: 'Peso da avaliação no cálculo geral (0-1)',
    example: 0.3,
  })
  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    name: 'peso_avaliacao',
    default: 1.0,
  })
  pesoAvaliacao: number;

  @ApiProperty({
    description: 'Dados complementares específicos do tipo de avaliação',
    example: {
      numero_comodos: 3,
      possui_banheiro: true,
      tipo_construcao: 'alvenaria',
    },
  })
  @Column({ type: 'jsonb', name: 'dados_complementares', nullable: true })
  dadosComplementares?: Record<string, any>;

  @ApiProperty({
    description: 'Data de criação do registro',
    example: '2025-01-15T10:30:00Z',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2025-01-15T10:30:00Z',
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ApiProperty({
    description: 'Data da remoção',
    example: '2025-01-15T10:30:00Z',
    required: false,
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  removedAt: Date;

  @ApiProperty({
    description: 'ID do usuário que criou o registro',
    example: 'user-123',
  })
  @Column({ name: 'created_by', length: 50 })
  createdBy: string;

  @ApiProperty({
    description: 'ID do usuário que fez a última atualização',
    example: 'user-123',
  })
  @Column({ name: 'updated_by', length: 50 })
  updatedBy: string;

  // Relacionamentos

  @ApiProperty({
    description: 'Visita domiciliar relacionada',
    type: () => VisitaDomiciliar,
  })
  @ManyToOne(() => VisitaDomiciliar, (visita) => visita.avaliacoes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'visita_id' })
  visita: VisitaDomiciliar;

  /**
   * Calcula a nota ponderada da avaliação
   * @returns Nota multiplicada pelo peso
   */
  calcularNotaPonderada(): number {
    if (!this.notaAvaliacao) return 0;
    return this.notaAvaliacao * this.pesoAvaliacao;
  }

  /**
   * Verifica se a avaliação está dentro dos parâmetros aceitáveis
   * @param notaMinima Nota mínima aceitável (padrão: 6.0)
   * @returns true se a avaliação está adequada
   */
  isAvaliacaoAdequada(notaMinima: number = 6.0): boolean {
    if (!this.notaAvaliacao) {
      return this.resultadoAvaliacao === 'adequado';
    }
    return this.notaAvaliacao >= notaMinima;
  }

  /**
   * Verifica se a avaliação possui evidências anexadas
   * @returns true se há evidências
   */
  possuiEvidencias(): boolean {
    return this.evidencias && this.evidencias.length > 0;
  }

  /**
   * Retorna um resumo textual da avaliação
   * @returns String com resumo da avaliação
   */
  getResumoAvaliacao(): string {
    const nota = this.notaAvaliacao ? ` (${this.notaAvaliacao}/10)` : '';
    const acao = this.requerAcaoImediata ? ' - REQUER AÇÃO IMEDIATA' : '';
    return `${this.criterioAvaliado}: ${this.resultadoAvaliacao}${nota}${acao}`;
  }
}