import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Enum para motivos de cancelamento
 */
export enum MotivoCancelamento {
  SOLICITACAO_INCORRETA = 'solicitacao_incorreta',
  MUDANCA_REQUISITOS = 'mudanca_requisitos',
  NAO_MAIS_NECESSARIO = 'nao_mais_necessario',
  ERRO_PROCESSO = 'erro_processo',
  DECISAO_GESTAO = 'decisao_gestao',
  OUTROS = 'outros',
}

/**
 * DTO para cancelar uma solicitação de aprovação
 */
export class CancelarSolicitacaoDto {
  @ApiProperty({
    description: 'Motivo do cancelamento',
    enum: MotivoCancelamento,
    example: MotivoCancelamento.NAO_MAIS_NECESSARIO,
  })
  @IsEnum(MotivoCancelamento)
  motivo: MotivoCancelamento;

  @ApiProperty({
    description: 'Justificativa detalhada para o cancelamento',
    example: 'A solicitação não é mais necessária devido a mudanças no escopo do projeto.',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(10, { message: 'Justificativa deve ter pelo menos 10 caracteres' })
  @MaxLength(1000, { message: 'Justificativa deve ter no máximo 1000 caracteres' })
  justificativa: string;

  @ApiPropertyOptional({
    description: 'Observações adicionais sobre o cancelamento',
    example: 'Cancelamento aprovado pela coordenação do projeto.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Indica se deve notificar todos os envolvidos',
    example: true,
  })
  @IsOptional()
  notificar_envolvidos?: boolean;

  @ApiPropertyOptional({
    description: 'Dados de contexto do cancelamento',
    example: {
      impacto: 'baixo',
      requer_comunicacao_externa: false,
      categoria_cancelamento: 'administrativo',
    },
  })
  @IsOptional()
  @IsObject()
  dados_contexto?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Tags para categorização do cancelamento',
    example: ['cancelamento_administrativo', 'mudanca_escopo'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}