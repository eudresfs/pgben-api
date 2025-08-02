import { TipoDocumentoEnum } from '@/enums';
import { MimeTypeValidator } from '@/modules/documento/validators/mime-type.validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
} from 'class-validator';

/**
 * DTO para upload de comprovante de pagamento
 *
 * Este DTO é utilizado para validar os metadados do comprovante
 * durante o upload de documentos comprobatórios de pagamento.
 *
 * O arquivo em si é enviado como um arquivo multipart e processado
 * separadamente pelo framework.
 *
 * @author Equipe PGBen
 */
export class ComprovanteUploadDto {
  /**
   * Tipo do documento (ex: comprovante_transferencia, recibo, etc.)
   */
  @ApiProperty({
    description: 'Tipo do documento sendo enviado',
    example: 'comprovante_transferencia',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  @IsEnum(TipoDocumentoEnum, { message: 'Tipo de documento inválido' })
  @MaxLength(100)
  tipo_documento: TipoDocumentoEnum;

  @ApiProperty({
    description: 'Arquivo do comprovante',
    type: 'string',
    format: 'binary',
  })
  @Validate(MimeTypeValidator, {
    message:
      'Arquivo inválido. Verifique o tipo, tamanho e integridade do arquivo.',
  })
  arquivo: any;

  /**
   * Observações sobre o documento
   */
  @ApiProperty({
    description: 'Observações sobre o comprovante',
    example:
      'Comprovante de transferência bancária realizada pelo sistema do banco.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;
}
