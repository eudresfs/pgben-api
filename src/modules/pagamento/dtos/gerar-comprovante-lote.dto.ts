import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';

/**
 * DTO para parâmetros de geração de comprovantes em lote
 */
export class GerarComprovanteLoteDto {
  @ApiProperty({
    description: 'Lista de IDs dos pagamentos para gerar comprovantes',
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Deve conter pelo menos um ID de pagamento' })
  @ArrayMaxSize(50, { message: 'Máximo de 50 pagamentos por lote' })
  @IsUUID('4', { each: true, message: 'Cada ID deve ser um UUID válido' })
  pagamento_ids: string[];

  @ApiPropertyOptional({
    description: 'Formato de saída do comprovante',
    enum: ['pdf', 'base64'],
    default: 'pdf',
    example: 'pdf',
  })
  @IsOptional()
  @IsString()
  @IsEnum(['pdf', 'base64'], { message: 'Formato deve ser pdf ou base64' })
  formato?: 'pdf' | 'base64' = 'pdf';
}

/**
 * DTO de resposta para geração de comprovantes em lote
 */
export class ComprovanteLoteGeradoDto {
  @ApiProperty({
    description: 'Nome do arquivo gerado',
    example: 'comprovantes_lote_2024-01-15.pdf',
  })
  nomeArquivo: string;

  @ApiProperty({
    description: 'Tipo MIME do arquivo',
    example: 'application/pdf',
  })
  tipoMime: string;

  @ApiProperty({
    description: 'Tamanho do arquivo em bytes',
    example: 1245760,
  })
  tamanho: number;

  @ApiProperty({
    description: 'Data de geração do lote',
    example: '2024-01-15T10:30:00.000Z',
  })
  dataGeracao: Date;

  @ApiProperty({
    description: 'Quantidade total de comprovantes no lote',
    example: 25,
  })
  totalComprovantes: number;

  @ApiProperty({
    description: 'Lista de IDs dos pagamentos processados com sucesso',
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
    type: [String],
  })
  pagamentosProcessados: string[];

  @ApiProperty({
    description: 'Lista de IDs dos pagamentos que falharam no processamento',
    example: ['123e4567-e89b-12d3-a456-426614174002'],
    type: [String],
  })
  pagamentosFalharam: string[];

  @ApiPropertyOptional({
    description: 'Conteúdo do arquivo em base64 (apenas quando formato=base64)',
    example: 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCg==',
  })
  conteudoBase64?: string;

  @ApiProperty({
    description: 'Detalhes dos erros ocorridos durante o processamento',
    example: {
      '123e4567-e89b-12d3-a456-426614174002': 'Pagamento não encontrado',
    },
    type: 'object',
    additionalProperties: true,
  })
  errosDetalhados: Array<{ pagamentoId: string; erro: string }>;
}