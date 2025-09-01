import { IsOptional, IsString, IsDateString, IsUUID, IsEnum, IsArray, ArrayMaxSize, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { PeriodoPredefinido } from '../../enums';
import { Prioridade } from '../../enums';

/**
 * Função utilitária para transformar valores em arrays, incluindo parsing de JSON strings
 * Aplica o princípio DRY evitando duplicação de código de transformação
 * 
 * @param value - Valor a ser transformado
 * @returns Array filtrado ou undefined se vazio
 */
export function transformToStringArray(value: any): string[] | undefined {
  if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
    return undefined;
  }
  
  // Se é uma string que parece ser JSON array, tenta fazer o parse
  if (typeof value === 'string' && value.trim().startsWith('[') && value.trim().endsWith(']')) {
    try {
      const parsed = JSON.parse(value.trim());
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(v => v && typeof v === 'string' && v.trim() !== '');
        return filtered.length > 0 ? filtered : undefined;
      }
    } catch (error) {
      // Fallback: usar regex para extrair valores de array sem aspas
      const arrayMatch = value.trim().match(/^\[(.+)\]$/);
      if (arrayMatch) {
        const content = arrayMatch[1];
        const items = content.split(',').map(item => item.trim()).filter(item => item !== '');
        return items.length > 0 ? items : undefined;
      }
      // Se falhar o parse, trata como string normal
    }
  }
  
  if (Array.isArray(value)) {
    const filtered = value.filter(v => v && v.trim() !== '');
    return filtered.length > 0 ? filtered : undefined;
  }
  
  return value.trim() !== '' ? [value] : undefined;
}

/**
 * DTO base genérico para filtros avançados
 * 
 * Fornece uma estrutura padronizada para todos os endpoints que necessitam
 * de filtros avançados, incluindo:
 * - Filtros múltiplos (arrays)
 * - Períodos predefinidos e personalizados
 * - Filtros individuais obrigatórios
 * - Validações robustas
 * - Paginação
 * 
 * Implementa os princípios SOLID e DRY para reutilização máxima
 */
export class FiltrosAvancadosBaseDto {
  // ========== FILTROS POR MÚLTIPLOS ITENS (ARRAYS) ==========
  
  @ApiPropertyOptional({
    description: 'IDs das unidades para filtrar os dados (múltiplas unidades)',
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
    type: [String],
    maxItems: 50
  })
  @IsOptional()
  @IsArray({ message: 'unidades deve ser um array' })
  @ArrayMaxSize(50, { message: 'Máximo de 50 unidades permitidas' })
  @IsUUID('4', { each: true, message: 'Cada unidade deve ser um UUID válido' })
  @Type(() => String)
  @Transform(({ value }) => transformToStringArray(value))
  unidades?: string[];

  @ApiPropertyOptional({
    description: 'Nomes dos bairros para filtrar os dados (múltiplos bairros)',
    example: ['Centro', 'Copacabana', 'Ipanema'],
    type: [String],
    maxItems: 50
  })
  @IsOptional()
  @IsArray({ message: 'bairros deve ser um array' })
  @ArrayMaxSize(50, { message: 'Máximo de 50 bairros permitidos' })
  @IsString({ each: true, message: 'Cada bairro deve ser uma string' })
  @Type(() => String)
  @Transform(({ value }) => transformToStringArray(value))
  bairros?: string[];

  @ApiPropertyOptional({
    description: 'IDs dos usuários responsáveis para filtrar os dados (múltiplos usuários)',
    example: ['123e4567-e89b-12d3-a456-426614174003', '123e4567-e89b-12d3-a456-426614174004'],
    type: [String],
    maxItems: 50
  })
  @IsOptional()
  @IsArray({ message: 'usuarios deve ser um array' })
  @ArrayMaxSize(50, { message: 'Máximo de 50 usuários permitidos' })
  @IsUUID('4', { each: true, message: 'Cada usuário deve ser um UUID válido' })
  @Type(() => String)
  @Transform(({ value }) => transformToStringArray(value))
  usuarios?: string[];

