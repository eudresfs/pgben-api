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
export class DadosBeneficios {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Solicitação é obrigatória' })
  solicitacao_id: string;

  @OneToOne(() => Solicitacao, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'solicitacao_id' })
  solicitacao: Solicitacao;

  @Column('jsonb', { nullable: true })
  @IsOptional()
  auxilio_natalidade: {
    data_nascimento?: Date;
    data_prevista_parto?: Date;
    realizou_pre_natal?: boolean;
    local_pre_natal?: string;
    itens_solicitados?: string[];
  };

  @Column('jsonb', { nullable: true })
  @IsOptional()
  aluguel_social: {
    motivo?: string;
    valor_solicitado?: number;
    periodo_meses?: number;
    tipo_solicitacao?: 'novo' | 'renovacao' | 'prorrogacao';
    contrato_aluguel?: boolean;
    data_inicio_contrato?: Date;
    data_fim_contrato?: Date;
    nome_proprietario?: string;
    cpf_proprietario?: string;
  };

  @Column('jsonb', { nullable: true })
  @IsOptional()
  dados_pagamento: {
    tipo_pagamento?: 'pix' | 'transferencia' | 'ordem_pagamento';
    chave_pix?: string;
    tipo_chave_pix?: 'cpf' | 'email' | 'telefone' | 'aleatoria';
    banco?: string;
    agencia?: string;
    conta?: string;
    titular?: string;
    cpf_titular?: string;
  };

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor aprovado deve ser um número' })
  @Min(0, { message: 'Valor aprovado não pode ser negativo' })
  valor_aprovado: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor liberado deve ser um número' })
  @Min(0, { message: 'Valor liberado não pode ser negativo' })
  valor_liberado: number;

  @Column({ type: 'date', nullable: true })
  @IsOptional()
  data_inicio_beneficio: Date;

  @Column({ type: 'date', nullable: true })
  @IsOptional()
  data_fim_beneficio: Date;

  @Column({ nullable: true })
  @IsOptional()
  observacoes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}