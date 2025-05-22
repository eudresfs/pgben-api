import {
  IsNotEmpty,
  IsBoolean,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
  Max,
  IsUUID,
  ArrayMinSize,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MotivoAluguelSocial } from '../entities/especificacao-aluguel-social.entity';

/**
 * DTO para criação de especificação do benefício de Aluguel Social
 */
export class CreateEspecificacaoAluguelSocialDto {
  @ApiProperty({
    description: 'ID do tipo de benefício (Aluguel Social)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  @IsUUID('4', { message: 'ID de tipo de benefício inválido' })
  tipo_beneficio_id: string;

  @ApiProperty({
    description: 'Duração máxima do benefício em meses',
    example: 12,
  })
  @IsNotEmpty({ message: 'Duração máxima é obrigatória' })
  @IsNumber({}, { message: 'Duração máxima deve ser um número' })
  @Min(1, { message: 'Duração máxima deve ser maior que zero' })
  @Max(48, { message: 'Duração máxima não pode exceder 48 meses' })
  duracao_maxima_meses: number;

  @ApiProperty({
    description: 'Indica se o benefício permite prorrogação',
    example: true,
  })
  @IsBoolean({ message: 'Permite prorrogação deve ser um booleano' })
  permite_prorrogacao: boolean;

  @ApiPropertyOptional({
    description: 'Tempo máximo de prorrogação em meses',
    example: 6,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tempo máximo de prorrogação deve ser um número' })
  @Min(1, { message: 'Tempo máximo de prorrogação deve ser maior que zero' })
  tempo_maximo_prorrogacao_meses?: number;

  @ApiProperty({
    description: 'Valor máximo do benefício',
    example: 800.00,
  })
  @IsNotEmpty({ message: 'Valor máximo é obrigatório' })
  @IsNumber({}, { message: 'Valor máximo deve ser um número' })
  @Min(0, { message: 'Valor máximo não pode ser negativo' })
  valor_maximo: number;

  @ApiProperty({
    description: 'Motivos válidos para concessão do benefício',
    example: ['calamidade', 'desastre', 'vulnerabilidade'],
    enum: Object.values(MotivoAluguelSocial),
    isArray: true,
  })
  @IsArray({ message: 'Motivos válidos deve ser um array' })
  @ArrayMinSize(1, { message: 'Deve haver pelo menos um motivo válido' })
  @IsEnum(MotivoAluguelSocial, { each: true, message: 'Motivo inválido' })
  motivos_validos: MotivoAluguelSocial[];

  @ApiProperty({
    description: 'Indica se o benefício requer comprovante de aluguel',
    example: true,
  })
  @IsBoolean({ message: 'Requer comprovante de aluguel deve ser um booleano' })
  requer_comprovante_aluguel: boolean;

  @ApiProperty({
    description: 'Indica se o benefício requer vistoria do imóvel',
    example: false,
  })
  @IsBoolean({ message: 'Requer vistoria deve ser um booleano' })
  requer_vistoria: boolean;

  @ApiProperty({
    description: 'Indica se o pagamento é feito diretamente ao locador',
    example: false,
  })
  @IsBoolean({ message: 'Pago diretamente ao locador deve ser um booleano' })
  pago_diretamente_locador: boolean;

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
