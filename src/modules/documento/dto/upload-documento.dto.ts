import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { TipoDocumento } from '../../beneficio/entities/requisito-documento.entity';

/**
 * DTO para upload de documento
 * 
 * Define os dados necessários para fazer upload de um documento
 * anexado a uma solicitação de benefício
 */
export class UploadDocumentoDto {
  @ApiProperty({ 
    description: 'ID da solicitação à qual o documento pertence',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6'
  })
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  @IsUUID('4', { message: 'ID da solicitação inválido' })
  solicitacao_id: string;

  @ApiProperty({ 
    description: 'Tipo do documento',
    enum: TipoDocumento,
    example: 'COMPROVANTE_RESIDENCIA'
  })
  @IsNotEmpty({ message: 'Tipo do documento é obrigatório' })
  @IsEnum(TipoDocumento, { message: 'Tipo de documento inválido' })
  tipo_documento: TipoDocumento;

  @ApiProperty({ 
    description: 'Arquivo do documento',
    type: 'string',
    format: 'binary'
  })
  arquivo: any;

  @ApiPropertyOptional({ 
    description: 'Observações sobre o documento',
    example: 'Documento atualizado conforme solicitado'
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser um texto' })
  observacoes?: string;
}
