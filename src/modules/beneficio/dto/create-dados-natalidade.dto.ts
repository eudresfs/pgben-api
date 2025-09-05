import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsNumber,
  IsUUID,
  Min,
  Max,
  ValidateIf,
  Length,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ValidateTipoBeneficio } from '@/shared/validators/tipo-beneficio.validator';
import { TipoContextoNatalidade } from '../../../enums';

/**
 * DTO para criação de dados específicos do cidadão para Auxílio Natalidade
 */
export class CreateDadosNatalidadeDto {
  @ApiProperty({
    description: 'ID da solicitação de benefício',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID('4')
  @ValidateTipoBeneficio('natalidade')
  solicitacao_id: string;

  @ApiProperty({
    description: 'Tipo de contexto do benefício de natalidade',
    example: TipoContextoNatalidade.PRE_NATAL,
    enum: TipoContextoNatalidade,
    default: TipoContextoNatalidade.PRE_NATAL,
  })
  @IsOptional()
  @IsEnum(TipoContextoNatalidade)
  @Transform(({ value }) => value || TipoContextoNatalidade.PRE_NATAL)
  tipo_contexto?: TipoContextoNatalidade = TipoContextoNatalidade.PRE_NATAL;

  // Campos para contexto PRÉ-NATAL
  @ApiProperty({
    description: 'Indica se a gestante realiza pré-natal',
    example: true,
  })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsNotEmpty()
  @IsBoolean()
  realiza_pre_natal: boolean;

  @ApiProperty({
    description: 'Indica se é atendida pelo PSF/UBS',
    example: true,
  })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsNotEmpty()
  @IsBoolean()
  atendida_psf_ubs: boolean;

  @ApiProperty({
    description: 'Indica se é uma gravidez de risco',
    example: false,
  })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsNotEmpty()
  @IsBoolean()
  gravidez_risco: boolean;

  @ApiProperty({
    description: 'Data provável do parto',
    example: '2024-06-15',
    type: 'string',
    format: 'date',
  })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsNotEmpty()
  @IsDateString()
  data_provavel_parto: string;

  @ApiProperty({
    description: 'Indica se é uma gravidez múltipla (gêmeos/trigêmeos)',
    example: false,
  })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsNotEmpty()
  @IsBoolean()
  gemeos_trigemeos: boolean;

  // Campos gerais
  @ApiProperty({
    description: 'Indica se a gestante já tem outros filhos',
    example: false,
  })
  @IsNotEmpty()
  @IsBoolean()
  ja_tem_filhos: boolean;

  @ApiProperty({
    description: 'Quantidade de filhos que já possui',
    example: 2
  })
  @ValidateIf((o) => o.ja_tem_filhos === true)
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  quantidade_filhos?: number;

  @ApiPropertyOptional({
    description: 'Observações adicionais sobre o caso',
    example: 'Gestante em situação de vulnerabilidade.',
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  observacoes?: string;

  // Campos para contexto PÓS-NATAL
  @ApiProperty({
    description: 'Data de nascimento do recém-nascido',
    example: '2024-01-15',
    type: 'string',
    format: 'date',
  })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.POS_NATAL)
  @IsNotEmpty()
  @IsDateString()
  data_nascimento?: string;

  @ApiProperty({
    description: 'Nome do recém-nascido',
    example: 'João Silva Santos',
  })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.POS_NATAL)
  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  nome_recem_nascido?: string;

  @ApiProperty({
    description: 'Número da certidão de nascimento',
    example: '123456 01 55 2024 1 12345 123 1234567-89',
  })
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.POS_NATAL)
  @IsNotEmpty()
  @IsString()
  @Length(10, 50)
  numero_certidao_nascimento?: string;

  @ApiPropertyOptional({
    description: 'Cartório de registro do nascimento',
    example: 'Cartório do 1º Ofício de Registro Civil',
  })
  @IsOptional()
  @IsString()
  @Length(5, 200)
  cartorio_registro?: string;

  @ApiPropertyOptional({
    description: 'Peso do recém-nascido em gramas',
    example: 3250,
    minimum: 500,
    maximum: 8000,
  })
  @IsOptional()
  @IsNumber()
  @Min(500)
  @Max(8000)
  @Type(() => Number)
  peso_nascimento?: number;
}

/**
 * DTO para atualização de dados específicos do cidadão para Auxílio Natalidade
 */
export class UpdateDadosNatalidadeDto {
  @ApiPropertyOptional({
    description: 'Tipo de contexto da natalidade',
    enum: TipoContextoNatalidade,
    example: TipoContextoNatalidade.PRE_NATAL,
  })
  @IsOptional()
  @IsEnum(TipoContextoNatalidade)
  tipo_contexto?: TipoContextoNatalidade;

  // Campos para contexto PRÉ-NATAL
  @ApiPropertyOptional({
    description: 'Indica se a gestante realiza pré-natal',
    example: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsBoolean()
  realiza_pre_natal?: boolean;

  @ApiPropertyOptional({
    description: 'Indica se é atendida pelo PSF/UBS',
    example: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsBoolean()
  atendida_psf_ubs?: boolean;

  @ApiPropertyOptional({
    description: 'Indica se é uma gravidez de risco',
    example: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsBoolean()
  gravidez_risco?: boolean;

  @ApiPropertyOptional({
    description: 'Data provável do parto',
    example: '2024-06-15',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsDateString()
  data_provavel_parto?: string;

  @ApiPropertyOptional({
    description: 'Indica se é uma gravidez múltipla (gêmeos/trigêmeos)',
    example: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.PRE_NATAL)
  @IsBoolean()
  gemeos_trigemeos?: boolean;

  // Campos gerais
  @ApiPropertyOptional({
    description: 'Indica se a gestante já tem outros filhos',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  ja_tem_filhos?: boolean;

  @ApiPropertyOptional({
    description: 'Quantidade de filhos que já possui',
    example: 2,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @ValidateIf((o) => o.ja_tem_filhos === true)
  @IsNumber()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  quantidade_filhos?: number;

  @ApiPropertyOptional({
    description: 'Observações adicionais sobre o caso',
    example: 'Gestante em situação de vulnerabilidade.',
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  observacoes?: string;

  // Campos para contexto PÓS-NATAL
  @ApiPropertyOptional({
    description: 'Data de nascimento do recém-nascido',
    example: '2024-01-15',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.POS_NATAL)
  @IsDateString()
  data_nascimento?: string;

  @ApiPropertyOptional({
    description: 'Nome do recém-nascido',
    example: 'João Silva Santos',
  })
  @IsOptional()
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.POS_NATAL)
  @IsString()
  @Length(2, 100)
  nome_recem_nascido?: string;

  @ApiPropertyOptional({
    description: 'Número da certidão de nascimento',
    example: '123456 01 55 2024 1 12345 123 1234567-89',
  })
  @IsOptional()
  @ValidateIf((o) => o.tipo_contexto === TipoContextoNatalidade.POS_NATAL)
  @IsString()
  @Length(10, 50)
  numero_certidao_nascimento?: string;

  @ApiPropertyOptional({
    description: 'Cartório de registro do nascimento',
    example: 'Cartório do 1º Ofício de Registro Civil',
  })
  @IsOptional()
  @IsString()
  @Length(5, 200)
  cartorio_registro?: string;

  @ApiPropertyOptional({
    description: 'Peso do recém-nascido em gramas',
    example: 3250,
    minimum: 500,
    maximum: 8000,
  })
  @IsOptional()
  @IsNumber()
  @Min(500)
  @Max(8000)
  @Type(() => Number)
  peso_nascimento?: number;
}
