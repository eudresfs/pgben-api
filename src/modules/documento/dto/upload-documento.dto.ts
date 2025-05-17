import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  Validate,
  IsObject,
} from 'class-validator';
import { TipoDocumento } from '../../beneficio/entities/requisito-documento.entity';
import { MimeTypeValidator } from '../validators/mime-type.validator';
import { MetadadosValidator } from '../validators/metadados.validator';
import { MetadadosDocumento } from '../interfaces/metadados.interface';
import { Type } from 'class-transformer';

/**
 * DTO para upload de documento
 *
 * Define os dados necessários para fazer upload de um documento
 * anexado a uma solicitação de benefício
 */
export class UploadDocumentoDto {
  @ApiProperty({
    description: 'ID da solicitação à qual o documento pertence',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  @IsUUID('4', { message: 'ID da solicitação inválido' })
  solicitacao_id: string;

  @ApiProperty({
    description: 'Tipo do documento',
    enum: TipoDocumento,
    example: 'COMPROVANTE_RESIDENCIA',
  })
  @IsNotEmpty({ message: 'Tipo do documento é obrigatório' })
  @IsEnum(TipoDocumento, { message: 'Tipo de documento inválido' })
  tipo_documento: TipoDocumento;

  @ApiProperty({
    description: 'Arquivo do documento',
    type: 'string',
    format: 'binary',
  })
  @Validate(MimeTypeValidator, {
    message:
      'Tipo de arquivo não permitido. Apenas documentos, imagens e planilhas são aceitos.',
  })
  arquivo: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Observações sobre o documento',
    example: 'Documento atualizado conforme solicitado',
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser um texto' })
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Metadados adicionais do documento',
    example: {
      titulo: 'Comprovante de Residência',
      descricao: 'Conta de luz referente ao mês de janeiro/2025',
      autor: 'Companhia Energética',
      data_documento: '2025-01-15',
      tags: ['residência', 'conta', 'luz'],
    },
  })
  @IsOptional()
  @IsObject({ message: 'Metadados devem ser um objeto válido' })
  @Validate(MetadadosValidator, {
    message: 'Formato de metadados inválido',
  })
  @Type(() => Object)
  metadados?: MetadadosDocumento;

  @ApiPropertyOptional({
    description:
      'ID do usuário que está fazendo upload (preenchido automaticamente)',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário inválido' })
  usuario_id?: string;
}
