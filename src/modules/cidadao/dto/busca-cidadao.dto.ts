import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, ValidateBy, ValidationOptions, ValidationArguments } from 'class-validator';

/**
 * Validador customizado para garantir que apenas um parâmetro de busca seja fornecido
 */
export function IsOnlyOneSearchParam(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isOnlyOneSearchParam',
      validator: {
        validate(value: any, args: ValidationArguments) {
          const object = args.object as BuscaCidadaoDto;
          const searchParams = [object.id, object.cpf, object.nis, object.telefone, object.nome];
          const definedParams = searchParams.filter(param => param !== undefined && param !== null && param !== '');
          
          return definedParams.length === 1;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Apenas um parâmetro de busca deve ser fornecido por vez (id, cpf, nis, telefone ou nome)';
        },
      },
    },
    validationOptions,
  );
}

/**
 * DTO para busca unificada de cidadão
 * Permite buscar por ID, CPF, NIS, telefone ou nome
 * Apenas um parâmetro deve ser fornecido por vez
 */
export class BuscaCidadaoDto {
  @ApiProperty({
    description: 'ID do cidadão (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID deve ser um UUID válido' })
  @IsOnlyOneSearchParam({ message: 'Apenas um parâmetro de busca deve ser fornecido por vez (id, cpf, nis, telefone ou nome)' })
  id?: string;

  @ApiProperty({
    description: 'CPF do cidadão (com ou sem formatação)',
    example: '12345678901',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'CPF deve ser uma string' })
  cpf?: string;

  @ApiProperty({
    description: 'NIS do cidadão (PIS/PASEP)',
    example: '12345678901',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'NIS deve ser uma string' })
  nis?: string;

  @ApiProperty({
    description: 'Telefone do cidadão (com ou sem formatação)',
    example: '11987654321',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Telefone deve ser uma string' })
  telefone?: string;

  @ApiProperty({
    description: 'Nome do cidadão (busca parcial)',
    example: 'João Silva',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Nome deve ser uma string' })
  nome?: string;

  @ApiProperty({
    description: 'Se deve incluir relacionamentos (papéis e composição familiar)',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  includeRelations?: boolean = false;
}