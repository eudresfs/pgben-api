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
 * DTO para aprovação de uma solicitação
 * Define os dados necessários para aprovar uma solicitação de aprovação
 */
export class AprovarSolicitacaoDto {
  @ApiProperty({
    description: 'ID do aprovador que está realizando a aprovação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4, { message: 'ID do aprovador deve ser um UUID válido' })
  aprovador_id: string;

  @ApiPropertyOptional({
    description: 'Justificativa para a aprovação',
    example: 'Solicitação está de acordo com as políticas da empresa',
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
    description: 'Dados de contexto da aprovação',
    example: {
      revisao_realizada: true,
      documentos_verificados: ['doc1.pdf', 'doc2.pdf'],
      observacoes: 'Aprovação com ressalvas',
    },
  })
  @IsOptional()
  @IsObject()
  dados_contexto?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Lista de anexos da aprovação',
    example: [
      {
        nome: 'parecer_aprovacao.pdf',
        url: 'https://storage.com/parecer.pdf',
        tipo: 'application/pdf',
        tamanho: 512000,
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
    description: 'Tags para categorização da aprovação',
    example: ['aprovado_com_ressalvas', 'revisao_necessaria'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Metadados adicionais da aprovação',
    example: {
      tempo_analise_minutos: 45,
      complexidade: 'media',
      requer_followup: false,
    },
  })
  @IsOptional()
  @IsObject()
  metadados?: Record<string, any>;
}
