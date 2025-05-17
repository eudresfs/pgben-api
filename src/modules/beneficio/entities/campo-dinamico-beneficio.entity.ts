import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import {
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { TipoBeneficio } from './tipo-beneficio.entity';

/**
 * Enum para definir os tipos de dados suportados pelos campos dinâmicos
 */
export enum TipoDado {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  ARRAY = 'array',
  OBJECT = 'object',
}

/**
 * Entidade para campos dinâmicos de benefícios
 *
 * Permite definir campos específicos para cada tipo de benefício,
 * com validações e regras de negócio próprias.
 */
@Entity('campos_dinamicos_beneficio')
@Index(['tipo_beneficio_id', 'nome'], { unique: true })
export class CampoDinamicoBeneficio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  tipo_beneficio_id: string;

  @ManyToOne(
    () => TipoBeneficio,
    (tipoBeneficio) => tipoBeneficio.campos_dinamicos,
  )
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column()
  @IsNotEmpty({ message: 'Label é obrigatório' })
  label: string;

  @Column()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @Column({
    type: 'enum',
    enum: TipoDado,
    enumName: 'tipo_dado',
  })
  @IsNotEmpty({ message: 'Tipo de dado é obrigatório' })
  @IsEnum(TipoDado, { message: 'Tipo de dado inválido' })
  tipo: TipoDado;

  @Column({ default: false })
  @IsBoolean({ message: 'Obrigatório deve ser um booleano' })
  obrigatorio: boolean;

  @Column('text', { nullable: true })
  @IsOptional()
  descricao: string;

  @Column('jsonb', { nullable: true })
  validacoes: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: string[];
    format?: string;
  };

  @Column({ default: 1 })
  @IsNumber({}, { message: 'Ordem deve ser um número' })
  @Min(1, { message: 'Ordem deve ser maior que zero' })
  ordem: number;

  @Column({ default: true })
  @IsBoolean({ message: 'Ativo deve ser um booleano' })
  ativo: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
