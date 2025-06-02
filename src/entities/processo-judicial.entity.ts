import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

/**
 * Enum para o status do processo judicial
 */
export enum StatusProcessoJudicial {
  ABERTO = 'ABERTO',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  SUSPENSO = 'SUSPENSO',
  CONCLUIDO = 'CONCLUIDO',
  ARQUIVADO = 'ARQUIVADO',
}

/**
 * Entidade de Processo Judicial
 *
 * Armazena os processos judiciais que podem afetar solicitações de benefício.
 */
@Entity('processo_judicial')
export class ProcessoJudicial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  numero_processo: string;

  @Column({ type: 'varchar', length: 255 })
  vara_judicial: string;

  @Column({ type: 'varchar', length: 255 })
  comarca: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  juiz: string;

  @Column({
    type: 'enum',
    enum: StatusProcessoJudicial,
    default: StatusProcessoJudicial.ABERTO,
  })
  status: StatusProcessoJudicial;

  @Column({ type: 'text' })
  objeto: string;

  @Column({ type: 'date' })
  data_distribuicao: Date;

  @Column({ type: 'date', nullable: true })
  data_conclusao: Date;

  @Column({ type: 'text', nullable: true })
  observacao: string;

  @Column({ name: 'cidadao_id', type: 'uuid', nullable: true })
  cidadao_id: string;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  /**
   * Relação com DeterminacaoJudicial definida usando string para evitar referência circular
   * Esta abordagem é recomendada pela documentação do TypeORM para resolver referências circulares
   */
  @OneToMany('DeterminacaoJudicial', 'processo_judicial')
  determinacoes: any[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updated_by: string;
}
