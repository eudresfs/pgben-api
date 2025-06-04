import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';

/**
 * DTO para conversão de papel de um cidadão
 *
 * Permite converter um cidadão que está na composição familiar de uma solicitação
 * para se tornar o beneficiário principal de uma nova solicitação.
 */
export class ConverterPapelDto {
  @ApiProperty({
    description: 'ID da solicitação onde o cidadão está na composição familiar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'ID da solicitação original é obrigatório' })
  @IsUUID('4', { message: 'ID da solicitação deve ser um UUID válido' })
  solicitacao_origem_id: string;

  @ApiProperty({
    description: 'ID do cidadão a ser convertido de membro para beneficiário',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  @IsUUID('4', { message: 'ID do cidadão deve ser um UUID válido' })
  cidadao_id: string;

  @ApiProperty({
    description: 'ID do tipo de benefício para a nova solicitação',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsNotEmpty({ message: 'ID do tipo de benefício é obrigatório' })
  @IsUUID('4', { message: 'ID do tipo de benefício deve ser um UUID válido' })
  tipo_beneficio_id: string;

  @ApiProperty({
    description: 'ID da unidade para a nova solicitação',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @IsNotEmpty({ message: 'ID da unidade é obrigatório' })
  @IsUUID('4', { message: 'ID da unidade deve ser um UUID válido' })
  unidade_id: string;

  @ApiProperty({
    description: 'Justificativa para a conversão de papel',
    example:
      'Cidadão precisa ser beneficiário devido a mudança na situação familiar',
  })
  @IsNotEmpty({ message: 'Justificativa é obrigatória' })
  @IsString({ message: 'Justificativa deve ser uma string' })
  justificativa: string;

  @ApiProperty({
    description: 'Dados complementares específicos para o tipo de benefício',
    example: { campo1: 'valor1', campo2: 'valor2' },
    required: false,
  })
  @IsOptional()
  dados_complementares?: Record<string, any>;
}
