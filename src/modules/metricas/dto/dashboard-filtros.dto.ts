import { IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * DTO para filtros padronizados do dashboard
 *
 * Todos os endpoints de métricas devem aceitar estes filtros
 * e aplicá-los de forma consistente com o sistema de escopo
 */
export class DashboardFiltrosDto {
  @ApiPropertyOptional({
    description: 'ID da unidade para filtrar os dados',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'unidade deve ser um UUID válido' })
  unidade?: string;

  @ApiPropertyOptional({
    description: 'ID do benefício para filtrar os dados',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'beneficio deve ser um UUID válido' })
  beneficio?: string;

  @ApiPropertyOptional({
    description: 'Nome do bairro para filtrar os dados',
    example: 'Centro',
  })
  @IsOptional()
  @IsString({ message: 'bairro deve ser uma string' })
  @Transform(({ value }) => value?.trim())
  bairro?: string;

  @ApiPropertyOptional({
    description: 'Status da solicitação para filtrar os dados',
    example: 'aprovado',
    enum: [
      'pendente',
      'em_analise',
      'aprovado',
      'rejeitado',
      'suspenso',
      'cancelado',
    ],
  })
  @IsOptional()
  @IsString({ message: 'status deve ser uma string' })
  status?: string;

  @ApiPropertyOptional({
    description: 'Data de início do período (formato ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dataInicio deve ser uma data válida' })
  dataInicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim do período (formato ISO 8601)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dataFim deve ser uma data válida' })
  dataFim?: string;
}
