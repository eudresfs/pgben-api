import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { EnhancedMetricsService } from './enhanced-metrics.service';
import { Public } from '../../auth/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * Controlador de Métricas Aprimorado
 * 
 * Expõe endpoints para acesso às métricas avançadas da aplicação
 * no formato do Prometheus, com foco em segurança e compliance LGPD
 */
@ApiTags('monitoring')
@Controller('monitoring/metrics')
export class EnhancedMetricsController {
  constructor(private readonly metricsService: EnhancedMetricsService) {}

  /**
   * Retorna todas as métricas no formato do Prometheus
   */
  @Get()
  @Public()
  @ApiOperation({ 
    summary: 'Obter métricas da aplicação', 
    description: 'Retorna todas as métricas da aplicação no formato do Prometheus' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Métricas retornadas com sucesso no formato do Prometheus' 
  })
  async getMetrics(@Res() response: Response) {
    const metrics = await this.metricsService.getMetrics();
    response.setHeader('Content-Type', 'text/plain');
    return response.send(metrics);
  }

  /**
   * Retorna métricas específicas de segurança e compliance LGPD
   */
  @Get('security')
  @Public()
  @ApiOperation({ 
    summary: 'Obter métricas de segurança', 
    description: 'Retorna métricas relacionadas à segurança e compliance LGPD' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Métricas de segurança retornadas com sucesso' 
  })
  async getSecurityMetrics(@Res() response: Response) {
    const metrics = await this.metricsService.getMetrics();
    
    // Filtrar apenas métricas de segurança
    const securityMetrics = metrics
      .split('\n')
      .filter(line => 
        line.includes('security_') || 
        line.includes('lgpd_') || 
        line.includes('authentication_') || 
        line.includes('authorization_')
      )
      .join('\n');
    
    response.setHeader('Content-Type', 'text/plain');
    return response.send(securityMetrics);
  }

  /**
   * Retorna métricas específicas de documentos
   */
  @Get('documents')
  @Public()
  @ApiOperation({ 
    summary: 'Obter métricas de documentos', 
    description: 'Retorna métricas relacionadas a operações com documentos' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Métricas de documentos retornadas com sucesso' 
  })
  async getDocumentMetrics(@Res() response: Response) {
    const metrics = await this.metricsService.getMetrics();
    
    // Filtrar apenas métricas de documentos
    const documentMetrics = metrics
      .split('\n')
      .filter(line => line.includes('document_'))
      .join('\n');
    
    response.setHeader('Content-Type', 'text/plain');
    return response.send(documentMetrics);
  }

  /**
   * Retorna métricas específicas de sistema
   */
  @Get('system')
  @Public()
  @ApiOperation({ 
    summary: 'Obter métricas de sistema', 
    description: 'Retorna métricas relacionadas ao sistema (memória, CPU)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Métricas de sistema retornadas com sucesso' 
  })
  async getSystemMetrics(@Res() response: Response) {
    // Atualizar métricas de sistema antes de retornar
    this.metricsService.updateMemoryUsage();
    
    const metrics = await this.metricsService.getMetrics();
    
    // Filtrar apenas métricas de sistema
    const systemMetrics = metrics
      .split('\n')
      .filter(line => 
        line.includes('system_') || 
        line.includes('process_') || 
        line.includes('nodejs_')
      )
      .join('\n');
    
    response.setHeader('Content-Type', 'text/plain');
    return response.send(systemMetrics);
  }
}
