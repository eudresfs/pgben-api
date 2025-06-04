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
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsString,
  MaxLength,
  IsIP,
} from 'class-validator';

/**
 * Entidade que representa métricas de requisições HTTP
 *
 * Esta entidade armazena informações sobre requisições HTTP realizadas no sistema,
 * incluindo endpoint, método, código de status, duração e informações do usuário.
 */
@Entity('metricas_http')
export class MetricaHttp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index('idx_metricas_http_timestamp')
  created_at: Date;

  @Column({ length: 255 })
  @Index('idx_metricas_http_endpoint')
  @IsNotEmpty({ message: 'Endpoint é obrigatório' })
  @IsString({ message: 'Endpoint deve ser uma string' })
  @MaxLength(255, { message: 'Endpoint deve ter no máximo 255 caracteres' })
  endpoint: string;

  @Column({ length: 10 })
  @IsNotEmpty({ message: 'Método HTTP é obrigatório' })
  @IsString({ message: 'Método deve ser uma string' })
  @MaxLength(10, { message: 'Método deve ter no máximo 10 caracteres' })
  metodo: string;

  @Column({ type: 'integer' })
  @Index('idx_metricas_http_status')
  @IsNotEmpty({ message: 'Código de status é obrigatório' })
  @IsNumber({}, { message: 'Código de status deve ser um número' })
  @Min(100, { message: 'Código de status deve ser maior ou igual a 100' })
  @Max(599, { message: 'Código de status deve ser menor ou igual a 599' })
  codigo_status: number;

  @Column({ type: 'integer' })
  @IsNotEmpty({ message: 'Duração é obrigatória' })
  @IsNumber({}, { message: 'Duração deve ser um número' })
  @Min(0, { message: 'Duração não pode ser negativa' })
  duracao_ms: number;

  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Tamanho da resposta deve ser um número' })
  @Min(0, { message: 'Tamanho da resposta não pode ser negativo' })
  tamanho_resposta_bytes: number;

  @Column({ length: 45, nullable: true })
  @IsOptional()
  @IsIP(undefined, { message: 'IP de origem inválido' })
  ip_origem: string;

  @Column({ type: 'uuid', nullable: true })
  @Index('idx_metricas_http_usuario')
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário inválido' })
  usuario_id: string;

  @Column({ length: 50, nullable: true })
  @IsOptional()
  @IsString({ message: 'Perfil do usuário deve ser uma string' })
  @MaxLength(50, {
    message: 'Perfil do usuário deve ter no máximo 50 caracteres',
  })
  perfil_usuario: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'User agent deve ser uma string' })
  user_agent: string;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  detalhes: Record<string, any>;
}
