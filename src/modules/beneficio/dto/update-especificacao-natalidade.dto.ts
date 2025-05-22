import {
  IsBoolean,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateEspecificacaoNatalidadeDto } from './create-especificacao-natalidade.dto';

/**
 * DTO para atualização de especificação do benefício de Auxílio Natalidade
 * 
 * Permite atualização parcial, omitindo o tipo_beneficio_id que não pode ser alterado
 */
export class UpdateEspecificacaoNatalidadeDto extends PartialType(
  OmitType(CreateEspecificacaoNatalidadeDto, ['tipo_beneficio_id'] as const),
) {
  @ApiPropertyOptional({
    description: 'Lista de itens que compõem o kit enxoval',
    example: ['Fraldas descartáveis', 'Roupas de bebê', 'Produtos de higiene'],
  })
  @IsOptional()
  @IsArray({ message: 'Itens do kit deve ser um array' })
  @ArrayMinSize(1, { message: 'Deve haver pelo menos um item no kit' })
  itens_kit?: string[];

  @ApiPropertyOptional({
    description: 'Tempo mínimo de gestação em semanas para solicitar o benefício',
    example: 28,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tempo mínimo de gestação deve ser um número' })
  @Min(1, { message: 'Tempo mínimo de gestação deve ser maior que zero' })
  tempo_gestacao_minimo?: number;

  @ApiPropertyOptional({
    description: 'Prazo máximo em dias após o nascimento para solicitar o benefício',
    example: 90,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Prazo máximo após nascimento deve ser um número' })
  @Min(1, { message: 'Prazo máximo após nascimento deve ser maior que zero' })
  prazo_maximo_apos_nascimento?: number;

  @ApiPropertyOptional({
    description: 'Indica se o benefício requer comprovação de acompanhamento pré-natal',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Requer pré-natal deve ser um booleano' })
  requer_pre_natal?: boolean;

  @ApiPropertyOptional({
    description: 'Indica se o benefício requer comprovante de residência',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Requer comprovante de residência deve ser um booleano' })
  requer_comprovante_residencia?: boolean;

  @ApiPropertyOptional({
    description: 'Número máximo de filhos por beneficiário',
    example: 3,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Número máximo de filhos deve ser um número' })
  @Min(1, { message: 'Número máximo de filhos deve ser maior que zero' })
  numero_maximo_filhos?: number;

  @ApiPropertyOptional({
    description: 'Valor complementar do benefício em caso de múltiplos nascimentos',
    example: 200.00,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Valor complementar deve ser um número' })
  @Min(0, { message: 'Valor complementar não pode ser negativo' })
  valor_complementar?: number;
}
