import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsDate, IsEnum } from 'class-validator';

/**
 * Enum para o tipo de determinação judicial
 */
export enum TipoDeterminacaoJudicial {
  CONCESSAO = 'CONCESSAO',
  SUSPENSAO = 'SUSPENSAO',
  CANCELAMENTO = 'CANCELAMENTO',
  ALTERACAO = 'ALTERACAO',
  OUTRO = 'OUTRO',
}

/**
 * Interface para definir o tipo de ProcessoJudicial sem criar dependências circulares
 */
interface IProcessoJudicial {
  id: string;
  numero_processo: string;
  vara_judicial: string;
  comarca: string;
}

/**
 * Entidade de Determinação Judicial
 *
 * Armazena as determinações judiciais relacionadas a processos judiciais
 * que podem afetar solicitações de benefício.
 */
@Entity('determinacao_judicial')
@Index(['processo_judicial_id'])
@Index(['solicitacao_id'])
@Index(['cidadao_id'])
@Index(['numero_processo'])
export class DeterminacaoJudicial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'processo_judicial_id', type: 'uuid' })
  @IsNotEmpty({ message: 'ID do processo judicial é obrigatório' })
  @IsUUID('4', { message: 'ID do processo judicial inválido' })
  processo_judicial_id: string;

  /**
   * Relação com ProcessoJudicial usando string para evitar referência circular
   * Esta abordagem é recomendada pela documentação do TypeORM para resolver referências circulares
   */
  @ManyToOne('ProcessoJudicial', 'determinacoes')
  @JoinColumn({ name: 'processo_judicial_id' })
  processo_judicial: IProcessoJudicial;

  @Column({ name: 'solicitacao_id', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'ID da solicitação inválido' })
  solicitacao_id: string;

  @Column({ name: 'cidadao_id', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'ID do cidadão inválido' })
  cidadao_id: string;

  @Column({ name: 'numero_processo', type: 'varchar', length: 50 })
  @IsNotEmpty({ message: 'Número do processo é obrigatório' })
  @IsString({ message: 'Número do processo deve ser uma string' })
  numero_processo: string;

  @Column({ name: 'numero_determinacao', type: 'varchar', length: 255 })
  @IsNotEmpty({ message: 'Número da determinação é obrigatório' })
  @IsString({ message: 'Número da determinação deve ser uma string' })
  numero_determinacao: string;

  @Column({
    name: 'tipo',
    type: 'enum',
    enum: TipoDeterminacaoJudicial,
    default: TipoDeterminacaoJudicial.OUTRO,
  })
  @IsNotEmpty({ message: 'Tipo de determinação é obrigatório' })
  @IsEnum(TipoDeterminacaoJudicial, { message: 'Tipo de determinação inválido' })
  tipo: TipoDeterminacaoJudicial;

  @Column({ name: 'orgao_judicial', type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString({ message: 'Órgão judicial deve ser uma string' })
  orgao_judicial: string;

  @Column({ name: 'comarca', type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString({ message: 'Comarca deve ser uma string' })
  comarca: string;

  @Column({ name: 'juiz', type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString({ message: 'Juiz deve ser uma string' })
  juiz: string;

  @Column({ name: 'descricao', type: 'text' })
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  @IsString({ message: 'Descrição deve ser uma string' })
  descricao: string;

  @Column({ name: 'data_determinacao', type: 'timestamp with time zone' })
  @IsNotEmpty({ message: 'Data da determinação é obrigatória' })
  @IsDate({ message: 'Data da determinação deve ser uma data válida' })
  data_determinacao: Date;

  @Column({ name: 'data_prazo', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate({ message: 'Data do prazo deve ser uma data válida' })
  data_prazo: Date;

  @Column({ name: 'cumprida', type: 'boolean', default: false })
  cumprida: boolean;

  @Column({ name: 'data_cumprimento', type: 'timestamp with time zone', nullable: true })
  @IsOptional()
  @IsDate({ message: 'Data de cumprimento deve ser uma data válida' })
  data_cumprimento: Date;

  @Column({ name: 'observacao_cumprimento', type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Observação de cumprimento deve ser uma string' })
  observacao_cumprimento: string;

  @Column({ name: 'documento_url', type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString({ message: 'URL do documento deve ser uma string' })
  documento_url: string;

  @Column({ name: 'ativo', type: 'boolean', default: true })
  ativo: boolean;

  @Column({ name: 'usuario_id', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário inválido' })
  usuario_id: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updated_by: string;
}
