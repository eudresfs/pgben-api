import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsString,
  MaxLength,
  IsUUID,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoConta, TipoChavePix } from '../../../enums/info-bancaria.enum';

/**
 * DTO para criação de informações bancárias
 */
export class CreateInfoBancariaDto {
  @ApiProperty({
    description: 'ID do cidadão',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  @IsUUID('4', { message: 'ID do cidadão deve ser um UUID válido' })
  cidadao_id: string;

  @ApiProperty({
    description: 'Código do banco (3 dígitos)',
    example: '001',
    maxLength: 3,
  })
  @IsOptional()
  @IsString({ message: 'Código do banco deve ser uma string' })
  @Matches(/^\d{3}$/, { message: 'Código do banco deve ter 3 dígitos' })
  banco?: string;

  @ApiProperty({
    description: 'Nome do banco',
    example: 'Banco do Brasil S.A.',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Nome do banco deve ser uma string' })
  @MaxLength(100, {
    message: 'Nome do banco deve ter no máximo 100 caracteres',
  })
  nome_banco?: string;

  @ApiProperty({
    description: 'Número da agência',
    example: '1234-5',
    maxLength: 10,
  })
  @IsOptional()
  @IsString({ message: 'Agência deve ser uma string' })
  @Matches(/^\d{4,5}(-\d)?$/, {
    message: 'Agência deve ter formato válido (ex: 1234 ou 1234-5)',
  })
  agencia?: string;

  @ApiProperty({
    description: 'Número da conta',
    example: '12345678-9',
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: 'Conta deve ser uma string' })
  @Matches(/^\d{1,15}(-\d)?$/, { message: 'Conta deve ter formato válido' })
  conta?: string;

  @ApiProperty({
    description: 'Tipo da conta bancária',
    enum: TipoConta,
    example: TipoConta.POUPANCA_SOCIAL,
  })
  @IsEnum(TipoConta, { message: 'Tipo de conta inválido' })
  @IsOptional()
  tipo_conta?: TipoConta;

  @ApiPropertyOptional({
    description: 'Chave PIX',
    example: '12345678901',
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'Chave PIX é obrigatória' })
  @IsString({ message: 'Chave PIX deve ser uma string' })
  @MaxLength(255, { message: 'Chave PIX deve ter no máximo 255 caracteres' })
  chave_pix: string;

  @ApiPropertyOptional({
    description: 'Tipo da chave PIX',
    enum: TipoChavePix,
    example: TipoChavePix.CPF,
  })
  @IsNotEmpty({ message: 'Tipo da chave PIX é obrigatório' })
  @IsEnum(TipoChavePix, { message: 'Tipo de chave PIX inválido' })
  tipo_chave_pix?: TipoChavePix;

  @ApiPropertyOptional({
    description: 'Observações sobre a conta bancária',
    example: 'Conta poupança social para recebimento de benefícios',
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser uma string' })
  observacoes?: string;
}
