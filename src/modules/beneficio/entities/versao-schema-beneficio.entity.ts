import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { IsNotEmpty, IsNumber, Min, IsBoolean, IsOptional } from 'class-validator';
import { TipoBeneficio } from './tipo-beneficio.entity';

/**
 * Entidade para versionamento de schema de benefícios
 * 
 * Permite controlar a evolução do schema de campos dinâmicos sem quebrar
 * dados existentes, mantendo um histórico de versões.
 */
@Entity('versoes_schema_beneficio')
@Index(['tipo_beneficio_id', 'versao'], { unique: true })
export class VersaoSchemaBeneficio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  tipo_beneficio_id: string;

  @ManyToOne(() => TipoBeneficio)
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column()
  @IsNumber({}, { message: 'Versão deve ser um número' })
  @Min(1, { message: 'Versão deve ser maior que zero' })
  versao: number;

  @Column('jsonb')
  @IsNotEmpty({ message: 'Schema é obrigatório' })
  schema: any;

  @Column('text', { nullable: true })
  @IsOptional()
  descricao_mudancas: string;

  @Column({ default: false })
  @IsBoolean({ message: 'Ativo deve ser um booleano' })
  ativo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
