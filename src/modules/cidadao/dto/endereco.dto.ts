import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para criação e atualização de endereço
 */
export class EnderecoDto {
  @ApiProperty({
    description: 'ID do endereço (apenas para atualização)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({
    description: 'ID do cidadão',
    required: true,
  })
  @IsUUID()
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  cidadao_id: string;

  @ApiProperty({
    description: 'Logradouro',
    required: true,
    example: 'Rua das Flores',
  })
  @IsNotEmpty({ message: 'Logradouro é obrigatório' })
  @IsString()
  logradouro: string;

  @ApiProperty({
    description: 'Número',
    required: true,
    example: '123',
  })
  @IsNotEmpty({ message: 'Número é obrigatório' })
  @IsString()
  numero: string;

  @ApiProperty({
    description: 'Complemento',
    required: false,
    example: 'Apto 101',
  })
  @IsOptional()
  @IsString()
  complemento?: string;

  @ApiProperty({
    description: 'Bairro',
    required: true,
    example: 'Centro',
  })
  @IsNotEmpty({ message: 'Bairro é obrigatório' })
  @IsString()
  bairro: string;

  @ApiProperty({
    description: 'Cidade',
    required: true,
    example: 'São Paulo',
  })
  @IsNotEmpty({ message: 'Cidade é obrigatória' })
  @IsString()
  cidade: string;

  @ApiProperty({
    description: 'Estado (UF)',
    required: true,
    example: 'SP',
  })
  @Length(2, 2, { message: 'Estado deve conter UF com 2 caracteres' })
  estado: string;

  @ApiProperty({
    description: 'CEP (apenas dígitos)',
    required: true,
    example: '01234567',
  })
  @Length(8, 8, { message: 'CEP deve conter 8 dígitos' })
  cep: string;

  @ApiProperty({
    description: 'Ponto de referência',
    required: false,
    example: 'Próximo ao mercado',
  })
  @IsOptional()
  @IsString()
  ponto_referencia?: string;

  @ApiProperty({
    description: 'Tempo de residência em meses',
    required: false,
    example: 24,
  })
  @IsOptional()
  @IsNumber()
  tempo_de_residencia?: number;

  @ApiProperty({
    description: 'Data de início da vigência do endereço',
    required: true,
    example: '2025-01-01',
  })
  @IsDateString()
  data_inicio_vigencia: string;

  @ApiProperty({
    description: 'Data de fim da vigência do endereço (null para endereço atual)',
    required: false,
    example: null,
  })
  @IsOptional()
  @IsDateString()
  data_fim_vigencia?: string | null;
}
