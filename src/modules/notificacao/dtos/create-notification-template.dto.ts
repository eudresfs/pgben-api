import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayNotEmpty,
  IsEnum,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CanalNotificacao } from '../entities/notification-template.entity';

/**
 * DTO para criação de templates de notificação
 */
export class CreateNotificationTemplateDto {
  @ApiProperty({
    description: 'Nome do template de notificação',
    example: 'confirmacao-solicitacao',
  })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({
    description: 'Descrição do template de notificação',
    example:
      'Template para confirmação de abertura de solicitação de benefício',
  })
  @IsString()
  @IsNotEmpty()
  descricao: string;

  @ApiProperty({
    description: 'Assunto da notificação',
    example: 'Confirmação da sua solicitação de benefício',
  })
  @IsString()
  @IsNotEmpty()
  assunto: string;

  @ApiProperty({
    description: 'Conteúdo do template com variáveis no formato {{variavel}}',
    example:
      'Olá {{nome}}, sua solicitação de benefício #{{protocolo}} foi registrada com sucesso.',
  })
  @IsString()
  @IsNotEmpty()
  template_conteudo: string;

  @ApiProperty({
    description: 'Canais de notificação suportados por este template',
    enum: CanalNotificacao,
    isArray: true,
    example: [CanalNotificacao.EMAIL, CanalNotificacao.IN_APP],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(CanalNotificacao, { each: true })
  canais_suportados: CanalNotificacao[];

  @ApiProperty({
    description: 'Indica se o template está ativo',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}
