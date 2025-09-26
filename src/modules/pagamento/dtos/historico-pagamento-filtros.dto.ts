import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsDateString,
  IsNumber,
  Min,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoEventoHistoricoEnum } from '../../../enums/tipo-evento-historico.enum';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';

/**
 * DTO para filtros de busca do histórico de pagamentos
 *
 * Define os critérios de filtro disponíveis para busca e listagem
 * do histórico de pagamentos, incluindo paginação e ordenação.
 *
 * @author Equipe PGBen
 */
export class HistoricoPagamentoFiltrosDto {
  @ApiPropertyOptional({
    description: 'ID do pagamento para filtrar histórico',
    example: 'uuid-pagamento-123',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do pagamento deve ser um UUID válido' })
  pagamento_id?: string;

  @ApiPropertyOptional({
    description: 'Tipo de evento para filtrar',
    enum: TipoEventoHistoricoEnum,
    example: TipoEventoHistoricoEnum.ALTERACAO_STATUS,
  })
  @IsOptional()
  @IsEnum(TipoEventoHistoricoEnum, {
    message: 'Tipo de evento deve ser um valor válido do enum TipoEventoHistoricoEnum',
  })
  tipo_evento?: TipoEventoHistoricoEnum;

  @ApiPropertyOptional({
    description: 'Status anterior para filtrar',
    enum: StatusPagamentoEnum,
    example: StatusPagamentoEnum.PENDENTE,
  })
  @IsOptional()
  @IsEnum(StatusPagamentoEnum, {
    message: 'Status anterior deve ser um valor válido do enum StatusPagamentoEnum',
  })
  status_anterior?: StatusPagamentoEnum;

  @ApiPropertyOptional({
    description: 'Status atual para filtrar',
    enum: StatusPagamentoEnum,
    example: StatusPagamentoEnum.LIBERADO,
  })
  @IsOptional()
  @IsEnum(StatusPagamentoEnum, {
    message: 'Status atual deve ser um valor válido do enum StatusPagamentoEnum',
  })
  status_atual?: StatusPagamentoEnum;

  @ApiPropertyOptional({
    description: 'ID do usuário responsável pelo evento',
    example: 'uuid-usuario-123',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário deve ser um UUID válido' })
  usuario_id?: string;

  @ApiPropertyOptional({
    description: 'Data inicial para filtro por período (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data inicial deve estar no formato ISO 8601' })
  data_inicial?: string;

  @ApiPropertyOptional({
    description: 'Data final para filtro por período (ISO 8601)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data final deve estar no formato ISO 8601' })
  data_final?: string;

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
    example: 'data_evento',
  })
  @IsOptional()
  @IsString({ message: 'Campo de ordenação deve ser uma string' })
  sort_by?: string = 'data_evento';

  @ApiPropertyOptional({
    description: 'Direção da ordenação',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString({ message: 'Direção da ordenação deve ser uma string' })
  sort_order?: 'ASC' | 'DESC' = 'DESC';
}