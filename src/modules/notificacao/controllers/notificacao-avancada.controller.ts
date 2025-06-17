import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { NotificacaoProativaService } from '../services/notificacao-proativa.service';
import {
  NotificacaoPreferenciasService,
  CanalNotificacao,
  FrequenciaAgrupamento,
  PreferenciasUsuario,
} from '../services/notificacao-preferencias.service';
import { TipoNotificacao } from '../../../entities/notification.entity';
import { IsOptional, IsEnum, IsBoolean, IsNumber, IsString, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * DTOs para as APIs
 */
class HorarioSilenciosoDto {
  @IsBoolean()
  ativo: boolean;

  @IsString()
  inicio: string; // HH:mm

  @IsString()
  fim: string; // HH:mm
}

class AgrupamentoDto {
  @IsBoolean()
  ativo: boolean;

  @IsEnum(FrequenciaAgrupamento)
  frequencia: FrequenciaAgrupamento;

  @IsNumber()
  maximo_por_grupo: number;
}

class PreferenciaTipoDto {
  @IsEnum(TipoNotificacao)
  tipo: TipoNotificacao;

  @IsBoolean()
  ativo: boolean;

  @IsArray()
  @IsEnum(CanalNotificacao, { each: true })
  canais: CanalNotificacao[];

  @IsEnum(['low', 'medium', 'high'])
  prioridade_minima: 'low' | 'medium' | 'high';

  @ValidateNested()
  @Type(() => HorarioSilenciosoDto)
  horario_silencioso: HorarioSilenciosoDto;

  @ValidateNested()
  @Type(() => AgrupamentoDto)
  agrupamento: AgrupamentoDto;
}

class ConfiguracoesGlobaisDto {
  @IsBoolean()
  pausar_todas: boolean;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value ? new Date(value) : null)
  pausar_ate: Date | null;

  @IsNumber()
  limite_diario: number;

  @IsBoolean()
  som_ativo: boolean;

  @IsBoolean()
  vibrar_ativo: boolean;
}

class AtualizarPreferenciasDto {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsString()
  idioma?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferenciaTipoDto)
  tipos?: PreferenciaTipoDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ConfiguracoesGlobaisDto)
  configuracoes_globais?: ConfiguracoesGlobaisDto;
}

class PausarNotificacoesDto {
  @IsNumber()
  duracao: number; // em minutos
}

/**
 * Controlador para funcionalidades avançadas de notificação
 * 
 * Implementa as APIs para:
 * - Notificações proativas (Fase 4)
 * - Preferências de usuário (Fase 5)
 * - Agrupamento e otimizações
 */
