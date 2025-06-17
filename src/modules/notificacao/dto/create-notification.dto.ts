import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
  IsBoolean,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType, NotificationPriority } from '../interfaces/ably.interface';

/**
 * DTO para criação de notificações individuais
 */
export class CreateNotificationDto {
  @ApiProperty({
    description: 'ID do usuário destinatário',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid'
  })
  @IsNotEmpty({ message: 'ID do usuário é obrigatório' })
  @IsUUID('4', { message: 'ID do usuário deve ser um UUID válido' })
  userId: string;

  @ApiProperty({
    description: 'Tipo da notificação',
    enum: NotificationType,
    example: NotificationType.SYSTEM
  })
  @IsNotEmpty({ message: 'Tipo da notificação é obrigatório' })
  @IsEnum(NotificationType, {
    message: 'Tipo de notificação inválido'
  })
  type: NotificationType;

  @ApiProperty({
    description: 'Título da notificação',
    example: 'Nova solicitação de benefício',
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
    example: 'Sua solicitação de auxílio natalidade foi recebida e está em análise.',
    minLength: 1,
    maxLength: 500
  })
  @IsNotEmpty({ message: 'Mensagem é obrigatória' })
  @IsString({ message: 'Mensagem deve ser uma string' })
  @MinLength(1, { message: 'Mensagem deve ter pelo menos 1 caractere' })
  @MaxLength(500, { message: 'Mensagem deve ter no máximo 500 caracteres' })
  message: string;

  @ApiPropertyOptional({
    description: 'Prioridade da notificação',
    enum: NotificationPriority,
    example: NotificationPriority.NORMAL,
    default: NotificationPriority.NORMAL
  })
  @IsOptional()
  @IsEnum(NotificationPriority, {
    message: 'Prioridade inválida'
  })
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: 'Dados adicionais da notificação',
    example: {
      benefitType: 'beneficio-natalidade',
      requestId: '12345',
      status: 'pending'
    }
  })
  @IsOptional()
  @IsObject({ message: 'Dados devem ser um objeto' })
  data?: Record<string, any>;

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

  @ApiPropertyOptional({
    description: 'Tentar novamente em caso de falha',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'retryOnFailure deve ser um boolean' })
  retryOnFailure?: boolean;
}

/**
 * DTO para dados adicionais de notificação de benefício
 */
export class BenefitNotificationDataDto {
  @ApiProperty({
    description: 'Tipo do benefício',
    example: 'beneficio-natalidade'
  })
  @IsNotEmpty({ message: 'Tipo do benefício é obrigatório' })
  @IsString({ message: 'Tipo do benefício deve ser uma string' })
  benefitType: string;

  @ApiProperty({
    description: 'ID da solicitação',
    example: '12345'
  })
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  @IsString({ message: 'ID da solicitação deve ser uma string' })
  requestId: string;

  @ApiPropertyOptional({
    description: 'Status da solicitação',
    example: 'pending'
  })
  @IsOptional()
  @IsString({ message: 'Status deve ser uma string' })
  status?: string;

  @ApiPropertyOptional({
    description: 'URL para ação',
    example: '/benefits/requests/12345'
  })
  @IsOptional()
  @IsString({ message: 'URL deve ser uma string' })
  actionUrl?: string;

  @ApiPropertyOptional({
    description: 'Texto do botão de ação',
    example: 'Ver Solicitação'
  })
  @IsOptional()
  @IsString({ message: 'Texto do botão deve ser uma string' })
  actionText?: string;
}

/**
 * DTO para notificação de benefício com dados específicos
 */
export class CreateBenefitNotificationDto extends CreateNotificationDto {
  @ApiProperty({
    description: 'Dados específicos do benefício',
    type: BenefitNotificationDataDto
  })
  @ValidateNested()
  @Type(() => BenefitNotificationDataDto)
  data: BenefitNotificationDataDto;
}

/**
 * DTO para dados adicionais de notificação de sistema
 */
export class SystemNotificationDataDto {
  @ApiPropertyOptional({
    description: 'Código do evento do sistema',
    example: 'MAINTENANCE_SCHEDULED'
  })
  @IsOptional()
  @IsString({ message: 'Código do evento deve ser uma string' })
  eventCode?: string;

  @ApiPropertyOptional({
    description: 'Severidade do evento',
    enum: ['info', 'warning', 'error', 'critical'],
    example: 'info'
  })
  @IsOptional()
  @IsEnum(['info', 'warning', 'error', 'critical'], {
    message: 'Severidade inválida'
  })
  severity?: string;

  @ApiPropertyOptional({
    description: 'Timestamp do evento',
    example: '2024-01-15T10:30:00Z'
  })
  @IsOptional()
  @IsString({ message: 'Timestamp deve ser uma string' })
  eventTimestamp?: string;

  @ApiPropertyOptional({
    description: 'Dados adicionais do evento',
    example: { duration: '2 hours', affectedServices: ['api', 'frontend'] }
  })
  @IsOptional()
  @IsObject({ message: 'Dados do evento devem ser um objeto' })
  eventData?: Record<string, any>;
}

/**
 * DTO para notificação de sistema com dados específicos
 */
export class CreateSystemNotificationDto extends CreateNotificationDto {
  @ApiProperty({
    description: 'Dados específicos do sistema',
    type: SystemNotificationDataDto
  })
  @ValidateNested()
  @Type(() => SystemNotificationDataDto)
  data: SystemNotificationDataDto;
}

/**
 * DTO para dados adicionais de notificação de segurança
 */
export class SecurityNotificationDataDto {
  @ApiProperty({
    description: 'Tipo do evento de segurança',
    example: 'LOGIN_ATTEMPT'
  })
  @IsNotEmpty({ message: 'Tipo do evento de segurança é obrigatório' })
  @IsString({ message: 'Tipo do evento deve ser uma string' })
  eventType: string;

  @ApiPropertyOptional({
    description: 'Endereço IP de origem',
    example: '192.168.1.100'
  })
  @IsOptional()
  @IsString({ message: 'IP deve ser uma string' })
  sourceIp?: string;

  @ApiPropertyOptional({
    description: 'User Agent do navegador',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  })
  @IsOptional()
  @IsString({ message: 'User Agent deve ser uma string' })
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Localização geográfica',
    example: 'São Paulo, SP, Brasil'
  })
  @IsOptional()
  @IsString({ message: 'Localização deve ser uma string' })
  location?: string;

  @ApiPropertyOptional({
    description: 'Nível de risco',
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'medium'
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'], {
    message: 'Nível de risco inválido'
  })
  riskLevel?: string;
}

/**
 * DTO para notificação de segurança com dados específicos
 */
export class CreateSecurityNotificationDto extends CreateNotificationDto {
  @ApiProperty({
    description: 'Dados específicos de segurança',
    type: SecurityNotificationDataDto
  })
  @ValidateNested()
  @Type(() => SecurityNotificationDataDto)
  data: SecurityNotificationDataDto;
}