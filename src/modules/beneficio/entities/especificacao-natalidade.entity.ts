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
  IsOptional,
  Min,
} from 'class-validator';
import { TipoBeneficio } from './tipo-beneficio.entity';

/**
 * Entidade para especificação do benefício de Auxílio Natalidade
 *
 * Armazena configurações específicas do benefício de Auxílio Natalidade,
 * como itens do kit, tempo mínimo de gestação, etc.
 */
@Entity('especificacao_natalidade')
@Index(['tipo_beneficio_id'], { unique: true })
export class EspecificacaoNatalidade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  tipo_beneficio_id: string;

  @OneToOne(() => TipoBeneficio)
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Tempo mínimo de gestação deve ser um número' })
  @Min(1, { message: 'Tempo mínimo de gestação deve ser maior que zero' })
  tempo_gestacao_minimo?: number;

  @Column({ type: 'integer' })
  @IsNotEmpty({ message: 'Prazo máximo após nascimento é obrigatório' })
  @IsNumber({}, { message: 'Prazo máximo após nascimento deve ser um número' })
  @Min(1, { message: 'Prazo máximo após nascimento deve ser maior que zero' })
  prazo_maximo_apos_nascimento: number;

  @Column({ default: false })
  @IsBoolean({ message: 'Requer pré-natal deve ser um booleano' })
  requer_pre_natal: boolean;

  @Column({ default: false })
  @IsBoolean({ message: 'Requer comprovante de residência deve ser um booleano' })
  requer_comprovante_residencia: boolean;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Número máximo de filhos deve ser um número' })
  @Min(1, { message: 'Número máximo de filhos deve ser maior que zero' })
  numero_maximo_filhos?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Valor complementar deve ser um número' })
  @Min(0, { message: 'Valor complementar não pode ser negativo' })
  valor_complementar?: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  removed_at: Date;
}
