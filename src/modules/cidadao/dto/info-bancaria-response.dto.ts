import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { TipoConta, TipoChavePix } from '../../../enums/info-bancaria.enum';

/**
 * DTO de resposta para informações bancárias
 */
export class InfoBancariaResponseDto {
  @ApiProperty({
    description: 'ID das informações bancárias',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'ID do cidadão',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  cidadao_id: string;

  @ApiProperty({
    description: 'Código do banco',
    example: '001',
  })
  @Expose()
  banco: string;

  @ApiProperty({
    description: 'Nome do banco',
    example: 'Banco do Brasil S.A.',
  })
  @Expose()
  nome_banco: string;

  @ApiProperty({
    description: 'Número da agência',
    example: '1234-5',
  })
  @Expose()
  agencia: string;

  @ApiProperty({
    description: 'Número da conta',
    example: '12345678-9',
  })
  @Expose()
  conta: string;

  @ApiProperty({
    description: 'Tipo da conta bancária',
    enum: TipoConta,
    example: TipoConta.POUPANCA_SOCIAL,
  })
  @Expose()
  tipo_conta: TipoConta;

  @ApiPropertyOptional({
    description: 'Chave PIX',
    example: '12345678901',
  })
  @Expose()
  chave_pix?: string;

  @ApiPropertyOptional({
    description: 'Tipo da chave PIX',
    enum: TipoChavePix,
    example: TipoChavePix.CPF,
  })
  @Expose()
  tipo_chave_pix?: TipoChavePix;

  @ApiProperty({
    description: 'Status ativo da conta',
    example: true,
  })
  @Expose()
  ativo: boolean;

  @ApiPropertyOptional({
    description: 'Observações sobre a conta bancária',
    example: 'Conta poupança social para recebimento de benefícios',
  })
  @Expose()
  observacoes?: string;

  @ApiProperty({
    description: 'Data de criação',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  created_at: Date;

  @ApiProperty({
    description: 'Data de última atualização',
    example: '2024-01-15T10:30:00Z',
  })
  @Expose()
  updated_at: Date;
}
