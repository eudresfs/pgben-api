import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ParametroTipoEnum } from '../../enums';

/**
 * DTO para criação de um novo parâmetro de configuração.
 */
export class ParametroCreateDto {
  @ApiProperty({
    description: 'Chave única que identifica o parâmetro',
    example: 'sistema.nome',
    maxLength: 100
  })
  @IsNotEmpty({ message: 'A chave é obrigatória' })
  @IsString({ message: 'A chave deve ser uma string' })
  @MinLength(3, { message: 'A chave deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'A chave deve ter no máximo 100 caracteres' })
  chave: string;

  @ApiProperty({
    description: 'Valor do parâmetro (será convertido conforme o tipo)',
    example: 'Sistema de Gestão de Benefícios'
  })
  @IsNotEmpty({ message: 'O valor é obrigatório' })
  @IsString({ message: 'O valor deve ser uma string' })
  valor: string;

  @ApiProperty({
    description: 'Tipo do parâmetro, que determina como o valor será convertido',
    enum: ParametroTipoEnum,
    example: ParametroTipoEnum.STRING
  })
  @IsNotEmpty({ message: 'O tipo é obrigatório' })
  @IsEnum(ParametroTipoEnum, { message: 'Tipo de parâmetro inválido' })
  tipo: ParametroTipoEnum;

  @ApiProperty({
    description: 'Descrição do parâmetro, explicando seu propósito e uso',
    example: 'Nome do sistema exibido na interface',
    maxLength: 500
  })
  @IsNotEmpty({ message: 'A descrição é obrigatória' })
  @IsString({ message: 'A descrição deve ser uma string' })
  @MaxLength(500, { message: 'A descrição deve ter no máximo 500 caracteres' })
  descricao: string;

  @ApiProperty({
    description: 'Categoria para agrupamento lógico dos parâmetros',
    example: 'sistema',
    maxLength: 100
  })
  @IsNotEmpty({ message: 'A categoria é obrigatória' })
  @IsString({ message: 'A categoria deve ser uma string' })
  @MaxLength(100, { message: 'A categoria deve ter no máximo 100 caracteres' })
  categoria: string;
}
