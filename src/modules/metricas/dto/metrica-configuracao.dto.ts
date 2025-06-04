import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoAgendamento, EstrategiaAmostragem } from '../../../entities';

/**
 * DTO para criar configuração de uma métrica
 */
export class CriarMetricaConfiguracaoDto {
  @ApiProperty({
    description: 'ID da métrica para a qual a configuração será criada',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  metrica_id: string;

  @ApiPropertyOptional({
    description: 'Habilita ou desabilita a coleta automática',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  coleta_automatica?: boolean;

  @ApiPropertyOptional({
    description: 'Tipo de agendamento para coleta automática',
    enum: TipoAgendamento,
    example: TipoAgendamento.INTERVALO,
    default: TipoAgendamento.INTERVALO,
  })
  @IsEnum(TipoAgendamento)
  @IsOptional()
  tipo_agendamento?: TipoAgendamento;

  @ApiPropertyOptional({
    description:
      'Valor do intervalo de coleta em segundos (para tipo INTERVALO)',
    example: 86400, // 1 dia
    default: 86400,
  })
  @IsNumber()
  @IsOptional()
  intervalo_segundos?: number;

  @ApiPropertyOptional({
    description: 'Expressão cron para agendamento complexo (para tipo CRON)',
    example: '0 0 * * *', // Diariamente à meia-noite
  })
  @IsString()
  @IsOptional()
  expressao_cron?: string;

  @ApiPropertyOptional({
    description: 'Nome do evento que dispara a coleta (para tipo EVENTO)',
    example: 'beneficio_aprovado',
  })
  @IsString()
  @IsOptional()
  nome_evento?: string;

  @ApiPropertyOptional({
    description: 'Número máximo de snapshots a serem mantidos (0 = sem limite)',
    example: 365,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  max_snapshots?: number;

  @ApiPropertyOptional({
    description: 'Período máximo de retenção em dias (0 = sem limite)',
    example: 365,
    default: 365,
  })
  @IsNumber()
  @IsOptional()
  periodo_retencao_dias?: number;

  @ApiPropertyOptional({
    description: 'Estratégia de amostragem para coleta de dados',
    enum: EstrategiaAmostragem,
    example: EstrategiaAmostragem.COMPLETA,
    default: EstrategiaAmostragem.COMPLETA,
  })
  @IsEnum(EstrategiaAmostragem)
  @IsOptional()
  estrategia_amostragem?: EstrategiaAmostragem;

  @ApiPropertyOptional({
    description: 'Tamanho da amostra (quando aplicável)',
    example: 1000,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  tamanho_amostra?: number;

  @ApiPropertyOptional({
    description: 'Habilita ou desabilita o cacheamento dos valores',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  cacheamento_habilitado?: boolean;

  @ApiPropertyOptional({
    description: 'Tempo de vida do cache em segundos',
    example: 300, // 5 minutos
    default: 300,
  })
  @IsNumber()
  @IsOptional()
  cache_ttl?: number;

  @ApiPropertyOptional({
    description: 'Configurações de alertas baseados no valor da métrica',
    example: [
      {
        tipo: 'valor_maximo',
        valor: 100,
        mensagem: 'Valor excedeu o limite',
        severidade: 'alta',
      },
      {
        tipo: 'valor_minimo',
        valor: 10,
        mensagem: 'Valor abaixo do mínimo',
        severidade: 'media',
      },
    ],
  })
  @IsArray()
  @IsOptional()
  alertas?: any[];

  @ApiPropertyOptional({
    description: 'Configurações de visualização',
    example: { cor: '#FF5500', icone: 'chart-line', destaque: true },
  })
  @IsOptional()
  visualizacao?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Flag que indica se a métrica deve ser exibida em dashboards',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  exibir_dashboard?: boolean;

  @ApiPropertyOptional({
    description:
      'Prioridade de exibição (ordem) no dashboard (menor = mais importante)',
    example: 100,
    default: 100,
  })
  @IsNumber()
  @IsOptional()
  prioridade_dashboard?: number;
}

/**
 * DTO para atualizar configuração de uma métrica
 */
export class AtualizarMetricaConfiguracaoDto {
  @ApiPropertyOptional({
    description: 'Habilita ou desabilita a coleta automática',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  coleta_automatica?: boolean;

  @ApiPropertyOptional({
    description: 'Tipo de agendamento para coleta automática',
    enum: TipoAgendamento,
    example: TipoAgendamento.INTERVALO,
  })
  @IsEnum(TipoAgendamento)
  @IsOptional()
  tipo_agendamento?: TipoAgendamento;

  @ApiPropertyOptional({
    description:
      'Valor do intervalo de coleta em segundos (para tipo INTERVALO)',
    example: 86400, // 1 dia
  })
  @IsNumber()
  @IsOptional()
  intervalo_segundos?: number;

  @ApiPropertyOptional({
    description: 'Expressão cron para agendamento complexo (para tipo CRON)',
    example: '0 0 * * *', // Diariamente à meia-noite
  })
  @IsString()
  @IsOptional()
  expressao_cron?: string;

  @ApiPropertyOptional({
    description: 'Nome do evento que dispara a coleta (para tipo EVENTO)',
    example: 'beneficio_aprovado',
  })
  @IsString()
  @IsOptional()
  nome_evento?: string;

  @ApiPropertyOptional({
    description: 'Número máximo de snapshots a serem mantidos (0 = sem limite)',
    example: 365,
  })
  @IsNumber()
  @IsOptional()
  max_snapshots?: number;

  @ApiPropertyOptional({
    description: 'Período máximo de retenção em dias (0 = sem limite)',
    example: 365,
  })
  @IsNumber()
  @IsOptional()
  periodo_retencao_dias?: number;

  @ApiPropertyOptional({
    description: 'Estratégia de amostragem para coleta de dados',
    enum: EstrategiaAmostragem,
    example: EstrategiaAmostragem.COMPLETA,
  })
  @IsEnum(EstrategiaAmostragem)
  @IsOptional()
  estrategia_amostragem?: EstrategiaAmostragem;

  @ApiPropertyOptional({
    description: 'Tamanho da amostra (quando aplicável)',
    example: 1000,
  })
  @IsNumber()
  @IsOptional()
  tamanho_amostra?: number;

  @ApiPropertyOptional({
    description: 'Habilita ou desabilita o cacheamento dos valores',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  cacheamento_habilitado?: boolean;

  @ApiPropertyOptional({
    description: 'Tempo de vida do cache em segundos',
    example: 300, // 5 minutos
  })
  @IsNumber()
  @IsOptional()
  cache_ttl?: number;

  @ApiPropertyOptional({
    description: 'Configurações de alertas baseados no valor da métrica',
    example: [
      {
        tipo: 'valor_maximo',
        valor: 100,
        mensagem: 'Valor excedeu o limite',
        severidade: 'alta',
      },
    ],
  })
  @IsArray()
  @IsOptional()
  alertas?: any[];

  @ApiPropertyOptional({
    description: 'Configurações de visualização',
    example: { cor: '#FF5500', icone: 'chart-line', destaque: true },
  })
  @IsOptional()
  visualizacao?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Flag que indica se a métrica deve ser exibida em dashboards',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  exibir_dashboard?: boolean;

  @ApiPropertyOptional({
    description:
      'Prioridade de exibição (ordem) no dashboard (menor = mais importante)',
    example: 100,
  })
  @IsNumber()
  @IsOptional()
  prioridade_dashboard?: number;
}