  @ApiPropertyOptional({
    description: 'Status para filtrar os dados (múltiplos status)',
    example: ['aprovado', 'pendente'],
    type: [String],
    maxItems: 20
  })
  @IsOptional()
  @IsArray({ message: 'status deve ser um array' })
  @ArrayMaxSize(20, { message: 'Máximo de 20 status permitidos' })
  @IsString({ each: true, message: 'Cada status deve ser uma string' })
  @Type(() => String)
  @Transform(({ value }) => transformToStringArray(value))
  status?: string[];

  @ApiPropertyOptional({
    description: 'IDs dos benefícios para filtrar os dados (múltiplos benefícios)',
    example: ['123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002'],
    type: [String],
    maxItems: 50
  })
  @IsOptional()
  @IsArray({ message: 'beneficios deve ser um array' })
  @ArrayMaxSize(50, { message: 'Máximo de 50 benefícios permitidos' })
  @IsUUID('4', { each: true, message: 'Cada benefício deve ser um UUID válido' })
  @Type(() => String)
  @Transform(({ value }) => transformToStringArray(value))
  beneficios?: string[];

  @ApiPropertyOptional({
    description: 'Roles para filtrar os dados (múltiplas roles)',
    example: ['admin', 'gestor', 'operador'],
    type: [String],
    maxItems: 20
  })
  @IsOptional()
  @IsArray({ message: 'roles deve ser um array' })
  @ArrayMaxSize(20, { message: 'Máximo de 20 roles permitidas' })
  @IsString({ each: true, message: 'Cada role deve ser uma string' })
  @Type(() => String)
  @Transform(({ value }) => transformToStringArray(value))
  roles?: string[];

  // ========== FILTROS INDIVIDUAIS OBRIGATÓRIOS ==========
  
  @ApiPropertyOptional({
    description: 'Período predefinido para filtrar os dados',
    example: 'ultimos_30_dias',
    enum: PeriodoPredefinido
  })
  @IsOptional()
  @IsEnum(PeriodoPredefinido, { message: 'periodo deve ser um valor válido' })
  periodo?: PeriodoPredefinido;

  @ApiPropertyOptional({
    description: 'Data de início personalizada (usado quando periodo = "personalizado")',
    example: '2024-01-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString({}, { message: 'data_inicio deve ser uma data válida' })
  @Transform(({ value }) => {
    if (!value || typeof value !== 'string' || value.trim() === '') return undefined;
    return value.trim();
  })
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim personalizada (usado quando periodo = "personalizado")',
    example: '2024-12-31T23:59:59.999Z'
  })
  @IsOptional()
  @IsDateString({}, { message: 'data_fim deve ser uma data válida' })
  @Transform(({ value }) => {
    if (!value || typeof value !== 'string' || value.trim() === '') return undefined;
    return value.trim();
  })
  data_fim?: string;

  @ApiPropertyOptional({
    description: 'Prioridade para filtrar os dados',
    example: 'alta',
    enum: Prioridade
  })
  @IsOptional()
  @IsEnum(Prioridade, { message: 'prioridade deve ser um valor válido' })
  prioridade?: Prioridade;

  // ========== PAGINAÇÃO E CONFIGURAÇÕES ==========
  
  @ApiPropertyOptional({
    description: 'Limite de registros para paginação',
    example: 100,
    default: 1000,
    minimum: 1,
    maximum: 10000
  })
  @IsOptional()
  @IsInt({ message: 'limite deve ser um número inteiro' })
  @Min(1, { message: 'limite deve ser no mínimo 1' })
  @Max(10000, { message: 'limite deve ser no máximo 10000' })
  @Type(() => Number)
  @Transform(({ value }) => {
    const num = parseInt(value, 10);
    return isNaN(num) ? 1000 : num;
  })
  limite?: number = 1000;

  @ApiPropertyOptional({
    description: 'Offset para paginação',
    example: 0,
    default: 0,
    minimum: 0
  })
  @IsOptional()
  @IsInt({ message: 'offset deve ser um número inteiro' })
  @Min(0, { message: 'offset deve ser no mínimo 0' })
  @Type(() => Number)
  @Transform(({ value }) => {
    const num = parseInt(value, 10);
    return isNaN(num) ? 0 : num;
  })
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Incluir dados arquivados/inativos',
    example: false,
    default: false
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  incluir_arquivados?: boolean = false;
}