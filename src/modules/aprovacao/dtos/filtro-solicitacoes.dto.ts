import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsString,
  IsDateString,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatusSolicitacao, TipoAcaoCritica } from '../enums/aprovacao.enums';

/**
 * DTO para filtrar solicitações de aprovação
 */
export class FiltroSolicitacoesDto {
  @ApiPropertyOptional({
    description: 'Status da solicitação',
    enum: StatusSolicitacao,
    example: StatusSolicitacao.PENDENTE,
  })
  @IsOptional()
  @IsEnum(StatusSolicitacao)
  status?: typeof StatusSolicitacao;

  @ApiPropertyOptional({
    description: 'Tipo da ação crítica',
    enum: TipoAcaoCritica,
    example: TipoAcaoCritica.CANCELAMENTO_SOLICITACAO,
  })
  @IsOptional()
  @IsEnum(TipoAcaoCritica)
  acao?: TipoAcaoCritica;

  @ApiPropertyOptional({
    description: 'ID do solicitante',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  solicitante_id?: string;

  @ApiPropertyOptional({
    description: 'ID do aprovador',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  aprovador_id?: string;

  @ApiPropertyOptional({
    description: 'Data de início do período de busca (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim do período de busca (ISO 8601)',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  data_fim?: string;

  @ApiPropertyOptional({
    description: 'Prioridade da solicitação',
    enum: ['baixa', 'normal', 'alta', 'urgente'],
    example: 'alta',
  })
  @IsOptional()
  @IsEnum(['baixa', 'normal', 'alta', 'urgente'])
  prioridade?: 'baixa' | 'normal' | 'alta' | 'urgente';

  @ApiPropertyOptional({
    description: 'Tipo da entidade alvo',
    example: 'Solicitacao',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  entidade_alvo_tipo?: string;

  @ApiPropertyOptional({
    description: 'ID da entidade alvo',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  entidade_alvo_id?: string;

  @ApiPropertyOptional({
    description: 'Tags para filtrar (busca por qualquer uma das tags)',
    example: ['urgente', 'financeiro'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Busca textual em justificativa, comentários e observações',
    example: 'cancelamento urgente',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  busca_texto?: string;

  @ApiPropertyOptional({
    description: 'Filtrar apenas solicitações próximas do prazo limite (em horas)',
    example: 24,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(720) // máximo 30 dias
  @Type(() => Number)
  prazo_limite_horas?: number;

  @ApiPropertyOptional({
    description: 'Filtrar apenas solicitações vencidas',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  apenas_vencidas?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por unidade organizacional',
    example: 'unidade-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  unidade_id?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por departamento',
    example: 'TI',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  departamento?: string;

  @ApiPropertyOptional({
    description: 'Filtrar apenas solicitações que requerem acompanhamento',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  requer_acompanhamento?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por valor mínimo da operação',
    example: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  valor_minimo?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por valor máximo da operação',
    example: 50000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  valor_maximo?: number;

  @ApiPropertyOptional({
    description: 'Filtrar apenas solicitações com anexos',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  tem_anexos?: boolean;

  @ApiPropertyOptional({
    description: 'Ordenar por campo específico',
    enum: ['created_at', 'updated_at', 'prazo_limite', 'prioridade', 'status'],
    example: 'created_at',
  })
  @IsOptional()
  @IsEnum(['created_at', 'updated_at', 'prazo_limite', 'prioridade', 'status'])
  ordenar_por?: 'created_at' | 'updated_at' | 'prazo_limite' | 'prioridade' | 'status';

  @ApiPropertyOptional({
    description: 'Direção da ordenação',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  direcao_ordenacao?: 'ASC' | 'DESC';

  @ApiPropertyOptional({
    description: 'Número da página',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Número de itens por página',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Incluir dados relacionados na resposta',
    example: ['solicitante', 'aprovador', 'acao_critica'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  incluir?: string[];

  @ApiPropertyOptional({
    description: 'Filtrar apenas solicitações do usuário atual',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  apenas_minhas?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar apenas solicitações que posso aprovar',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  apenas_posso_aprovar?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por categoria da decisão',
    enum: ['tecnica', 'administrativa', 'financeira', 'juridica', 'estrategica'],
    example: 'tecnica',
  })
  @IsOptional()
  @IsEnum(['tecnica', 'administrativa', 'financeira', 'juridica', 'estrategica'])
  categoria_decisao?: 'tecnica' | 'administrativa' | 'financeira' | 'juridica' | 'estrategica';

  @ApiPropertyOptional({
    description: 'Filtrar por impacto estimado',
    enum: ['baixo', 'medio', 'alto', 'critico'],
    example: 'alto',
  })
  @IsOptional()
  @IsEnum(['baixo', 'medio', 'alto', 'critico'])
  impacto_estimado?: 'baixo' | 'medio' | 'alto' | 'critico';

  @ApiPropertyOptional({
    description: 'Filtrar por urgência',
    enum: ['baixa', 'normal', 'alta', 'critica'],
    example: 'alta',
  })
  @IsOptional()
  @IsEnum(['baixa', 'normal', 'alta', 'critica'])
  urgencia?: 'baixa' | 'normal' | 'alta' | 'critica';
}