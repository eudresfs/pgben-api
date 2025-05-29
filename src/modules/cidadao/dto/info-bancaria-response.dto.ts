import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoConta, TipoChavePix } from '../enums/info-bancaria.enum';

/**
 * DTO de resposta para informações bancárias
 */
export class InfoBancariaResponseDto {
  @ApiProperty({
    description: 'ID das informações bancárias',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'ID do cidadão',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  cidadao_id: string;

  @ApiProperty({
    description: 'Código do banco',
    example: '001',
  })
  banco: string;

  @ApiProperty({
    description: 'Nome do banco',
    example: 'Banco do Brasil S.A.',
  })
  nome_banco: string;

  @ApiProperty({
    description: 'Número da agência',
    example: '1234-5',
  })
  agencia: string;

  @ApiProperty({
    description: 'Número da conta',
    example: '12345678-9',
  })
  conta: string;

  @ApiProperty({
    description: 'Tipo da conta bancária',
    enum: TipoConta,
    example: TipoConta.POUPANCA_SOCIAL,
  })
  tipo_conta: TipoConta;

  @ApiPropertyOptional({
    description: 'Chave PIX',
    example: '12345678901',
  })
  chave_pix?: string;

  @ApiPropertyOptional({
    description: 'Tipo da chave PIX',
    enum: TipoChavePix,
    example: TipoChavePix.CPF,
  })
  tipo_chave_pix?: TipoChavePix;

  @ApiProperty({
    description: 'Status ativo da conta',
    example: true,
  })
  ativo: boolean;

  @ApiPropertyOptional({
    description: 'Observações sobre a conta bancária',
    example: 'Conta poupança social para recebimento de benefícios',
  })
  observacoes?: string;

  @ApiProperty({
    description: 'Data de criação',
    example: '2024-01-15T10:30:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Data de última atualização',
    example: '2024-01-15T10:30:00Z',
  })
  updated_at: Date;
}