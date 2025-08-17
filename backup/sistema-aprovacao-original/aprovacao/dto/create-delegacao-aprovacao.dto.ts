import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseDto } from '../../../shared/dtos/base.dto';
import {
  CREATE,
  UPDATE,
} from '../../../shared/validators/validation-groups';

/**
 * DTO para criação de delegação de aprovação
 *
 * Define a estrutura de dados necessária para criar uma nova
 * delegação de aprovação no sistema.
 */
export class CreateDelegacaoAprovacaoDto extends BaseDto {
  @ApiProperty({
    description: 'ID do aprovador que está delegando',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({
    message: 'O ID do aprovador é obrigatório',
    groups: [CREATE],
  })
  @IsUUID('4', {
    message: 'O ID do aprovador deve ser um UUID válido',
    groups: [CREATE, UPDATE],
  })
  aprovador_id: string;

  @ApiProperty({
    description: 'ID do usuário que receberá a delegação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({
    message: 'O ID do delegado é obrigatório',
    groups: [CREATE],
  })
  @IsUUID('4', {
    message: 'O ID do delegado deve ser um UUID válido',
    groups: [CREATE, UPDATE],
  })
  delegado_id: string;

  @ApiProperty({
    description: 'Data de início da delegação',
    example: '2023-01-01T00:00:00Z',
  })
  @IsNotEmpty({
    message: 'A data de início é obrigatória',
    groups: [CREATE],
  })
  @IsDateString(
    {},
    {
      message: 'A data de início deve estar em formato ISO',
      groups: [CREATE, UPDATE],
    },
  )
  data_inicio: Date;

  @ApiProperty({
    description: 'Data de fim da delegação',
    example: '2023-12-31T23:59:59Z',
  })
  @IsNotEmpty({
    message: 'A data de fim é obrigatória',
    groups: [CREATE],
  })
  @IsDateString(
    {},
    {
      message: 'A data de fim deve estar em formato ISO',
      groups: [CREATE, UPDATE],
    },
  )
  data_fim: Date;

  @ApiPropertyOptional({
    description: 'Motivo da delegação',
    example: 'Férias do aprovador titular',
  })
  @IsOptional({ groups: [CREATE, UPDATE] })
  @IsString({
    message: 'O motivo deve ser uma string',
    groups: [CREATE, UPDATE],
  })
  @MaxLength(500, {
    message: 'O motivo deve ter no máximo 500 caracteres',
    groups: [CREATE, UPDATE],
  })
  motivo?: string;

  @ApiPropertyOptional({
    description: 'Se a delegação está ativa',
    example: true,
    default: true,
  })
  @IsOptional({ groups: [CREATE, UPDATE] })
  @IsBoolean({
    message: 'O campo ativo deve ser um booleano',
    groups: [CREATE, UPDATE],
  })
  ativo?: boolean;

  @ApiPropertyOptional({
    description: 'Observações adicionais sobre a delegação',
    example: 'Delegação temporária para período de ausência',
  })
  @IsOptional({ groups: [CREATE, UPDATE] })
  @IsString({
    message: 'As observações devem ser uma string',
    groups: [CREATE, UPDATE],
  })
  @MaxLength(1000, {
    message: 'As observações devem ter no máximo 1000 caracteres',
    groups: [CREATE, UPDATE],
  })
  observacoes?: string;
}