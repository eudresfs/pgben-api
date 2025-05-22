import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsString,
  IsEnum,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { TipoUrnaFuneraria } from '../entities/especificacao-funeral.entity';

/**
 * DTO para criação de especificações do Auxílio Funeral
 */
export class CreateEspecificacaoFuneralDto {
  @ApiProperty({
    description: 'ID do tipo de benefício',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsNotEmpty({ message: 'O ID do tipo de benefício é obrigatório' })
  @IsUUID('4', { message: 'O ID do tipo de benefício deve ser um UUID válido' })
  tipo_beneficio_id: string;

  @ApiProperty({
    description: 'Prazo máximo em dias para solicitação após o óbito',
    example: 30,
  })
  @IsNumber({}, { message: 'O prazo máximo após óbito deve ser um número' })
  @Min(1, { message: 'O prazo máximo após óbito deve ser maior que zero' })
  @Max(365, { message: 'O prazo máximo após óbito deve ser menor que 365 dias' })
  @Transform(({ value }) => Number(value))
  prazo_maximo_apos_obito: number;

  @ApiProperty({
    description: 'Indica se o benefício requer certidão de óbito',
    example: true,
    default: true,
  })
  @IsBoolean({ message: 'O campo requer certidão de óbito deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  requer_certidao_obito: boolean;

  @ApiProperty({
    description: 'Indica se o benefício requer comprovante de residência',
    example: false,
    default: false,
  })
  @IsBoolean({ message: 'O campo requer comprovante de residência deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  requer_comprovante_residencia: boolean;

  @ApiProperty({
    description: 'Indica se o benefício requer comprovante de vínculo familiar',
    example: true,
    default: false,
  })
  @IsBoolean({ message: 'O campo requer comprovante de vínculo familiar deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  requer_comprovante_vinculo_familiar: boolean;

  @ApiProperty({
    description: 'Indica se o benefício requer comprovante de despesas funerárias',
    example: true,
    default: false,
  })
  @IsBoolean({ message: 'O campo requer comprovante de despesas deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  requer_comprovante_despesas: boolean;

  @ApiProperty({
    description: 'Indica se o benefício permite reembolso de despesas',
    example: true,
    default: false,
  })
  @IsBoolean({ message: 'O campo permite reembolso deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  permite_reembolso: boolean;

  @ApiProperty({
    description: 'Valor máximo para reembolso',
    example: 1500.00,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O valor máximo de reembolso deve ser um número' })
  @Min(0, { message: 'O valor máximo de reembolso deve ser maior ou igual a zero' })
  @Transform(({ value }) => value ? Number(value) : null)
  valor_maximo_reembolso?: number;

  @ApiProperty({
    description: 'Valor fixo do auxílio',
    example: 1200.00,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O valor fixo deve ser um número' })
  @Min(0, { message: 'O valor fixo deve ser maior ou igual a zero' })
  @Transform(({ value }) => value ? Number(value) : null)
  valor_fixo?: number;

  @ApiProperty({
    description: 'Indica se o benefício inclui translado',
    example: false,
    default: false,
  })
  @IsBoolean({ message: 'O campo inclui translado deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  inclui_translado: boolean;

  @ApiProperty({
    description: 'Indica se o benefício inclui isenção de taxas',
    example: false,
    default: false,
  })
  @IsBoolean({ message: 'O campo inclui isenção de taxas deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  inclui_isencao_taxas: boolean;

  @ApiProperty({
    description: 'Indica se o benefício é limitado a residentes do município',
    example: true,
    default: true,
  })
  @IsBoolean({ message: 'O campo limitado ao município deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  limitado_ao_municipio: boolean;

  @ApiProperty({
    description: 'Indica se o benefício inclui urna funerária',
    example: true,
    default: true,
  })
  @IsBoolean({ message: 'O campo inclui urna funerária deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  inclui_urna_funeraria: boolean;

  @ApiProperty({
    description: 'Indica se o benefício inclui edredom fúnebre',
    example: true,
    default: true,
  })
  @IsBoolean({ message: 'O campo inclui edredom fúnebre deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  inclui_edredom_funebre: boolean;

  @ApiProperty({
    description: 'Indica se o benefício inclui despesas de sepultamento',
    example: true,
    default: true,
  })
  @IsBoolean({ message: 'O campo inclui despesas de sepultamento deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  inclui_despesas_sepultamento: boolean;

  @ApiProperty({
    description: 'Serviço de sobreaviso para o auxílio funeral',
    example: 'Disponível 24h pelo telefone (84) 99999-9999',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'O campo serviço de sobreaviso deve ser uma string' })
  servico_sobreaviso?: string;

  @ApiProperty({
    description: 'Valor máximo do auxílio',
    example: 2000.00,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O valor máximo deve ser um número' })
  @Min(0, { message: 'O valor máximo deve ser maior ou igual a zero' })
  @Transform(({ value }) => value ? Number(value) : null)
  valor_maximo?: number;

  @ApiProperty({
    description: 'Indica se o benefício permite cremação',
    example: true,
    default: true,
  })
  @IsBoolean({ message: 'O campo permite cremação deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  permite_cremacao: boolean;

  @ApiProperty({
    description: 'Indica se o benefício permite sepultamento',
    example: true,
    default: true,
  })
  @IsBoolean({ message: 'O campo permite sepultamento deve ser um booleano' })
  @Transform(({ value }) => value === 'true' || value === true || value === 1)
  permite_sepultamento: boolean;

  @ApiProperty({
    description: 'Lista de documentos necessários para solicitar o benefício',
    example: ['Documento de identificação', 'Comprovante de residência'],
    type: [String],
    required: true,
  })
  @IsArray({ message: 'O campo documentos necessários deve ser um array' })
  @ArrayMinSize(1, { message: 'Pelo menos um documento necessário deve ser especificado' })
  @IsString({ each: true, message: 'Cada documento deve ser uma string' })
  documentos_necessarios: string[];
}
