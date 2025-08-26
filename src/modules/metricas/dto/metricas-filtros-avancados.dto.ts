import { IsOptional, IsString, IsDateString, IsUUID, IsEnum, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { DashboardFiltrosDto } from './dashboard-filtros.dto';

/**
 * Função utilitária para transformar valores em arrays, incluindo parsing de JSON strings
 * Aplica o princípio DRY evitando duplicação de código de transformação
 * 
 * @param value - Valor a ser transformado
 * @returns Array filtrado ou undefined se vazio
 */
function transformToStringArray(value: any): string[] | undefined {
  if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
    return undefined;
  }
  
  // Se é uma string que parece ser JSON array, tenta fazer o parse
  if (typeof value === 'string' && value.trim().startsWith('[') && value.trim().endsWith(']')) {
    try {
      const parsed = JSON.parse(value.trim());
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(v => v && typeof v === 'string' && v.trim() !== '');
        return filtered.length > 0 ? filtered : undefined;
      }
    } catch (error) {
      // Fallback: usar regex para extrair valores de array sem aspas
      const arrayMatch = value.trim().match(/^\[(.+)\]$/);
      if (arrayMatch) {
        const content = arrayMatch[1];
        const items = content.split(',').map(item => item.trim()).filter(item => item !== '');
        return items.length > 0 ? items : undefined;
      }
      // Se falhar o parse, trata como string normal
    }
  }
  
  if (Array.isArray(value)) {
    const filtered = value.filter(v => v && v.trim() !== '');
    return filtered.length > 0 ? filtered : undefined;
  }
  
  return value.trim() !== '' ? [value] : undefined;
}

/**
 * Enum para períodos predefinidos
 */
export enum PeriodoPredefinido {
  HOJE = 'hoje',
  ONTEM = 'ontem',
  ULTIMOS_7_DIAS = 'ultimos_7_dias',
  ULTIMOS_30_DIAS = 'ultimos_30_dias',
  ULTIMOS_90_DIAS = 'ultimos_90_dias',
  MES_ATUAL = 'mes_atual',
  MES_ANTERIOR = 'mes_anterior',
  TRIMESTRE_ATUAL = 'trimestre_atual',
  TRIMESTRE_ANTERIOR = 'trimestre_anterior',
  ANO_ATUAL = 'ano_atual',
  ANO_ANTERIOR = 'ano_anterior',
  PERSONALIZADO = 'personalizado'
}

/**
 * Enum para status de solicitação
 */
export enum StatusSolicitacao {
  PENDENTE = 'pendente',
  EM_ANALISE = 'em_analise',
  APROVADO = 'aprovado',
  REJEITADO = 'rejeitado',
  SUSPENSO = 'suspenso',
  CANCELADO = 'cancelado',
  CONCLUIDO = 'concluido'
}

/**
 * DTO para filtros avançados das métricas de dashboard
 * 
 * Estende os filtros básicos com funcionalidades avançadas como:
 * - Filtros múltiplos (arrays)
 * - Períodos predefinidos
 * - Filtro por usuário
 * - Validações mais robustas
 */
export class MetricasFiltrosAvancadosDto extends DashboardFiltrosDto {
  @ApiPropertyOptional({
    description: 'IDs das unidades para filtrar os dados (múltiplas unidades)',
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
    type: [String]
  })
  @IsOptional()
  @IsArray({ message: 'unidades deve ser um array' })
  @Type(() => String)
  @Transform(({ value }) => transformToStringArray(value))
  unidades?: string[];

  @ApiPropertyOptional({
    description: 'IDs dos benefícios para filtrar os dados (múltiplos benefícios)',
    example: ['123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002'],
    type: [String]
  })
  @IsOptional()
  @IsArray({ message: 'beneficios deve ser um array' })
  @Type(() => String)
  @Transform(({ value }) => transformToStringArray(value))
  beneficios?: string[];

