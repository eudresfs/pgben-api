import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { TipoDocumentoEnum } from '../../../enums/tipo-documento.enum';

/**
 * DTO para geração de documentos
 */
export class GerarDocumentoDto {
  @ApiProperty({
    description: 'ID da solicitação para geração do documento',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'ID da solicitação deve ser um UUID válido' })
  solicitacaoId: string;

  @ApiProperty({
    description: 'Tipo de documento a ser gerado',
    enum: TipoDocumentoEnum,
    example: TipoDocumentoEnum.AUTORIZACAO_ATAUDE,
  })
  @IsEnum(TipoDocumentoEnum, {
    message: 'Tipo de documento deve ser um dos valores válidos',
  })
  tipoDocumento: TipoDocumentoEnum;

  @ApiPropertyOptional({
    description: 'Formato de saída do documento (pdf ou base64)',
    enum: ['pdf', 'base64'],
    default: 'pdf',
    example: 'pdf',
  })
  @IsOptional()
  @IsString()
  formato?: 'pdf' | 'base64' = 'pdf';

  @ApiPropertyOptional({
    description: 'Observações adicionais para o documento',
    example: 'Documento gerado para análise prévia',
  })
  @IsOptional()
  @IsString()
  observacoes?: string;
}

/**
 * DTO para resposta da geração de documento
 */
export class DocumentoGeradoDto {
  @ApiProperty({
    description: 'ID único do documento gerado',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Nome do arquivo gerado',
    example: 'autorizacao_ataude_20240101_123456.pdf',
  })
  nomeArquivo: string;

  @ApiProperty({
    description: 'Tipo de documento gerado',
    enum: TipoDocumentoEnum,
    example: TipoDocumentoEnum.AUTORIZACAO_ATAUDE,
  })
  tipoDocumento: TipoDocumentoEnum;

  @ApiProperty({
    description: 'Tamanho do arquivo em bytes',
    example: 245760,
  })
  tamanhoArquivo: number;

  @ApiProperty({
    description: 'Data e hora da geração',
    example: '2024-01-01T10:30:00.000Z',
  })
  dataGeracao: Date;

  @ApiPropertyOptional({
    description: 'Conteúdo do arquivo em base64 (quando formato = base64)',
    example: 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwo...',
  })
  conteudoBase64?: string;

  @ApiProperty({
    description: 'Caminho do arquivo no sistema (quando formato = pdf)',
    example: '/uploads/documentos/autorizacao_ataude_20240101_123456.pdf',
  })
  caminhoArquivo?: string;

  @ApiProperty({
    description: 'ID da solicitação relacionada',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  solicitacaoId: string;

  @ApiPropertyOptional({
    description: 'Observações incluídas no documento',
    example: 'Documento gerado para análise prévia',
  })
  observacoes?: string;
}

/**
 * DTO para listagem de documentos gerados
 */
export class ListarDocumentosDto {
  @ApiPropertyOptional({
    description: 'Filtrar por tipo de documento',
    enum: TipoDocumentoEnum,
  })
  @IsOptional()
  @IsEnum(TipoDocumentoEnum)
  tipoDocumento?: TipoDocumentoEnum;

  @ApiPropertyOptional({
    description: 'Filtrar por ID da solicitação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4')
  solicitacaoId?: string;

  @ApiPropertyOptional({
    description: 'Data inicial para filtro (formato: YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsString()
  dataInicial?: string;

  @ApiPropertyOptional({
    description: 'Data final para filtro (formato: YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsString()
  dataFinal?: string;
}