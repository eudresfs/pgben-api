import {
  IsBoolean,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
  Max,
  ArrayMinSize,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateEspecificacaoAluguelSocialDto } from './create-especificacao-aluguel-social.dto';
import { MotivoAluguelSocial } from '../entities/especificacao-aluguel-social.entity';

/**
 * DTO para atualização de especificação do benefício de Aluguel Social
 * 
 * Permite atualização parcial, omitindo o tipo_beneficio_id que não pode ser alterado
 */
export class UpdateEspecificacaoAluguelSocialDto extends PartialType(
  OmitType(CreateEspecificacaoAluguelSocialDto, ['tipo_beneficio_id'] as const),
) {
  @ApiPropertyOptional({
    description: 'Duração máxima do benefício em meses',
    example: 12,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Duração máxima deve ser um número' })
  @Min(1, { message: 'Duração máxima deve ser maior que zero' })
  @Max(48, { message: 'Duração máxima não pode exceder 48 meses' })
  duracao_maxima_meses?: number;

  @ApiPropertyOptional({
    description: 'Indica se o benefício permite prorrogação',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Permite prorrogação deve ser um booleano' })
  permite_prorrogacao?: boolean;

  @ApiPropertyOptional({
    description: 'Tempo máximo de prorrogação em meses',
    example: 6,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tempo máximo de prorrogação deve ser um número' })
  @Min(1, { message: 'Tempo máximo de prorrogação deve ser maior que zero' })
  tempo_maximo_prorrogacao_meses?: number;

  @ApiPropertyOptional({
    description: 'Valor máximo do benefício',
    example: 800.00,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Valor máximo deve ser um número' })
  @Min(0, { message: 'Valor máximo não pode ser negativo' })
  valor_maximo?: number;

  @ApiPropertyOptional({
    description: 'Motivos válidos para concessão do benefício',
    example: ['calamidade', 'desastre', 'vulnerabilidade'],
    enum: Object.values(MotivoAluguelSocial),
    isArray: true,
  })
  @IsOptional()
  @IsArray({ message: 'Motivos válidos deve ser um array' })
  @ArrayMinSize(1, { message: 'Deve haver pelo menos um motivo válido' })
  @IsEnum(MotivoAluguelSocial, { each: true, message: 'Motivo inválido' })
  motivos_validos?: MotivoAluguelSocial[];

  @ApiPropertyOptional({
    description: 'Indica se o benefício requer comprovante de aluguel',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Requer comprovante de aluguel deve ser um booleano' })
  requer_comprovante_aluguel?: boolean;

  @ApiPropertyOptional({
    description: 'Indica se o benefício requer vistoria do imóvel',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Requer vistoria deve ser um booleano' })
  requer_vistoria?: boolean;

  @ApiPropertyOptional({
    description: 'Indica se o pagamento é feito diretamente ao locador',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Pago diretamente ao locador deve ser um booleano' })
  pago_diretamente_locador?: boolean;

  @ApiPropertyOptional({
    description: 'Percentual máximo da renda familiar que pode ser comprometido com aluguel',
    example: 30,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Percentual máximo da renda deve ser um número' })
  @Min(0, { message: 'Percentual máximo da renda não pode ser negativo' })
  @Max(100, { message: 'Percentual máximo da renda não pode exceder 100%' })
  percentual_maximo_renda?: number;
}
