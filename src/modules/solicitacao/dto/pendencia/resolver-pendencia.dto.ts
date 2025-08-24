import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { BaseDto } from '../../../../shared/dtos/base.dto';

/**
 * DTO para resolução de pendência
 *
 * Utilizado para marcar uma pendência como resolvida
 */
export class ResolverPendenciaDto extends BaseDto {
  @ApiPropertyOptional({
    description: 'Observações adicionais sobre a resolução',
    example: 'Documento validado pelo técnico responsável',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser um texto' })
  @MaxLength(500, { message: 'Observações não podem exceder 500 caracteres' })
  @Transform(({ value }) => value?.trim())
  observacao_resolucao?: string;
}
