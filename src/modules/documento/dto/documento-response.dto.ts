import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { TipoDocumentoEnum } from '@/enums';

/**
 * DTO para resposta de usuário sem informações sensíveis
 *
 * Exclui dados sensíveis como senha hash, tentativas de login, etc.
 */
export class UsuarioSafeResponseDto {
  @ApiProperty({
    description: 'ID único do usuário',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João Silva',
  })
  @Expose()
  nome: string;

  @ApiProperty({
    description: 'Email do usuário',
    example: 'joao.silva@natal.pgben.gov.br',
  })
  @Expose()
  email: string;

  @ApiPropertyOptional({
    description: 'CPF do usuário',
    example: '12345678901',
  })
  @Expose()
  cpf?: string;

  @ApiPropertyOptional({
    description: 'Telefone do usuário',
    example: '(84) 99999-9999',
  })
  @Expose()
  telefone?: string;

  @ApiPropertyOptional({
    description: 'Matrícula do usuário',
    example: '123456',
  })
  @Expose()
  matricula?: string;

  @ApiProperty({
    description: 'Status do usuário',
    example: 'ativo',
  })
  @Expose()
  status: string;

  @ApiProperty({
    description: 'Data de criação',
    example: '2025-01-01T00:00:00.000Z',
  })
  @Expose()
  created_at: Date;

  @ApiProperty({
    description: 'Data de última atualização',
    example: '2025-01-01T00:00:00.000Z',
  })
  @Expose()
  updated_at: Date;

  // Excluir campos sensíveis
  @Exclude()
  senha_hash: string;

  @Exclude()
  tentativas_login: number;

  @Exclude()
  role_id: string;

  @Exclude()
  unidade_id: string;

  @Exclude()
  setor_id: string;

  @Exclude()
  primeiro_acesso: boolean;

  @Exclude()
  ultimo_login: Date;

  @Exclude()
  removed_at: Date;
}

/**
 * DTO para resposta de documento
 *
 * Inclui informações do documento e dados seguros do usuário que fez upload
 */
export class DocumentoResponseDto {
  @ApiProperty({
    description: 'ID único do documento',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @Expose()
  id: string;

  @ApiPropertyOptional({
    description: 'ID da solicitação vinculada',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @Expose()
  solicitacao_id?: string;

  @ApiProperty({
    description: 'ID do cidadão proprietário',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @Expose()
  cidadao_id: string;

  @ApiProperty({
    description: 'Tipo do documento',
    enum: TipoDocumentoEnum,
    example: 'COMPROVANTE_RESIDENCIA',
  })
  @Expose()
  tipo: TipoDocumentoEnum;

  @ApiProperty({
    description: 'Nome do arquivo gerado pelo sistema',
    example: 'documento_123456.pdf',
  })
  @Expose()
  nome_arquivo: string;

  @ApiProperty({
    description: 'Nome original do arquivo enviado',
    example: 'comprovante_residencia.pdf',
  })
  @Expose()
  nome_original: string;

  @ApiProperty({
    description: 'Caminho do arquivo no sistema de armazenamento',
    example: 'documentos/2025/01/documento_123456.pdf',
  })
  @Expose()
  caminho: string;

  @ApiPropertyOptional({
    description: 'Caminho da thumbnail (se disponível)',
    example: 'thumbnails/documento_123456_thumb.jpg',
  })
  @Expose()
  thumbnail?: string;

  @ApiPropertyOptional({
    description: 'Descrição do documento',
    example: 'Comprovante de residência atualizado',
  })
  @Expose()
  descricao?: string;

  @ApiProperty({
    description: 'Tamanho do arquivo em bytes',
    example: 1024000,
  })
  @Expose()
  tamanho: number;

  @ApiProperty({
    description: 'Tipo MIME do arquivo',
    example: 'application/pdf',
  })
  @Expose()
  mimetype: string;

  @ApiProperty({
    description: 'Data e hora do upload',
    example: '2025-01-01T10:30:00.000Z',
  })
  @Expose()
  data_upload: Date;

  @ApiProperty({
    description: 'ID do usuário que fez o upload',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @Expose()
  usuario_upload_id: string;

  @ApiProperty({
    description: 'Dados seguros do usuário que fez o upload',
    type: UsuarioSafeResponseDto,
  })
  @Expose()
  @Type(() => UsuarioSafeResponseDto)
  @Transform(({ value }) => {
    if (!value) {return null;}
    // Aplicar transformação para excluir campos sensíveis
    const safeUser = new UsuarioSafeResponseDto();
    Object.assign(safeUser, value);
    return safeUser;
  })
  usuario_upload?: UsuarioSafeResponseDto;

  @ApiProperty({
    description: 'Indica se o documento foi verificado',
    example: false,
  })
  @Expose()
  verificado: boolean;

  @ApiPropertyOptional({
    description: 'Data de verificação do documento',
    example: '2025-01-01T15:00:00.000Z',
  })
  @Expose()
  data_verificacao?: Date;

  @ApiPropertyOptional({
    description: 'ID do usuário que verificou o documento',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @Expose()
  usuario_verificacao_id?: string;

  @ApiPropertyOptional({
    description: 'Observações da verificação',
    example: 'Documento aprovado conforme critérios estabelecidos',
  })
  @Expose()
  observacoes_verificacao?: string;

  @ApiProperty({
    description: 'Indica se o documento pode ser reutilizado',
    example: false,
  })
  @Expose()
  reutilizavel: boolean;

  @ApiPropertyOptional({
    description: 'Hash do arquivo para verificação de integridade',
    example: 'sha256:abc123...',
  })
  @Expose()
  hash_arquivo?: string;

  @ApiPropertyOptional({
    description: 'Data de validade do documento',
    example: '2025-12-31',
  })
  @Expose()
  data_validade?: Date;

  @ApiPropertyOptional({
    description: 'Metadados adicionais do documento',
    example: {
      upload_info: {
        ip: '192.168.1.1',
        user_agent: 'Mozilla/5.0...',
        timestamp: '2025-01-01T10:30:00.000Z',
      },
    },
  })
  @Expose()
  metadados?: any;

  @ApiProperty({
    description: 'Data de criação do registro',
    example: '2025-01-01T10:30:00.000Z',
  })
  @Expose()
  created_at: Date;

  @ApiProperty({
    description: 'Data de última atualização',
    example: '2025-01-01T10:30:00.000Z',
  })
  @Expose()
  updated_at: Date;

  @ApiPropertyOptional({
    description: 'Data de remoção (soft delete)',
    example: null,
  })
  @Expose()
  removed_at?: Date;
}
