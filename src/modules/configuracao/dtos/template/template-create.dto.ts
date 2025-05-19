import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TemplateTipoEnum } from '../../enums';

/**
 * DTO para criação de um novo template.
 */
export class TemplateCreateDto {
  @ApiProperty({
    description: 'Código único que identifica o template',
    example: 'email.nova-solicitacao',
    maxLength: 100
  })
  @IsNotEmpty({ message: 'O código é obrigatório' })
  @IsString({ message: 'O código deve ser uma string' })
  @MinLength(3, { message: 'O código deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'O código deve ter no máximo 100 caracteres' })
  codigo: string;

  @ApiProperty({
    description: 'Nome descritivo do template',
    example: 'Email de Nova Solicitação',
    maxLength: 200
  })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  @IsString({ message: 'O nome deve ser uma string' })
  @MaxLength(200, { message: 'O nome deve ter no máximo 200 caracteres' })
  nome: string;

  @ApiProperty({
    description: 'Tipo do template',
    enum: TemplateTipoEnum,
    example: TemplateTipoEnum.EMAIL
  })
  @IsNotEmpty({ message: 'O tipo é obrigatório' })
  @IsEnum(TemplateTipoEnum, { message: 'Tipo de template inválido' })
  tipo: TemplateTipoEnum;

  @ApiProperty({
    description: 'Assunto do template (obrigatório para emails)',
    example: 'Nova solicitação de benefício registrada',
    maxLength: 200,
    required: false
  })
  @IsOptional()
  @IsString({ message: 'O assunto deve ser uma string' })
  @MaxLength(200, { message: 'O assunto deve ter no máximo 200 caracteres' })
  assunto?: string;

  @ApiProperty({
    description: 'Conteúdo do template em formato HTML ou texto com placeholders',
    example: '<p>Olá {{nome}},</p><p>Sua solicitação de benefício {{tipo_beneficio}} foi registrada com sucesso.</p>'
  })
  @IsNotEmpty({ message: 'O conteúdo é obrigatório' })
  @IsString({ message: 'O conteúdo deve ser uma string' })
  conteudo: string;

  @ApiProperty({
    description: 'Lista de variáveis disponíveis para substituição no template',
    example: ['nome', 'tipo_beneficio', 'data_solicitacao'],
    type: [String]
  })
  @IsArray({ message: 'As variáveis devem estar em um array' })
  @IsString({ each: true, message: 'Cada variável deve ser uma string' })
  variaveis: string[];

  @ApiProperty({
    description: 'Status ativo/inativo do template',
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'O status deve ser um booleano' })
  ativo?: boolean;
}