  @ApiPropertyOptional({
    description: 'Nomes dos bairros para filtrar os dados (múltiplos bairros)',
    example: ['Centro', 'Copacabana', 'Ipanema'],
    type: [String]
  })
  @IsOptional()
  @IsArray({ message: 'bairros deve ser um array' })
  @IsString({ each: true, message: 'Cada bairro deve ser uma string' })
  @Type(() => String)
  @Transform(({ value }) => transformToStringArray(value))
  bairros?: string[];

  @ApiPropertyOptional({
    description: 'Status das solicitações para filtrar os dados (múltiplos status)',
    example: ['aprovado', 'pendente'],
    enum: StatusSolicitacao,
    isArray: true
  })
  @IsOptional()
  @IsArray({ message: 'statusList deve ser um array' })
  @IsEnum(StatusSolicitacao, { each: true, message: 'Cada status deve ser um valor válido' })
  @Type(() => String)
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  statusList?: StatusSolicitacao[];

  @ApiPropertyOptional({
    description: 'ID do usuário responsável para filtrar os dados',
    example: '123e4567-e89b-12d3-a456-426614174003'
  })
  @IsOptional()
  @IsUUID('4', { message: 'usuario deve ser um UUID válido' })
  usuario?: string;

  @ApiPropertyOptional({
    description: 'IDs dos usuários responsáveis para filtrar os dados (múltiplos usuários)',
    example: ['123e4567-e89b-12d3-a456-426614174003', '123e4567-e89b-12d3-a456-426614174004'],
    type: [String]
  })
  @IsOptional()
  @IsArray({ message: 'usuarios deve ser um array' })
  @Type(() => String)
  @Transform(({ value }) => transformToStringArray(value))
  usuarios?: string[];

  @ApiPropertyOptional({
    description: 'Período predefinido para filtrar os dados',
    example: 'ultimos_30_dias',
    enum: PeriodoPredefinido
  })
  @IsOptional()
  @IsEnum(PeriodoPredefinido, { message: 'periodo deve ser um valor válido' })
  periodo?: PeriodoPredefinido;

  @ApiPropertyOptional({
    description: 'Data de início personalizada (usado quando periodo = "personalizado")',
    example: '2024-01-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString({}, { message: 'dataInicioPersonalizada deve ser uma data válida' })
  @Transform(({ value }) => {
    if (!value || typeof value !== 'string' || value.trim() === '') return undefined;
    return value.trim();
  })
  dataInicioPersonalizada?: string;

  @ApiPropertyOptional({
    description: 'Data de fim personalizada (usado quando periodo = "personalizado")',
    example: '2024-12-31T23:59:59.999Z'
  })
  @IsOptional()
  @IsDateString({}, { message: 'dataFimPersonalizada deve ser uma data válida' })
  @Transform(({ value }) => {
    if (!value || typeof value !== 'string' || value.trim() === '') return undefined;
    return value.trim();
  })
  dataFimPersonalizada?: string;

  @ApiPropertyOptional({
    description: 'Incluir dados arquivados/inativos',
    example: false,
    default: false
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  incluirArquivados?: boolean = false;

  @ApiPropertyOptional({
    description: 'Limite de registros para paginação',
    example: 100,
    default: 1000,
    minimum: 1,
    maximum: 10000
  })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => {
    const num = parseInt(value, 10);
    return isNaN(num) ? 1000 : Math.min(Math.max(num, 1), 10000);
  })
  limite?: number = 1000;

  @ApiPropertyOptional({
    description: 'Offset para paginação',
    example: 0,
    default: 0,
    minimum: 0
  })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => {
    const num = parseInt(value, 10);
    return isNaN(num) ? 0 : Math.max(num, 0);
  })
  offset?: number = 0;
}

/**
 * Interface para representar o período calculado
 */
export interface PeriodoCalculado {
  dataInicio: Date;
  dataFim: Date;
  descricao: string;
}

/**
 * Classe utilitária para calcular períodos predefinidos
 */
export class PeriodoCalculador {
  /**
   * Calcula as datas de início e fim baseado no período predefinido
   */
  static calcularPeriodo(periodo: PeriodoPredefinido, timezone = 'America/Sao_Paulo'): PeriodoCalculado {
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    
    switch (periodo) {
      case PeriodoPredefinido.HOJE:
        return {
          dataInicio: hoje,
          dataFim: new Date(hoje.getTime() + 24 * 60 * 60 * 1000 - 1),
          descricao: 'Hoje'
        };

      case PeriodoPredefinido.ONTEM:
        const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);
        return {
          dataInicio: ontem,
          dataFim: new Date(ontem.getTime() + 24 * 60 * 60 * 1000 - 1),
          descricao: 'Ontem'
        };

      case PeriodoPredefinido.ULTIMOS_7_DIAS:
        return {
          dataInicio: new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000),
          dataFim: agora,
          descricao: 'Últimos 7 dias'
        };

      case PeriodoPredefinido.ULTIMOS_30_DIAS:
        return {
          dataInicio: new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000),
          dataFim: agora,
          descricao: 'Últimos 30 dias'
        };

      case PeriodoPredefinido.ULTIMOS_90_DIAS:
        return {
          dataInicio: new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000),
          dataFim: agora,
          descricao: 'Últimos 90 dias'
        };

