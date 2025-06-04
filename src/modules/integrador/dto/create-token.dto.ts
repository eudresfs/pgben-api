import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO para criação de um novo token de integrador.
 * Define os parâmetros necessários para geração de um token de acesso.
 */
export class CreateTokenDto {
  @ApiProperty({
    description: 'Nome do token (identificação para gestão)',
    example: 'Token para integração com Sistema Financeiro',
  })
  @IsNotEmpty({ message: 'O nome do token é obrigatório' })
  @IsString({ message: 'O nome do token deve ser uma string' })
  nome: string;

  @ApiPropertyOptional({
    description: 'Descrição do token',
    example: 'Acesso para consulta de benefícios e cidadãos',
  })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser uma string' })
  descricao?: string;

  @ApiPropertyOptional({
    description: 'Lista de escopos de permissão para este token',
    example: ['read:cidadaos', 'read:beneficios'],
  })
  @IsOptional()
  @IsArray({ message: 'Os escopos devem ser um array' })
  escopos?: string[];

  @ApiPropertyOptional({
    description:
      'Número de dias de validade do token (se não informado, o token não expira)',
    example: 365,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Os dias de validade devem ser um número inteiro' })
  @Min(1, { message: 'Os dias de validade devem ser maior que zero' })
  diasValidade?: number;

  @ApiPropertyOptional({
    description: 'Indica se o token deve ser criado sem expiração',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'O campo semExpiracao deve ser um booleano' })
  semExpiracao?: boolean = false;
}
