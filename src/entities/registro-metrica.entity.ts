import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsNumber,
  Min,
  IsString,
  MaxLength,
  IsIP,
} from 'class-validator';
import { MetricaDefinicao } from './metrica-definicao.entity';
import { Metrica } from './metrica.entity';

/**
 * Entidade que representa um registro de métrica
 *
 * Esta entidade armazena os valores coletados para uma métrica específica,
 * incluindo o timestamp da coleta e detalhes adicionais.
 *
 * A tabela é particionada por tempo para otimizar o desempenho em consultas
 * com grandes volumes de dados.
 */
@Entity('registros_metricas')
export class RegistroMetrica {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index('idx_registros_metricas_definicao_id')
  @IsNotEmpty({ message: 'ID da definição de métrica é obrigatório' })
  @IsUUID('4', { message: 'ID da definição de métrica inválido' })
  metrica_definicao_id: string;

  @ManyToOne(() => Metrica, (metrica) => metrica.registros)
  @JoinColumn({ name: 'metrica_id' })
  metrica: Metrica;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  @IsNotEmpty({ message: 'Valor é obrigatório' })
  @IsNumber({}, { message: 'Valor deve ser um número' })
  valor: number;

  @CreateDateColumn({ name: 'created_at' })
  @Index('idx_registros_metricas_timestamp')
  created_at: Date;

  @Column({ type: 'jsonb', nullable: true })
  detalhes: Record<string, any>;

  @Column({ length: 45, nullable: true })
  @IsOptional()
  @IsIP(undefined, { message: 'IP de origem inválido' })
  ip_origem: string;

  @Column({ type: 'uuid', nullable: true })
  @Index('idx_registros_metricas_usuario_id')
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário inválido' })
  usuario_id: string;

  @Column({ length: 255, nullable: true })
  @IsOptional()
  @IsString({ message: 'Endpoint deve ser uma string' })
  @MaxLength(255, { message: 'Endpoint deve ter no máximo 255 caracteres' })
  endpoint: string;
}
