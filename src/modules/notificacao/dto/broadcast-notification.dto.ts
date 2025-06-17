import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
  ArrayNotEmpty
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para definir o alvo do broadcast
 */
export class BroadcastTargetDto {
  @ApiProperty({
    description: 'Tipo do alvo do broadcast',
    enum: ['all', 'unit', 'role', 'region'],
    example: 'unit'
  })
  @IsNotEmpty({ message: 'Tipo do alvo é obrigatório' })
  @IsEnum(['all', 'unit', 'role', 'region'], {
    message: 'Tipo de alvo inválido'
  })
  type: 'all' | 'unit' | 'role' | 'region';

  @ApiPropertyOptional({
    description: 'Valor específico do alvo (obrigatório para tipos diferentes de "all")',
    example: 'assistencia_social'
  })
  @IsOptional()
  @IsString({ message: 'Valor do alvo deve ser uma string' })
  value?: string;
}

/**
 * DTO para broadcast de notificações
 */
export class BroadcastNotificationDto {
  @ApiProperty({
    description: 'Tipo da notificação',
    enum: ['system', 'user', 'admin', 'security', 'workflow', 'reminder', 'alert', 'info'],
    example: 'system'
  })
  @IsNotEmpty({ message: 'Tipo da notificação é obrigatório' })
  @IsEnum(['system', 'user', 'admin', 'security', 'workflow', 'reminder', 'alert', 'info'], {
    message: 'Tipo de notificação inválido'
  })
  type: string;

  @ApiProperty({
    description: 'Título da notificação',
    example: 'Manutenção programada do sistema',
    minLength: 1,
    maxLength: 100
  })
  @IsNotEmpty({ message: 'Título é obrigatório' })
  @IsString({ message: 'Título deve ser uma string' })
  @MinLength(1, { message: 'Título deve ter pelo menos 1 caractere' })
  @MaxLength(100, { message: 'Título deve ter no máximo 100 caracteres' })
  title: string;

  @ApiProperty({
    description: 'Mensagem da notificação',
    example: 'O sistema estará em manutenção das 02:00 às 04:00. Durante este período, alguns serviços podem ficar indisponíveis.',
    minLength: 1,
    maxLength: 1000
  })
  @IsNotEmpty({ message: 'Mensagem é obrigatória' })
  @IsString({ message: 'Mensagem deve ser uma string' })
  @MinLength(1, { message: 'Mensagem deve ter pelo menos 1 caractere' })
  @MaxLength(1000, { message: 'Mensagem deve ter no máximo 1000 caracteres' })
  message: string;

  @ApiPropertyOptional({
    description: 'Prioridade da notificação',
    enum: ['low', 'normal', 'high', 'urgent'],
    example: 'high',
    default: 'normal'
  })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'], {
    message: 'Prioridade inválida'
  })
  priority?: string;

  @ApiProperty({
    description: 'Configuração do alvo do broadcast',
    type: BroadcastTargetDto
  })
  @ValidateNested()
  @Type(() => BroadcastTargetDto)
  target: BroadcastTargetDto;

  @ApiPropertyOptional({
    description: 'Dados adicionais da notificação',
    example: {
      maintenanceType: 'scheduled',
      estimatedDuration: '2 hours',
      affectedServices: ['api', 'frontend', 'database']
    }
  })
  @IsOptional()
  @IsObject({ message: 'Dados devem ser um objeto' })
  data?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Lista de IDs de usuários a serem excluídos do broadcast',
    example: ['123e4567-e89b-12d3-a456-426614174000', '987fcdeb-51a2-43d1-b789-123456789abc'],
    type: [String]
  })
  @IsOptional()
  @IsArray({ message: 'excludeUsers deve ser um array' })
  @IsUUID('4', { each: true, message: 'Cada ID de usuário deve ser um UUID válido' })
  excludeUsers?: string[];

  @ApiPropertyOptional({
    description: 'Forçar método de entrega específico',
    enum: ['ably', 'sse'],
    example: 'ably'
  })
  @IsOptional()
  @IsEnum(['ably', 'sse'], {
    message: 'Método de entrega inválido'
  })
  forceMethod?: 'ably' | 'sse';
}

/**
 * DTO para broadcast de manutenção do sistema
 */
export class MaintenanceBroadcastDto extends BroadcastNotificationDto {
  @ApiProperty({
    description: 'Dados específicos de manutenção',
    example: {
      maintenanceType: 'scheduled',
      startTime: '2024-01-15T02:00:00Z',
      endTime: '2024-01-15T04:00:00Z',
      affectedServices: ['api', 'frontend'],
      impact: 'partial_downtime',
      contactInfo: 'suporte@semtas.gov.br'
    }
  })
  @IsObject({ message: 'Dados de manutenção devem ser um objeto' })
  data: {
    maintenanceType: 'scheduled' | 'emergency' | 'hotfix';
    startTime: string;
    endTime: string;
    affectedServices: string[];
    impact: 'no_impact' | 'partial_downtime' | 'full_downtime';
    contactInfo?: string;
    alternativeAccess?: string;
  };
}

