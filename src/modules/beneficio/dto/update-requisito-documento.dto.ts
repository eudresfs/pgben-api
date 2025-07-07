import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  MaxLength,
  IsEnum,
  IsUrl,
} from 'class-validator';
import { TipoDocumentoEnum } from '@/enums';

/**
 * DTO para atualização de requisito documental
 *
 * Permite atualizar informações de documentos necessários para solicitação de um benefício
 */
export class UpdateRequisitoDocumentoDto {
  @ApiPropertyOptional({
    description: 'Tipo do documento requerido',
    enum: TipoDocumentoEnum,
    example: TipoDocumentoEnum.COMPROVANTE_RESIDENCIA,
  })
  @IsOptional()
  @IsEnum(TipoDocumentoEnum, { message: 'Tipo de documento inválido' })
  tipo_documento?: TipoDocumentoEnum;

  @ApiPropertyOptional({
    description: 'Nome personalizado do documento',
    example: 'Comprovante de Residência Atualizado',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Nome deve ser um texto' })
  @MaxLength(255, { message: 'Nome deve ter no máximo 255 caracteres' })
  nome?: string;

  @ApiPropertyOptional({
    description: 'Descrição do documento e suas especificações',
    example:
      'Comprovante de residência dos últimos 3 meses (conta de água, luz ou telefone)',
  })
  @IsOptional()
  @IsString({ message: 'Descrição deve ser um texto' })
  descricao?: string;

  @ApiPropertyOptional({
    description: 'Indica se o documento é obrigatório para a solicitação',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Obrigatoriedade deve ser um booleano' })
  obrigatorio?: boolean;

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
  @MaxLength(255, { message: 'Nome do template deve ter no máximo 255 caracteres' })
  template_nome?: string;

  @ApiPropertyOptional({
    description: 'Descrição ou instruções sobre o template',
    example: 'Template padrão para comprovante de residência. Preencher com dados atualizados.',
  })
  @IsOptional()
  @IsString({ message: 'Descrição do template deve ser um texto' })
  template_descricao?: string;
}