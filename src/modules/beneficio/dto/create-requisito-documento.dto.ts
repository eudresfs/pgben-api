import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  MaxLength,
  IsEnum,
  IsUrl,
} from 'class-validator';
import { TipoDocumentoEnum } from '@/enums';

/**
 * DTO para criação de requisito documental
 *
 * Define os documentos necessários para solicitação de um benefício
 */
export class CreateRequisitoDocumentoDto {
  @ApiProperty({
    description: 'Tipo do documento requerido',
    enum: TipoDocumentoEnum,
    example: TipoDocumentoEnum.COMPROVANTE_RESIDENCIA,
  })
  @IsNotEmpty({ message: 'Tipo de documento é obrigatório' })
  @IsEnum(TipoDocumentoEnum, { message: 'Tipo de documento inválido' })
  tipo_documento: TipoDocumentoEnum;

  @ApiProperty({
    description: 'Nome personalizado do documento',
    example: 'Comprovante de Residência Atualizado',
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'Nome do documento é obrigatório' })
  @IsString({ message: 'Nome deve ser um texto' })
  @MaxLength(255, { message: 'Nome deve ter no máximo 255 caracteres' })
  nome: string;

  @ApiProperty({
    description: 'Descrição do documento e suas especificações',
    example:
      'Comprovante de residência dos últimos 3 meses (conta de água, luz ou telefone)',
  })
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  @IsString({ message: 'Descrição deve ser um texto' })
  descricao: string;

  @ApiProperty({
    description: 'Indica se o documento é obrigatório para a solicitação',
    default: true,
  })
  @IsBoolean({ message: 'Obrigatoriedade deve ser um booleano' })
  obrigatorio: boolean;

  @ApiPropertyOptional({
    description: 'Observações adicionais sobre o documento',
    example:
      'Caso não possua comprovante em seu nome, apresentar declaração do titular',
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser um texto' })
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'URL do template/modelo do documento para download',
    example: 'https://storage.exemplo.com/templates/comprovante-residencia.pdf',
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL do template deve ser uma URL válida' })
  template_url?: string;

  @ApiPropertyOptional({
    description: 'Nome do arquivo template para identificação',
    example: 'modelo-comprovante-residencia.pdf',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Nome do template deve ser um texto' })
  @MaxLength(255, {
    message: 'Nome do template deve ter no máximo 255 caracteres',
  })
  template_nome?: string;

  @ApiPropertyOptional({
    description: 'Descrição ou instruções sobre o template',
    example:
      'Template padrão para comprovante de residência. Preencher com dados atualizados.',
  })
  @IsOptional()
  @IsString({ message: 'Descrição do template deve ser um texto' })
  template_descricao?: string;
}
