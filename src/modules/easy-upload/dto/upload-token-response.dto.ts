import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UploadTokenStatus } from '../entities/upload-token.entity';
import { RequiredDocumentDto } from './create-upload-token.dto';

/**
 * DTO de resposta para token de upload
 */
export class UploadTokenResponseDto {
  @ApiProperty({
    description: 'ID único do token',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Token de acesso para upload',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'URL do QR Code para acesso móvel',
    example: 'https://api.pgben.com/easy-upload/qr/123e4567-e89b-12d3-a456-426614174000',
  })
  qr_code_url: string;

  @ApiProperty({
    description: 'URL direta para upload',
    example: 'https://upload.pgben.com/123e4567-e89b-12d3-a456-426614174000',
  })
  upload_url: string;

  @ApiProperty({
    description: 'Data de expiração do token',
    example: '2024-01-15T14:30:00Z',
  })
  expires_at: Date;

  @ApiProperty({
    description: 'Status atual do token',
    enum: UploadTokenStatus,
    example: UploadTokenStatus.ATIVO,
  })
  status: UploadTokenStatus;

  @ApiProperty({
    description: 'Número máximo de arquivos permitidos',
    example: 5,
  })
  max_files: number;

  @ApiPropertyOptional({
    description: 'Lista de documentos obrigatórios',
    type: [RequiredDocumentDto],
  })
  required_documents?: RequiredDocumentDto[] | null;

  @ApiPropertyOptional({
    description: 'Metadados adicionais do token',
    example: {
      tipo_beneficio: 'auxilio_natalidade',
      observacoes: 'Upload de documentos para análise',
    },
  })
  metadata?: Record<string, any> | null;

  @ApiPropertyOptional({
    description: 'Instruções para o upload',
    example: 'Por favor, envie apenas documentos legíveis e em boa qualidade.',
  })
  instrucoes?: string;

  @ApiProperty({
    description: 'Data de criação do token',
    example: '2024-01-15T12:00:00Z',
  })
  created_at: Date;

  @ApiPropertyOptional({
    description: 'Data de uso do token',
    example: '2024-01-15T13:15:00Z',
  })
  used_at?: Date;

  @ApiPropertyOptional({
    description: 'Informações do cidadão (dados básicos)',
    example: {
      nome: 'João Silva',
      cpf: '***.***.***-**',
    },
  })
  cidadao?: {
    nome: string;
    cpf: string;
  };

  @ApiPropertyOptional({
    description: 'Informações da solicitação (dados básicos)',
    example: {
      numero: 'SOL-2024-001234',
      tipo_beneficio: 'Auxílio Natalidade',
    },
  })
  solicitacao?: {
    numero: string;
    tipo_beneficio: string;
  };
}

/**
 * DTO de resposta simplificada para validação de token
 */
export class ValidateTokenResponseDto {
  @ApiProperty({
    description: 'Se o token é válido',
    example: true,
  })
  valid: boolean;

  @ApiProperty({
    description: 'Status atual do token',
    enum: UploadTokenStatus,
    example: UploadTokenStatus.ATIVO,
  })
  status: UploadTokenStatus;

  @ApiPropertyOptional({
    description: 'Mensagem explicativa',
    example: 'Token válido e pronto para uso',
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Data de expiração do token',
    example: '2024-01-15T14:30:00Z',
  })
  expires_at?: Date;

  @ApiPropertyOptional({
    description: 'Tempo restante em minutos',
    example: 45,
  })
  minutes_remaining?: number;

  @ApiPropertyOptional({
    description: 'Configurações de upload permitidas',
    example: {
      max_files: 5,
      max_file_size_mb: 10,
      allowed_extensions: ['pdf', 'jpg', 'png'],
    },
  })
  upload_config?: {
    max_files: number;
    max_file_size_mb: number;
    allowed_extensions: string[];
  };
}

/**
 * DTO de resposta para lista de tokens
 */
export class UploadTokenListResponseDto {
  @ApiProperty({
    description: 'Lista de tokens',
    type: [UploadTokenResponseDto],
  })
  tokens: UploadTokenResponseDto[];

  @ApiProperty({
    description: 'Total de registros',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Página atual',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Registros por página',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total de páginas',
    example: 3,
  })
  total_pages: number;
}