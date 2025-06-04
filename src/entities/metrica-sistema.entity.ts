import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';
import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Entidade que representa métricas de sistema
 *
 * Esta entidade armazena informações sobre o desempenho do sistema,
 * incluindo uso de CPU, memória, disco e carga do sistema.
 */
@Entity('metricas_sistema')
export class MetricaSistema {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index('idx_metricas_sistema_timestamp')
  created_at: Date;

  @Column({ length: 100 })
  @Index('idx_metricas_sistema_servidor')
  @IsNotEmpty({ message: 'Nome do servidor é obrigatório' })
  @IsString({ message: 'Nome do servidor deve ser uma string' })
  @MaxLength(100, {
    message: 'Nome do servidor deve ter no máximo 100 caracteres',
  })
  servidor: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Uso de CPU deve ser um número' })
  @Min(0, { message: 'Uso de CPU não pode ser negativo' })
  @Max(100, { message: 'Uso de CPU não pode ser maior que 100%' })
  uso_cpu_percentual: number;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Uso de memória deve ser um número' })
  @Min(0, { message: 'Uso de memória não pode ser negativo' })
  uso_memoria_mb: number;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Memória total deve ser um número' })
  @Min(0, { message: 'Memória total não pode ser negativa' })
  memoria_total_mb: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Uso de disco deve ser um número' })
  @Min(0, { message: 'Uso de disco não pode ser negativo' })
  @Max(100, { message: 'Uso de disco não pode ser maior que 100%' })
  uso_disco_percentual: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Carga do sistema deve ser um número' })
  @Min(0, { message: 'Carga do sistema não pode ser negativa' })
  carga_sistema: number;

  @Column({ type: 'jsonb', nullable: true })
  detalhes: Record<string, any>;
}
