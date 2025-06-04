import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsString,
  IsDate,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { StatusProcessoJudicial } from '../../../entities/processo-judicial.entity';

/**
 * DTO para criação de um novo processo judicial
 */
export class CreateProcessoJudicialDto {
  @ApiProperty({
    description: 'Número do processo judicial',
    example: '0123456-78.2023.8.20.0001',
  })
  @IsNotEmpty({ message: 'Número do processo é obrigatório' })
  @IsString({ message: 'Número do processo deve ser uma string' })
  numero_processo: string;

  @ApiProperty({ description: 'Vara judicial', example: '1ª Vara Cível' })
  @IsNotEmpty({ message: 'Vara judicial é obrigatória' })
  @IsString({ message: 'Vara judicial deve ser uma string' })
  vara_judicial: string;

  @ApiProperty({ description: 'Comarca', example: 'Natal' })
  @IsNotEmpty({ message: 'Comarca é obrigatória' })
  @IsString({ message: 'Comarca deve ser uma string' })
  comarca: string;

  @ApiPropertyOptional({
    description: 'Juiz responsável',
    example: 'Dr. João Silva',
  })
  @IsOptional()
  @IsString({ message: 'Juiz deve ser uma string' })
  juiz?: string;

  @ApiPropertyOptional({
    description: 'Status do processo',
    enum: StatusProcessoJudicial,
    default: StatusProcessoJudicial.ABERTO,
  })
  @IsOptional()
  @IsEnum(StatusProcessoJudicial, {
    message: 'Status deve ser um valor válido',
  })
  status?: StatusProcessoJudicial;

  @ApiProperty({
    description: 'Objeto do processo',
    example: 'Concessão de benefício de aluguel social',
  })
  @IsNotEmpty({ message: 'Objeto do processo é obrigatório' })
  @IsString({ message: 'Objeto do processo deve ser uma string' })
  objeto: string;

  @ApiProperty({
    description: 'Data de distribuição do processo',
    example: '2023-01-15',
  })
  @IsNotEmpty({ message: 'Data de distribuição é obrigatória' })
  @Type(() => Date)
  @IsDate({ message: 'Data de distribuição deve ser uma data válida' })
  data_distribuicao: Date;

  @ApiPropertyOptional({
    description: 'Data de conclusão do processo',
    example: '2023-05-20',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Data de conclusão deve ser uma data válida' })
  data_conclusao?: Date;

  @ApiPropertyOptional({
    description: 'Observações sobre o processo',
    example: 'Processo com prioridade devido à situação de vulnerabilidade',
  })
  @IsOptional()
  @IsString({ message: 'Observação deve ser uma string' })
  observacao?: string;

  @ApiPropertyOptional({
    description: 'ID do cidadão relacionado ao processo',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do cidadão inválido' })
  cidadao_id?: string;
}

/**
 * DTO para atualização de um processo judicial
 * Todos os campos são opcionais
 */
export class UpdateProcessoJudicialDto {
  @ApiPropertyOptional({
    description: 'Número do processo judicial',
    example: '0123456-78.2023.8.20.0001',
  })
  @IsOptional()
  @IsString({ message: 'Número do processo deve ser uma string' })
  numero_processo?: string;

  @ApiPropertyOptional({
    description: 'Vara judicial',
    example: '1ª Vara Cível',
  })
  @IsOptional()
  @IsString({ message: 'Vara judicial deve ser uma string' })
  vara_judicial?: string;

  @ApiPropertyOptional({ description: 'Comarca', example: 'Natal' })
  @IsOptional()
  @IsString({ message: 'Comarca deve ser uma string' })
  comarca?: string;

  @ApiPropertyOptional({
    description: 'Juiz responsável',
    example: 'Dr. João Silva',
  })
  @IsOptional()
  @IsString({ message: 'Juiz deve ser uma string' })
  juiz?: string;

  @ApiPropertyOptional({
    description: 'Status do processo',
    enum: StatusProcessoJudicial,
  })
  @IsOptional()
  @IsEnum(StatusProcessoJudicial, {
    message: 'Status deve ser um valor válido',
  })
  status?: StatusProcessoJudicial;

  @ApiPropertyOptional({
    description: 'Objeto do processo',
    example: 'Concessão de benefício de aluguel social',
  })
  @IsOptional()
  @IsString({ message: 'Objeto do processo deve ser uma string' })
  objeto?: string;

  @ApiPropertyOptional({
    description: 'Data de distribuição do processo',
    example: '2023-01-15',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Data de distribuição deve ser uma data válida' })
  data_distribuicao?: Date;

  @ApiPropertyOptional({
    description: 'Data de conclusão do processo',
    example: '2023-05-20',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Data de conclusão deve ser uma data válida' })
  data_conclusao?: Date;

  @ApiPropertyOptional({
    description: 'Observações sobre o processo',
    example: 'Processo com prioridade devido à situação de vulnerabilidade',
  })
  @IsOptional()
  @IsString({ message: 'Observação deve ser uma string' })
  observacao?: string;

  @ApiPropertyOptional({
    description: 'ID do cidadão relacionado ao processo',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do cidadão inválido' })
  cidadao_id?: string;

  @ApiPropertyOptional({
    description: 'Status de ativação do processo',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Ativo deve ser um valor booleano' })
  ativo?: boolean;
}

/**
 * DTO para atualização do status de um processo judicial
 */
export class UpdateStatusProcessoJudicialDto {
  @ApiProperty({
    description: 'Novo status do processo',
    enum: StatusProcessoJudicial,
  })
  @IsNotEmpty({ message: 'Status é obrigatório' })
  @IsEnum(StatusProcessoJudicial, {
    message: 'Status deve ser um valor válido',
  })
  status: StatusProcessoJudicial;
}

/**
 * DTO para filtros de busca de processos judiciais
 */
export class FindProcessoJudicialFilterDto {
  @ApiPropertyOptional({ description: 'Página atual', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Limite de itens por página',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'ID do cidadão relacionado ao processo',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do cidadão inválido' })
  cidadaoId?: string;

  @ApiPropertyOptional({
    description: 'Status do processo',
    enum: StatusProcessoJudicial,
  })
  @IsOptional()
  @IsEnum(StatusProcessoJudicial, {
    message: 'Status deve ser um valor válido',
  })
  status?: StatusProcessoJudicial;

  @ApiPropertyOptional({ description: 'Comarca', example: 'Natal' })
  @IsOptional()
  @IsString({ message: 'Comarca deve ser uma string' })
  comarca?: string;

  @ApiPropertyOptional({
    description: 'Vara judicial',
    example: '1ª Vara Cível',
  })
  @IsOptional()
  @IsString({ message: 'Vara judicial deve ser uma string' })
  vara?: string;

  @ApiPropertyOptional({
    description: 'Termo para busca textual',
    example: 'aluguel social',
  })
  @IsOptional()
  @IsString({ message: 'Termo de busca deve ser uma string' })
  termo?: string;
}
