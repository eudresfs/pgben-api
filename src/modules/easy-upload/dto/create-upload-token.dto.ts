import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsNumber,
  IsArray,
  IsString,
  IsObject,
  Min,
  Max,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para documento obrigatório
 */
export class RequiredDocumentDto {
  @ApiProperty({
    description: 'Tipo do documento obrigatório',
    example: 'RG',
  })
  @IsNotEmpty({ message: 'Tipo do documento é obrigatório' })
  @IsString({ message: 'Tipo do documento deve ser uma string' })
  tipo: string;

  @ApiProperty({
    description: 'Descrição do documento',
    example: 'Documento de identidade (RG)',
  })
  @IsNotEmpty({ message: 'Descrição do documento é obrigatória' })
  @IsString({ message: 'Descrição deve ser uma string' })
  descricao: string;

  @ApiPropertyOptional({
    description: 'Se o documento é obrigatório',
    example: true,
    default: true,
  })
  @IsOptional()
  obrigatorio?: boolean;

  @ApiPropertyOptional({
    description: 'Formatos aceitos para o documento',
    example: ['pdf', 'jpg', 'png'],
  })
  @IsOptional()
  @IsArray({ message: 'Formatos aceitos deve ser um array' })
  @IsString({ each: true, message: 'Cada formato deve ser uma string' })
  formatos_aceitos?: string[];

  @ApiPropertyOptional({
    description: 'Tamanho máximo do arquivo em MB',
    example: 5,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tamanho máximo deve ser um número' })
  @Min(1, { message: 'Tamanho máximo deve ser pelo menos 1MB' })
  @Max(50, { message: 'Tamanho máximo não pode exceder 50MB' })
  tamanho_maximo_mb?: number;
}

/**
 * DTO para criação de token de upload
 */
export class CreateUploadTokenDto {
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
    type: [RequiredDocumentDto],
  })
  @IsOptional()
  @IsArray({ message: 'Documentos obrigatórios deve ser um array' })
  @ArrayMinSize(0, { message: 'Array de documentos não pode estar vazio se fornecido' })
  @ArrayMaxSize(20, { message: 'Máximo de 20 tipos de documentos permitidos' })
  @ValidateNested({ each: true })
  @Type(() => RequiredDocumentDto)
  required_documents?: RequiredDocumentDto[];

  @ApiPropertyOptional({
    description: 'Metadados adicionais do token',
    example: {
      tipo_beneficio: 'auxilio_natalidade',
      observacoes: 'Upload de documentos para análise',
    },
  })
  @IsOptional()
  @IsObject({ message: 'Metadados deve ser um objeto' })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Instruções específicas para o upload',
    example: 'Por favor, envie apenas documentos legíveis e em boa qualidade.',
  })
  @IsOptional()
  @IsString({ message: 'Instruções devem ser uma string' })
  instrucoes?: string;

  @ApiPropertyOptional({
    description: 'Se deve enviar notificação por email',
    example: true,
    default: false,
  })
  @IsOptional()
  notificar_email?: boolean;

  @ApiPropertyOptional({
    description: 'Se deve enviar notificação por SMS',
    example: false,
    default: false,
  })
  @IsOptional()
  notificar_sms?: boolean;
}