import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class PaginationParamsDto {
  @ApiPropertyOptional({
    description: 'Optional, defaults to 100',
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10), { toClassOnly: true })
  limit = 100;

  @ApiPropertyOptional({
    description:
      'Número da página (começa em 1). Se informado, sobrescreve o offset',
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Transform(
    ({ value }) =>
      value === undefined || value === '' ? undefined : parseInt(value, 10),
    { toClassOnly: true },
  )
  page?: number;

  @ApiPropertyOptional({
    description:
      'Deslocamento para paginação (padrão: 0). Ignorado se page for informado',
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(
    ({ value }) =>
      value === undefined || value === '' ? undefined : parseInt(value, 10),
    { toClassOnly: true },
  )
  offset = 0;
}
