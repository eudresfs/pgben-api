import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO para atualização de um template existente.
 */
export class TemplateUpdateDto {
  @ApiProperty({
    description: 'Nome descritivo do template',
    example: 'Email de Nova Solicitação',
    maxLength: 200,
    required: false
  })
  @IsOptional()
  @IsString({ message: 'O nome deve ser uma string' })
  @MaxLength(200, { message: 'O nome deve ter no máximo 200 caracteres' })
  nome?: string;

  @ApiProperty({
    description: 'Assunto do template (para emails)',
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
    description: 'Status ativo/inativo do template',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: 'O status deve ser um booleano' })
  ativo?: boolean;
}
