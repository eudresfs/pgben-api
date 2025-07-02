import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayNotEmpty,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsIn,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CanalNotificacao } from '../../../entities/notification-template.entity';

/**
 * DTO para criação de templates de notificação
 */
export class CreateNotificationTemplateDto {
  @ApiProperty({
    description: 'Código único do template de notificação',
    example: 'usuario-credenciais-acesso',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  codigo: string;

  @ApiProperty({
    description: 'Nome do template de notificação',
    example: 'Credenciais de Acesso do Usuário',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nome: string;

  @ApiProperty({
    description: 'Tipo do template',
    example: 'sistema',
    enum: ['sistema', 'usuario', 'automatico'],
    default: 'sistema',
  })
  @IsString()
  @IsOptional()
  @IsIn(['sistema', 'usuario', 'automatico'])
  tipo?: string;

  @ApiProperty({
    description: 'Descrição do template de notificação',
    example: 'Template para envio de credenciais de acesso ao usuário',
    required: false,
  })
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiProperty({
    description: 'Assunto da notificação',
    example: 'Suas credenciais de acesso - PGBEN',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  assunto: string;

  @ApiProperty({
    description: 'Conteúdo em texto simples do template',
    example:
      'Suas credenciais de acesso foram criadas. Login: {{email}}, Senha: {{senha}}',
  })
  @IsString()
  @IsNotEmpty()
  corpo: string;

  @ApiProperty({
    description:
      'Conteúdo HTML do template com variáveis no formato {{variavel}}',
    example:
      '<h2>Bem-vindo!</h2><p>Suas credenciais: <strong>{{email}}</strong></p>',
    required: false,
  })
  @IsString()
  @IsOptional()
  corpo_html?: string;

  @ApiProperty({
    description: 'Canais de notificação suportados por este template',
    type: [String],
    example: ['email', 'sms'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  canais_disponiveis: string[];

  @ApiProperty({
    description: 'Variáveis requeridas pelo template em formato JSON',
    example: '["nome", "email", "senha"]',
  })
  @IsString()
  @IsNotEmpty()
  variaveis_requeridas: string;

  @ApiProperty({
    description: 'Categoria do template',
    example: 'autenticacao',
    enum: ['autenticacao', 'seguranca', 'beneficio', 'sistema'],
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(['autenticacao', 'seguranca', 'beneficio', 'sistema'])
  categoria?: string;

  @ApiProperty({
    description: 'Prioridade do template',
    example: 'normal',
    enum: ['baixa', 'normal', 'alta', 'critica'],
    default: 'normal',
  })
  @IsString()
  @IsOptional()
  @IsIn(['baixa', 'normal', 'alta', 'critica'])
  prioridade?: string;

  @ApiProperty({
    description: 'Indica se o template está ativo',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}
