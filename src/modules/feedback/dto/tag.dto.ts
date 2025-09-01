import {
  IsString,
  IsOptional,
  IsBoolean,
  IsHexColor,
  IsInt,
  Length,
  MaxLength,
  Min,
  Max,
  IsNotEmpty
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para criação de tag
 */
export class CreateTagDto {
  @ApiProperty({
    description: 'Nome da tag (único)',
    minLength: 2,
    maxLength: 50,
    example: 'interface'
  })
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @Length(2, 50, {
    message: 'Nome deve ter entre 2 e 50 caracteres'
  })
  @Transform(({ value }) => value?.trim().toLowerCase())
  nome: string;

  @ApiPropertyOptional({
    description: 'Descrição da tag',
    maxLength: 100,
    example: 'Problemas relacionados à interface do usuário'
  })
  @IsOptional()
  @IsString({ message: 'Descrição deve ser uma string' })
  @MaxLength(100, {
    message: 'Descrição deve ter no máximo 100 caracteres'
  })
  @Transform(({ value }) => value?.trim())
  descricao?: string;

  @ApiPropertyOptional({
    description: 'Categoria da tag',
    maxLength: 30,
    example: 'funcionalidade'
  })
  @IsOptional()
  @IsString({ message: 'Categoria deve ser uma string' })
  @MaxLength(30, {
    message: 'Categoria deve ter no máximo 30 caracteres'
  })
  @Transform(({ value }) => value?.trim().toLowerCase())
  categoria?: string;

  @ApiPropertyOptional({
    description: 'Cor da tag em formato hexadecimal (#RRGGBB)',
    example: '#3B82F6'
  })
  @IsOptional()
  @IsHexColor({ message: 'Cor deve estar no formato hexadecimal válido (#RRGGBB)' })
  cor?: string;

  @ApiPropertyOptional({
    description: 'Ordem de exibição da tag (menor valor = maior prioridade)',
    minimum: 0,
    maximum: 9999,
    default: 0,
    example: 10
  })
  @IsOptional()
  @IsInt({ message: 'Ordem de exibição deve ser um número inteiro' })
  @Min(0, { message: 'Ordem de exibição deve ser maior ou igual a 0' })
  @Max(9999, { message: 'Ordem de exibição deve ser menor ou igual a 9999' })
  ordem_exibicao?: number = 0;
}

/**
 * DTO para atualização de tag
 */
export class UpdateTagDto {
  @ApiPropertyOptional({
    description: 'Nome da tag (único)',
    minLength: 2,
    maxLength: 50,
    example: 'interface-melhorada'
  })
  @IsOptional()
  @IsString({ message: 'Nome deve ser uma string' })
  @Length(2, 50, {
    message: 'Nome deve ter entre 2 e 50 caracteres'
  })
  @Transform(({ value }) => value?.trim().toLowerCase())
  nome?: string;

  @ApiPropertyOptional({
    description: 'Descrição da tag',
    maxLength: 100,
    example: 'Melhorias relacionadas à interface do usuário'
  })
  @IsOptional()
  @IsString({ message: 'Descrição deve ser uma string' })
  @MaxLength(100, {
    message: 'Descrição deve ter no máximo 100 caracteres'
  })
  @Transform(({ value }) => value?.trim())
  descricao?: string;

  @ApiPropertyOptional({
    description: 'Categoria da tag',
    maxLength: 30,
    example: 'melhoria'
  })
  @IsOptional()
  @IsString({ message: 'Categoria deve ser uma string' })
  @MaxLength(30, {
    message: 'Categoria deve ter no máximo 30 caracteres'
  })
  @Transform(({ value }) => value?.trim().toLowerCase())
  categoria?: string;

  @ApiPropertyOptional({
    description: 'Cor da tag em formato hexadecimal (#RRGGBB)',
    example: '#10B981'
  })
  @IsOptional()
  @IsHexColor({ message: 'Cor deve estar no formato hexadecimal válido (#RRGGBB)' })
  cor?: string;

  @ApiPropertyOptional({
    description: 'Indica se a tag está ativa para uso',
    example: true
  })
  @IsOptional()
  @IsBoolean({ message: 'Ativo deve ser um valor booleano' })
  ativo?: boolean;

  @ApiPropertyOptional({
    description: 'Ordem de exibição da tag (menor valor = maior prioridade)',
    minimum: 0,
    maximum: 9999,
    example: 5
  })
  @IsOptional()
  @IsInt({ message: 'Ordem de exibição deve ser um número inteiro' })
  @Min(0, { message: 'Ordem de exibição deve ser maior ou igual a 0' })
  @Max(9999, { message: 'Ordem de exibição deve ser menor ou igual a 9999' })
  ordem_exibicao?: number;
}

/**
 * DTO para filtros de busca de tags
 */
export class TagFilterDto {
  @ApiPropertyOptional({
    description: 'Buscar tags por nome (busca parcial)',
    example: 'inter'
  })
  @IsOptional()
  @IsString({ message: 'Nome deve ser uma string' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  nome?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por categoria',
    example: 'funcionalidade'
  })
  @IsOptional()
  @IsString({ message: 'Categoria deve ser uma string' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  categoria?: string;

  @ApiPropertyOptional({
    description: 'Filtrar apenas tags ativas',
    example: true
  })
  @IsOptional()
  @IsBoolean({ message: 'Ativo deve ser um valor booleano' })
  ativo?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar apenas tags populares (usadas mais de 10 vezes)',
    example: true
  })
  @IsOptional()
  @IsBoolean({ message: 'Popular deve ser um valor booleano' })
  popular?: boolean;

  @ApiPropertyOptional({
    description: 'Número mínimo de usos da tag',
    minimum: 0,
    example: 5
  })
  @IsOptional()
  @IsInt({ message: 'Uso mínimo deve ser um número inteiro' })
  @Min(0, { message: 'Uso mínimo deve ser maior ou igual a 0' })
  uso_minimo?: number;

  @ApiPropertyOptional({
    description: 'Limite de resultados',
    minimum: 1,
    maximum: 100,
    default: 50,
    example: 20
  })
  @IsOptional()
  @IsInt({ message: 'Limite deve ser um número inteiro' })
  @Min(1, { message: 'Limite deve ser maior ou igual a 1' })
  @Max(100, { message: 'Limite deve ser menor ou igual a 100' })
  limite?: number = 50;

  @ApiPropertyOptional({
    description: 'Número da página',
    minimum: 1,
    default: 1,
    example: 1
  })
  @IsOptional()
  @IsInt({ message: 'Página deve ser um número inteiro' })
  @Min(1, { message: 'Página deve ser maior ou igual a 1' })
  page?: number = 1;
}

/**
 * DTO para sugestões de tags baseadas em texto
 */
export class TagSugestionsDto {
  @ApiProperty({
    description: 'Texto para gerar sugestões de tags',
    minLength: 3,
    maxLength: 500,
    example: 'problema na interface do usuário ao fazer login'
  })
  @IsString({ message: 'Texto deve ser uma string' })
  @IsNotEmpty({ message: 'Texto é obrigatório' })
  @Length(3, 500, {
    message: 'Texto deve ter entre 3 e 500 caracteres'
  })
  @Transform(({ value }) => value?.trim())
  texto: string;

  @ApiPropertyOptional({
    description: 'Número máximo de sugestões',
    minimum: 1,
    maximum: 10,
    default: 5,
    example: 3
  })
  @IsOptional()
  @IsInt({ message: 'Máximo de sugestões deve ser um número inteiro' })
  @Min(1, { message: 'Máximo de sugestões deve ser maior ou igual a 1' })
  @Max(10, { message: 'Máximo de sugestões deve ser menor ou igual a 10' })
  max_sugestoes?: number = 5;

  @ApiPropertyOptional({
    description: 'Limite de resultados',
    minimum: 1,
    maximum: 50,
    default: 10,
    example: 5
  })
  @IsOptional()
  @IsInt({ message: 'Limite deve ser um número inteiro' })
  @Min(1, { message: 'Limite deve ser maior ou igual a 1' })
  @Max(50, { message: 'Limite deve ser menor ou igual a 50' })
  limite?: number = 10;
}

/**
 * DTO para resposta de tag
 */
export class TagResponseDto {
  @ApiProperty({
    description: 'ID único da tag',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'Nome da tag',
    example: 'interface'
  })
  nome: string;

  @ApiProperty({
    description: 'Nome formatado da tag',
    example: 'Interface'
  })
  nome_formatado: string;

  @ApiPropertyOptional({
    description: 'Descrição da tag',
    example: 'Problemas relacionados à interface do usuário'
  })
  descricao?: string;

  @ApiPropertyOptional({
    description: 'Categoria da tag',
    example: 'funcionalidade'
  })
  categoria?: string;

  @ApiPropertyOptional({
    description: 'Cor da tag em formato hexadecimal',
    example: '#3B82F6'
  })
  cor?: string;

  @ApiProperty({
    description: 'Indica se a tag está ativa',
    example: true
  })
  ativo: boolean;

  @ApiProperty({
    description: 'Número de vezes que a tag foi usada',
    example: 15
  })
  contador_uso: number;

  @ApiProperty({
    description: 'Indica se a tag é sugerida pelo sistema',
    example: false
  })
  sugerida_sistema: boolean;

  @ApiProperty({
    description: 'Ordem de exibição da tag',
    example: 10
  })
  ordem_exibicao: number;

  @ApiProperty({
    description: 'Indica se a tag é popular',
    example: true
  })
  popular: boolean;

  @ApiProperty({
    description: 'Indica se a tag é popular (alias)',
    example: true
  })
  is_popular: boolean;

  @ApiProperty({
    description: 'Data de criação da tag',
    example: '2024-01-15T10:30:00Z'
  })
  created_at: Date;

  @ApiProperty({
    description: 'Data de última atualização da tag',
    example: '2024-01-15T10:30:00Z'
  })
  updated_at: Date;
}