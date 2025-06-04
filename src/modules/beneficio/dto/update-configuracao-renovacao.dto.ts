import {
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  IsString,
} from 'class-validator';

/**
 * DTO para atualização de configuração de renovação automática
 */
export class UpdateConfiguracaoRenovacaoDto {
  @IsOptional()
  @IsBoolean({ message: 'Renovação automática deve ser um booleano' })
  renovacao_automatica?: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'Dias de antecedência deve ser um número' })
  @Min(1, { message: 'Dias de antecedência deve ser no mínimo 1' })
  dias_antecedencia_renovacao?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Número máximo de renovações deve ser um número' })
  @Min(0, { message: 'Número máximo de renovações não pode ser negativo' })
  numero_maximo_renovacoes?: number;

  @IsOptional()
  @IsBoolean({ message: 'Requer aprovação de renovação deve ser um booleano' })
  requer_aprovacao_renovacao?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Ativo deve ser um booleano' })
  ativo?: boolean;

  @IsOptional()
  @IsString({ message: 'Observações devem ser uma string' })
  observacoes?: string;
}
