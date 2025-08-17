import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsBoolean,
  IsEnum,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para anexos do processamento
 */
export class AnexoProcessamentoDto {
  @ApiProperty({
    description: 'Nome do arquivo',
    example: 'parecer_tecnico.pdf',
  })
  @IsString()
  @MaxLength(255)
  nome: string;

  @ApiProperty({
    description: 'Tipo MIME do arquivo',
    example: 'application/pdf',
  })
  @IsString()
  @MaxLength(100)
  tipo: string;

  @ApiProperty({
    description: 'Tamanho do arquivo em bytes',
    example: 512000,
  })
  tamanho: number;

  @ApiProperty({
    description: 'URL ou caminho do arquivo',
    example: '/uploads/pareceres/parecer_tecnico.pdf',
  })
  @IsString()
  @MaxLength(500)
  url: string;

  @ApiPropertyOptional({
    description: 'Descrição do anexo',
    example: 'Parecer técnico detalhado sobre a solicitação',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  descricao?: string;
}

/**
 * DTO para processar aprovação (aprovar, rejeitar ou solicitar informações)
 */
export class ProcessarAprovacaoDto {
  @ApiProperty({
    description: 'Comentário ou justificativa do aprovador',
    example: 'Aprovado conforme análise técnica. Todos os requisitos foram atendidos.',
    minLength: 5,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(5, { message: 'Comentário deve ter pelo menos 5 caracteres' })
  @MaxLength(1000, { message: 'Comentário não pode exceder 1000 caracteres' })
  comentario: string;

  @ApiPropertyOptional({
    description: 'Dados adicionais do processamento',
    example: {
      criterios_avaliados: ['viabilidade_tecnica', 'impacto_financeiro'],
      pontuacao: 8.5,
      recomendacoes: 'Implementar com acompanhamento mensal',
    },
  })
  @IsOptional()
  @IsObject()
  dados_processamento?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Lista de anexos do processamento (pareceres, documentos)',
    type: [AnexoProcessamentoDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnexoProcessamentoDto)
  anexos?: AnexoProcessamentoDto[];

  @ApiPropertyOptional({
    description: 'Tags para categorização do processamento',
    example: ['aprovado_com_restricoes', 'requer_acompanhamento'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Nível de confiança na decisão (0-100)',
    example: 95,
  })
  @IsOptional()
  nivel_confianca?: number;

  @ApiPropertyOptional({
    description: 'Indica se requer acompanhamento posterior',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  requer_acompanhamento?: boolean;

  @ApiPropertyOptional({
    description: 'Prazo para acompanhamento (em dias)',
    example: 30,
  })
  @IsOptional()
  prazo_acompanhamento?: number;

  @ApiPropertyOptional({
    description: 'Condições ou restrições da aprovação',
    example: [
      'Implementar em ambiente de teste primeiro',
      'Obter aprovação do cliente antes da execução',
      'Documentar todos os passos do processo',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  condicoes?: string[];

  @ApiPropertyOptional({
    description: 'Riscos identificados durante a análise',
    example: [
      'Possível impacto em outros sistemas',
      'Necessidade de recursos adicionais',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  riscos_identificados?: string[];

  @ApiPropertyOptional({
    description: 'Recomendações do aprovador',
    example: [
      'Realizar backup completo antes da implementação',
      'Agendar implementação fora do horário comercial',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  recomendacoes?: string[];

  @ApiPropertyOptional({
    description: 'Categoria da decisão',
    enum: ['tecnica', 'administrativa', 'financeira', 'juridica', 'estrategica'],
    example: 'tecnica',
  })
  @IsOptional()
  @IsEnum(['tecnica', 'administrativa', 'financeira', 'juridica', 'estrategica'])
  categoria_decisao?: 'tecnica' | 'administrativa' | 'financeira' | 'juridica' | 'estrategica';

  @ApiPropertyOptional({
    description: 'Impacto estimado da decisão',
    enum: ['baixo', 'medio', 'alto', 'critico'],
    example: 'medio',
  })
  @IsOptional()
  @IsEnum(['baixo', 'medio', 'alto', 'critico'])
  impacto_estimado?: 'baixo' | 'medio' | 'alto' | 'critico';

  @ApiPropertyOptional({
    description: 'Urgência da implementação',
    enum: ['baixa', 'normal', 'alta', 'critica'],
    example: 'normal',
  })
  @IsOptional()
  @IsEnum(['baixa', 'normal', 'alta', 'critica'])
  urgencia?: 'baixa' | 'normal' | 'alta' | 'critica';

  @ApiPropertyOptional({
    description: 'Indica se a decisão é final ou se pode ser revista',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  decisao_final?: boolean;

  @ApiPropertyOptional({
    description: 'Observações internas (não visíveis ao solicitante)',
    example: 'Decisão tomada após consulta com a equipe técnica',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes_internas?: string;

  @ApiPropertyOptional({
    description: 'Metadados adicionais do processamento',
    example: {
      tempo_analise_minutos: 45,
      ferramentas_utilizadas: ['checklist_seguranca', 'analise_impacto'],
      consultores_envolvidos: ['joao.silva', 'maria.santos'],
    },
  })
  @IsOptional()
  @IsObject()
  metadados?: Record<string, any>;
}