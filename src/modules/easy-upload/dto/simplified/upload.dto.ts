import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO simplificado para upload de arquivo
 */
export class UploadDto {
  @ApiProperty({
    description: 'Tipo do documento',
    example: 'RG',
  })
  @IsNotEmpty({ message: 'Tipo do documento é obrigatório' })
  @IsString({ message: 'Tipo do documento deve ser uma string' })
  tipo_documento: string;

  @ApiProperty({
    description: 'Descrição do documento',
    example: 'Documento de identidade',
  })
  @IsNotEmpty({ message: 'Descrição do documento é obrigatória' })
  @IsString({ message: 'Descrição deve ser uma string' })
  descricao: string;

  @ApiPropertyOptional({
    description: 'Metadados adicionais do documento',
    example: {
      observacoes: 'Documento frente e verso',
    },
  })
  @IsOptional()
  @IsObject({ message: 'Metadados deve ser um objeto' })
  metadata?: Record<string, any>;
}
