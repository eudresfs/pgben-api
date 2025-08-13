import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  StatusSolicitacaoAprovacao,
  PrioridadeAprovacao,
  TipoAcaoCritica,
} from '../enums/aprovacao.enums';

/**
 * DTO para filtros de consulta de solicitações de aprovação
 * Permite filtrar e paginar resultados de solicitações
 */
export class FiltroSolicitacaoDto {
  @ApiPropertyOptional({
    description: 'Página atual (baseada em 1)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Página deve ser um número' })
  @Min(1, { message: 'Página deve ser pelo menos 1' })
  pagina?: number = 1;

  @ApiPropertyOptional({
    description: 'Número de itens por página',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limite deve ser um número' })
  @Min(1, { message: 'Limite deve ser pelo menos 1' })
  @Max(100, { message: 'Limite deve ser no máximo 100' })
  limite?: number = 20;

  @ApiPropertyOptional({
    description: 'Status da solicitação',
    enum: StatusSolicitacaoAprovacao,
    example: StatusSolicitacaoAprovacao.PENDENTE,
  })
  @IsOptional()
  @IsEnum(StatusSolicitacaoAprovacao, {
    message: 'Status deve ser um valor válido',
  })
  status?: StatusSolicitacaoAprovacao;

  @ApiPropertyOptional({
    description: 'Prioridade da solicitação',
    enum: PrioridadeAprovacao,
    example: PrioridadeAprovacao.ALTA,
  })
  @IsOptional()
  @IsEnum(PrioridadeAprovacao, {
    message: 'Prioridade deve ser um valor válido',
  })
  prioridade?: PrioridadeAprovacao;

  @ApiPropertyOptional({
    description: 'ID do usuário solicitante',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID(4, { message: 'ID do usuário deve ser um UUID válido' })
  usuario_solicitante_id?: string;

  @ApiPropertyOptional({
    description: 'ID da ação crítica',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID(4, { message: 'ID da ação crítica deve ser um UUID válido' })
  acao_critica_id?: string;

  @ApiPropertyOptional({
    description: 'Tipo da ação crítica',
    enum: TipoAcaoCritica,
    example: TipoAcaoCritica.CANCELAMENTO_SOLICITACAO,
  })
  @IsOptional()
  @IsEnum(TipoAcaoCritica, {
    message: 'Tipo de ação deve ser um valor válido',
  })
  tipo_acao?: TipoAcaoCritica;

  @ApiPropertyOptional({
    description: 'Unidade organizacional',
    example: 'DIRETORIA_TECNICA',
  })
  @IsOptional()
  @IsString()
  unidade?: string;

  @ApiPropertyOptional({
    description: 'Perfil do solicitante',
    example: 'GESTOR',
  })
  @IsOptional()
  @IsString()
  perfil?: string;

  @ApiPropertyOptional({
    description: 'Data de início do período (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Data de início deve estar no formato ISO 8601' },
  )
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim do período (ISO 8601)',
    example: '2024-01-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de fim deve estar no formato ISO 8601' })
  data_fim?: string;

  @ApiPropertyOptional({
    description: 'Valor mínimo envolvido',
    example: 1000.0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Valor mínimo deve ser um número decimal' },
  )
  @Min(0, { message: 'Valor mínimo deve ser maior ou igual a 0' })
  valor_minimo?: number;

  @ApiPropertyOptional({
    description: 'Valor máximo envolvido',
    example: 10000.0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Valor máximo deve ser um número decimal' },
  )
  @Min(0, { message: 'Valor máximo deve ser maior ou igual a 0' })
  valor_maximo?: number;

  @ApiPropertyOptional({
    description: 'Tags para filtrar',
    example: ['urgente', 'financeiro'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((tag) => tag.trim());
    }
    return value;
  })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Código da solicitação (busca parcial)',
    example: 'SOL-2024',
  })
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiPropertyOptional({
    description: 'Texto para busca na justificativa',
    example: 'cancelamento',
  })
  @IsOptional()
  @IsString()
  busca_justificativa?: string;

  @ApiPropertyOptional({
    description: 'IP do solicitante',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsString()
  ip_solicitante?: string;

  @ApiPropertyOptional({
    description: 'Campo para ordenação',
    example: 'created_at',
    default: 'created_at',
  })
  @IsOptional()
  @IsString()
  ordenar_por?: string = 'created_at';

  @ApiPropertyOptional({
    description: 'Direção da ordenação',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsString()
  direcao?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    description: 'Se deve incluir apenas solicitações expiradas',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  apenas_expiradas?: boolean = false;

  @ApiPropertyOptional({
    description: 'Se deve incluir apenas solicitações próximas do vencimento',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  proximas_vencimento?: boolean = false;
}
