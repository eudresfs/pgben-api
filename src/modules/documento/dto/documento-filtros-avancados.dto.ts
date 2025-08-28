import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsNumber, Min, IsArray, IsEnum, IsDate, IsUUID, IsIn } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import { IResultadoFiltros, IFiltrosAvancados, IPeriodoCalculado } from '../../../common/interfaces/filtros-avancados.interface';
import { TipoDocumentoEnum } from '../../../enums/tipo-documento.enum';
import { Documento } from '../../../entities/documento.entity';
import { transformToUUIDArray } from '../../../common/utils/filtros-transform.util';

/**
 * DTO para filtros avançados de documentos
 * Permite busca com múltiplos critérios, paginação e ordenação
 */
export class DocumentoFiltrosAvancadosDto extends PaginationParamsDto {
  @ApiPropertyOptional({
    description: 'Tipos de documento para filtrar',
    enum: TipoDocumentoEnum,
    isArray: true,
    example: [TipoDocumentoEnum.RG, TipoDocumentoEnum.CPF],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TipoDocumentoEnum, { each: true })
  @Transform(transformToUUIDArray)
  tipo?: TipoDocumentoEnum[];

  @ApiPropertyOptional({
    description: 'Status de verificação dos documentos',
    type: [Boolean],
    example: [true, false],
  })
  @IsOptional()
  @IsArray()
  @IsBoolean({ each: true })
  @Transform(transformToUUIDArray)
  verificado?: boolean[];

  @ApiPropertyOptional({
    description: 'Se os documentos são reutilizáveis',
    type: [Boolean],
    example: [true],
  })
  @IsOptional()
  @IsArray()
  @IsBoolean({ each: true })
  reutilizavel?: boolean[];

  @ApiPropertyOptional({
    description: 'Lista de IDs dos cidadãos proprietários dos documentos',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsOptional()
  @Transform(transformToUUIDArray)
  cidadaos?: string[];

  @ApiPropertyOptional({
    description: 'Lista de IDs das solicitações vinculadas aos documentos',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsOptional()
  @Transform(transformToUUIDArray)
  solicitacoes?: string[];

  @ApiPropertyOptional({
    description: 'ID do usuário que fez upload dos documentos',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsOptional()
  @Transform(transformToUUIDArray)
  usuarios_upload?: string[];

  @ApiPropertyOptional({
    description: 'ID do usuário que verificou os documentos',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsOptional()
  @Transform(transformToUUIDArray)
  usuarios_verificacao?: string[];

  @ApiPropertyOptional({
    description: 'Tamanho mínimo do arquivo em bytes',
    example: 1024,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  tamanho_min?: number;

  @ApiPropertyOptional({
    description: 'Tamanho máximo do arquivo em bytes',
    example: 10485760,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  tamanho_max?: number;

  @ApiPropertyOptional({
    description: 'Tipos MIME para filtrar',
    type: [String],
    example: ['application/pdf', 'image/jpeg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(transformToUUIDArray)
  mimetype?: string[];

  @ApiPropertyOptional({
    description: 'Termo de busca (nome do arquivo, descrição)',
    example: 'rg',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Relacionamentos a incluir na resposta',
    type: [String],
    example: ['cidadao', 'solicitacao', 'usuario_upload'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(transformToUUIDArray)
  include_relations?: string[];

  @ApiPropertyOptional({
    description: 'Data de upload inicial (formato: YYYY-MM-DD)',
    type: String,
    example: '2024-01-01',
  })
  @IsOptional()
  @IsString()
  data_upload_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de upload final (formato: YYYY-MM-DD)',
    type: String,
    example: '2024-12-31',
  })
  @IsOptional()
  @IsString()
  data_upload_fim?: string;

  @ApiPropertyOptional({
    description: 'Data de verificação inicial (formato: YYYY-MM-DD)',
    type: String,
    example: '2024-01-01',
  })
  @IsOptional()
  @IsString()
  data_verificacao_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de verificação final (formato: YYYY-MM-DD)',
    type: String,
    example: '2024-12-31',
  })
  @IsOptional()
  @IsString()
  data_verificacao_fim?: string;

  @ApiPropertyOptional({
    description: 'Data de validade inicial (formato: YYYY-MM-DD)',
    type: String,
    example: '2024-01-01',
  })
  @IsOptional()
  @IsString()
  data_validade_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de validade final (formato: YYYY-MM-DD)',
    type: String,
    example: '2024-12-31',
  })
  @IsOptional() 
  @IsString()
  data_validade_fim?: string;

  @ApiPropertyOptional({
    description: 'Data de criação inicial (formato: YYYY-MM-DD)',
    type: String,
    example: '2024-01-01',
  })
  @IsOptional()
  @IsString()
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de criação final (formato: YYYY-MM-DD)',
    type: String,
    example: '2024-12-31',
  })
  @IsOptional()
  @IsString()
  data_fim?: string;

  @ApiPropertyOptional({
    description: 'Campo para ordenação',
    example: 'nome',
  })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({
    description: 'Ordem de ordenação',
    example: 'ASC',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sort_order?: 'ASC' | 'DESC';
}

/**
 * DTO de resposta para filtros avançados de documentos
 * Implementa a interface padrão de resultados de filtros
 */
export class DocumentoFiltrosResponseDto implements IResultadoFiltros {
  @ApiProperty({
    description: 'Lista de documentos encontrados',
    type: [Documento],
  })
  items: Documento[];

  @ApiProperty({
    description: 'Total de registros encontrados',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Filtros aplicados na consulta',
    example: {
      tipo: ['rg', 'cpf'],
      verificado: [true],
      search: 'documento',
    },
  })
  filtros_aplicados: IFiltrosAvancados;

  @ApiPropertyOptional({
    description: 'Período calculado da consulta',
    example: {
      dataInicio: '2024-01-01T00:00:00.000Z',
      dataFim: '2024-12-31T23:59:59.999Z',
      descricao: 'Último ano',
      timezone: 'America/Sao_Paulo'
    },
  })
  periodoCalculado?: IPeriodoCalculado;

  @ApiProperty({
    description: 'Metadados de paginação',
    example: {
      limit: 10,
      offset: 0,
      page: 1,
      totalPages: 15,
      hasNextPage: true,
      hasPreviousPage: false,
    },
  })
  meta: {
    limit: number;
    offset: number;
    page: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

  @ApiProperty({
    description: 'Tempo de execução da consulta em milissegundos',
    example: 245,
  })
  tempo_execucao?: number;
}