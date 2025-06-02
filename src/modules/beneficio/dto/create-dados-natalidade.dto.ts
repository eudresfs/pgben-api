import {
  IsNotEmpty,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsNumber,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * DTO para criação de dados específicos do cidadão para Auxílio Natalidade
 */
export class CreateDadosNatalidadeDto {
  @ApiProperty({
    description: 'ID da solicitação de benefício',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  @IsUUID('4', { message: 'ID da solicitação inválido' })
  solicitacao_id: string;

  @ApiProperty({
    description: 'Indica se a gestante realiza pré-natal',
    example: true,
  })
  @IsBoolean({ message: 'Realiza pré-natal deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  realiza_pre_natal: boolean;

  @ApiProperty({
    description: 'Indica se é atendida pelo PSF/UBS',
    example: true,
  })
  @IsBoolean({ message: 'Atendida pelo PSF/UBS deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  atendida_psf_ubs: boolean;

  @ApiProperty({
    description: 'Indica se é uma gravidez de risco',
    example: false,
  })
  @IsBoolean({ message: 'Gravidez de risco deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  gravidez_risco: boolean;

  @ApiPropertyOptional({
    description: 'Data provável do parto',
    example: '2024-06-15',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data provável do parto deve ser uma data válida' })
  data_provavel_parto?: string;

  @ApiProperty({
    description: 'Indica se é uma gravidez múltipla (gêmeos/trigêmeos)',
    example: false,
  })
  @IsBoolean({ message: 'Gêmeos/Trigêmeos deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  gemeos_trigemeos: boolean;

  @ApiProperty({
    description: 'Indica se a gestante já tem outros filhos',
    example: false,
  })
  @IsBoolean({ message: 'Já tem filhos deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  ja_tem_filhos: boolean;

  @ApiPropertyOptional({
    description: 'Quantidade de filhos que já possui (obrigatório se já_tem_filhos = true)',
    example: 2,
    minimum: 0,
  })
  @ValidateIf((o) => o.ja_tem_filhos === true)
  @IsNotEmpty({ message: 'Quantidade de filhos é obrigatória quando já tem filhos' })
  @IsNumber({}, { message: 'Quantidade de filhos deve ser um número' })
  @Min(0, { message: 'Quantidade de filhos não pode ser negativa' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return isNaN(num) ? value : num;
    }
    return value;
  })
  quantidade_filhos?: number;

  @ApiPropertyOptional({
    description: 'Telefone cadastrado no CPF (para critério de pecúnia)',
    example: '(85) 99999-9999',
  })
  @IsOptional()
  telefone_cadastrado_cpf?: string;

  @ApiPropertyOptional({
    description: 'Chave PIX igual ao CPF (para critério de pecúnia)',
    example: '123.456.789-00',
  })
  @IsOptional()
  chave_pix?: string;
}

/**
 * DTO para atualização de dados específicos do cidadão para Auxílio Natalidade
 */
export class UpdateDadosNatalidadeDto {
  @ApiPropertyOptional({
    description: 'Indica se a gestante realiza pré-natal',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Realiza pré-natal deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  realiza_pre_natal?: boolean;

  @ApiPropertyOptional({
    description: 'Indica se é atendida pelo PSF/UBS',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Atendida pelo PSF/UBS deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  atendida_psf_ubs?: boolean;

  @ApiPropertyOptional({
    description: 'Indica se é uma gravidez de risco',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Gravidez de risco deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  gravidez_risco?: boolean;

  @ApiPropertyOptional({
    description: 'Data provável do parto',
    example: '2024-06-15',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data provável do parto deve ser uma data válida' })
  data_provavel_parto?: string;

  @ApiPropertyOptional({
    description: 'Indica se é uma gravidez múltipla (gêmeos/trigêmeos)',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Gêmeos/Trigêmeos deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  gemeos_trigemeos?: boolean;

  @ApiPropertyOptional({
    description: 'Indica se a gestante já tem outros filhos',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Já tem filhos deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  ja_tem_filhos?: boolean;

  @ApiPropertyOptional({
    description: 'Quantidade de filhos que já possui',
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Quantidade de filhos deve ser um número' })
  @Min(0, { message: 'Quantidade de filhos não pode ser negativa' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const num = parseInt(value, 10);
      return isNaN(num) ? value : num;
    }
    return value;
  })
  quantidade_filhos?: number;

  @ApiPropertyOptional({
    description: 'Telefone cadastrado no CPF (para critério de pecúnia)',
    example: '(85) 99999-9999',
  })
  @IsOptional()
  telefone_cadastrado_cpf?: string;

  @ApiPropertyOptional({
    description: 'Chave PIX igual ao CPF (para critério de pecúnia)',
    example: '123.456.789-00',
  })
  @IsOptional()
  chave_pix?: string;
}