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
 * DTO para delegação de uma solicitação
 * Define os dados necessários para delegar uma solicitação de aprovação para outro aprovador
 */
export class DelegarSolicitacaoDto {
  @ApiProperty({
    description: 'ID do aprovador que está delegando',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4, { message: 'ID do aprovador deve ser um UUID válido' })
  aprovador_id: string;

  @ApiProperty({
    description: 'ID do usuário para quem a solicitação está sendo delegada',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID(4, { message: 'ID do usuário delegado deve ser um UUID válido' })
  delegado_para_usuario_id: string;

  @ApiProperty({
    description: 'Justificativa para a delegação',
    example:
      'Delegando para especialista da área técnica para análise mais detalhada',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(10, { message: 'Justificativa deve ter pelo menos 10 caracteres' })
  @MaxLength(1000, {
    message: 'Justificativa deve ter no máximo 1000 caracteres',
  })
  justificativa: string;

  @ApiPropertyOptional({
    description: 'Dados de contexto da delegação',
    example: {
      motivo_delegacao: 'expertise_tecnica',
      prazo_delegacao: '2024-01-20T18:00:00Z',
      instrucoes_especiais: 'Verificar conformidade técnica',
    },
  })
  @IsOptional()
  @IsObject()
  dados_contexto?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Lista de anexos da delegação',
    example: [
      {
        nome: 'instrucoes_delegacao.pdf',
        url: 'https://storage.com/instrucoes.pdf',
        tipo: 'application/pdf',
        tamanho: 128000,
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
    description: 'Tags para categorização da delegação',
    example: ['delegacao_tecnica', 'expertise_necessaria'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Metadados adicionais da delegação',
    example: {
      tipo_delegacao: 'expertise',
      urgencia: 'media',
      retorna_para_delegante: false,
    },
  })
  @IsOptional()
  @IsObject()
  metadados?: Record<string, any>;
}
