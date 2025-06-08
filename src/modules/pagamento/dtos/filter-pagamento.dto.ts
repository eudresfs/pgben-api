import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';

/**
 * DTO para filtros de busca de pagamentos
 * 
 * Define os critérios de filtro disponíveis para busca e listagem
 * de pagamentos, incluindo paginação e ordenação.
 */
export class FilterPagamentoDto {
  @ApiPropertyOptional({
    description: 'Status do pagamento para filtrar',
    enum: StatusPagamentoEnum,
    example: StatusPagamentoEnum.LIBERADO,
  })
  @IsOptional()
  @IsEnum(StatusPagamentoEnum, {
    message: 'Status deve ser um valor válido do enum StatusPagamentoEnum',
  })
  status?: StatusPagamentoEnum;

  @ApiPropertyOptional({
    description: 'ID da solicitação para filtrar',
    example: 'solicitacao-123',
  })
  @IsOptional()
  @IsString({ message: 'ID da solicitação deve ser uma string' })
  solicitacaoId?: string;

  @ApiPropertyOptional({
    description: 'Data inicial para filtro por período (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data inicial deve estar no formato ISO 8601' })
  dataInicial?: string;

  @ApiPropertyOptional({
    description: 'Data final para filtro por período (ISO 8601)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data final deve estar no formato ISO 8601' })
  dataFinal?: string;

  @ApiPropertyOptional({
    description: 'Método de pagamento para filtrar',
    example: 'pix',
  })
  @IsOptional()
  @IsString({ message: 'Método de pagamento deve ser uma string' })
  metodoPagamento?: string;

  @ApiPropertyOptional({
    description: 'Página para paginação',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Página deve ser um número' })
  @Min(1, { message: 'Página deve ser maior que 0' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Limite de itens por página',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limite deve ser um número' })
  @Min(1, { message: 'Limite deve ser maior que 0' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Campo para ordenação',
    example: 'dataCriacao',
  })
  @IsOptional()
  @IsString({ message: 'Campo de ordenação deve ser uma string' })
  sortBy?: string = 'dataCriacao';

  @ApiPropertyOptional({
    description: 'Direção da ordenação',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString({ message: 'Direção da ordenação deve ser uma string' })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}