import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsNumber,
  IsString,
  IsArray,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO simplificado para criação de token de upload
 */
export class CreateTokenDto {
  @ApiProperty({
    description: 'ID da solicitação de benefício',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'ID da solicitação é obrigatório' })
  @IsUUID('4', { message: 'ID da solicitação deve ser um UUID válido' })
  solicitacao_id: string;

  @ApiProperty({
    description: 'ID do cidadão',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  @IsUUID('4', { message: 'ID do cidadão deve ser um UUID válido' })
  cidadao_id: string;

  @ApiPropertyOptional({
    description: 'Número máximo de arquivos permitidos',
    example: 5,
    default: 10,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Número máximo de arquivos deve ser um número' })
  @Min(1, { message: 'Deve permitir pelo menos 1 arquivo' })
  @Max(50, { message: 'Não pode exceder 50 arquivos' })
  max_files?: number;

  @ApiPropertyOptional({
    description: 'Tempo de expiração do token em minutos',
    example: 60,
    default: 120,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tempo de expiração deve ser um número' })
  @Min(5, { message: 'Tempo mínimo de expiração é 5 minutos' })
  @Max(1440, { message: 'Tempo máximo de expiração é 24 horas' })
  expires_in_minutes?: number;

  @ApiPropertyOptional({
    description: 'Lista de documentos obrigatórios',
    example: ['RG', 'CPF', 'Comprovante de Residência'],
  })
  @IsOptional()
  @IsArray({ message: 'Documentos obrigatórios deve ser um array' })
  required_documents?: string[];

  @ApiPropertyOptional({
    description: 'Instruções específicas para o upload',
    example: 'Por favor, envie apenas documentos legíveis e em boa qualidade.',
  })
  @IsOptional()
  @IsString({ message: 'Instruções devem ser uma string' })
  instrucoes?: string;
}
