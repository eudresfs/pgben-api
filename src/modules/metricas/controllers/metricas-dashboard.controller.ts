import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ImpactoSocialResponse } from '../interfaces/impacto-social.interface';
import { GestaoOperacionalResponse } from '../interfaces/gestao-operacional.interface';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { MetricasDashboardService } from '../services/metricas-dashboard.service';
import { PermissionGuard } from '@/auth/guards/permission.guard';
import { RequiresPermission } from '@/auth/decorators/requires-permission.decorator';

@ApiTags('Dashboard de Métricas')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class MetricasDashboardController {
  constructor(
    private readonly metricasDashboardService: MetricasDashboardService,
  ) {}



  @Get('impacto-social')
  @RequiresPermission({permissionName: 'dashboard.impacto_social'})
  @ApiOperation({
    summary: 'Obter métricas de impacto social',
    description:
      'Retorna métricas consolidadas sobre o impacto social dos benefícios concedidos',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas de impacto social obtidas com sucesso',
  })
  @ApiQuery({
    name: 'periodo',
    required: false,
    description: 'Período para filtrar as métricas (30d, 90d, 1y)',
    example: '30d',
  })
  async getImpactoSocial(@Query('periodo') periodo?: string): Promise<ImpactoSocialResponse> {
    try {
      const impactoSocial = await this.metricasDashboardService.getImpactoSocial(
        periodo,
      );
      return {
        success: true,
        data: impactoSocial,
        message: 'Dados de impacto social carregados com sucesso',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
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
    description: 'Retorna métricas sobre a gestão operacional do sistema de benefícios',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas de gestão operacional obtidas com sucesso',
  })
  @ApiQuery({
    name: 'periodo',
    required: false,
    description: 'Período para filtrar as métricas (30d, 90d, 1y)',
    example: '30d',
  })
  async getGestaoOperacional(@Query('periodo') periodo?: string): Promise<GestaoOperacionalResponse> {
    try {
      const gestaoOperacional = await this.metricasDashboardService.getGestaoOperacional(
        periodo,
      );
      return {
        success: true,
        data: gestaoOperacional,
        message: 'Dados de gestão operacional carregados com sucesso',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
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
}
