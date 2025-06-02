import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';
import { IsNotEmpty, IsOptional, IsUUID, IsString, MaxLength, IsIP, IsEnum } from 'class-validator';

/**
 * Níveis de alerta para métricas de segurança
 */
export enum NivelAlertaEnum {
  INFO = 'info',
  AVISO = 'aviso',
  CRITICO = 'critico',
  EMERGENCIA = 'emergencia',
}

/**
 * Entidade que representa métricas de segurança específicas para LGPD
 * 
 * Esta entidade armazena eventos de segurança relacionados à LGPD,
 * incluindo acessos a dados sensíveis, tentativas de autenticação,
 * e outras operações relevantes para conformidade.
 */
@Entity('metricas_seguranca')
export class MetricaSeguranca {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  @Index('idx_metricas_seguranca_tipo')
  @IsNotEmpty({ message: 'Tipo de evento é obrigatório' })
  @IsString({ message: 'Tipo de evento deve ser uma string' })
  @MaxLength(100, { message: 'Tipo de evento deve ter no máximo 100 caracteres' })
  tipo_evento: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index('idx_metricas_seguranca_timestamp')
  created_at: Date;

  @Column({ type: 'uuid', nullable: true })
  @Index('idx_metricas_seguranca_usuario')
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário inválido' })
  usuario_id: string;

  @Column({ length: 50, nullable: true })
  @IsOptional()
  @IsString({ message: 'Perfil do usuário deve ser uma string' })
  @MaxLength(50, { message: 'Perfil do usuário deve ter no máximo 50 caracteres' })
  perfil_usuario: string;

  @Column({ length: 45, nullable: true })
  @Index('idx_metricas_seguranca_ip')
  @IsOptional()
  @IsIP(undefined, { message: 'IP de origem inválido' })
  ip_origem: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'User agent deve ser uma string' })
  user_agent: string;

  @Column({ length: 255, nullable: true })
  @IsOptional()
  @IsString({ message: 'Endpoint deve ser uma string' })
  @MaxLength(255, { message: 'Endpoint deve ter no máximo 255 caracteres' })
  endpoint: string;

  @Column({ type: 'jsonb', nullable: true })
  dados_acessados: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  detalhes: Record<string, any>;

  @Column({
    type: 'enum',
    enum: NivelAlertaEnum,
    default: NivelAlertaEnum.INFO
  })
  @Index('idx_metricas_seguranca_nivel')
  @IsEnum(NivelAlertaEnum, { message: 'Nível de alerta inválido' })
  nivel: NivelAlertaEnum;
}
