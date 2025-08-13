import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para rejeição de uma solicitação
 * Define os dados necessários para rejeitar uma solicitação de aprovação
 */
export class RejeitarSolicitacaoDto {
  @ApiProperty({
    description: 'ID do aprovador que está realizando a rejeição',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4, { message: 'ID do aprovador deve ser um UUID válido' })
  aprovador_id: string;

  @ApiProperty({
    description: 'Motivo da rejeição',
    example: 'Documentação incompleta - faltam comprovantes necessários',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(10, { message: 'Motivo deve ter pelo menos 10 caracteres' })
  @MaxLength(1000, { message: 'Motivo deve ter no máximo 1000 caracteres' })
  motivo_rejeicao: string;

  @ApiPropertyOptional({
    description: 'Justificativa adicional para a rejeição',
    example:
      'Solicitação não atende aos critérios estabelecidos na política XYZ',
    minLength: 10,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Justificativa deve ter pelo menos 10 caracteres' })
  @MaxLength(1000, {
    message: 'Justificativa deve ter no máximo 1000 caracteres',
  })
  justificativa?: string;

  @ApiPropertyOptional({
    description: 'Dados de contexto da rejeição',
    example: {
      itens_faltantes: ['comprovante_renda', 'documento_identidade'],
      sugestoes_correcao: 'Incluir documentos em formato PDF',
      permite_resubmissao: true,
    },
  })
  @IsOptional()
  @IsObject()
  dados_contexto?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Lista de anexos da rejeição',
    example: [
      {
        nome: 'checklist_documentos.pdf',
        url: 'https://storage.com/checklist.pdf',
        tipo: 'application/pdf',
        tamanho: 256000,
      },
    ],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  anexos?: Array<{
    nome: string;
    url: string;
    tipo: string;
    tamanho: number;
  }>;

  @ApiPropertyOptional({
    description: 'Tags para categorização da rejeição',
    example: ['documentacao_incompleta', 'requer_correcao'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Metadados adicionais da rejeição',
    example: {
      tempo_analise_minutos: 30,
      categoria_rejeicao: 'documentacao',
      permite_recurso: true,
    },
  })
  @IsOptional()
  @IsObject()
  metadados?: Record<string, any>;
}
