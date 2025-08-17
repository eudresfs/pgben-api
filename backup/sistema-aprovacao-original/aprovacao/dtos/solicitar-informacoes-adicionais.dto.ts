import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para solicitar informações adicionais em uma solicitação de aprovação
 */
export class SolicitarInformacoesAdicionaisDto {
  @ApiProperty({
    description: 'Mensagem solicitando informações adicionais',
    example: 'Por favor, forneça mais detalhes sobre o impacto financeiro desta solicitação.',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(10, { message: 'Mensagem deve ter pelo menos 10 caracteres' })
  @MaxLength(1000, { message: 'Mensagem deve ter no máximo 1000 caracteres' })
  mensagem: string;

  @ApiPropertyOptional({
    description: 'Lista de informações específicas solicitadas',
    example: ['justificativa_detalhada', 'impacto_financeiro', 'cronograma'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  informacoes_solicitadas?: string[];

  @ApiPropertyOptional({
    description: 'Prazo para fornecimento das informações (em dias)',
    example: 3,
  })
  @IsOptional()
  prazo_dias?: number;

  @ApiPropertyOptional({
    description: 'Dados de contexto da solicitação',
    example: {
      urgencia: 'media',
      categoria: 'informacoes_tecnicas',
      requer_documentacao: true,
    },
  })
  @IsOptional()
  @IsObject()
  dados_contexto?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Tags para categorização da solicitação',
    example: ['informacoes_adicionais', 'esclarecimento'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}