import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsOptional,
  IsArray,
  IsString,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsUUID,
  Min,
  ArrayMaxSize,
} from 'class-validator';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../../enums/metodo-pagamento.enum';
import { PeriodoPredefinido } from '../../../enums/periodo-predefinido.enum';
import { transformToStringArray } from '../../../common/utils/filtros-transform.util';

/**
 * DTO para geração de relatórios PDF baseados em filtros avançados de pagamentos
 * Substitui a abordagem anterior de receber pagamento_ids diretamente
 * Permite filtrar pagamentos usando os mesmos critérios do endpoint de listagem
 */
export class RelatorioPagamentosFiltrosDto {
  @ApiPropertyOptional({
    description: 'Lista de IDs de unidades para filtrar',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  @Transform(({ value }) => transformToStringArray(value))
  unidades?: string[];

  @ApiPropertyOptional({
    description: 'Lista de status de pagamento para filtrar',
    example: ['PAGO', 'PROCESSADO'],
    enum: StatusPagamentoEnum,
    isArray: true
  })
  @IsOptional()
  @IsArray()
  @IsEnum(StatusPagamentoEnum, { each: true })
  @ArrayMaxSize(20)
  @Transform(({ value }) => transformToStringArray(value))
  status?: StatusPagamentoEnum[];

  @ApiPropertyOptional({
    description: 'Lista de métodos de pagamento para filtrar',
    example: ['PIX', 'TRANSFERENCIA'],
    enum: MetodoPagamentoEnum,
    isArray: true
  })
  @IsOptional()
  @IsArray()
  @IsEnum(MetodoPagamentoEnum, { each: true })
  @ArrayMaxSize(10)
  @Transform(({ value }) => transformToStringArray(value))
  metodos_pagamento?: MetodoPagamentoEnum[];

  @ApiPropertyOptional({
    description: 'Lista de IDs de solicitações para filtrar',
    example: ['990e8400-e29b-41d4-a716-446655440004'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(100)
  @Transform(({ value }) => transformToStringArray(value))
  solicitacoes?: string[];

  @ApiPropertyOptional({
    description: 'Lista de IDs de concessões para filtrar',
    example: ['990e8400-e29b-41d4-a716-446655440004'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(100)
  @Transform(({ value }) => transformToStringArray(value))
  concessoes?: string[];

  @ApiPropertyOptional({
    description: 'Lista de IDs de tipos de benefício para filtrar',
    example: ['990e8400-e29b-41d4-a716-446655440004'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(100)
  @Transform(({ value }) => transformToStringArray(value))
  beneficios?: string[];

  @ApiPropertyOptional({
    description: 'Busca textual em campos relevantes (protocolo, nome do beneficiário, CPF)',
    example: 'João Silva',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Período predefinido para filtro de datas',
    example: 'ultimos_30_dias',
    enum: PeriodoPredefinido,
  })
  @IsOptional()
  @IsEnum(PeriodoPredefinido)
  periodo?: PeriodoPredefinido;

  @ApiPropertyOptional({
    description: 'Data de início para filtro por período de liberação (usado com período personalizado)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim para filtro por período de liberação (usado com período personalizado)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  data_fim?: string;

  @ApiPropertyOptional({
    description: 'Data de início para filtro por período de pagamento',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  data_pagamento_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim para filtro por período de pagamento',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  data_pagamento_fim?: string;

  @ApiPropertyOptional({
    description: 'Valor mínimo do pagamento',
    example: 100.00,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  valor_min?: number;

  @ApiPropertyOptional({
    description: 'Valor máximo do pagamento',
    example: 5000.00,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  valor_max?: number;

  @ApiPropertyOptional({
    description: 'Número da parcela mínima',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  parcela_min?: number;

  @ApiPropertyOptional({
    description: 'Número da parcela máxima',
    example: 12,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  parcela_max?: number;

  @ApiPropertyOptional({
    description: 'Filtrar apenas pagamentos com comprovante',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  com_comprovante?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar apenas pagamentos monitorados',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  monitorado?: boolean;

  @ApiProperty({
    description: 'Observações opcionais para incluir no documento PDF',
    example: 'Beneficiários que receberam 02 parcelas receberam por atraso no envio de recibo do mês anterior.',
    required: false
  })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Campo para ordenação dos pagamentos no relatório',
    example: 'data_liberacao',
    enum: ['data_liberacao', 'data_pagamento', 'valor', 'numero_parcela', 'created_at'],
  })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({
    description: 'Direção da ordenação',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  sort_order?: 'ASC' | 'DESC';

  // Campos de paginação opcionais para compatibilidade com frontend
  // Estes campos são ignorados na geração de relatórios (retorna TUDO por padrão)
  @ApiPropertyOptional({
    description: 'Limite de registros (ignorado em relatórios - retorna todos)',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Offset para paginação (ignorado em relatórios - retorna todos)',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  @ApiPropertyOptional({
    description: 'Número da página (ignorado em relatórios - retorna todos)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;
}