@ApiTags('Notificações Avançadas')
@Controller('notificacoes/avancado')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificacaoAvancadaController {
  constructor(
    private readonly notificacaoProativaService: NotificacaoProativaService,
    private readonly preferenciasService: NotificacaoPreferenciasService,
  ) {}

  // ==========================================
  // ENDPOINTS DE NOTIFICAÇÕES PROATIVAS
  // ==========================================

  @Get('proativas/estatisticas')
  @ApiOperation({
    summary: 'Obter estatísticas das notificações proativas',
    description: 'Retorna métricas sobre alertas de prazo, notificações de sistema e limpeza automática',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas obtidas com sucesso',
    schema: {
      type: 'object',
      properties: {
        alertasPrazoEnviados: { type: 'number' },
        alertasSistemaEnviados: { type: 'number' },
        notificacoesArquivadas: { type: 'number' },
        proximasVerificacoes: {
          type: 'object',
          properties: {
            prazos: { type: 'string' },
            sistema: { type: 'string' },
            limpeza: { type: 'string' },
          },
        },
      },
    },
  })
  async obterEstatisticasProativas() {
    return this.notificacaoProativaService.obterEstatisticas();
  }

  @Post('proativas/verificar-prazos')
  @ApiOperation({
    summary: 'Forçar verificação de prazos',
    description: 'Executa manualmente a verificação de prazos de solicitações',
  })
  @ApiResponse({
    status: 200,
    description: 'Verificação de prazos executada com sucesso',
  })
  @HttpCode(HttpStatus.OK)
  async executarVerificacaoPrazos() {
    await this.notificacaoProativaService.executarVerificacaoPrazos();
    return { message: 'Verificação de prazos executada com sucesso' };
  }

  @Post('proativas/monitorar-sistema')
  @ApiOperation({
    summary: 'Forçar monitoramento do sistema',
    description: 'Executa manualmente o monitoramento de métricas do sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Monitoramento do sistema executado com sucesso',
  })
  @HttpCode(HttpStatus.OK)
  async executarMonitoramentoSistema() {
    await this.notificacaoProativaService.executarMonitoramentoSistema();
    return { message: 'Monitoramento do sistema executado com sucesso' };
  }

  // ==========================================
  // ENDPOINTS DE PREFERÊNCIAS
  // ==========================================

  @Get('preferencias')
  @ApiOperation({
    summary: 'Obter preferências de notificação do usuário',
    description: 'Retorna as configurações de notificação do usuário autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferências obtidas com sucesso',
  })
  async obterPreferencias(@GetUser() user: any) {
    return this.preferenciasService.obterPreferencias(user.id);
  }

  @Put('preferencias')
  @ApiOperation({
    summary: 'Atualizar preferências de notificação',
    description: 'Atualiza as configurações de notificação do usuário',
  })
  @ApiBody({ type: AtualizarPreferenciasDto })
  @ApiResponse({
    status: 200,
    description: 'Preferências atualizadas com sucesso',
  })
  async atualizarPreferencias(
    @GetUser() user: any,
    @Body(ValidationPipe) preferencias: AtualizarPreferenciasDto,
  ) {
    return this.preferenciasService.atualizarPreferencias(user.id, preferencias);
  }

  @Post('preferencias/pausar')
  @ApiOperation({
    summary: 'Pausar notificações temporariamente',
    description: 'Pausa todas as notificações do usuário por um período determinado',
  })
  @ApiBody({ type: PausarNotificacoesDto })
  @ApiResponse({
    status: 200,
    description: 'Notificações pausadas com sucesso',
  })
  @HttpCode(HttpStatus.OK)
  async pausarNotificacoes(
    @GetUser() user: any,
    @Body(ValidationPipe) dados: PausarNotificacoesDto,
  ) {
    await this.preferenciasService.pausarNotificacoes(user.id, dados.duracao);
    return { message: `Notificações pausadas por ${dados.duracao} minutos` };
  }

  @Post('preferencias/reativar')
  @ApiOperation({
    summary: 'Reativar notificações',
    description: 'Remove a pausa das notificações do usuário',
  })
  @ApiResponse({
    status: 200,
    description: 'Notificações reativadas com sucesso',
  })
  @HttpCode(HttpStatus.OK)
  async reativarNotificacoes(@GetUser() user: any) {
    await this.preferenciasService.reativarNotificacoes(user.id);
    return { message: 'Notificações reativadas com sucesso' };
  }

  @Get('preferencias/validar')
  @ApiOperation({
    summary: 'Validar se notificação deve ser enviada',
    description: 'Verifica se uma notificação deve ser enviada baseada nas preferências do usuário',
  })
  @ApiQuery({ name: 'tipo', enum: TipoNotificacao })
  @ApiQuery({ name: 'prioridade', enum: ['low', 'medium', 'high'] })
  @ApiQuery({ name: 'canal', enum: CanalNotificacao })
  @ApiResponse({
    status: 200,
    description: 'Validação realizada com sucesso',
    schema: {
      type: 'object',
      properties: {
        deveEnviar: { type: 'boolean' },
        motivo: { type: 'string' },
      },
    },
  })
  async validarEnvioNotificacao(
    @GetUser() user: any,
    @Query('tipo') tipo: TipoNotificacao,
    @Query('prioridade') prioridade: 'low' | 'medium' | 'high',
    @Query('canal') canal: CanalNotificacao,
  ) {
    const deveEnviar = await this.preferenciasService.deveEnviarNotificacao(
      user.id,
      tipo,
      prioridade,
      canal,
    );

    return {
      deveEnviar,
      motivo: deveEnviar
        ? 'Notificação aprovada pelas preferências do usuário'
        : 'Notificação bloqueada pelas preferências do usuário',
    };
  }

  // ==========================================
  // ENDPOINTS DE AGRUPAMENTO
  // ==========================================

  @Get('agrupamento/estatisticas')
  @ApiOperation({
    summary: 'Obter estatísticas de agrupamento',
    description: 'Retorna informações sobre grupos de notificações ativos e na fila',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas de agrupamento obtidas com sucesso',
    schema: {
      type: 'object',
      properties: {
        gruposAtivos: { type: 'number' },
        notificacoesNaFila: { type: 'number' },
        proximosEnvios: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              chave: { type: 'string' },
              dataEnvio: { type: 'string', format: 'date-time' },
              quantidade: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async obterEstatisticasAgrupamento() {
    return this.preferenciasService.obterEstatisticasAgrupamento();
  }

  @Post('agrupamento/limpar-cache')
  @ApiOperation({
    summary: 'Limpar cache de preferências',
    description: 'Remove todas as preferências do cache em memória (útil para desenvolvimento)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache limpo com sucesso',
  })
  @HttpCode(HttpStatus.OK)
  async limparCachePreferencias() {
    this.preferenciasService.limparCache();
    return { message: 'Cache de preferências limpo com sucesso' };
  }

  // ==========================================
  // ENDPOINTS DE CONFIGURAÇÃO
  // ==========================================

  @Get('configuracao/canais')
  @ApiOperation({
    summary: 'Listar canais de notificação disponíveis',
    description: 'Retorna todos os canais de notificação suportados pelo sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Canais listados com sucesso',
  })
  async listarCanais() {
    return {
      canais: Object.values(CanalNotificacao).map((canal) => ({
        valor: canal,
        label: this.getCanelLabel(canal),
        descricao: this.getCanalDescricao(canal),
      })),
    };
  }

  @Get('configuracao/frequencias')
  @ApiOperation({
    summary: 'Listar frequências de agrupamento disponíveis',
    description: 'Retorna todas as opções de frequência para agrupamento de notificações',
  })
  @ApiResponse({
    status: 200,
    description: 'Frequências listadas com sucesso',
  })
  async listarFrequencias() {
    return {
      frequencias: Object.values(FrequenciaAgrupamento).map((freq) => ({
        valor: freq,
        label: this.getFrequenciaLabel(freq),
        descricao: this.getFrequenciaDescricao(freq),
      })),
    };
  }

  @Get('configuracao/tipos')
  @ApiOperation({
    summary: 'Listar tipos de notificação disponíveis',
    description: 'Retorna todos os tipos de notificação suportados pelo sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Tipos listados com sucesso',
  })
  async listarTipos() {
    return {
      tipos: Object.values(TipoNotificacao).map((tipo) => ({
        valor: tipo,
        label: this.getTipoLabel(tipo),
        descricao: this.getTipoDescricao(tipo),
      })),
    };
  }

  // ==========================================
  // MÉTODOS AUXILIARES
  // ==========================================

  private getCanelLabel(canal: CanalNotificacao): string {
    const labels = {
      [CanalNotificacao.SSE]: 'Tempo Real (SSE)',
      [CanalNotificacao.EMAIL]: 'E-mail',
      [CanalNotificacao.SMS]: 'SMS',
      [CanalNotificacao.PUSH]: 'Push Notification',
    };
    return labels[canal];
  }

  private getCanalDescricao(canal: CanalNotificacao): string {
    const descricoes = {
      [CanalNotificacao.SSE]: 'Notificações em tempo real no navegador',
      [CanalNotificacao.EMAIL]: 'Notificações por e-mail',
      [CanalNotificacao.SMS]: 'Notificações por mensagem de texto',
      [CanalNotificacao.PUSH]: 'Notificações push no dispositivo móvel',
    };
    return descricoes[canal];
  }

  private getFrequenciaLabel(freq: FrequenciaAgrupamento): string {
    const labels = {
      [FrequenciaAgrupamento.IMEDIATO]: 'Imediato',
      [FrequenciaAgrupamento.CADA_15_MIN]: 'A cada 15 minutos',
      [FrequenciaAgrupamento.CADA_30_MIN]: 'A cada 30 minutos',
      [FrequenciaAgrupamento.CADA_HORA]: 'A cada hora',
      [FrequenciaAgrupamento.CADA_2_HORAS]: 'A cada 2 horas',
      [FrequenciaAgrupamento.DIARIO]: 'Diário',
    };
    return labels[freq];
  }

  private getFrequenciaDescricao(freq: FrequenciaAgrupamento): string {
    const descricoes = {
      [FrequenciaAgrupamento.IMEDIATO]: 'Enviar notificações imediatamente',
      [FrequenciaAgrupamento.CADA_15_MIN]: 'Agrupar e enviar a cada 15 minutos',
      [FrequenciaAgrupamento.CADA_30_MIN]: 'Agrupar e enviar a cada 30 minutos',
      [FrequenciaAgrupamento.CADA_HORA]: 'Agrupar e enviar a cada hora',
      [FrequenciaAgrupamento.CADA_2_HORAS]: 'Agrupar e enviar a cada 2 horas',
      [FrequenciaAgrupamento.DIARIO]: 'Agrupar e enviar uma vez por dia (9h)',
    };
    return descricoes[freq];
  }

  private getTipoLabel(tipo: TipoNotificacao): string {
    const labels = {
      [TipoNotificacao.SISTEMA]: 'Sistema',
      [TipoNotificacao.SOLICITACAO]: 'Solicitação',
      [TipoNotificacao.PENDENCIA]: 'Pendência',
      [TipoNotificacao.APROVACAO]: 'Aprovação',
      [TipoNotificacao.LIBERACAO]: 'Liberação',
      [TipoNotificacao.ALERTA]: 'Alerta',
    };
    return labels[tipo];
  }

  private getTipoDescricao(tipo: TipoNotificacao): string {
    const descricoes = {
      [TipoNotificacao.SISTEMA]: 'Notificações gerais do sistema',
      [TipoNotificacao.SOLICITACAO]: 'Notificações sobre solicitações',
      [TipoNotificacao.PENDENCIA]: 'Notificações sobre pendências',
      [TipoNotificacao.APROVACAO]: 'Notificações sobre aprovações',
      [TipoNotificacao.LIBERACAO]: 'Notificações sobre liberações',
      [TipoNotificacao.ALERTA]: 'Alertas importantes e urgentes',
    };
    return descricoes[tipo];
  }
}