import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsArray,
  IsUUID,
  IsEnum,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TipoDocumentoEnum } from '@/enums';

/**
 * DTO para filtros de download em lote de documentos
 */
export class BatchDownloadDto {
  @ApiPropertyOptional({
    description: 'Lista de IDs de cidadãos',
    type: [String],
    example: ['3fa85f64-5717-4562-b3fc-2c963f66afa6'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  cidadaoIds?: string[];

  @ApiPropertyOptional({
    description: 'Lista de IDs de solicitações',
    type: [String],
    example: ['3fa85f64-5717-4562-b3fc-2c963f66afa6'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  solicitacaoIds?: string[];

  @ApiPropertyOptional({
    description: 'Tipos de documento para filtrar',
    enum: TipoDocumentoEnum,
    isArray: true,
    example: [TipoDocumentoEnum.CPF, TipoDocumentoEnum.RG],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TipoDocumentoEnum, { each: true })
  tiposDocumento?: TipoDocumentoEnum[];

  @ApiPropertyOptional({
    description: 'Data de início do período (YYYY-MM-DD)',
    type: String,
    format: 'date',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  dataInicio?: Date;

  @ApiPropertyOptional({
    description: 'Data de fim do período (YYYY-MM-DD)',
    type: String,
    format: 'date',
    example: '2025-01-31',
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  dataFim?: Date;

  @ApiPropertyOptional({
    description: 'Apenas documentos verificados',
    type: Boolean,
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  apenasVerificados?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir metadados dos documentos no ZIP',
    type: Boolean,
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  incluirMetadados?: boolean;
}

/**
 * Interface para filtros internos do serviço
 */
export interface BatchDownloadFiltros {
  cidadaoIds?: string[];
  solicitacaoIds?: string[];
  tiposDocumento?: string[];
  dataInicio?: Date;
  dataFim?: Date;
  apenasVerificados?: boolean;
  incluirMetadados?: boolean;
}

/**
 * Interface para status do job de download em lote
 */
export interface BatchJobStatus {
  id: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  usuarioId: string;
  filtros: BatchDownloadFiltros;
  documentos: any[]; // Será tipado com a entidade Documento
  estimatedSize: number;
  actualSize?: number;
  documentCount: number;
  createdAt: Date;
  completedAt?: Date;
  progress: number;
  zipPath?: string;
  error?: string;
}

/**
 * Interface para estrutura do ZIP
 */
export interface ZipStructure {
  folders: Map<string, string[]>;
  files: ZipFileInfo[];
}

/**
 * Interface para informações de arquivo no ZIP
 */
export interface ZipFileInfo {
  documento: any; // Será tipado com a entidade Documento
  zipPath: string;
}

/**
 * Response DTO para criação de job de download
 */
export class BatchDownloadResponseDto {
  @ApiProperty({
    description: 'ID do job de download',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  jobId: string;

  @ApiProperty({
    description: 'Tamanho estimado do arquivo ZIP em bytes',
    example: 1048576,
  })
  estimatedSize: number;

  @ApiProperty({
    description: 'Número de documentos que serão incluídos',
    example: 25,
  })
  documentCount: number;

  @ApiProperty({
    description: 'Mensagem informativa',
    example:
      'Download em lote iniciado. Use o jobId para verificar o progresso.',
  })
  message: string;

  @ApiProperty({
    description: 'URL para verificar o status do job',
    example:
      '/api/v1/documento/download-lote/3fa85f64-5717-4562-b3fc-2c963f66afa6/status',
  })
  statusUrl: string;
}

/**
 * Response DTO para status do job
 */
export class BatchJobStatusResponseDto {
  @ApiProperty({
    description: 'ID do job',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  id: string;

  @ApiProperty({
    description: 'Status atual do job',
    enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
    example: 'PROCESSING',
  })
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';

  @ApiProperty({
    description: 'Progresso do processamento (0-100)',
    minimum: 0,
    maximum: 100,
    example: 75,
  })
  progress: number;

  @ApiProperty({
    description: 'Número de documentos',
    example: 25,
  })
  documentCount: number;

  @ApiProperty({
    description: 'Tamanho estimado em bytes',
    example: 1048576,
  })
  estimatedSize: number;

  @ApiPropertyOptional({
    description: 'Tamanho real do arquivo gerado em bytes',
    example: 987654,
  })
  actualSize?: number;

  @ApiProperty({
    description: 'Data de criação do job',
    type: Date,
    example: '2025-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Data de conclusão do job',
    type: Date,
    example: '2025-01-15T10:35:00Z',
  })
  completedAt?: Date;

  @ApiPropertyOptional({
    description: 'Mensagem de erro (se status for FAILED)',
    example: 'Erro ao processar documento: arquivo não encontrado',
  })
  error?: string;

  @ApiPropertyOptional({
    description: 'URL para download do arquivo ZIP (se status for COMPLETED)',
    example:
      '/api/documento/download-lote/3fa85f64-5717-4562-b3fc-2c963f66afa6/download',
  })
  downloadUrl?: string;
}
