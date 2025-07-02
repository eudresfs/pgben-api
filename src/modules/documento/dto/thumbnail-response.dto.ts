import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/**
 * DTO para resposta de operações de thumbnail
 *
 * Define a estrutura padronizada das respostas relacionadas a thumbnails,
 * incluindo metadados e informações de status.
 */
export class ThumbnailResponseDto {
  @ApiProperty({
    description: 'Mensagem de status da operação',
    example: 'Thumbnail gerado com sucesso',
  })
  @Expose()
  message: string;

  @ApiProperty({
    description: 'Metadados do thumbnail gerado',
    type: 'object',
    properties: {
      hash: {
        type: 'string',
        description: 'Hash único do thumbnail',
        example: 'abc123def456',
      },
      size: {
        type: 'number',
        description: 'Tamanho do thumbnail em pixels',
        example: 250,
      },
      format: {
        type: 'string',
        description: 'Formato do thumbnail',
        example: 'jpeg',
      },
      quality: {
        type: 'number',
        description: 'Qualidade do thumbnail (0-100)',
        example: 85,
      },
      fileSize: {
        type: 'number',
        description: 'Tamanho do arquivo em bytes',
        example: 15360,
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Data de criação do thumbnail',
        example: '2024-01-15T10:30:00Z',
      },
      documentoId: {
        type: 'string',
        format: 'uuid',
        description: 'ID do documento original',
        example: '123e4567-e89b-12d3-a456-426614174000',
      },
    },
  })
  @Expose()
  metadata: {
    hash: string;
    size: number;
    format: string;
    quality: number;
    fileSize: number;
    createdAt: Date;
    documentoId: string;
  };
}

/**
 * DTO para resposta de status de processamento de thumbnail
 *
 * Usado para informar o status de processamento assíncrono de thumbnails.
 */
export class ThumbnailStatusResponseDto {
  @ApiProperty({
    description: 'ID do documento',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  documentoId: string;

  @ApiProperty({
    description: 'Status do processamento',
    enum: ['pending', 'processing', 'completed', 'failed'],
    example: 'completed',
  })
  @Expose()
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @ApiProperty({
    description: 'Progresso do processamento (0-100)',
    minimum: 0,
    maximum: 100,
    example: 100,
  })
  @Expose()
  progress: number;

  @ApiProperty({
    description: 'Mensagem de erro (se houver)',
    required: false,
    example: null,
  })
  @Expose()
  error?: string;

  @ApiProperty({
    description: 'Data de início do processamento',
    format: 'date-time',
    example: '2024-01-15T10:25:00Z',
  })
  @Expose()
  startedAt: Date;

  @ApiProperty({
    description: 'Data de conclusão do processamento',
    format: 'date-time',
    required: false,
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  completedAt?: Date;
}

/**
 * DTO para resposta de estatísticas de thumbnails
 *
 * Fornece informações agregadas sobre o sistema de thumbnails.
 */
export class ThumbnailStatsResponseDto {
  @ApiProperty({
    description: 'Total de thumbnails gerados',
    example: 1250,
  })
  @Expose()
  totalThumbnails: number;

  @ApiProperty({
    description: 'Thumbnails processados hoje',
    example: 45,
  })
  @Expose()
  processedToday: number;

  @ApiProperty({
    description: 'Thumbnails pendentes na fila',
    example: 12,
  })
  @Expose()
  pendingInQueue: number;

  @ApiProperty({
    description: 'Taxa de sucesso (%)',
    minimum: 0,
    maximum: 100,
    example: 98.5,
  })
  @Expose()
  successRate: number;

  @ApiProperty({
    description: 'Tempo médio de processamento (ms)',
    example: 2500,
  })
  @Expose()
  averageProcessingTime: number;

  @ApiProperty({
    description: 'Distribuição por tipo de arquivo',
    type: 'object',
    additionalProperties: {
      type: 'number',
    },
    example: {
      'application/pdf': 650,
      'image/jpeg': 400,
      'image/png': 200,
    },
  })
  @Expose()
  typeDistribution: Record<string, number>;
}
