import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuditoriaMonitoramentoService } from '../services/auditoria-monitoramento.service';

/**
 * Controlador para monitoramento do módulo de auditoria
 */
@ApiTags('Auditoria')
@Controller('auditoria/monitoramento')
export class AuditoriaMonitoramentoController {
  private readonly logger = new Logger(AuditoriaMonitoramentoController.name);

  constructor(
    private readonly auditoriaMonitoramentoService: AuditoriaMonitoramentoService,
  ) {}

  /**
   * Obtém estatísticas do módulo de auditoria
   */
  @Get('estatisticas')
  @ApiOperation({ summary: 'Obtém estatísticas do módulo de auditoria' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
  })
  async getEstatisticas() {
    try {
      return this.auditoriaMonitoramentoService.getEstatisticas();
    } catch (error) {
      this.logger.error(
        `Erro ao obter estatísticas: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Gera relatório de saúde do módulo de auditoria
   */
  @Get('saude')
  @ApiOperation({ summary: 'Gera relatório de saúde do módulo de auditoria' })
  @ApiResponse({
    status: 200,
    description: 'Relatório de saúde gerado com sucesso',
  })
  async getRelatorioSaude() {
    try {
      return this.auditoriaMonitoramentoService.gerarRelatorioSaude();
    } catch (error) {
      this.logger.error(
        `Erro ao gerar relatório de saúde: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Força atualização das estatísticas
   */
  @Get('atualizar')
  @ApiOperation({ summary: 'Força atualização das estatísticas' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas atualizadas com sucesso',
  })
  async forcarAtualizacao() {
    try {
      await this.auditoriaMonitoramentoService.atualizarEstatisticas();
      return {
        mensagem: 'Estatísticas atualizadas com sucesso',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar estatísticas: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
