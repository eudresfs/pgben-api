import { ApiProperty } from '@nestjs/swagger';

export class ComprovanteResponseDto {
  @ApiProperty({
    description: 'ID único do comprovante',
    example: 'uuid-v4',
  })
  id: string;

  @ApiProperty({
    description: 'ID do pagamento relacionado',
    example: 'uuid-v4',
  })
  pagamento_id: string;

  @ApiProperty({
    description: 'Nome original do arquivo',
    example: 'comprovante_pagamento.pdf',
  })
  nome_original: string;

  @ApiProperty({
    description: 'Tamanho do arquivo em bytes',
    example: 1024000,
  })
  tamanho: number;

  @ApiProperty({
    description: 'Tipo MIME do arquivo',
    example: 'application/pdf',
  })
  mimetype: string;

  @ApiProperty({
    description: 'Data de upload do comprovante',
    example: '2024-01-15T10:30:00Z',
  })
  data_upload: Date;

  @ApiProperty({
    description: 'Observações sobre o comprovante',
    example: 'Comprovante de transferência bancária',
    required: false,
  })
  observacoes?: string;

  @ApiProperty({
    description: 'ID do usuário que fez o upload',
    example: 'uuid-v4',
  })
  usuario_upload_id: string;

  @ApiProperty({
    description: 'Hash SHA256 do arquivo',
    example: 'a1b2c3d4e5f6...',
    required: false,
  })
  hash_arquivo?: string;

  @ApiProperty({
    description: 'URL pública do arquivo (se disponível)',
    example: 'https://storage.example.com/comprovantes/arquivo.pdf',
    required: false,
  })
  url_publica?: string;

  @ApiProperty({
    description: 'Metadados do arquivo',
    example: {
      deteccao_mime: {
        mime_declarado: 'application/pdf',
        mime_detectado: 'application/pdf',
        extensao_detectada: 'pdf',
      },
      upload_info: {
        ip: 'sistema',
        user_agent: 'comprovante-service',
      },
    },
    required: false,
  })
  metadados?: any;

  @ApiProperty({
    description: 'Descrição do comprovante',
    example: 'Comprovante de pagamento - documento.pdf',
    required: false,
  })
  descricao?: string;
}
