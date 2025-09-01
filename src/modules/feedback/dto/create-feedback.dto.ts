import {
  IsEnum,
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  Length,
  MaxLength,
  IsNotEmpty,
  ArrayMaxSize,
  ValidateNested
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoFeedbackEnum, PrioridadeFeedbackEnum } from '../enums';

/**
 * DTO para criação de feedback
 */
export class CreateFeedbackDto {
  @ApiProperty({
    description: 'Tipo do feedback',
    enum: TipoFeedbackEnum,
    example: TipoFeedbackEnum.SUGESTAO
  })
  @IsEnum(TipoFeedbackEnum, {
    message: 'Tipo de feedback deve ser um dos valores válidos: sugestao, reclamacao, elogio, bug, melhoria'
  })
  @IsNotEmpty({ message: 'Tipo do feedback é obrigatório' })
  tipo: TipoFeedbackEnum;

  @ApiProperty({
    description: 'Título do feedback',
    minLength: 5,
    maxLength: 200,
    example: 'Sugestão para melhorar a interface'
  })
  @IsString({ message: 'Título deve ser uma string' })
  @IsNotEmpty({ message: 'Título é obrigatório' })
  @Length(5, 200, {
    message: 'Título deve ter entre 5 e 200 caracteres'
  })
  @Transform(({ value }) => value?.trim())
  titulo: string;

  @ApiProperty({
    description: 'Descrição detalhada do feedback',
    minLength: 10,
    maxLength: 5000,
    example: 'Seria interessante adicionar um modo escuro para melhorar a experiência do usuário durante o uso noturno.'
  })
  @IsString({ message: 'Descrição deve ser uma string' })
  @IsNotEmpty({ message: 'Descrição é obrigatória' })
  @Length(10, 5000, {
    message: 'Descrição deve ter entre 10 e 5000 caracteres'
  })
  @Transform(({ value }) => value?.trim())
  descricao: string;

  @ApiPropertyOptional({
    description: 'Prioridade do feedback',
    enum: PrioridadeFeedbackEnum,
    default: PrioridadeFeedbackEnum.MEDIA,
    example: PrioridadeFeedbackEnum.ALTA
  })
  @IsOptional()
  @IsEnum(PrioridadeFeedbackEnum, {
    message: 'Prioridade deve ser um dos valores válidos: baixa, media, alta, critica'
  })
  prioridade?: PrioridadeFeedbackEnum = PrioridadeFeedbackEnum.MEDIA;

  @ApiPropertyOptional({
    description: 'Página ou seção do sistema onde o feedback foi gerado',
    maxLength: 100,
    example: '/dashboard/usuarios'
  })
  @IsOptional()
  @IsString({ message: 'Página de origem deve ser uma string' })
  @MaxLength(100, {
    message: 'Página de origem deve ter no máximo 100 caracteres'
  })
  @Transform(({ value }) => value?.trim())
  pagina_origem?: string;

  @ApiPropertyOptional({
    description: 'Versão do sistema quando o feedback foi enviado',
    maxLength: 50,
    example: '1.2.3'
  })
  @IsOptional()
  @IsString({ message: 'Versão do sistema deve ser uma string' })
  @MaxLength(50, {
    message: 'Versão do sistema deve ter no máximo 50 caracteres'
  })
  @Transform(({ value }) => value?.trim())
  versao_sistema?: string;

  @ApiPropertyOptional({
    description: 'Informações técnicas adicionais (user agent, resolução, etc.)',
    maxLength: 1000,
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  })
  @IsOptional()
  @IsString({ message: 'Informações técnicas devem ser uma string' })
  @MaxLength(1000, {
    message: 'Informações técnicas devem ter no máximo 1000 caracteres'
  })
  informacoes_tecnicas?: string;

  @ApiPropertyOptional({
    description: 'IDs das tags associadas ao feedback',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'],
    maxItems: 10
  })
  @IsOptional()
  @IsArray({ message: 'Tags devem ser um array' })
  @ArrayMaxSize(10, {
    message: 'Máximo de 10 tags por feedback'
  })
  @IsUUID('4', {
    each: true,
    message: 'Cada tag deve ser um UUID válido'
  })
  tag_ids?: string[];

  @ApiPropertyOptional({
    description: 'Nomes de novas tags a serem criadas',
    type: [String],
    example: ['interface', 'usabilidade'],
    maxItems: 5
  })
  @IsOptional()
  @IsArray({ message: 'Novas tags devem ser um array' })
  @ArrayMaxSize(5, {
    message: 'Máximo de 5 novas tags por feedback'
  })
  @IsString({
    each: true,
    message: 'Cada nova tag deve ser uma string'
  })
  @Length(2, 30, {
    each: true,
    message: 'Cada nova tag deve ter entre 2 e 30 caracteres'
  })
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map(tag => tag?.trim().toLowerCase());
    }
    return value;
  })
  novas_tags?: string[];
}

/**
 * DTO para informações do usuário (extraído do token JWT)
 */
export class FeedbackUserInfo {
  @IsUUID('4', { message: 'ID do usuário deve ser um UUID válido' })
  usuario_id: string;

  @IsOptional()
  @IsString()
  ip_origem?: string;
}