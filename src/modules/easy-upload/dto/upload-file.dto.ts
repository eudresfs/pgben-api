import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { BaseDto } from '../../../shared/dtos/base.dto';

/**
 * DTO para upload de arquivos através do EasyUpload
 * 
 * Define a estrutura de dados necessária para o upload de arquivos
 * via feature EasyUpload, incluindo metadados opcionais.
 */
export class UploadFileDto extends BaseDto {
  @ApiProperty({
    description: 'Descrição do arquivo sendo enviado',
    example: 'Comprovante de residência',
  })
  @IsNotEmpty({
    message: 'A descrição do arquivo é obrigatória',
  })
  @IsString({
    message: 'A descrição do arquivo deve ser uma string',
  })
  @MaxLength(255, {
    message: 'A descrição deve ter no máximo 255 caracteres',
  })
  descricao: string;

  @ApiProperty({
    description: 'Tipo do documento',
    example: 'COMPROVANTE_RESIDENCIA',
  })
  @IsNotEmpty({
    message: 'O tipo do documento é obrigatório',
  })
  @IsString({
    message: 'O tipo do documento deve ser uma string',
  })
  @MaxLength(100, {
    message: 'O tipo do documento deve ter no máximo 100 caracteres',
  })
  tipo: string;

  @ApiPropertyOptional({
    description: 'ID do cidadão associado ao documento',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', {
    message: 'O ID do cidadão deve ser um UUID válido',
  })
  cidadao_id?: string;

  @ApiPropertyOptional({
    description: 'ID da solicitação associada ao documento',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', {
    message: 'O ID da solicitação deve ser um UUID válido',
  })
  solicitacao_id?: string;

  @ApiPropertyOptional({
    description: 'Metadados adicionais do documento',
    example: { origem: 'app_mobile', versao: '1.0.0' },
  })
  @IsOptional()
  @IsObject({
    message: 'Os metadados devem ser um objeto',
  })
  metadados?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Indica se o documento é reutilizável',
    example: true,
  })
  @IsOptional()
  @IsBoolean({
    message: 'O campo reutilizável deve ser um booleano',
  })
  reutilizavel?: boolean;
}
