import {
  IsOptional,
  IsEnum,
  IsString,
  IsBoolean,
  IsDateString,
  IsNumber,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatusNotificacaoProcessamento } from '../../../entities/notification.entity';

/**
 * DTO para filtros avançados de notificações
 * Centraliza todas as opções de filtro e ordenação disponíveis
 */
export class FiltrosNotificacaoDto {
  @ApiPropertyOptional({
    description: 'Página atual',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Página deve ser um número' })
  @Min(1, { message: 'Página deve ser maior que 0' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Itens por página',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limite deve ser um número' })
  @Min(1, { message: 'Limite deve ser maior que 0' })
  @Max(100, { message: 'Limite máximo é 100 itens por página' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filtro por status da notificação',
    enum: StatusNotificacaoProcessamento,
    example: StatusNotificacaoProcessamento.NAO_LIDA,
  })
  @IsOptional()
  @IsEnum(StatusNotificacaoProcessamento, {
    message: 'Status deve ser um valor válido',
  })
  status?: StatusNotificacaoProcessamento;

  @ApiPropertyOptional({
    description: 'Filtro por tipo do template',
    example: 'sistema',
    enum: ['sistema', 'solicitacao', 'pendencia', 'aprovacao', 'liberacao', 'alerta', 'urgente'],
  })
  @IsOptional()
  @IsString({ message: 'Tipo deve ser uma string' })
  tipo?: string;

  @ApiPropertyOptional({
    description: 'Filtro por categoria do template',
    example: 'aprovacao',
  })
  @IsOptional()
  @IsString({ message: 'Categoria deve ser uma string' })
  categoria?: string;

  @ApiPropertyOptional({
    description: 'Filtro por prioridade do template',
    example: 'alta',
    enum: ['baixa', 'normal', 'alta', 'urgente'],
  })
  @IsOptional()
  @IsString({ message: 'Prioridade deve ser uma string' })
  @IsIn(['baixa', 'normal', 'alta', 'urgente'], {
    message: 'Prioridade deve ser: baixa, normal, alta ou urgente',
  })
  prioridade?: string;

  @ApiPropertyOptional({
    description: 'Data de início para filtro por período (formato: YYYY-MM-DD)',
    example: '2024-01-01',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de início deve estar no formato YYYY-MM-DD' })
  dataInicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim para filtro por período (formato: YYYY-MM-DD)',
    example: '2024-12-31',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de fim deve estar no formato YYYY-MM-DD' })
  dataFim?: string;

  @ApiPropertyOptional({
    description: 'Filtrar apenas notificações lidas (true) ou não lidas (false)',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'Lidas deve ser um valor booleano' })
  lidas?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir notificações arquivadas',
    default: false,
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'Arquivadas deve ser um valor booleano' })
  arquivadas?: boolean = false;

  @ApiPropertyOptional({
    description: 'Campo para ordenação',
    example: 'created_at',
    enum: ['created_at', 'data_leitura', 'prioridade', 'status'],
  })
  @IsOptional()
  @IsString({ message: 'Campo de ordenação deve ser uma string' })
  @IsIn(['created_at', 'data_leitura', 'prioridade', 'status'], {
    message: 'Campo de ordenação deve ser: created_at, data_leitura, prioridade ou status',
  })
  ordenarPor?: string = 'created_at';

  @ApiPropertyOptional({
    description: 'Direção da ordenação',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString({ message: 'Ordem deve ser uma string' })
  @IsIn(['ASC', 'DESC'], {
    message: 'Ordem deve ser ASC ou DESC',
  })
  ordem?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    description: 'Busca textual no assunto e corpo do template',
    example: 'aprovação',
  })
  @IsOptional()
  @IsString({ message: 'Busca deve ser uma string' })
  busca?: string;
}

/**
 * DTO para resposta da listagem de notificações
 * Inclui metadados sobre filtros aplicados e estatísticas
 */
export class RespostaListagemNotificacaoDto {
  @ApiPropertyOptional({
    description: 'Lista de notificações',
    type: 'array',
  })
  items: any[];

  @ApiPropertyOptional({
    description: 'Metadados da paginação e filtros',
    example: {
      total: 150,
      page: 1,
      limit: 10,
      pages: 15,
      filtros_aplicados: {
        status: 'nao_lida',
        tipo: 'sistema',
        categoria: null,
        prioridade: 'alta',
        dataInicio: null,
        dataFim: null,
        lidas: false,
        arquivadas: false,
        busca: null,
      },
      estatisticas: {
        nao_lidas: 25,
        arquivadas: 5,
        total_geral: 150,
      },
      ordenacao: {
        campo: 'created_at',
        direcao: 'DESC',
      },
    },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    filtros_aplicados: {
      status?: StatusNotificacaoProcessamento;
      tipo?: string;
      categoria?: string;
      prioridade?: string;
      dataInicio?: Date;
      dataFim?: Date;
      lidas?: boolean;
      arquivadas?: boolean;
      busca?: string;
    };
    estatisticas: {
      nao_lidas: number;
      arquivadas: number;
      total_geral: number;
    };
    ordenacao: {
      campo: string;
      direcao: string;
    };
  };
}