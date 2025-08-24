import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

/**
 * Enum para tipos de comprovante disponíveis
 */
export enum TipoComprovante {
  CESTA_BASICA = 'cesta_basica',
  ALUGUEL_SOCIAL = 'aluguel_social',
}

/**
 * DTO para parâmetros de geração de comprovante
 */
export class GerarComprovanteDto {
  @ApiPropertyOptional({
    description: 'Formato de saída do comprovante',
    enum: ['pdf', 'base64'],
    default: 'pdf',
    example: 'pdf',
  })
  @IsOptional()
  @IsString()
  formato?: 'pdf' | 'base64' = 'pdf';
}

/**
 * DTO de resposta para geração de comprovante
 */
export class ComprovanteGeradoDto {
  @ApiProperty({
    description: 'Nome do arquivo gerado',
    example: 'comprovante_pagamento_123456.pdf',
  })
  nomeArquivo: string;

  @ApiProperty({
    description: 'Tipo MIME do arquivo',
    example: 'application/pdf',
  })
  tipoMime: string;

  @ApiProperty({
    description: 'Tamanho do arquivo em bytes',
    example: 245760,
  })
  tamanho: number;

  @ApiProperty({
    description: 'Data de geração do comprovante',
    example: '2024-01-15T10:30:00.000Z',
  })
  dataGeracao: Date;

  @ApiProperty({
    description: 'Tipo de comprovante gerado',
    enum: TipoComprovante,
    example: TipoComprovante.CESTA_BASICA,
  })
  tipoComprovante: TipoComprovante;

  @ApiPropertyOptional({
    description: 'Conteúdo do arquivo em base64 (apenas quando formato=base64)',
    example: 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCg==',
  })
  conteudoBase64?: string;
}