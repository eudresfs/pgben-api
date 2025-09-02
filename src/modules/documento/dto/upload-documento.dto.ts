import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsBoolean,
  Validate,
  MaxLength,
} from 'class-validator';
import { TipoDocumentoEnum } from '@/enums';
import { MimeTypeValidator } from '../validators/mime-type.validator';
import { InputSanitizerValidator } from '../validators/input-sanitizer.validator';
import { Transform } from 'class-transformer';

/**
 * DTO para upload de documento
 *
 * Define os dados necessários para fazer upload de um documento
 * que pode estar vinculado a uma solicitação específica ou ser um documento geral do cidadão
 */
export class UploadDocumentoDto {
  @ApiProperty({
    description: 'ID do cidadão proprietário do documento',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  @IsUUID('4', { message: 'ID do cidadão inválido' })
  cidadao_id: string;

  @ApiPropertyOptional({
    description:
      'ID da solicitação à qual o documento pertence (opcional para documentos reutilizáveis)',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID da solicitação inválido' })
  solicitacao_id?: string;

  @ApiPropertyOptional({
    description:
      'ID da pendência à qual o documento pertence (opcional para documentos reutilizáveis)',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID da pendência inválido' })
  pendencia_id?: string;

  @ApiPropertyOptional({
    description: 'ID da sessão de upload (usado pelo módulo easy-upload)',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID da sessão de upload inválido' })
  upload_session_id?: string;

  @ApiProperty({
    description: 'Tipo do documento',
    enum: TipoDocumentoEnum,
    example: 'COMPROVANTE_RESIDENCIA',
  })
  @IsNotEmpty({ message: 'Tipo do documento é obrigatório' })
  @IsEnum(TipoDocumentoEnum, { message: 'Tipo de documento inválido' })
  tipo: TipoDocumentoEnum;

  @ApiProperty({
    description: 'Arquivo do documento',
    type: 'string',
    format: 'binary',
  })
  @Validate(MimeTypeValidator, {
    message:
      'Arquivo inválido. Verifique o tipo, tamanho e integridade do arquivo.',
  })
  arquivo: any; // Arquivo será validado no controller

  @ApiPropertyOptional({
    description: 'Descrição do documento',
    example: 'Comprovante de residência atualizado',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Descrição deve ser um texto' })
  @MaxLength(500, {
    message: 'Descrição não pode exceder 500 caracteres',
  })
  @Validate(InputSanitizerValidator, {
    message: 'Descrição contém conteúdo não permitido por motivos de segurança',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  })
  descricao?: string;

  @ApiPropertyOptional({
    description:
      'Indica se o documento pode ser reutilizado em outras solicitações',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Reutilizável deve ser um valor booleano' })
  reutilizavel?: boolean = false;

  @ApiPropertyOptional({
    description:
      'ID do usuário que está fazendo upload (preenchido automaticamente)',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário inválido' })
  usuario_id?: string;
}
