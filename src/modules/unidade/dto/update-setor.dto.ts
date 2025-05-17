import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsBoolean } from 'class-validator';

/**
 * DTO para atualização de setor
 */
export class UpdateSetorDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: 'Setor de Atendimento',
    description: 'Nome do setor',
    required: false,
  })
  nome?: string;

  @IsString({ message: 'Descrição deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: 'Responsável pelo atendimento inicial aos cidadãos',
    description: 'Descrição das atividades do setor',
    required: false,
  })
  descricao?: string;

  @IsString({ message: 'Sigla deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: 'SA',
    description: 'Sigla do setor',
    required: false,
  })
  sigla?: string;

  @IsUUID(undefined, { message: 'ID da unidade inválido' })
  @IsOptional()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID da unidade à qual o setor pertence',
    required: false,
  })
  unidadeId?: string;

  @IsBoolean({ message: 'Status deve ser um booleano' })
  @IsOptional()
  @ApiProperty({
    example: true,
    description: 'Status do setor (ativo/inativo)',
    required: false,
  })
  status?: boolean;
}
