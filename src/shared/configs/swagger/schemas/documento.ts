import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para upload de documento
 */
export class UploadDocumentoDto {
  @ApiProperty({
    description: 'Tipo do documento sendo enviado',
    example: 'COMPROVANTE_RENDA',
    enum: [
      'CPF',
      'RG',
      'COMPROVANTE_RESIDENCIA',
      'COMPROVANTE_RENDA',
      'CERTIDAO_NASCIMENTO',
      'CERTIDAO_CASAMENTO',
      'DECLARACAO_MEDICA',
      'LAUDO_MEDICO',
      'COMPROVANTE_ESCOLARIDADE',
      'CARTEIRA_TRABALHO',
      'EXTRATO_BANCARIO',
      'CONTA_LUZ',
      'CONTA_AGUA',
      'IPTU',
      'CONTRATO_ALUGUEL',
      'DECLARACAO_ESCOLA',
      'OUTROS'
    ],
    type: 'string'
  })
  tipoDocumento: string;

  @ApiProperty({
    description: 'Arquivo do documento (multipart/form-data)',
    type: 'string',
    format: 'binary'
  })
  arquivo: any;

  @ApiPropertyOptional({
    description: 'Descrição adicional do documento',
    example: 'Comprovante de renda referente ao mês de janeiro/2025',
    type: 'string',
    maxLength: 200
  })
  descricao?: string;

  @ApiPropertyOptional({
    description: 'ID da solicitação à qual o documento está relacionado',
    example: '507f1f77bcf86cd799439013',
    type: 'string'
  })
  solicitacaoId?: string;

  @ApiPropertyOptional({
    description: 'ID do cidadão proprietário do documento',
    example: '507f1f77bcf86cd799439012',
    type: 'string'
  })
  cidadaoId?: string;
}

/**
 * DTO para resposta de documento
 */
export class DocumentoResponseDto {
  @ApiProperty({
    description: 'Identificador único do documento',
    example: '507f1f77bcf86cd799439015',
    type: 'string'
  })
  id: string;

  @ApiProperty({
    description: 'Nome original do arquivo',
    example: 'comprovante_renda_janeiro_2025.pdf',
    type: 'string'
  })
  nomeOriginal: string;

  @ApiProperty({
    description: 'Nome do arquivo no sistema de armazenamento',
    example: '2025/01/18/507f1f77bcf86cd799439015_comprovante_renda.pdf',
    type: 'string'
  })
  nomeArquivo: string;

  @ApiProperty({
    description: 'Tipo MIME do arquivo',
    example: 'application/pdf',
    type: 'string'
  })
  mimeType: string;

  @ApiProperty({
    description: 'Tamanho do arquivo em bytes',
    example: 2048576,
    type: 'integer',
    minimum: 0
  })
  tamanho: number;

  @ApiProperty({
    description: 'Tipo do documento',
    example: 'COMPROVANTE_RENDA',
    enum: [
      'CPF',
      'RG', 
      'COMPROVANTE_RESIDENCIA',
      'COMPROVANTE_RENDA',
      'CERTIDAO_NASCIMENTO',
      'CERTIDAO_CASAMENTO',
      'DECLARACAO_MEDICA',
      'LAUDO_MEDICO',
      'COMPROVANTE_ESCOLARIDADE',
      'CARTEIRA_TRABALHO',
      'EXTRATO_BANCARIO',
      'CONTA_LUZ',
      'CONTA_AGUA',
      'IPTU',
      'CONTRATO_ALUGUEL',
      'DECLARACAO_ESCOLA',
      'OUTROS'
    ],
    type: 'string'
  })
  tipoDocumento: string;

  @ApiProperty({
    description: 'Status de validação do documento',
    example: 'PENDENTE',
    enum: ['PENDENTE', 'VALIDADO', 'REJEITADO', 'EXPIRADO'],
    type: 'string'
  })
  statusValidacao: string;

  @ApiPropertyOptional({
    description: 'Descrição adicional do documento',
    example: 'Comprovante de renda referente ao mês de janeiro/2025',
    type: 'string'
  })
  descricao?: string;

  @ApiPropertyOptional({
    description: 'ID da solicitação relacionada',
    example: '507f1f77bcf86cd799439013',
    type: 'string'
  })
  solicitacaoId?: string;

  @ApiPropertyOptional({
    description: 'ID do cidadão proprietário',
    example: '507f1f77bcf86cd799439012',
    type: 'string'
  })
  cidadaoId?: string;

  @ApiPropertyOptional({
    description: 'ID do usuário que fez o upload',
    example: '507f1f77bcf86cd799439014',
    type: 'string'
  })
  uploadedBy?: string;

  @ApiPropertyOptional({
    description: 'Nome do usuário que fez o upload',
    example: 'João Silva Santos',
    type: 'string'
  })
  nomeUploader?: string;

  @ApiProperty({
    description: 'Data e hora do upload',
    example: '2025-01-18T10:30:00.000Z',
    type: 'string',
    format: 'date-time'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Data e hora da última atualização',
    example: '2025-01-18T10:30:00.000Z',
    type: 'string',
    format: 'date-time'
  })
  updatedAt: string;

  @ApiPropertyOptional({
    description: 'Data de validação do documento',
    example: '2025-01-18T14:30:00.000Z',
    type: 'string',
    format: 'date-time'
  })
  dataValidacao?: string;

