import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para tipo de documento
 */
export class TipoDocumentoDto {
  @ApiProperty({
    description: 'ID do tipo de documento',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
  })
  id: string;

  @ApiProperty({
    description: 'Nome do tipo de documento',
    example: 'Comprovante de Residência',
  })
  nome: string;

  @ApiProperty({
    description: 'Descrição do tipo de documento',
    example: 'Documento que comprova o endereço do cidadão',
  })
  descricao: string;

  @ApiProperty({
    description: 'Indica se o documento é obrigatório',
    example: true,
    default: true,
  })
  obrigatorio: boolean;

  @ApiProperty({
    description: 'Tipos de arquivo aceitos (MIME types)',
    example: ['application/pdf', 'image/jpeg', 'image/png'],
    type: [String],
  })
  tiposArquivoAceitos: string[];

  @ApiProperty({
    description: 'Tamanho máximo do arquivo em bytes',
    example: 5242880, // 5MB
    default: 5242880,
  })
  tamanhoMaximo: number;
}

/**
 * DTO para documento anexado
 */
export class DocumentoDto {
  @ApiProperty({
    description: 'ID do documento',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
  })
  id: string;

  @ApiProperty({
    description: 'Nome original do arquivo',
    example: 'comprovante_residencia.pdf',
  })
  nomeArquivo: string;

  @ApiProperty({
    description: 'Tipo MIME do arquivo',
    example: 'application/pdf',
  })
  mimeType: string;

  @ApiProperty({
    description: 'Tamanho do arquivo em bytes',
    example: 102400,
  })
  tamanho: number;

  @ApiProperty({
    description: 'URL para download do documento',
    example: '/api/documentos/5f8d3b4e3b4f3b2d3c2e1d2f/download',
  })
  urlDownload: string;

  @ApiProperty({
    description: 'URL para visualização do documento',
    example: '/api/documentos/5f8d3b4e3b4f3b2d3c2e1d2f/visualizar',
    required: false,
  })
  urlVisualizacao?: string;

  @ApiProperty({
    description: 'Tipo do documento',
    type: TipoDocumentoDto,
  })
  tipoDocumento: TipoDocumentoDto;

  @ApiProperty({
    description: 'ID da solicitação relacionada',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    required: false,
  })
  solicitacaoId?: string;

  @ApiProperty({
    description: 'ID do cidadão dono do documento',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
  })
  cidadaoId: string;

  @ApiProperty({
    description: 'Data de upload do documento',
    example: '2025-05-17T21:50:07.000Z',
  })
  dataUpload: string;

  @ApiProperty({
    description: 'Status de validação do documento',
    example: 'PENDENTE',
    enum: ['PENDENTE', 'VALIDADO', 'INVALIDO'],
  })
  statusValidacao: string;

  @ApiProperty({
    description: 'Observações sobre a validação',
    example: 'Documento aprovado pela equipe técnica',
    required: false,
  })
  observacoesValidacao?: string;
}

/**
 * DTO para upload de documento
 */
export class UploadDocumentoDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Arquivo a ser enviado',
  })
  file: any;

  @ApiProperty({
    description: 'ID do tipo de documento',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
  })
  tipoDocumentoId: string;

  @ApiProperty({
    description: 'ID da solicitação relacionada',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    required: false,
  })
  solicitacaoId?: string;
}

/**
 * DTO para validação de documento
 */
export class ValidarDocumentoDto {
  @ApiProperty({
    description: 'Status de validação',
    example: 'VALIDADO',
    enum: ['VALIDADO', 'INVALIDO'],
  })
  status: string;

  @ApiProperty({
    description: 'Observações sobre a validação',
    example: 'Documento aprovado após análise',
    required: false,
  })
  observacoes?: string;
}
