import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TipoAcaoHistorico, CategoriaHistorico } from '../entities/historico-monitoramento.entity';

/**
 * DTO para filtros de consulta do histórico de agendamentos
 */
export class HistoricoAgendamentoFiltrosDto {
  @ApiPropertyOptional({
    description: 'ID do agendamento específico',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do agendamento deve ser um UUID válido' })
  agendamento_id?: string;

  @ApiPropertyOptional({
    description: 'ID do cidadão/beneficiário',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do cidadão deve ser um UUID válido' })
  cidadao_id?: string;

  @ApiPropertyOptional({
    description: 'ID do usuário que realizou a ação',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário deve ser um UUID válido' })
  usuario_id?: string;

  @ApiPropertyOptional({
    description: 'Tipos de ação específicos',
    enum: TipoAcaoHistorico,
    isArray: true,
    example: [TipoAcaoHistorico.AGENDAMENTO_CRIADO, TipoAcaoHistorico.AGENDAMENTO_ATUALIZADO],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TipoAcaoHistorico, {
    each: true,
    message: 'Cada tipo de ação deve ser um valor válido do enum TipoAcaoHistorico',
  })
  tipos_acao?: TipoAcaoHistorico[];

  @ApiPropertyOptional({
    description: 'Categorias de histórico',
    enum: CategoriaHistorico,
    isArray: true,
    example: [CategoriaHistorico.AGENDAMENTO],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(CategoriaHistorico, {
    each: true,
    message: 'Cada categoria deve ser um valor válido do enum CategoriaHistorico',
  })
  categorias?: CategoriaHistorico[];

  @ApiPropertyOptional({
    description: 'Data de início do período (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de início deve estar no formato ISO 8601' })
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  data_inicio?: Date;

  @ApiPropertyOptional({
    description: 'Data de fim do período (ISO 8601)',
    example: '2025-01-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de fim deve estar no formato ISO 8601' })
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  data_fim?: Date;

  @ApiPropertyOptional({
    description: 'Filtrar apenas ações bem-sucedidas',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Campo apenas_sucessos deve ser um valor booleano' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  apenas_sucessos?: boolean;

  @ApiPropertyOptional({
    description: 'Busca textual na descrição e observações',
    example: 'reagendamento',
  })
  @IsOptional()
  @IsString({ message: 'Busca de texto deve ser uma string' })
  busca_texto?: string;
}

/**
 * DTO para parâmetros de paginação e ordenação
 */
export class HistoricoAgendamentoPaginacaoDto {
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
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limite deve ser um número' })
  @Min(1, { message: 'Limite deve ser maior que 0' })
  @Max(100, { message: 'Limite não pode ser maior que 100' })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Campo para ordenação',
    default: 'created_at',
    example: 'created_at',
    enum: ['created_at', 'tipo_acao', 'categoria', 'sucesso'],
  })
  @IsOptional()
  @IsString({ message: 'Campo de ordenação deve ser uma string' })
  orderBy?: string = 'created_at';

  @ApiPropertyOptional({
    description: 'Direção da ordenação',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    example: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'], {
    message: 'Direção da ordenação deve ser ASC ou DESC',
  })
  orderDirection?: 'ASC' | 'DESC' = 'DESC';
}

/**
 * DTO para consulta de histórico por agendamento
 */
export class ConsultarHistoricoAgendamentoDto {
  @ApiProperty({
    description: 'ID do agendamento',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'ID do agendamento deve ser um UUID válido' })
  agendamento_id: string;

  @ApiPropertyOptional({
    description: 'Filtros adicionais para a consulta',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => HistoricoAgendamentoFiltrosDto)
  filtros?: Omit<HistoricoAgendamentoFiltrosDto, 'agendamento_id'>;

  @ApiPropertyOptional({
    description: 'Parâmetros de paginação e ordenação',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => HistoricoAgendamentoPaginacaoDto)
  paginacao?: HistoricoAgendamentoPaginacaoDto;
}

/**
 * DTO para consulta de histórico por cidadão
 */
export class ConsultarHistoricoCidadaoDto {
  @ApiProperty({
    description: 'ID do cidadão',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID('4', { message: 'ID do cidadão deve ser um UUID válido' })
  cidadao_id: string;

  @ApiPropertyOptional({
    description: 'Filtros adicionais para a consulta',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => HistoricoAgendamentoFiltrosDto)
  filtros?: Omit<HistoricoAgendamentoFiltrosDto, 'cidadao_id'>;

  @ApiPropertyOptional({
    description: 'Parâmetros de paginação e ordenação',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => HistoricoAgendamentoPaginacaoDto)
  paginacao?: HistoricoAgendamentoPaginacaoDto;
}

/**
 * DTO para consulta geral de histórico com filtros
 */
export class ConsultarHistoricoGeralDto {
  @ApiPropertyOptional({
    description: 'Filtros para a consulta',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => HistoricoAgendamentoFiltrosDto)
  filtros?: HistoricoAgendamentoFiltrosDto;

  @ApiPropertyOptional({
    description: 'Parâmetros de paginação e ordenação',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => HistoricoAgendamentoPaginacaoDto)
  paginacao?: HistoricoAgendamentoPaginacaoDto;
}

/**
 * DTO para resposta de usuário simplificada
 */
export class UsuarioHistoricoDto {
  @ApiProperty({
    description: 'ID do usuário',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  id: string;

  @ApiProperty({
    description: 'Nome do usuário',
    example: 'João Silva',
  })
  nome: string;

  @ApiPropertyOptional({
    description: 'Email do usuário',
    example: 'joao.silva@semtas.gov.br',
  })
  email?: string;
}

/**
 * DTO para resposta de cidadão simplificada
 */
export class CidadaoHistoricoDto {
  @ApiProperty({
    description: 'ID do cidadão',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  id: string;

  @ApiProperty({
    description: 'Nome do cidadão',
    example: 'Maria Santos',
  })
  nome: string;

  @ApiPropertyOptional({
    description: 'CPF do cidadão',
    example: '123.456.789-00',
  })
  cpf?: string;
}

/**
 * DTO para resposta de agendamento simplificada
 */
export class AgendamentoHistoricoDto {
  @ApiProperty({
    description: 'ID do agendamento',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Data do agendamento',
    example: '2025-01-20T10:00:00.000Z',
  })
  data_agendamento: Date;

  @ApiProperty({
    description: 'Tipo da visita',
    example: 'INICIAL',
  })
  tipo_visita: string;

  @ApiProperty({
    description: 'Status atual',
    example: 'AGENDADO',
  })
  status: string;
}

/**
 * DTO para resposta de histórico individual
 */
export class HistoricoMonitoramentoResponseDto {
  @ApiProperty({
    description: 'ID do registro de histórico',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  id: string;

  @ApiProperty({
    description: 'Tipo da ação realizada',
    enum: TipoAcaoHistorico,
    example: TipoAcaoHistorico.AGENDAMENTO_CRIADO,
  })
  tipo_acao: TipoAcaoHistorico;

  @ApiProperty({
    description: 'Categoria do histórico',
    enum: CategoriaHistorico,
    example: CategoriaHistorico.AGENDAMENTO,
  })
  categoria: CategoriaHistorico;

  @ApiProperty({
    description: 'Descrição detalhada da ação',
    example: 'Agendamento criado para INICIAL em 2025-01-20T10:00:00.000Z',
  })
  descricao: string;

  @ApiPropertyOptional({
    description: 'Dados anteriores (antes da mudança)',
    example: { status: 'PENDENTE' },
  })
  dados_anteriores?: any;

  @ApiPropertyOptional({
    description: 'Dados novos (após a mudança)',
    example: { status: 'AGENDADO', data_agendamento: '2025-01-20T10:00:00.000Z' },
  })
  dados_novos?: any;

  @ApiPropertyOptional({
    description: 'Metadados adicionais',
    example: { timestamp: '2025-01-15T14:30:00.000Z', agendamento_tipo: 'INICIAL' },
  })
  metadados?: any;

  @ApiPropertyOptional({
    description: 'Observações complementares',
    example: 'Agendamento criado automaticamente pelo sistema',
  })
  observacoes?: string;

  @ApiProperty({
    description: 'Indica se a operação foi bem-sucedida',
    example: true,
  })
  sucesso: boolean;

  @ApiPropertyOptional({
    description: 'Mensagem de erro (se houver)',
    example: null,
  })
  erro?: string;

  @ApiPropertyOptional({
    description: 'Duração da operação em milissegundos',
    example: 150,
  })
  duracao_ms?: number;

  @ApiProperty({
    description: 'Data de criação do registro',
    example: '2025-01-15T14:30:00.000Z',
  })
  created_at: Date;

  @ApiPropertyOptional({
    description: 'Dados do usuário que realizou a ação',
  })
  usuario?: UsuarioHistoricoDto;

  @ApiPropertyOptional({
    description: 'Dados do cidadão relacionado',
  })
  cidadao?: CidadaoHistoricoDto;

  @ApiPropertyOptional({
    description: 'Dados do agendamento relacionado',
  })
  agendamento?: AgendamentoHistoricoDto;
}

/**
 * DTO para resposta paginada de histórico
 */
export class HistoricoAgendamentoResponseDto {
  @ApiProperty({
    description: 'Lista de registros de histórico',
    type: [HistoricoMonitoramentoResponseDto],
  })
  data: HistoricoMonitoramentoResponseDto[];

  @ApiProperty({
    description: 'Total de registros encontrados',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Página atual',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Itens por página',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total de páginas',
    example: 8,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Indica se há próxima página',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Indica se há página anterior',
    example: false,
  })
  hasPrev: boolean;
}

/**
 * DTO para resposta de estatísticas do histórico
 */
export class EstatisticasHistoricoDto {
  @ApiProperty({
    description: 'Total de ações registradas',
    example: 1250,
  })
  total_acoes: number;

  @ApiProperty({
    description: 'Contagem de ações por tipo',
    example: {
      CRIAR: 450,
      ATUALIZAR: 320,
      CANCELAR: 180,
      CONFIRMAR: 200,
      REAGENDAR: 100,
    },
  })
  acoes_por_tipo: Record<TipoAcaoHistorico, number>;

  @ApiProperty({
    description: 'Taxa de sucesso das operações (%)',
    example: 95.5,
  })
  taxa_sucesso: number;

  @ApiProperty({
    description: 'Período de análise',
    example: {
      inicio: '2025-01-01T00:00:00.000Z',
      fim: '2025-01-15T23:59:59.999Z',
    },
  })
  periodo_analise: {
    inicio: Date;
    fim: Date;
  };
}