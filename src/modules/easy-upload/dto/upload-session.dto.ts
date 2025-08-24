import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsDate,
  IsOptional,
  IsEnum,
  IsObject,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsIP,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UploadSessionStatus } from '../entities/upload-session.entity';
import { IUploadProgress } from '../interfaces/easy-upload.interface';

/**
 * DTO para iniciar sessão de upload
 */
export class StartUploadSessionDto {
  @ApiPropertyOptional({
    description: 'User-Agent do navegador/dispositivo',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  @IsOptional()
  @IsString({ message: 'User-Agent deve ser uma string' })
  @Length(0, 1000, { message: 'User-Agent deve ter no máximo 1000 caracteres' })
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Endereço IP do cliente',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsIP(undefined, { message: 'Endereço IP inválido' })
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Fingerprint único do dispositivo',
    example: 'fp_1234567890abcdef',
  })
  @IsOptional()
  @IsString({ message: 'Device fingerprint deve ser uma string' })
  @Length(0, 255, {
    message: 'Device fingerprint deve ter no máximo 255 caracteres',
  })
  device_fingerprint?: string;

  @ApiPropertyOptional({
    description: 'Metadados adicionais da sessão',
    example: {
      browser: 'Chrome',
      version: '120.0.0.0',
      platform: 'Windows',
    },
  })
  session_metadata?: Record<string, any>;
}

/**
 * DTO de resposta para sessão de upload
 */
export class UploadSessionResponseDto {
  @ApiProperty({
    description: 'ID único da sessão',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'ID do token associado',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  token_id: string;

  @ApiProperty({
    description: 'Status atual da sessão',
    enum: UploadSessionStatus,
    example: UploadSessionStatus.ATIVA,
  })
  status: UploadSessionStatus;

  @ApiProperty({
    description: 'Número de arquivos já enviados',
    example: 2,
  })
  files_uploaded: number;

  @ApiProperty({
    description: 'Tamanho total dos arquivos em bytes',
    example: 1048576,
  })
  total_size_bytes: number;

  @ApiProperty({
    description: 'Data de início da sessão',
    example: '2024-01-15T13:00:00Z',
  })
  started_at: Date;

  @ApiPropertyOptional({
    description: 'Data da última atividade',
    example: '2024-01-15T13:15:00Z',
  })
  last_activity_at?: Date;

  @ApiPropertyOptional({
    description: 'Data de conclusão da sessão',
    example: '2024-01-15T13:30:00Z',
  })
  completed_at?: Date;

  @ApiPropertyOptional({
    description: 'Endereço IP da sessão',
    example: '192.168.1.100',
  })
  ip_address?: string;

  @ApiPropertyOptional({
    description: 'User-Agent da sessão',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  user_agent?: string;

  @ApiPropertyOptional({
    description: 'Mensagem de erro (se houver)',
    example: 'Arquivo muito grande',
  })
  error_message?: string;

  @ApiPropertyOptional({
    description: 'Progresso detalhado do upload',
    example: {
      current_file: 2,
      total_files: 5,
      bytes_uploaded: 1048576,
      percentage: 40,
      files_completed: ['documento1.pdf', 'documento2.jpg'],
      files_failed: [],
    },
  })
  upload_progress?: {
    current_file?: number;
    total_files?: number;
    bytes_uploaded?: number;
    percentage?: number;
    files_completed?: string[];
    files_failed?: string[];
  };

  @ApiProperty({
    description: 'Data de criação da sessão',
    example: '2024-01-15T13:00:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Data de última atualização',
    example: '2024-01-15T13:15:00Z',
  })
  updated_at: Date;
}

/**
 * DTO para atualizar progresso da sessão
 */
export class UpdateSessionProgressDto {
  @ApiPropertyOptional({
    description: 'Objeto completo de progresso do upload',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UploadProgressDto)
  progress?: UploadProgressDto;

  @ApiPropertyOptional({
    description: 'Indica se um arquivo foi completado',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  fileCompleted?: boolean;

  @ApiPropertyOptional({
    description: 'Tamanho do arquivo completado em bytes',
    example: 1048576,
  })
  @IsOptional()
  @IsNumber()
  fileSize?: number;
}

/**
 * DTO para progresso de upload
 */
export class UploadProgressDto implements Partial<IUploadProgress> {
  @ApiPropertyOptional({
    description: 'ID da sessão',
    example: 'a1b2c3d4-e5f6-7890-abcd-1234567890ab',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Número do arquivo atual sendo processado',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  currentFile?: number;

  @ApiPropertyOptional({
    description: 'Total de arquivos a serem enviados',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  totalFiles?: number;

  @ApiPropertyOptional({
    description: 'Bytes já enviados',
    example: 2097152,
  })
  @IsOptional()
  @IsNumber()
  bytesUploaded?: number;

  @ApiPropertyOptional({
    description: 'Total de bytes a serem enviados',
    example: 5242880,
  })
  @IsOptional()
  @IsNumber()
  totalBytes?: number;

  @ApiPropertyOptional({
    description: 'Porcentagem de progresso',
    example: 60,
  })
  @IsOptional()
  @IsNumber()
  percentage?: number;

  @ApiPropertyOptional({
    description: 'Lista de arquivos completados',
    example: ['documento1.pdf', 'documento2.jpg'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filesCompleted?: string[];

  @ApiPropertyOptional({
    description: 'Lista de arquivos com falha',
    example: ['documento4.exe'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filesFailed?: string[];

  @ApiPropertyOptional({
    description: 'Nome do arquivo atual',
    example: 'documento3.png',
  })
  @IsOptional()
  @IsString()
  currentFileName?: string;

  @ApiPropertyOptional({
    description: 'Tempo estimado restante em segundos',
    example: 45,
  })
  @IsOptional()
  @IsNumber()
  estimatedTimeRemaining?: number;
}

/**
 * DTO de resposta para status da sessão
 */
export class SessionStatusResponseDto {
  @ApiProperty({
    description: 'ID da sessão',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  session_id: string;

  @ApiProperty({
    description: 'Status atual da sessão',
    enum: UploadSessionStatus,
    example: UploadSessionStatus.ATIVA,
  })
  status: UploadSessionStatus;

  @ApiProperty({
    description: 'Se a sessão está ativa',
    example: true,
  })
  is_active: boolean;

  @ApiProperty({
    description: 'Progresso atual em porcentagem',
    example: 75,
  })
  progress_percentage: number;

  @ApiProperty({
    description: 'Arquivos enviados vs total permitido',
    example: '3/5',
  })
  files_status: string;

  @ApiProperty({
    description: 'Tamanho total formatado',
    example: '2.5 MB',
  })
  total_size_formatted: string;

  @ApiProperty({
    description: 'Duração da sessão em minutos',
    example: 15,
  })
  duration_minutes: number;

  @ApiPropertyOptional({
    description: 'Tempo restante estimado em minutos',
    example: 45,
  })
  time_remaining_minutes?: number;

  @ApiPropertyOptional({
    description: 'Mensagem de status',
    example: 'Upload em andamento - 3 de 5 arquivos enviados',
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Próximas ações disponíveis',
    example: ['upload_file', 'complete_session', 'cancel_session'],
  })
  available_actions?: string[];
  @ApiPropertyOptional({
    description: 'Informações do token associado à sessão',
    type: 'object',
    additionalProperties: true,
  })
  token?: {
    id: string;
    token: string;
    cidadao_id?: string | null;
    solicitacao_id?: string | null;
    status: string;
    expires_at: Date;
  };
}
