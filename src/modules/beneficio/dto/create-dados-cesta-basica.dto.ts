import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsUUID,
  Min,
  Max,
  ValidateIf,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PeriodicidadeEnum, OrigemAtendimentoEnum } from '@/enums';
import { ValidateTipoBeneficio } from '@/shared/validators/tipo-beneficio.validator';

/**
 * DTO para criação de dados específicos do cidadão para Cesta Básica
 */
export class CreateDadosCestaBasicaDto {
  @ApiProperty({
    description: 'ID da solicitação de benefício',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  @IsUUID('4', { message: 'ID da solicitação inválido' })
  @ValidateTipoBeneficio('cesta-basica')
  solicitacao_id: string;

  @ApiProperty({
    description: 'Quantidade de cestas básicas solicitadas',
    example: 2,
    minimum: 1,
    maximum: 12,
  })
  @IsNotEmpty({ message: 'Quantidade de cestas é obrigatória' })
  @IsNumber({}, { message: 'Quantidade de cestas deve ser um número' })
  @Min(1, { message: 'Quantidade mínima é 1 cesta' })
  @Max(12, { message: 'Quantidade máxima é 12 cestas' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return isNaN(num) ? value : num;
    }
    return value;
  })
  quantidade_cestas_solicitadas: number;

  @ApiProperty({
    description: 'Período de concessão do benefício',
    enum: PeriodicidadeEnum,
    example: PeriodicidadeEnum.MENSAL,
  })
  @IsNotEmpty({ message: 'Período de concessão é obrigatório' })
  @IsEnum(PeriodicidadeEnum, { message: 'Período de concessão inválido' })
  periodo_concessao: PeriodicidadeEnum;

  @ApiProperty({
    description: 'Origem do atendimento que gerou a solicitação',
    enum: OrigemAtendimentoEnum,
    example: OrigemAtendimentoEnum.CRAS,
  })
  @IsNotEmpty({ message: 'Origem do atendimento é obrigatória' })
  @IsEnum(OrigemAtendimentoEnum, { message: 'Origem do atendimento inválida' })
  origem_atendimento: OrigemAtendimentoEnum;

  @ApiPropertyOptional({
    description:
      'Número de pessoas na família (para cálculo da quantidade recomendada)',
    example: 4,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Número de pessoas na família deve ser um número' })
  @Min(1, { message: 'Número mínimo de pessoas na família é 1' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return isNaN(num) ? value : num;
    }
    return value;
  })
  numero_pessoas_familia?: number;

  @ApiPropertyOptional({
    description:
      'Justificativa para a quantidade solicitada (obrigatória se quantidade > recomendada)',
    example:
      'Família com necessidades especiais devido a situação de vulnerabilidade extrema.',
  })
  @IsOptional()
  @ValidateIf((o) => {
    // Validação condicional: obrigatória se quantidade > recomendada
    // Regra simples: 1 cesta para até 3 pessoas, +1 a cada 3 pessoas
    const recomendada = o.numero_pessoas_familia
      ? Math.ceil(o.numero_pessoas_familia / 3)
      : 1;
    return o.quantidade_cestas_solicitadas > recomendada + 1;
  })
  @IsNotEmpty({
    message: 'Justificativa é obrigatória para quantidade acima do recomendado',
  })
  @MinLength(10, { message: 'Justificativa deve ter pelo menos 10 caracteres' })
  justificativa_quantidade?: string;

  @ApiPropertyOptional({
    description: 'Observações especiais sobre o caso',
    example:
      'Família acompanhada pelo PAIF devido a situação de vulnerabilidade.',
  })
  @IsOptional()
  observacoes_especiais?: string;

  @ApiPropertyOptional({
    description: 'Nome do técnico responsável pelo acompanhamento',
    example: 'Maria Silva - Assistente Social',
  })
  @IsOptional()
  tecnico_responsavel?: string;

  @ApiPropertyOptional({
    description:
      'Unidade solicitante (obrigatória para encaminhamentos externos)',
    example: 'CRAS Regional III',
  })
  @ValidateIf(
    (o) =>
      o.origem_atendimento === OrigemAtendimentoEnum.ENCAMINHAMENTO_EXTERNO,
  )
  @IsNotEmpty({
    message: 'Unidade solicitante é obrigatória para encaminhamentos externos',
  })
  @IsOptional()
  unidade_solicitante?: string;
}

/**
 * DTO para atualização de dados específicos do cidadão para Cesta Básica
 */
export class UpdateDadosCestaBasicaDto {
  @ApiPropertyOptional({
    description: 'Quantidade de cestas básicas solicitadas',
    example: 2,
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Quantidade de cestas deve ser um número' })
  @Min(1, { message: 'Quantidade mínima é 1 cesta' })
  @Max(12, { message: 'Quantidade máxima é 12 cestas' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return isNaN(num) ? value : num;
    }
    return value;
  })
  quantidade_cestas_solicitadas?: number;

  @ApiPropertyOptional({
    description: 'Período de concessão do benefício',
    enum: PeriodicidadeEnum,
    example: PeriodicidadeEnum.MENSAL,
  })
  @IsOptional()
  @IsEnum(PeriodicidadeEnum, { message: 'Período de concessão inválido' })
  periodo_concessao?: PeriodicidadeEnum;

  @ApiPropertyOptional({
    description: 'Origem do atendimento que gerou a solicitação',
    enum: OrigemAtendimentoEnum,
    example: OrigemAtendimentoEnum.CRAS,
  })
  @IsOptional()
  @IsEnum(OrigemAtendimentoEnum, { message: 'Origem do atendimento inválida' })
  origem_atendimento?: OrigemAtendimentoEnum;

  @ApiPropertyOptional({
    description: 'Número de pessoas na família',
    example: 4,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Número de pessoas na família deve ser um número' })
  @Min(1, { message: 'Número mínimo de pessoas na família é 1' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return isNaN(num) ? value : num;
    }
    return value;
  })
  numero_pessoas_familia?: number;

  @ApiPropertyOptional({
    description: 'Justificativa para a quantidade solicitada',
    example: 'Justificativa atualizada após reavaliação.',
  })
  @IsOptional()
  @MinLength(10, { message: 'Justificativa deve ter pelo menos 10 caracteres' })
  justificativa_quantidade?: string;

  @ApiPropertyOptional({
    description: 'Observações especiais sobre o caso',
    example: 'Observações atualizadas.',
  })
  @IsOptional()
  observacoes_especiais?: string;

  @ApiPropertyOptional({
    description: 'Nome do técnico responsável pelo acompanhamento',
    example: 'João Santos - Assistente Social',
  })
  @IsOptional()
  tecnico_responsavel?: string;

  @ApiPropertyOptional({
    description: 'Unidade solicitante',
    example: 'CRAS Regional IV',
  })
  @IsOptional()
  unidade_solicitante?: string;
}
