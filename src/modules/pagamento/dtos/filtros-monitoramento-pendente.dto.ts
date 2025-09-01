import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';

/**
 * DTO para filtros de pagamentos pendentes de monitoramento
 * Estende PaginationParamsDto para incluir suporte a paginação
 */
export class FiltrosMonitoramentoPendenteDto extends PaginationParamsDto {
  /**
   * Filtro por bairro do beneficiário
   * @example "Centro"
   */
  @ApiPropertyOptional({
    description: 'Filtro por bairro do beneficiário',
    example: 'Centro',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'O bairro deve ser uma string' })
  @Length(1, 100, { message: 'O bairro deve ter entre 1 e 100 caracteres' })
  bairro?: string;

  /**
   * Filtro por CPF do beneficiário (apenas números)
   * @example "12345678901"
   */
  @ApiPropertyOptional({
    description: 'Filtro por CPF do beneficiário (apenas números)',
    example: '12345678901',
    type: String,
    pattern: '^[0-9]{11}$',
  })
  @IsOptional()
  @IsString({ message: 'O CPF deve ser uma string' })
  @Length(11, 11, { message: 'O CPF deve ter exatamente 11 dígitos' })
  cpf?: string;
}