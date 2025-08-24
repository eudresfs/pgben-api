import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseDto } from '../../../../shared/dtos/base.dto';

/**
 * DTO para cancelamento de pendência
 *
 * Utilizado para cancelar uma pendência que não é mais necessária
 */
export class CancelarPendenciaDto extends BaseDto {
  @ApiProperty({
    description: 'Motivo do cancelamento da pendência',
    example: 'Pendência não é mais aplicável devido a mudança nos critérios',
    maxLength: 500,
  })
  @IsNotEmpty({ message: 'Motivo do cancelamento é obrigatório' })
  @IsString({ message: 'Motivo deve ser um texto' })
  @MaxLength(500, { message: 'Motivo não pode exceder 500 caracteres' })
  @Transform(({ value }) => value?.trim())
  motivo_cancelamento: string;

  @ApiPropertyOptional({
    description: 'Observações adicionais sobre o cancelamento',
    example: 'Cancelamento autorizado pela coordenação',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser um texto' })
  @MaxLength(500, { message: 'Observações não podem exceder 500 caracteres' })
  @Transform(({ value }) => value?.trim())
  observacao_cancelamento?: string;
}
