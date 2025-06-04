import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Schemas Swagger para comprovantes de pagamento
 *
 * Define os schemas utilizados na documentação Swagger para
 * as operações relacionadas a comprovantes de pagamento.
 *
 * @author Equipe PGBen
 */

/**
 * Schema para upload de comprovante
 */
export class ComprovanteUploadDto {
  @ApiProperty({
    description: 'Arquivo do comprovante de pagamento',
    type: 'string',
    format: 'binary',
  })
  arquivo: any;

  @ApiPropertyOptional({
    description: 'Descrição do comprovante',
    example: 'Comprovante de transferência bancária',
    type: String,
  })
  descricao?: string;
}

/**
 * Schema para resposta de comprovante
 */
export class ComprovanteResponseDto {
  @ApiProperty({
    description: 'ID único do comprovante',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String,
  })
  id: string;

  @ApiProperty({
    description: 'ID do pagamento associado ao comprovante',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String,
  })
  pagamentoId: string;

  @ApiProperty({
    description: 'ID do documento no sistema de armazenamento',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String,
  })
  documentoId: string;

  @ApiProperty({
    description: 'Nome do arquivo',
    example: 'comprovante_pagamento_20250518.pdf',
    type: String,
  })
  nomeArquivo: string;

  @ApiProperty({
    description: 'Tipo MIME do arquivo',
    example: 'application/pdf',
    type: String,
  })
  tipoArquivo: string;

  @ApiProperty({
    description: 'Tamanho do arquivo em bytes',
    example: 245789,
    type: Number,
  })
  tamanhoArquivo: number;

  @ApiProperty({
    description: 'URL para download do arquivo',
    example:
      'https://api.pgben.natal.rn.gov.br/documentos/5f8d3b4e3b4f3b2d3c2e1d2f/download',
    type: String,
  })
  urlDownload: string;

  @ApiProperty({
    description: 'ID do usuário que enviou o comprovante',
    example: '5f8d3b4e3b4f3b2d3c2e1d2f',
    type: String,
  })
  uploadedBy: string;

  @ApiPropertyOptional({
    description: 'Descrição do comprovante',
    example: 'Comprovante de transferência bancária',
    type: String,
  })
  descricao?: string;

  @ApiProperty({
    description: 'Data de criação do registro',
    example: '2025-05-18T12:30:00.000Z',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do registro',
    example: '2025-05-18T12:30:00.000Z',
    type: Date,
  })
  updatedAt: Date;
}

/**
 * Schema para remoção de comprovante
 */
export class ComprovanteRemocaoDto {
  @ApiProperty({
    description: 'Motivo da remoção do comprovante',
    example: 'Documento incorreto ou ilegível',
    type: String,
  })
  motivo: string;
}

/**
 * Schema para resposta de lista de comprovantes
 */
export class ComprovantesResponseDto {
  @ApiProperty({
    description: 'Lista de comprovantes',
    type: [ComprovanteResponseDto],
    isArray: true,
  })
  items: ComprovanteResponseDto[];

  @ApiProperty({
    description: 'Total de registros encontrados',
    example: 3,
    type: Number,
  })
  total: number;
}
