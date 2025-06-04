import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CidadaoResponseDto } from './cidadao-response.dto';

/**
 * DTO para resposta com paginação via cursor para Cidadãos
 *
 * A paginação via cursor é mais eficiente para grandes conjuntos de dados,
 * pois não requer contagem total de registros (que pode ser custosa)
 * e não sofre com problemas de consistência quando registros são adicionados/removidos.
 */
export class CursorCidadaoPaginatedResponseDto {
  @ApiProperty({
    type: [CidadaoResponseDto],
    description: 'Lista de cidadãos na página atual',
  })
  @Expose()
  @Type(() => CidadaoResponseDto)
  items: CidadaoResponseDto[];

  @ApiProperty({
    type: 'object',
    properties: {
      count: { type: 'number', example: 10 },
      total: { type: 'number', example: 100 },
      nextCursor: {
        type: 'string',
        example: '550e8400-e29b-41d4-a716-446655440000',
      },
      hasNextPage: { type: 'boolean', example: true },
    },
    description: 'Metadados da paginação',
  })
  @Expose()
  meta: {
    count: number;
    total: number;
    nextCursor?: string;
    hasNextPage: boolean;
  };
}
