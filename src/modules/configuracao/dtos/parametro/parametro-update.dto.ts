import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO para atualização de um parâmetro de configuração existente.
 * Permite atualizar apenas o valor, descrição e categoria.
 */
export class ParametroUpdateDto {
  @ApiProperty({
    description: 'Valor do parâmetro (será convertido conforme o tipo)',
    example: 'Sistema de Gestão de Benefícios',
  })
  @IsNotEmpty({ message: 'O valor é obrigatório' })
  @IsString({ message: 'O valor deve ser uma string' })
  valor: string;

  @ApiProperty({
    description: 'Descrição do parâmetro, explicando seu propósito e uso',
    example: 'Nome do sistema exibido na interface',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser uma string' })
  @MaxLength(500, { message: 'A descrição deve ter no máximo 500 caracteres' })
  descricao?: string;

  @ApiProperty({
    description: 'Categoria para agrupamento lógico dos parâmetros',
    example: 'sistema',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'A categoria deve ser uma string' })
  @MaxLength(100, { message: 'A categoria deve ter no máximo 100 caracteres' })
  categoria?: string;
}
