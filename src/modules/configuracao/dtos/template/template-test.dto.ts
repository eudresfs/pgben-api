import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { TemplateTipoEnum } from '../../../../enums';

/**
 * DTO para testar a renderização de um template com dados de exemplo.
 */
export class TemplateTestDto {
  @ApiProperty({
    description: 'Código do template a ser renderizado',
    example: 'email.nova-solicitacao',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'O código do template deve ser uma string' })
  codigo?: string;
  
  @ApiProperty({
    description: 'Conteúdo do template (alternativo ao código)',
    example: '<p>Olá {{nome}},</p><p>Sua solicitação foi registrada.</p>',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'O conteúdo do template deve ser uma string' })
  conteudo?: string;
  
  @ApiProperty({
    description: 'Tipo do template',
    enum: TemplateTipoEnum,
    example: TemplateTipoEnum.EMAIL,
    required: false
  })
  @IsOptional()
  @IsEnum(TemplateTipoEnum, { message: 'Tipo de template inválido' })
  tipo?: TemplateTipoEnum;

  @ApiProperty({
    description: 'Dados para substituir as variáveis do template',
    example: {
      nome: 'João Silva',
      tipo_beneficio: 'Auxílio Natalidade',
      data_solicitacao: '2023-01-15',
    },
    type: 'object',
    additionalProperties: true
  })
  @IsNotEmpty({ message: 'Os dados para renderização são obrigatórios' })
  @IsObject({ message: 'Os dados devem estar em formato de objeto' })
  dados: Record<string, any>;
}
