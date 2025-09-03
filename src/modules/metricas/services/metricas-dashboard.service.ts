import { Injectable, Logger } from '@nestjs/common';
import { ImpactoSocialData } from '../interfaces/impacto-social.interface';
import { GestaoOperacionalData } from '../interfaces/gestao-operacional.interface';
import { MetricasFiltrosAvancadosDto } from '../dto/metricas-filtros-avancados.dto';
import { ImpactoSocialService } from './impacto-social.service';
import { GestaoOperacionalService } from './gestao-operacional.service';

/**
 * Serviço principal para métricas do dashboard
 * 
 * @description
 * Centraliza o acesso às métricas do dashboard administrativo,
 * delegando o cálculo para serviços especializados em impacto social
 * e gestão operacional.
 * 
 * Mantém a interface pública original enquanto utiliza os novos
 * serviços especializados internamente para melhor separação de responsabilidades.
 */
@Injectable()
export class MetricasDashboardService {
  private readonly logger = new Logger(MetricasDashboardService.name);

  constructor(
    private readonly impactoSocialService: ImpactoSocialService,
    private readonly gestaoOperacionalService: GestaoOperacionalService,
  ) {}

  /**
   * Obtém dados de impacto social do sistema
   * 
   * @param filtros Filtros avançados opcionais para refinar os dados
   * @returns Dados completos de impacto social incluindo métricas, indicadores e gráficos
   */
  async getImpactoSocial(
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<ImpactoSocialData> {
    try {
      const resultado = await this.impactoSocialService.getImpactoSocial(filtros);
      return resultado;
    } catch (error) {
      this.logger.error('Erro ao calcular métricas de impacto social', error.stack);
      throw error;
    }
  }

  /**
   * Obtém dados de gestão operacional do sistema
   * 
   * @param filtros Filtros avançados opcionais para refinar os dados
   * @returns Dados completos de gestão operacional incluindo métricas, performance e gráficos
   */
  async getGestaoOperacional(
    filtros?: MetricasFiltrosAvancadosDto,
  ): Promise<GestaoOperacionalData> {
    try {
      const resultado = await this.gestaoOperacionalService.getGestaoOperacional(filtros);
      return resultado;
    } catch (error) {
      this.logger.error('Erro ao calcular métricas de gestão operacional', error.stack);
      throw error;
    }
  }

  /**
   * Obtém solicitações agrupadas por status para debug
   * 
   * @returns Total de solicitações e distribuição por status
   */
  async obterSolicitacoesPorStatus(): Promise<{ 
    total: number; 
    porStatus: { status: string; quantidade: number }[] 
  }> {
    try {
      const resultado = await this.gestaoOperacionalService.obterSolicitacoesPorStatus();
      return resultado;
    } catch (error) {
      this.logger.error('Erro ao obter solicitações por status', error.stack);
      throw error;
    }
  }
}