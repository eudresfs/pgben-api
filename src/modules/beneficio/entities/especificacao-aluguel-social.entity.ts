import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import {
  IsNotEmpty,
  IsBoolean,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { TipoBeneficio } from './tipo-beneficio.entity';

/**
 * Enum para definir os motivos válidos para concessão de Aluguel Social
 */
export enum MotivoAluguelSocial {
  CALAMIDADE = 'calamidade',
  DESASTRE = 'desastre',
  VULNERABILIDADE = 'vulnerabilidade',
  DESPEJO = 'despejo',
  VIOLENCIA = 'violencia',
  AREA_RISCO = 'area_risco',
  OUTRO = 'outro',
}

/**
 * Entidade para especificação do benefício de Aluguel Social
 *
 * Armazena configurações específicas do benefício de Aluguel Social,
 * como duração máxima, motivos válidos, etc.
 */
@Entity('especificacao_aluguel_social')
@Index(['tipo_beneficio_id'], { unique: true })
export class EspecificacaoAluguelSocial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  tipo_beneficio_id: string;

  @OneToOne(() => TipoBeneficio)
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column({ type: 'integer' })
  @IsNotEmpty({ message: 'Duração máxima é obrigatória' })
  @IsNumber({}, { message: 'Duração máxima deve ser um número' })
  @Min(1, { message: 'Duração máxima deve ser maior que zero' })
  @Max(48, { message: 'Duração máxima não pode exceder 48 meses' })
  duracao_maxima_meses: number;

  @Column({ default: false })
  @IsBoolean({ message: 'Permite prorrogação deve ser um booleano' })
  permite_prorrogacao: boolean;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Tempo máximo de prorrogação deve ser um número' })
  @Min(1, { message: 'Tempo máximo de prorrogação deve ser maior que zero' })
  tempo_maximo_prorrogacao_meses?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @IsNotEmpty({ message: 'Valor máximo é obrigatório' })
  @IsNumber({}, { message: 'Valor máximo deve ser um número' })
  @Min(0, { message: 'Valor máximo não pode ser negativo' })
  valor_maximo: number;

  @Column('simple-array')
  @IsArray({ message: 'Motivos válidos deve ser um array' })
  motivos_validos: MotivoAluguelSocial[];

  @Column({ default: true })
  @IsBoolean({ message: 'Requer comprovante de aluguel deve ser um booleano' })
  requer_comprovante_aluguel: boolean;

  @Column({ default: false })
  @IsBoolean({ message: 'Requer vistoria deve ser um booleano' })
  requer_vistoria: boolean;

  @Column({ default: false })
  @IsBoolean({ message: 'Pago diretamente ao locador deve ser um booleano' })
  pago_diretamente_locador: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Percentual máximo da renda deve ser um número' })
  @Min(0, { message: 'Percentual máximo da renda não pode ser negativo' })
  @Max(100, { message: 'Percentual máximo da renda não pode exceder 100%' })
  percentual_maximo_renda?: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
