import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsDateString,
  MaxLength,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseDto } from '../../../../shared/dtos/base.dto';

/**
 * DTO para criação de pendência
 *
 * Utilizado para registrar uma nova pendência em uma solicitação
 */
export class CreatePendenciaDto extends BaseDto {
  @ApiProperty({
    description: 'ID da solicitação à qual a pendência está relacionada',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  solicitacao_id: string;

  @ApiProperty({
    description: 'Descrição detalhada da pendência',
    example:
      'Comprovante de residência desatualizado - necessário documento com data dos últimos 3 meses',
    maxLength: 1000,
  })
  @IsNotEmpty({ message: 'Descrição da pendência é obrigatória' })
  @IsString({ message: 'Descrição deve ser um texto' })
  @MaxLength(1000, { message: 'Descrição não pode exceder 1000 caracteres' })
  @Transform(({ value }) => value?.trim())
  descricao: string;

  @ApiPropertyOptional({
    description: 'Prazo para resolução da pendência (formato ISO 8601)',
    example: '2024-12-31',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Prazo deve ser uma data válida no formato ISO 8601' },
  )
  prazo_resolucao?: string;

  @ApiPropertyOptional({
    description: 'Observações adicionais sobre a pendência',
    example: 'Pendência crítica que impede a continuidade do processo',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser um texto' })
  @MaxLength(500, { message: 'Observações não podem exceder 500 caracteres' })
  @Transform(({ value }) => value?.trim())
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Documentos anexados à pendência',
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    example: ['documento1.pdf', 'documento2.jpg'],
  })
  @IsOptional()
  @IsArray({ message: 'Documentos devem ser um array' })
  documentos?: Express.Multer.File[];
}
