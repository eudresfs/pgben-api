import { IsNotEmpty, IsString, Length, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CPFValidator } from '../validators/cpf-validator';

/**
 * DTO para verificação de conflito de papéis
 */
export class VerificacaoConflitoPapelDto {
  @ApiProperty({
    description: 'CPF do cidadão a ser verificado',
    example: '12345678901',
    required: true
  })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @IsString({ message: 'CPF deve ser uma string' })
  @Length(11, 14, { message: 'CPF deve ter entre 11 e 14 caracteres' })
  @Validate(CPFValidator, { message: 'CPF inválido' })
  cpf: string;
}

/**
 * DTO para resposta de verificação de conflito de papéis
 */
export class VerificacaoConflitoPapelResponseDto {
  @ApiProperty({
    description: 'Indica se existe conflito de papéis',
    example: true
  })
  temConflito: boolean;

  @ApiProperty({
    description: 'Tipo de papel atual do cidadão, se houver',
    example: 'BENEFICIARIO',
    required: false
  })
  tipoPapelAtual?: string;

  @ApiProperty({
    description: 'ID da composição familiar, se o cidadão estiver em uma',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false
  })
  composicaoFamiliarId?: string;

  @ApiProperty({
    description: 'ID do cidadão, se encontrado',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false
  })
  cidadaoId?: string;

  @ApiProperty({
    description: 'Detalhes adicionais sobre o resultado da verificação',
    example: 'Cidadão é beneficiário e também está na composição familiar do cidadão X',
    required: false
  })
  detalhes?: string;
}
