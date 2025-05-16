import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsEnum, IsDate, IsNumber, ValidateNested, Validate } from 'class-validator';
import { Type } from 'class-transformer';
import { Sexo } from '../entities/cidadao.entity';
import { CPFValidator } from '../validators/cpf-validator';
import { NISValidator } from '../validators/nis-validator';
import { EnderecoDto } from './create-cidadao.dto';

/**
 * DTO para atualização de cidadão
 */
export class UpdateCidadaoDto {
  [x: string]: any;
  @IsString({ message: 'Nome deve ser uma string' })
  @IsOptional()
  @ApiProperty({ 
    example: 'Maria da Silva',
    description: 'Nome completo do cidadão',
    required: false
  })
  nome?: string;

  @IsString({ message: 'RG deve ser uma string' })
  @IsOptional()
  @ApiProperty({ 
    example: '1234567',
    description: 'RG do cidadão',
    required: false
  })
  rg?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  @ApiProperty({ 
    example: '1985-10-15',
    description: 'Data de nascimento do cidadão',
    required: false
  })
  data_nascimento?: Date;

  @IsEnum(Sexo, { message: 'Sexo inválido' })
  @IsOptional()
  @ApiProperty({ 
    enum: Sexo,
    example: Sexo.FEMININO,
    description: 'Sexo do cidadão',
    required: false
  })
  sexo?: Sexo;

  @IsString({ message: 'NIS deve ser uma string' })
  @IsOptional()
  @Validate(NISValidator, { message: 'NIS inválido' })
  @ApiProperty({ 
    example: '12345678901',
    description: 'Número de Identificação Social (NIS)',
    required: false
  })
  nis?: string;

  @IsString({ message: 'Telefone deve ser uma string' })
  @IsOptional()
  @ApiProperty({ 
    example: '(84) 98765-4321',
    description: 'Telefone do cidadão',
    required: false
  })
  telefone?: string;

  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  @ApiProperty({ 
    example: 'maria.silva@email.com',
    description: 'Email do cidadão',
    required: false
  })
  email?: string;

  @ValidateNested()
  @Type(() => EnderecoDto)
  @IsOptional()
  @ApiProperty({ 
    type: EnderecoDto,
    description: 'Endereço do cidadão',
    required: false
  })
  endereco?: EnderecoDto;

  @IsNumber({}, { message: 'Renda deve ser um número' })
  @IsOptional()
  @ApiProperty({ 
    example: 1200.50,
    description: 'Renda mensal do cidadão',
    required: false
  })
  renda?: number;
}
