import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ImpactoSocialResponse } from '../interfaces/impacto-social.interface';
import { GestaoOperacionalResponse } from '../interfaces/gestao-operacional.interface';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { MetricasDashboardService } from '../services/metricas-dashboard.service';
import { PermissionGuard } from '@/auth/guards/permission.guard';
import { RequiresPermission } from '@/auth/decorators/requires-permission.decorator';
import { MetricasFiltrosAvancadosDto } from '../dto/metricas-filtros-avancados.dto';

@ApiTags('Dashboard de Métricas')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class MetricasDashboardController {
  private readonly logger = new Logger(MetricasDashboardController.name);

  constructor(
    private readonly metricasDashboardService: MetricasDashboardService,
  ) {}



  @Get('impacto-social')
  @RequiresPermission({permissionName: 'dashboard.impacto_social'})
  @ApiOperation({
    summary: 'Obter métricas de impacto social',
    description:
      'Retorna métricas consolidadas sobre o impacto social dos benefícios concedidos. Suporta filtros avançados por unidade, benefício, bairro, status, usuário e período.',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas de impacto social obtidas com sucesso',
  })
  @ApiQuery({ name: 'periodo', required: false, enum: ['HOJE', 'ONTEM', 'ULTIMOS_7_DIAS', 'ULTIMOS_30_DIAS', 'ULTIMOS_90_DIAS', 'MES_ATUAL', 'MES_ANTERIOR', 'TRIMESTRE_ATUAL', 'TRIMESTRE_ANTERIOR', 'ANO_ATUAL', 'ANO_ANTERIOR', 'PERSONALIZADO'], description: 'Período predefinido para análise' })
  @ApiQuery({ name: 'unidades', required: false, type: [String], description: 'UUIDs das unidades para filtrar (array)' })
  @ApiQuery({ name: 'beneficios', required: false, type: [String], description: 'UUIDs dos tipos de benefício para filtrar (array)' })
  @ApiQuery({ name: 'bairros', required: false, type: [String], description: 'Nomes dos bairros para filtrar (array)' })
  @ApiQuery({ name: 'status', required: false, type: [String], description: 'Status das solicitações para filtrar (array)' })
  @ApiQuery({ name: 'usuarios', required: false, type: [String], description: 'UUIDs dos usuários responsáveis para filtrar (array)' })
  @ApiQuery({ name: 'data_inicio', required: false, type: String, description: 'Data de início para período personalizado (ISO 8601)' })
  @ApiQuery({ name: 'data_fim', required: false, type: String, description: 'Data de fim para período personalizado (ISO 8601)' })
  async getImpactoSocial(@Query() filtros: MetricasFiltrosAvancadosDto): Promise<ImpactoSocialResponse> {
    try {
      const impactoSocial = await this.metricasDashboardService.getImpactoSocial(
        filtros,
      );
      return {
        success: true,
        data: impactoSocial,
        message: 'Dados de impacto social carregados com sucesso',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Erro detalhado no getImpactoSocial:', {
        message: error.message,
        stack: error.stack,
        filtros,
        errorName: error.constructor.name,
      });
      
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao obter métricas de impacto social',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('gestao-operacional')
  @RequiresPermission({permissionName: 'dashboard.gestao_operacional'})
  @ApiOperation({
    summary: 'Obter métricas de gestão operacional',
    description: 'Retorna métricas sobre a gestão operacional do sistema de benefícios. Suporta filtros avançados por unidade, benefício, bairro, status, usuário e período.',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas de gestão operacional obtidas com sucesso',
  })
  @ApiQuery({ name: 'periodo', required: false, enum: ['HOJE', 'ONTEM', 'ULTIMOS_7_DIAS', 'ULTIMOS_30_DIAS', 'ULTIMOS_90_DIAS', 'MES_ATUAL', 'MES_ANTERIOR', 'TRIMESTRE_ATUAL', 'TRIMESTRE_ANTERIOR', 'ANO_ATUAL', 'ANO_ANTERIOR', 'PERSONALIZADO'], description: 'Período predefinido para análise' })
  @ApiQuery({ name: 'unidades', required: false, type: [String], description: 'UUIDs das unidades para filtrar (array)' })
  @ApiQuery({ name: 'beneficios', required: false, type: [String], description: 'UUIDs dos tipos de benefício para filtrar (array)' })
  @ApiQuery({ name: 'bairros', required: false, type: [String], description: 'Nomes dos bairros para filtrar (array)' })
  @ApiQuery({ name: 'status', required: false, type: [String], description: 'Status das solicitações para filtrar (array)' })
  @ApiQuery({ name: 'usuarios', required: false, type: [String], description: 'UUIDs dos usuários responsáveis para filtrar (array)' })
  @ApiQuery({ name: 'data_inicio', required: false, type: String, description: 'Data de início para período personalizado (ISO 8601)' })
  @ApiQuery({ name: 'data_fim', required: false, type: String, description: 'Data de fim para período personalizado (ISO 8601)' })
  async getGestaoOperacional(@Query() filtros: MetricasFiltrosAvancadosDto): Promise<GestaoOperacionalResponse> {
    try {
      const gestaoOperacional = await this.metricasDashboardService.getGestaoOperacional(
        filtros,
      );
      return {
        success: true,
        data: gestaoOperacional,
        message: 'Dados de gestão operacional carregados com sucesso',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Erro detalhado no getGestaoOperacional:', {
        message: error.message,
        stack: error.stack,
        filtros,
        errorName: error.constructor.name,
      });
      
      throw new HttpException(
        {
          success: false,
          message: 'Erro ao obter métricas de gestão operacional',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('solicitacoes/status')
  @ApiOperation({ summary: 'Obter contagem de solicitações por status' })
  @ApiResponse({
    status: 200,
    description: 'Contagem de solicitações por status obtida com sucesso',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', description: 'Total de solicitações' },
        porStatus: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              status: { type: 'string', description: 'Status da solicitação' },
              count: { type: 'number', description: 'Quantidade de solicitações com este status' },
            },
          },
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard, PermissionGuard)
  async getSolicitacoesPorStatus(): Promise<{ total: number; porStatus: { status: string; quantidade: number }[] }> {
    try {
      return await this.metricasDashboardService.obterSolicitacoesPorStatus();
    } catch (error) {
      throw new HttpException(
        'Erro ao obter contagem de solicitações por status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
