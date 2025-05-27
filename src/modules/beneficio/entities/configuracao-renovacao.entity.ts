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
import { IsNotEmpty, IsOptional, IsBoolean, IsNumber, Min, IsUUID } from 'class-validator';
import { TipoBeneficio } from './tipo-beneficio.entity';

/**
 * Entidade de Configuração de Renovação Automática
 *
 * Armazena as configurações para renovação automática de benefícios,
 * permitindo definir regras específicas por tipo de benefício.
 */
@Entity('configuracao_renovacao')
@Index(['tipo_beneficio_id'])
export class ConfiguracaoRenovacao {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tipo_beneficio_id', type: 'uuid' })
  @IsNotEmpty({ message: 'ID do tipo de benefício é obrigatório' })
  @IsUUID('4', { message: 'ID do tipo de benefício inválido' })
  tipo_beneficio_id: string;

  @ManyToOne(() => TipoBeneficio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tipo_beneficio_id' })
  tipo_beneficio: TipoBeneficio;

  @Column({ name: 'renovacao_automatica', type: 'boolean', default: false })
  @IsBoolean({ message: 'Renovação automática deve ser um booleano' })
  renovacao_automatica: boolean;

  @Column({ name: 'dias_antecedencia_renovacao', type: 'integer', default: 7 })
  @IsNumber({}, { message: 'Dias de antecedência deve ser um número' })
  @Min(1, { message: 'Dias de antecedência deve ser no mínimo 1' })
  dias_antecedencia_renovacao: number;

  @Column({ name: 'numero_maximo_renovacoes', type: 'integer', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Número máximo de renovações deve ser um número' })
  @Min(0, { message: 'Número máximo de renovações não pode ser negativo' })
  numero_maximo_renovacoes?: number;

  @Column({ name: 'requer_aprovacao_renovacao', type: 'boolean', default: true })
  @IsBoolean({ message: 'Requer aprovação de renovação deve ser um booleano' })
  requer_aprovacao_renovacao: boolean;

  @Column({ name: 'ativo', type: 'boolean', default: true })
  @IsBoolean({ message: 'Ativo deve ser um booleano' })
  ativo: boolean;

  @Column({ name: 'usuario_id', type: 'uuid' })
  @IsNotEmpty({ message: 'ID do usuário é obrigatório' })
  @IsUUID('4', { message: 'ID do usuário inválido' })
  usuario_id: string;

  @Column({ name: 'observacoes', type: 'text', nullable: true })
  @IsOptional()
  observacoes?: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