  @ApiPropertyOptional({
    description: 'ID do usuário que validou o documento',
    example: '507f1f77bcf86cd799439016',
    type: 'string'
  })
  validadoPor?: string;

  @ApiPropertyOptional({
    description: 'Nome do usuário que validou',
    example: 'Maria Analista Silva',
    type: 'string'
  })
  nomeValidador?: string;

  @ApiPropertyOptional({
    description: 'Motivo da rejeição (quando aplicável)',
    example: 'Documento ilegível, solicitar nova versão',
    type: 'string',
    maxLength: 300
  })
  motivoRejeicao?: string;

  @ApiPropertyOptional({
    description: 'Data de expiração do documento',
    example: '2025-12-31T23:59:59.000Z',
    type: 'string',
    format: 'date-time'
  })
  dataExpiracao?: string;

  @ApiPropertyOptional({
    description: 'Hash MD5 do arquivo para verificação de integridade',
    example: 'd41d8cd98f00b204e9800998ecf8427e',
    type: 'string'
  })
  hashArquivo?: string;

  @ApiProperty({
    description: 'URL para download do documento (temporária e autenticada)',
    example: 'https://storage.example.com/documents/temp/abc123?token=xyz789',
    type: 'string',
    format: 'uri'
  })
  urlDownload: string;
}

/**
 * DTO para validação de documento
 */
export class ValidarDocumentoDto {
  @ApiProperty({
    description: 'Status de validação a ser aplicado',
    example: 'VALIDADO',
    enum: ['VALIDADO', 'REJEITADO'],
    type: 'string'
  })
  statusValidacao: string;

  @ApiPropertyOptional({
    description: 'Motivo da rejeição (obrigatório quando status = REJEITADO)',
    example: 'Documento com qualidade insuficiente para leitura',
    type: 'string',
    maxLength: 300
  })
  motivoRejeicao?: string;

  @ApiPropertyOptional({
    description: 'Observações da validação',
    example: 'Documento válido, informações conferidas',
    type: 'string',
    maxLength: 500
  })
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Data de expiração do documento',
    example: '2025-12-31',
    type: 'string',
    format: 'date'
  })
  dataExpiracao?: string;
}

/**
 * DTO para filtros de busca de documentos
 */
export class FiltroDocumentoDto {
  @ApiPropertyOptional({
    description: 'Filtrar por tipo de documento',
    example: 'COMPROVANTE_RENDA',
    enum: [
      'CPF',
      'RG',
      'COMPROVANTE_RESIDENCIA', 
      'COMPROVANTE_RENDA',
      'CERTIDAO_NASCIMENTO',
      'CERTIDAO_CASAMENTO',
      'DECLARACAO_MEDICA',
      'LAUDO_MEDICO',
      'COMPROVANTE_ESCOLARIDADE',
      'CARTEIRA_TRABALHO',
      'EXTRATO_BANCARIO',
      'CONTA_LUZ',
      'CONTA_AGUA',
      'IPTU',
      'CONTRATO_ALUGUEL',
      'DECLARACAO_ESCOLA',
      'OUTROS'
    ],
    type: 'string'
  })
  tipoDocumento?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por status de validação',
    example: 'PENDENTE',
    enum: ['PENDENTE', 'VALIDADO', 'REJEITADO', 'EXPIRADO'],
    type: 'string'
  })
  statusValidacao?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ID do cidadão',
    example: '507f1f77bcf86cd799439012',
    type: 'string'
  })
  cidadaoId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ID da solicitação',
    example: '507f1f77bcf86cd799439013',
    type: 'string'
  })
  solicitacaoId?: string;

  @ApiPropertyOptional({
    description: 'Data inicial para filtro por período de upload',
    example: '2025-01-01',
    type: 'string',
    format: 'date'
  })
  dataInicio?: string;

  @ApiPropertyOptional({
    description: 'Data final para filtro por período de upload',
    example: '2025-01-31',
    type: 'string',
    format: 'date'
  })
  dataFim?: string;

  @ApiPropertyOptional({
    description: 'Filtrar apenas documentos expirados',
    example: true,
    type: 'boolean'
  })
  apenasExpirados?: boolean;

  @ApiPropertyOptional({
    description: 'Buscar por nome do arquivo',
    example: 'comprovante_renda',
    type: 'string'
  })
  nomeArquivo?: string;
}

/**
 * DTO para resposta de upload múltiplo
 */
export class UploadMultiploResponseDto {
  @ApiProperty({
    description: 'Lista de documentos enviados com sucesso',
    type: [DocumentoResponseDto]
  })
  sucessos: DocumentoResponseDto[];

  @ApiProperty({
    description: 'Lista de erros ocorridos durante o upload',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        arquivo: {
          type: 'string',
          description: 'Nome do arquivo que falhou'
        },
        erro: {
          type: 'string', 
          description: 'Descrição do erro'
        }
      }
    },
    example: [
      {
        arquivo: 'documento_invalido.txt',
        erro: 'Tipo de arquivo não permitido'
      }
    ]
  })
  erros: Array<{
    arquivo: string;
    erro: string;
  }>;

  @ApiProperty({
    description: 'Número total de arquivos processados',
    example: 5,
    type: 'integer'
  })
  totalProcessados: number;

  @ApiProperty({
    description: 'Número de uploads bem-sucedidos',
    example: 4,
    type: 'integer'
  })
  totalSucessos: number;

  @ApiProperty({
    description: 'Número de uploads que falharam',
    example: 1,
    type: 'integer'
  })
  totalErros: number;
}