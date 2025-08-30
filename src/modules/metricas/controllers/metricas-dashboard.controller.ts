import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
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



  @Post('impacto-social')
  @RequiresPermission({permissionName: 'dashboard.impacto_social'})
  @ApiOperation({
    summary: 'Obter métricas de impacto social com filtros avançados',
    description: `Retorna métricas consolidadas sobre o impacto social dos benefícios concedidos.
    
    **Funcionalidades principais:**
    - Filtros por múltiplas unidades, benefícios e status
    - Filtros por período predefinido ou personalizado
    - Filtros por bairros e usuários responsáveis
    - Análise de impacto social consolidada
    
    **Casos de uso comuns:**
    - Relatórios de impacto por unidade
    - Análise de benefícios por período
    - Métricas consolidadas por região
    - Dashboard executivo de impacto social`
  })
  @ApiBody({
    type: MetricasFiltrosAvancadosDto,
    description: 'Filtros avançados para métricas de impacto social',
    examples: {
      'filtro-basico': {
        summary: 'Filtro básico por período',
        description: 'Exemplo de filtro simples por período predefinido',
        value: {
          periodo: 'ultimos_30_dias',
          limite: 1000,
          offset: 0
        }
      },
      'filtro-unidades': {
        summary: 'Filtro por múltiplas unidades',
        description: 'Exemplo de filtro por unidades específicas',
        value: {
          unidades: ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'],
          periodo: 'mes_atual',
          incluirArquivados: false
        }
      },
      'filtro-avancado': {
        summary: 'Filtro avançado completo',
        description: 'Exemplo de filtro com múltiplos critérios',
        value: {
          unidades: ['550e8400-e29b-41d4-a716-446655440000'],
          beneficios: ['550e8400-e29b-41d4-a716-446655440002'],
          bairros: ['Centro', 'Copacabana'],
          status: ['aprovado', 'concluido'],
          usuarios: ['550e8400-e29b-41d4-a716-446655440003'],
          periodo: 'personalizado',
          dataInicioPersonalizada: '2024-01-01T00:00:00.000Z',
          dataFimPersonalizada: '2024-12-31T23:59:59.999Z'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas de impacto social obtidas com sucesso',
  })
  async getImpactoSocial(@Body() filtros: MetricasFiltrosAvancadosDto): Promise<ImpactoSocialResponse> {
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

  @Post('gestao-operacional')
  @RequiresPermission({permissionName: 'dashboard.gestao_operacional'})
  @ApiOperation({
    summary: 'Obter métricas de gestão operacional com filtros avançados',
    description: `Retorna métricas sobre a gestão operacional do sistema de benefícios.
    
    **Funcionalidades principais:**
    - Filtros por múltiplas unidades, benefícios e status
    - Filtros por período predefinido ou personalizado
    - Filtros por bairros e usuários responsáveis
    - Métricas operacionais consolidadas
    
    **Casos de uso comuns:**
    - Relatórios operacionais por unidade
    - Análise de performance por período
    - Métricas de produtividade por usuário
    - Dashboard gerencial de operações`
  })
  @ApiBody({
    type: MetricasFiltrosAvancadosDto,
    description: 'Filtros avançados para métricas de gestão operacional',
    examples: {
      'filtro-basico': {
        summary: 'Filtro básico por período',
        description: 'Exemplo de filtro simples por período predefinido',
        value: {
          periodo: 'mes_atual',
          limite: 1000,
          offset: 0
        }
      },
      'filtro-usuarios': {
        summary: 'Filtro por usuários específicos',
        description: 'Exemplo de filtro por usuários responsáveis',
        value: {
          usuarios: ['550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004'],
          periodo: 'ultimos_30_dias',
          incluirArquivados: false
        }
      },
      'filtro-completo': {
        summary: 'Filtro operacional completo',
        description: 'Exemplo de filtro com múltiplos critérios operacionais',
        value: {
          unidades: ['550e8400-e29b-41d4-a716-446655440000'],
          usuarios: ['550e8400-e29b-41d4-a716-446655440003'],
          status: ['em_analise', 'aprovado'],
          periodo: 'personalizado',
          dataInicioPersonalizada: '2024-01-01T00:00:00.000Z',
          dataFimPersonalizada: '2024-03-31T23:59:59.999Z'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas de gestão operacional obtidas com sucesso',
  })
  async getGestaoOperacional(@Body() filtros: MetricasFiltrosAvancadosDto): Promise<GestaoOperacionalResponse> {
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
