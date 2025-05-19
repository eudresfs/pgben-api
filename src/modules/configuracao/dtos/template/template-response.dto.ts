import { ApiProperty } from '@nestjs/swagger';
import { TemplateTipoEnum } from '../../enums';

/**
 * DTO para resposta com informações de um template.
 */
export class TemplateResponseDto {
  @ApiProperty({
    description: 'Código único que identifica o template',
    example: 'email.nova-solicitacao'
  })
  codigo: string;

  @ApiProperty({
    description: 'Nome descritivo do template',
    example: 'Email de Nova Solicitação'
  })
  nome: string;

  @ApiProperty({
    description: 'Tipo do template',
    enum: TemplateTipoEnum,
    example: TemplateTipoEnum.EMAIL
  })
  tipo: string;

  @ApiProperty({
    description: 'Assunto do template (para emails)',
    example: 'Nova solicitação de benefício registrada',
    required: false
  })
  assunto?: string;

  @ApiProperty({
    description: 'Conteúdo do template em formato HTML ou texto com placeholders',
    example: '<p>Olá {{nome}},</p><p>Sua solicitação de benefício {{tipo_beneficio}} foi registrada com sucesso.</p>'
  })
  conteudo: string;

  @ApiProperty({
    description: 'Lista de variáveis disponíveis para substituição no template',
    example: ['nome', 'tipo_beneficio', 'data_solicitacao'],
    type: [String]
  })
  variaveis: string[];

  @ApiProperty({
    description: 'Status ativo/inativo do template',
    example: true
  })
  ativo: boolean;

  @ApiProperty({
    description: 'Data de criação do template',
    example: '2025-05-18T20:10:30.123Z'
  })
  created_at: Date;

  @ApiProperty({
    description: 'Data da última atualização do template',
    example: '2025-05-18T20:15:45.678Z'
  })
  updated_at: Date;

  @ApiProperty({
    description: 'Usuário que realizou a última atualização',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'Administrador'
    }
  })
  updated_by: {
    id: string;
    nome: string;
  };
}
