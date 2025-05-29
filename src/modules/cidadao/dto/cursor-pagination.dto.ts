import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO para paginação baseada em cursor
 * 
 * A paginação baseada em cursor é mais eficiente que a paginação por offset para grandes volumes de dados
 * pois não exige que o banco de dados conte todos os registros anteriores ao offset desejado.
 */
export class CursorPaginationDto {
  @ApiPropertyOptional({
    description: 'Cursor para paginação (geralmente o ID do último item da página anterior)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Direção da ordenação dos resultados',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsString()
  order?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    description: 'Quantidade de itens por página',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Campo usado para ordenação e cursor',
    default: 'created_at',
  })
  @IsOptional()
  @IsString()
  orderBy?: string = 'created_at';
}

/**
 * DTO para resposta com paginação baseada em cursor
 */
export class CursorPaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Itens da página atual',
    isArray: true,
  })
  items: T[];

  @ApiProperty({
    description: 'Metadados da paginação',
    example: {
      count: 10,
      total: 100,
      nextCursor: '550e8400-e29b-41d4-a716-446655440000',
      hasNextPage: true,
    },
  })
  meta: {
    /** Quantidade de itens retornados na página atual */
    count: number;
    
    /** Total de itens disponíveis (pode ser uma estimativa) */
    total: number;
    
    /** Cursor para a próxima página */
    nextCursor?: string;
    
    /** Indica se existe uma próxima página */
    hasNextPage: boolean;
  };
}
