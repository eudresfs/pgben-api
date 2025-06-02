import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TipoDeterminacaoJudicial } from '../../../entities/determinacao-judicial.entity';

/**
 * DTO para criação de determinação judicial
 */
export class CreateDeterminacaoJudicialDto {
  @ApiProperty({
    description: 'ID do processo judicial',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'O ID do processo judicial é obrigatório' })
  @IsUUID('4', { message: 'O ID do processo judicial deve ser um UUID válido' })
  processo_judicial_id: string;

  @ApiProperty({
    description: 'Número da determinação judicial',
    example: 'DET-2025/001',
  })
  @IsNotEmpty({ message: 'O número da determinação é obrigatório' })
  @IsString({ message: 'O número da determinação deve ser uma string' })
  numero_determinacao: string;

  @ApiProperty({
    description: 'Tipo da determinação judicial',
    enum: TipoDeterminacaoJudicial,
    example: TipoDeterminacaoJudicial.CONCESSAO,
  })
  @IsNotEmpty({ message: 'O tipo da determinação é obrigatório' })
  @IsEnum(TipoDeterminacaoJudicial, {
    message: 'Tipo inválido. Deve ser um dos valores permitidos',
  })
  tipo: TipoDeterminacaoJudicial;

  @ApiProperty({
    description: 'Descrição da determinação judicial',
    example: 'Concessão imediata do benefício ao requerente',
  })
  @IsNotEmpty({ message: 'A descrição é obrigatória' })
  @IsString({ message: 'A descrição deve ser uma string' })
  descricao: string;

  @ApiProperty({
    description: 'Data da determinação judicial',
    example: '2025-05-24',
    type: Date,
  })
  @IsNotEmpty({ message: 'A data da determinação é obrigatória' })
  @Type(() => Date)
  @IsDate({ message: 'A data da determinação deve ser uma data válida' })
  data_determinacao: Date;

  @ApiProperty({
    description: 'Data prazo para cumprimento',
    example: '2025-06-24',
    required: false,
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'A data prazo deve ser uma data válida' })
  data_prazo?: Date;

  @ApiProperty({
    description: 'ID do cidadão relacionado (se aplicável)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'O ID do cidadão deve ser um UUID válido' })
  cidadao_id?: string;

  @ApiProperty({
    description: 'ID da solicitação relacionada (se aplicável)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'O ID da solicitação deve ser um UUID válido' })
  solicitacao_id?: string;

  @ApiProperty({
    description: 'Observações adicionais',
    example: 'Determinação emitida após audiência de conciliação',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'A observação deve ser uma string' })
  observacao?: string;
}

/**
 * DTO para atualização de determinação judicial
 */
export class UpdateDeterminacaoJudicialDto {
  @ApiProperty({
    description: 'Número da determinação judicial',
    example: 'DET-2025/001',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'O número da determinação deve ser uma string' })
  numero_determinacao?: string;

  @ApiProperty({
    description: 'Tipo da determinação judicial',
    enum: TipoDeterminacaoJudicial,
    example: TipoDeterminacaoJudicial.CONCESSAO,
    required: false,
  })
  @IsOptional()
  @IsEnum(TipoDeterminacaoJudicial, {
    message: 'Tipo inválido. Deve ser um dos valores permitidos',
  })
  tipo?: TipoDeterminacaoJudicial;

  @ApiProperty({
    description: 'Descrição da determinação judicial',
    example: 'Concessão imediata do benefício ao requerente',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser uma string' })
  descricao?: string;

  @ApiProperty({
    description: 'Data da determinação judicial',
    example: '2025-05-24',
    required: false,
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'A data da determinação deve ser uma data válida' })
  data_determinacao?: Date;

  @ApiProperty({
    description: 'Data prazo para cumprimento',
    example: '2025-06-24',
    required: false,
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'A data prazo deve ser uma data válida' })
  data_prazo?: Date;

  @ApiProperty({
    description: 'Status de cumprimento',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'O status de cumprimento deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true)
  cumprida?: boolean;

  @ApiProperty({
    description: 'Data de cumprimento',
    example: '2025-06-10',
    required: false,
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'A data de cumprimento deve ser uma data válida' })
  data_cumprimento?: Date;

  @ApiProperty({
    description: 'Observação sobre o cumprimento',
    example: 'Benefício concedido conforme determinado',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'A observação de cumprimento deve ser uma string' })
  observacao_cumprimento?: string;

  @ApiProperty({
    description: 'ID do cidadão relacionado (se aplicável)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'O ID do cidadão deve ser um UUID válido' })
  cidadao_id?: string;

  @ApiProperty({
    description: 'ID da solicitação relacionada (se aplicável)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'O ID da solicitação deve ser um UUID válido' })
  solicitacao_id?: string;

  @ApiProperty({
    description: 'Status de ativação',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'O status de ativação deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true)
  ativo?: boolean;
}
