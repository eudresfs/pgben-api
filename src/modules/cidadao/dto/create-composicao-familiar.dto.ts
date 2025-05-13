import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, IsDate, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para adicionar membro à composição familiar
 */
export class CreateComposicaoFamiliarDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @ApiProperty({ 
    example: 'João da Silva',
    description: 'Nome completo do membro familiar'
  })
  nome: string;

  @IsString({ message: 'Parentesco deve ser uma string' })
  @IsNotEmpty({ message: 'Parentesco é obrigatório' })
  @ApiProperty({ 
    example: 'filho',
    description: 'Relação de parentesco com o cidadão'
  })
  parentesco: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty({ message: 'Data de nascimento é obrigatória' })
  @ApiProperty({ 
    example: '2010-05-20',
    description: 'Data de nascimento do membro familiar'
  })
  data_nascimento: Date;

  @IsNumber({}, { message: 'Renda deve ser um número' })
  @IsOptional()
  @ApiProperty({ 
    example: 0,
    description: 'Renda mensal do membro familiar',
    required: false
  })
  renda?: number;
}
