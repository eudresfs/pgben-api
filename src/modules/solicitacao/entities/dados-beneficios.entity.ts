/* eslint-disable prettier/prettier */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { Solicitacao } from './solicitacao.entity';

@Entity('dados_beneficios')
@Index(['solicitacao_id'], { unique: true })
export class DadosSolicitacaoBeneficio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Solicitação é obrigatória' })
  solicitacao_id: string;

  @OneToOne(() => Solicitacao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @Column('enum', { name: 'tipo_beneficio', enum: 'tipo_beneficio_enum' })
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  tipo_beneficio: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor solicitado deve ser um número' })
  @Min(0, { message: 'Valor solicitado deve ser maior que zero' })
  valor_solicitado: number;

  @Column('integer', { nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Período em meses deve ser um número' })
  @Min(1, { message: 'Período em meses deve ser maior que zero' })
  periodo_meses: number;

  // Campos específicos para Auxílio Natalidade
  @Column({ type: 'date', nullable: true })
  @IsOptional()
  data_prevista_parto: Date;

  @Column({ type: 'date', nullable: true })
  @IsOptional()
  data_nascimento: Date;

  @Column({ type: 'boolean', nullable: true })
  @IsOptional()
  pre_natal: boolean;

  @Column({ type: 'boolean', nullable: true })
  @IsOptional()
  psf_ubs: boolean;

  @Column({ type: 'boolean', nullable: true })
  @IsOptional()
  gravidez_risco: boolean;

  @Column({ type: 'boolean', nullable: true })
  @IsOptional()
  gravidez_gemelar: boolean;

  // Campos específicos para Aluguel Social
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  motivo: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor do aluguel deve ser um número' })
  @Min(0, { message: 'Valor do aluguel deve ser maior que zero' })
  valor_aluguel: number;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  endereco_aluguel: string;

  @Column({ length: 100, nullable: true })
  @IsOptional()
  bairro_aluguel: string;

  @Column({ length: 8, nullable: true })
  @IsOptional()
  cep_aluguel: string;

  @Column({ length: 255, nullable: true })
  @IsOptional()
  nome_proprietario: string;

  @Column({ length: 11, nullable: true })
  @IsOptional()
  cpf_proprietario: string;

  @Column({ length: 20, nullable: true })
  @IsOptional()
  telefone_proprietario: string;

  @Column({ length: 100, nullable: true })
  @IsOptional()
  banco_proprietario: string;

  @Column({ length: 10, nullable: true })
  @IsOptional()
  agencia_proprietario: string;

  @Column({ length: 20, nullable: true })
  @IsOptional()
  conta_proprietario: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}