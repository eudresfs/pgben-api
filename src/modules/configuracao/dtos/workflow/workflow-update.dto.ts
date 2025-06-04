import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { WorkflowEtapaDto } from './workflow-etapa.dto';

/**
 * DTO para atualização de um workflow de benefício.
 */
export class WorkflowUpdateDto {
  @ApiProperty({
    description: 'Nome do workflow',
    example: 'Fluxo de Aprovação do Auxílio Natalidade',
    maxLength: 200,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'O nome deve ser uma string' })
  @MaxLength(200, { message: 'O nome deve ter no máximo 200 caracteres' })
  nome?: string;

  @ApiProperty({
    description: 'Descrição detalhada do workflow',
    example: 'Processo de aprovação para solicitações de Auxílio Natalidade',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser uma string' })
  @MaxLength(500, { message: 'A descrição deve ter no máximo 500 caracteres' })
  descricao?: string;

  @ApiProperty({
    description: 'Lista de etapas do workflow',
    type: [WorkflowEtapaDto],
  })
  @IsNotEmpty({ message: 'As etapas são obrigatórias' })
  @IsArray({ message: 'As etapas devem estar em um array' })
  @ValidateNested({ each: true })
  @Type(() => WorkflowEtapaDto)
  etapas: WorkflowEtapaDto[];

  @ApiProperty({
    description: 'Status ativo/inativo do workflow',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'O status deve ser um booleano' })
  ativo?: boolean;
}
