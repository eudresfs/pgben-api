import {
  IsNotEmpty,
  IsBoolean,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
  ArrayMinSize,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para criação de especificação do benefício de Auxílio Natalidade
 */
export class CreateEspecificacaoNatalidadeDto {
  @ApiProperty({
    description: 'ID do tipo de benefício (Auxílio Natalidade)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: 'Tipo de benefício é obrigatório' })
  @IsUUID('4', { message: 'ID de tipo de benefício inválido' })
  tipo_beneficio_id: string;

  @ApiPropertyOptional({
    description: 'Tempo mínimo de gestação em semanas para solicitar o benefício',
    example: 28,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tempo mínimo de gestação deve ser um número' })
  @Min(1, { message: 'Tempo mínimo de gestação deve ser maior que zero' })
  tempo_gestacao_minimo?: number;

  @ApiProperty({
    description: 'Prazo máximo em dias após o nascimento para solicitar o benefício',
    example: 90,
  })
  @IsNotEmpty({ message: 'Prazo máximo após nascimento é obrigatório' })
  @IsNumber({}, { message: 'Prazo máximo após nascimento deve ser um número' })
  @Min(1, { message: 'Prazo máximo após nascimento deve ser maior que zero' })
  prazo_maximo_apos_nascimento: number;

  @ApiProperty({
    description: 'Indica se o benefício requer comprovação de acompanhamento pré-natal',
    example: true,
  })
  @IsBoolean({ message: 'Requer pré-natal deve ser um booleano' })
  requer_pre_natal: boolean;

  @ApiProperty({
    description: 'Indica se o benefício requer comprovante de residência',
    example: true,
  })
  @IsBoolean({ message: 'Requer comprovante de residência deve ser um booleano' })
  requer_comprovante_residencia: boolean;

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