/**
 * DTO para broadcast de emergência
 */
export class EmergencyBroadcastDto extends BroadcastNotificationDto {
  @ApiProperty({
    description: 'Dados específicos de emergência',
    example: {
      emergencyType: 'security_breach',
      severity: 'critical',
      actionRequired: 'immediate_logout',
      instructions: 'Faça logout imediatamente e aguarde novas instruções.',
      contactInfo: 'emergencia@semtas.gov.br',
      incidentId: 'INC-2024-001'
    }
  })
  @IsObject({ message: 'Dados de emergência devem ser um objeto' })
  data: {
    emergencyType: 'security_breach' | 'system_failure' | 'data_corruption' | 'external_threat';
    severity: 'low' | 'medium' | 'high' | 'critical';
    actionRequired: 'none' | 'immediate_logout' | 'change_password' | 'contact_support';
    instructions: string;
    contactInfo: string;
    incidentId?: string;
    estimatedResolution?: string;
  };
}

/**
 * DTO para broadcast de comunicado geral
 */
export class AnnouncementBroadcastDto extends BroadcastNotificationDto {
  @ApiProperty({
    description: 'Dados específicos do comunicado',
    example: {
      announcementType: 'policy_update',
      category: 'benefits',
      effectiveDate: '2024-02-01T00:00:00Z',
      documentUrl: '/documents/policy-update-2024-001.pdf',
      requiresAcknowledgment: true,
      expirationDate: '2024-02-15T23:59:59Z'
    }
  })
  @IsObject({ message: 'Dados do comunicado devem ser um objeto' })
  data: {
    announcementType: 'policy_update' | 'new_feature' | 'training' | 'general_info';
    category: 'benefits' | 'system' | 'training' | 'administrative' | 'legal';
    effectiveDate?: string;
    documentUrl?: string;
    requiresAcknowledgment?: boolean;
    expirationDate?: string;
    tags?: string[];
  };
}

/**
 * DTO para broadcast por departamento
 */
export class DepartmentBroadcastDto extends BroadcastNotificationDto {
  @ApiProperty({
    description: 'Configuração específica para broadcast por departamento',
    example: {
      type: 'unit',
      value: 'assistencia_social'
    }
  })
  target: {
    type: 'unit';
    value: string;
  };

  @ApiPropertyOptional({
    description: 'Dados específicos do departamento',
    example: {
      departmentCode: 'ASSIS_SOC',
      managerNotification: true,
      cascadeToSubdepartments: false
    }
  })
  @IsOptional()
  @IsObject({ message: 'Dados do departamento devem ser um objeto' })
  departmentData?: {
    departmentCode?: string;
    managerNotification?: boolean;
    cascadeToSubdepartments?: boolean;
  };
}

/**
 * DTO para broadcast por função/cargo
 */
export class RoleBroadcastDto extends BroadcastNotificationDto {
  @ApiProperty({
    description: 'Configuração específica para broadcast por função',
    example: {
      type: 'role',
      value: 'analista_beneficios'
    }
  })
  target: {
    type: 'role';
    value: string;
  };

  @ApiPropertyOptional({
    description: 'Dados específicos da função',
    example: {
      roleLevel: 'tecnico',
      includeSubordinates: false,
      temporaryAssignments: true
    }
  })
  @IsOptional()
  @IsObject({ message: 'Dados da função devem ser um objeto' })
  roleData?: {
    roleLevel?: 'tecnico' | 'cidadao' | 'gestor' | 'coordenador' | 'administrador';
    includeSubordinates?: boolean;
    temporaryAssignments?: boolean;
  };
}

/**
 * DTO para broadcast por região
 */
export class RegionBroadcastDto extends BroadcastNotificationDto {
  @ApiProperty({
    description: 'Configuração específica para broadcast por região',
    example: {
      type: 'region',
      value: 'zona_norte'
    }
  })
  target: {
    type: 'region';
    value: string;
  };

  @ApiPropertyOptional({
    description: 'Dados específicos da região',
    example: {
      regionCode: 'ZN',
      includeNeighboringRegions: false,
      urgentDelivery: false
    }
  })
  @IsOptional()
  @IsObject({ message: 'Dados da região devem ser um objeto' })
  regionData?: {
    regionCode?: string;
    includeNeighboringRegions?: boolean;
    urgentDelivery?: boolean;
  };
}