import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsUUID, IsOptional, IsString } from 'class-validator';

/**
 * DTO para geração de relatórios PDF baseados em pagamentos
 * Aceita uma lista de IDs de pagamentos e gera PDFs por tipo de benefício
 */
export class RelatorioPagamentosPdfDto {
  @ApiProperty({
    description: 'Lista de IDs de pagamentos para geração dos relatórios PDF',
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001'
    ],
    type: [String],
    isArray: true
  })
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsUUID('4', { each: true })
  pagamento_ids: string[];

  @ApiProperty({
    description: 'Observações opcionais para incluir no documento PDF',
    example: 'Beneficiários que receberam 02 parcelas receberam por atraso no envio de recibo do mês anterior.',
    required: false
  })
  @IsOptional()
  @IsString()
  observacoes?: string;
}