      case PeriodoPredefinido.MES_ATUAL:
        const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
        return {
          dataInicio: inicioMes,
          dataFim: agora,
          descricao: 'Mês atual'
        };

      case PeriodoPredefinido.MES_ANTERIOR:
        const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
        const fimMesAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59, 999);
        return {
          dataInicio: inicioMesAnterior,
          dataFim: fimMesAnterior,
          descricao: 'Mês anterior'
        };

      case PeriodoPredefinido.TRIMESTRE_ATUAL:
        const trimestreAtual = Math.floor(agora.getMonth() / 3);
        const inicioTrimestre = new Date(agora.getFullYear(), trimestreAtual * 3, 1);
        return {
          dataInicio: inicioTrimestre,
          dataFim: agora,
          descricao: 'Trimestre atual'
        };

      case PeriodoPredefinido.TRIMESTRE_ANTERIOR:
        const trimestreAnterior = Math.floor(agora.getMonth() / 3) - 1;
        const anoTrimestre = trimestreAnterior < 0 ? agora.getFullYear() - 1 : agora.getFullYear();
        const mesTrimestre = trimestreAnterior < 0 ? 9 : trimestreAnterior * 3;
        const inicioTrimestreAnterior = new Date(anoTrimestre, mesTrimestre, 1);
        const fimTrimestreAnterior = new Date(anoTrimestre, mesTrimestre + 3, 0, 23, 59, 59, 999);
        return {
          dataInicio: inicioTrimestreAnterior,
          dataFim: fimTrimestreAnterior,
          descricao: 'Trimestre anterior'
        };

      case PeriodoPredefinido.ANO_ATUAL:
        const inicioAno = new Date(agora.getFullYear(), 0, 1);
        return {
          dataInicio: inicioAno,
          dataFim: agora,
          descricao: 'Ano atual'
        };

      case PeriodoPredefinido.ANO_ANTERIOR:
        const inicioAnoAnterior = new Date(agora.getFullYear() - 1, 0, 1);
        const fimAnoAnterior = new Date(agora.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        return {
          dataInicio: inicioAnoAnterior,
          dataFim: fimAnoAnterior,
          descricao: 'Ano anterior'
        };

      default:
        // Para período personalizado, retorna o período padrão (últimos 30 dias)
        return this.calcularPeriodo(PeriodoPredefinido.ULTIMOS_30_DIAS, timezone);
    }
  }

  /**
   * Valida se as datas personalizadas são válidas
   */
  static validarPeriodoPersonalizado(dataInicio?: string, dataFim?: string): { valido: boolean; erro?: string } {
    if (!dataInicio || !dataFim) {
      return { valido: false, erro: 'Data de início e fim são obrigatórias para período personalizado' };
    }

    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      return { valido: false, erro: 'Datas devem estar em formato válido' };
    }

    if (inicio >= fim) {
      return { valido: false, erro: 'Data de início deve ser anterior à data de fim' };
    }

    // Limita o período máximo a 2 anos
    const diffMs = fim.getTime() - inicio.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > 730) {
      return { valido: false, erro: 'Período não pode ser superior a 2 anos' };
    }

    return { valido: true };
  }
}