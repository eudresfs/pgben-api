import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsObject,
  ValidateNested,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para documento anexado à solicitação
 */
export class DocumentoSolicitacaoDto {
  @ApiProperty({
    description: 'Nome do documento',
    example: 'Comprovante de Residência',
  })
  @IsNotEmpty({ message: 'Nome do documento é obrigatório' })
  @IsString({ message: 'Nome do documento deve ser um texto' })
  nome: string;

  @ApiProperty({
    description: 'Tipo do documento',
    example: 'comprovante_residencia',
  })
  @IsNotEmpty({ message: 'Tipo do documento é obrigatório' })
  @IsString({ message: 'Tipo do documento deve ser um texto' })
  tipo: string;

  @ApiProperty({
    description: 'URL ou caminho do arquivo',
    example: '/uploads/documentos/12345.pdf',
  })
  @IsNotEmpty({ message: 'Caminho do arquivo é obrigatório' })
  @IsString({ message: 'Caminho do arquivo deve ser um texto' })
  arquivo_url: string;

  @ApiPropertyOptional({ description: 'Observações sobre o documento' })
  @IsOptional()
  @IsString({ message: 'Observações devem ser um texto' })
  observacoes?: string;
}

/**
 * DTO para criação de solicitação de benefício
 */
export class CreateSolicitacaoDto {
  @ApiProperty({ description: 'ID do cidadão beneficiário' })
  @IsNotEmpty({ message: 'ID do beneficiário é obrigatório' })
  @IsUUID('4', { message: 'ID do beneficiário inválido' })
  beneficiario_id: string;

  @ApiProperty({ description: 'ID do cidadão beneficiário' })
  @IsOptional()
  @IsUUID('4', { message: 'ID do beneficiário inválido' })
  solicitante_id?: string;

  @ApiProperty({ description: 'ID do tipo de benefício solicitado' })
  @IsNotEmpty({ message: 'ID do tipo de benefício é obrigatório' })
  @IsUUID('4', { message: 'ID do tipo de benefício inválido' })
  tipo_beneficio_id: string;

  @ApiPropertyOptional({
    description:
      'ID da unidade onde a solicitação está sendo feita (obrigatório se usuário não tiver unidade vinculada)',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID da unidade inválido' })
  unidade_id?: string;

  @ApiPropertyOptional({ description: 'Observações sobre a solicitação' })
  @IsOptional()
  @IsString({ message: 'Observações devem ser um texto' })
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Dados complementares específicos do tipo de benefício',
  })
  @IsOptional()
  @IsObject({ message: 'Dados complementares devem ser um objeto' })
  dados_complementares?: Record<string, any>;

  @ApiProperty({
    description: 'Documentos anexados à solicitação',
    type: [DocumentoSolicitacaoDto],
  })
  @IsArray({ message: 'Documentos deve ser um array' })
  @ArrayMinSize(1, { message: 'Deve haver pelo menos um documento anexado' })
  @ValidateNested({ each: true })
  @Type(() => DocumentoSolicitacaoDto)
  documentos: DocumentoSolicitacaoDto[];
}
