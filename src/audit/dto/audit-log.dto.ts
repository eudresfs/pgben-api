import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  IsObject,
  IsDateString,
  IsIP,
  IsUrl,
  Min,
  Max,
  Length,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { AuditAction, AuditSeverity } from '../../entities/audit-log.entity';

export class CreateAuditLogDto {
  @ApiPropertyOptional({
    description: 'ID do usuário que executou a ação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  usuario_id?: string;

  @ApiProperty({
    description: 'Ação executada',
    enum: AuditAction,
    example: AuditAction.CREATE,
  })
  @IsEnum(AuditAction)
  action: AuditAction;

  @ApiProperty({
    description: 'Tipo do recurso afetado',
    example: 'Usuario',
    maxLength: 100,
  })
  @IsString()
  @Length(1, 100)
  resource_type: string;

  @ApiPropertyOptional({
    description: 'ID do recurso afetado',
    example: '123e4567-e89b-12d3-a456-426614174000',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  resource_id?: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada da ação',
    example: 'Usuário criado com sucesso',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Severidade do evento',
    enum: AuditSeverity,
    default: AuditSeverity.LOW,
  })
  @IsOptional()
  @IsEnum(AuditSeverity)
  severity?: AuditSeverity;

  @ApiPropertyOptional({
    description: 'IP do cliente',
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsIP()
  client_ip?: string;

  @ApiPropertyOptional({
    description: 'User Agent do cliente',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  user_agent?: string;

  @ApiPropertyOptional({
    description: 'ID da sessão',
    example: 'sess_123456789',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  session_id?: string;

  @ApiPropertyOptional({
    description: 'Método HTTP da requisição',
    example: 'POST',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  request_method?: string;

  @ApiPropertyOptional({
    description: 'URL da requisição',
    example: '/api/usuarios',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  request_url?: string;

  @ApiPropertyOptional({
    description: 'Status HTTP da resposta',
    example: 201,
    minimum: 100,
    maximum: 599,
  })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(599)
  response_status?: number;

  @ApiPropertyOptional({
    description: 'Tempo de resposta em milissegundos',
    example: 150,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  response_time_ms?: number;

  @ApiPropertyOptional({
    description: 'Valores anteriores (para operações de UPDATE)',
    example: { nome: 'João Silva', email: 'joao@email.com' },
  })
  @IsOptional()
  @IsObject()
  old_values?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Novos valores (para operações de CREATE/UPDATE)',
    example: { nome: 'João Santos', email: 'joao.santos@email.com' },
  })
  @IsOptional()
  @IsObject()
  new_values?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Metadados adicionais',
    example: { module: 'auth', feature: 'login' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Mensagem de erro (se houver)',
    example: 'Erro de validação: email já existe',
  })
  @IsOptional()
  @IsString()
  error_message?: string;

  @ApiPropertyOptional({
    description: 'Stack trace do erro (se houver)',
  })
  @IsOptional()
  @IsString()
  stack_trace?: string;
}

export class AuditLogQueryDto {
  @ApiPropertyOptional({
    description: 'ID do usuário para filtrar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  usuario_id?: string;

  @ApiPropertyOptional({
    description: 'Ação para filtrar',
    enum: AuditAction,
  })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({
    description: 'Tipo de recurso para filtrar',
    example: 'Usuario',
  })
  @IsOptional()
  @IsString()
  resource_type?: string;

  @ApiPropertyOptional({
    description: 'ID do recurso para filtrar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  resource_id?: string;

  @ApiPropertyOptional({
    description: 'Severidade para filtrar',
    enum: AuditSeverity,
  })
  @IsOptional()
  @IsEnum(AuditSeverity)
  severity?: AuditSeverity;

  @ApiPropertyOptional({
    description: 'IP do cliente para filtrar',
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsIP()
  client_ip?: string;

  @ApiPropertyOptional({
    description: 'Data de início (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    description: 'Data de fim (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Página (começando em 1)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Itens por página',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Campo para ordenação',
    example: 'created_at',
    enum: ['created_at', 'action', 'severity', 'resource_type'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['created_at', 'action', 'severity', 'resource_type'])
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({
    description: 'Direção da ordenação',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sort_order?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    description: 'Filtrar apenas eventos de segurança',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  security_events_only?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar apenas eventos críticos',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  critical_only?: boolean;
}

export class AuditLogResponseDto {
  @ApiProperty({
    description: 'ID do log de auditoria',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'ID do usuário',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  usuario_id?: string;

  @ApiPropertyOptional({
    description: 'Dados do usuário',
  })
  usuario?: {
    id: string;
    nome: string;
    email: string;
  };

  @ApiProperty({
    description: 'Ação executada',
    enum: AuditAction,
  })
  action: AuditAction;

  @ApiProperty({
    description: 'Tipo do recurso',
  })
  resource_type: string;

  @ApiPropertyOptional({
    description: 'ID do recurso',
  })
  resource_id?: string;

  @ApiPropertyOptional({
    description: 'Descrição da ação',
  })
  description?: string;

  @ApiProperty({
    description: 'Severidade do evento',
    enum: AuditSeverity,
  })
  severity: AuditSeverity;

  @ApiPropertyOptional({
    description: 'IP do cliente',
  })
  client_ip?: string;

  @ApiPropertyOptional({
    description: 'User Agent',
  })
  user_agent?: string;

  @ApiProperty({
    description: 'Data de criação',
  })
  created_at: Date;

  @ApiPropertyOptional({
    description: 'Metadados adicionais',
  })
  metadata?: Record<string, any>;
}

export class AuditLogStatsDto {
  @ApiProperty({
    description: 'Total de logs',
    example: 1500,
  })
  total_logs: number;

  @ApiProperty({
    description: 'Logs por ação',
    example: {
      LOGIN: 450,
      CREATE: 300,
      UPDATE: 250,
      DELETE: 100,
    },
  })
  logs_by_action: Record<string, number>;

  @ApiProperty({
    description: 'Logs por severidade',
    example: {
      LOW: 1200,
      MEDIUM: 250,
      HIGH: 45,
      CRITICAL: 5,
    },
  })
  logs_by_severity: Record<string, number>;

  @ApiProperty({
    description: 'Logs por usuário (top 10)',
    example: [
      { usuario_id: '123', nome: 'João Silva', count: 150 },
      { usuario_id: '456', nome: 'Maria Santos', count: 120 },
    ],
  })
  top_users: Array<{
    usuario_id: string;
    nome: string;
    count: number;
  }>;

  @ApiProperty({
    description: 'Eventos de segurança recentes',
    example: 25,
  })
  recent_security_events: number;

  @ApiProperty({
    description: 'Eventos críticos recentes',
    example: 2,
  })
  recent_critical_events: number;

  @ApiProperty({
    description: 'Período da análise',
    example: {
      start_date: '2024-01-01T00:00:00Z',
      end_date: '2024-01-31T23:59:59Z',
    },
  })
  period: {
    start_date: string;
    end_date: string;
  };
}