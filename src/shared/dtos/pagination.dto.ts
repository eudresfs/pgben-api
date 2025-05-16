import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({
    description: 'Página atual',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Número de itens por página',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total de itens',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Total de páginas',
    example: 10,
  })
  pages: number;

  @ApiProperty({
    description: 'Tem próxima página?',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Tem página anterior?',
    example: false,
  })
  hasPrev: boolean;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Lista de itens',
    isArray: true,
  })
  items: T[];

  @ApiProperty({
    description: 'Metadados da paginação',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;

  constructor(items: T[], meta: PaginationMetaDto) {
    this.items = items;
    this.meta = meta;
  }
}
