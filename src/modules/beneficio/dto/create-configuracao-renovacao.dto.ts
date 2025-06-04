import {
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  IsUUID,
  IsString,
} from 'class-validator';

/**
 * DTO para criação de configuração de renovação automática
 */
export class CreateConfiguracaoRenovacaoDto {
  @IsNotEmpty({ message: 'ID do tipo de benefício é obrigatório' })
  @IsUUID('4', { message: 'ID do tipo de benefício inválido' })
  tipo_beneficio_id: string;

  @IsBoolean({ message: 'Renovação automática deve ser um booleano' })
  renovacao_automatica: boolean;

  @IsNumber({}, { message: 'Dias de antecedência deve ser um número' })
  @Min(1, { message: 'Dias de antecedência deve ser no mínimo 1' })
  dias_antecedencia_renovacao: number;

  @IsOptional()
  @IsNumber({}, { message: 'Número máximo de renovações deve ser um número' })
  @Min(0, { message: 'Número máximo de renovações não pode ser negativo' })
  numero_maximo_renovacoes?: number;

  @IsBoolean({ message: 'Requer aprovação de renovação deve ser um booleano' })
  requer_aprovacao_renovacao: boolean;

  @IsOptional()
  @IsString({ message: 'Observações devem ser uma string' })
  observacoes?: string;
}
