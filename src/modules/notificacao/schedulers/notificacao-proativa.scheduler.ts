import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificacaoProativaService } from '../services/notificacao-proativa.service';
import { NotificacaoPreferenciasService } from '../services/notificacao-preferencias.service';
import { ConfigService } from '@nestjs/config';

/**
 * Scheduler para execução automática de notificações proativas
 * 
 * Implementa as tarefas agendadas para:
 * - Verificação de prazos de solicitações
 * - Monitoramento de métricas do sistema
 * - Limpeza automática de notificações antigas
 * - Processamento de grupos de notificações
 * - Envio de relatórios periódicos
 */
@Injectable()
export class NotificacaoProativaScheduler {
  private readonly logger = new Logger(NotificacaoProativaScheduler.name);
  private readonly isProducao: boolean;

  constructor(
    private readonly notificacaoProativaService: NotificacaoProativaService,
    private readonly preferenciasService: NotificacaoPreferenciasService,
    private readonly configService: ConfigService,
  ) {
    this.isProducao = this.configService.get('NODE_ENV') === 'production';
    this.logger.log(
      `Scheduler inicializado - Ambiente: ${this.isProducao ? 'Produção' : 'Desenvolvimento'}`,
    );
  }

  // ==========================================
  // VERIFICAÇÃO DE PRAZOS
  // ==========================================

  /**
   * Verifica prazos de solicitações a cada 15 minutos
   * Envia alertas para solicitações próximas do vencimento
   */
  // @Cron('0 */15 * * * *', {
  //   name: 'verificacao-prazos',
  //   timeZone: 'America/Sao_Paulo',
  // })
  // async executarVerificacaoPrazos() {
  //   if (!this.isProducao) {
  //     this.logger.debug('Verificação de prazos (desenvolvimento)');
  //     return;
  //   }

  //   this.logger.log('Iniciando verificação de prazos de solicitações');

  //   try {
  //     const inicio = Date.now();
  //     await this.notificacaoProativaService.executarVerificacaoPrazos();
  //     const duracao = Date.now() - inicio;

  //     this.logger.log(`Verificação de prazos concluída em ${duracao}ms`);
  //   } catch (error) {
  //     this.logger.error('Erro na verificação de prazos:', error);
  //   }
  // }

  /**
   * Verificação de prazos críticos a cada 5 minutos
   * Para solicitações com prazo muito próximo (< 2 horas)
   */
  // @Cron('0 */5 * * * *', {
  //   name: 'verificacao-prazos-criticos',
  //   timeZone: 'America/Sao_Paulo',
  // })
  // async executarVerificacaoPrazosCriticos() {
  //   if (!this.isProducao) {
  //     this.logger.debug('Verificação de prazos críticos (desenvolvimento)');
  //     return;
  //   }

  //   this.logger.log('Iniciando verificação de prazos críticos');

  //   try {
  //     const inicio = Date.now();
  //     await this.notificacaoProativaService.executarVerificacaoPrazos();
  //     const duracao = Date.now() - inicio;

  //     this.logger.log(`Verificação de prazos críticos concluída em ${duracao}ms`);
  //   } catch (error) {
  //     this.logger.error('Erro na verificação de prazos críticos:', error);
  //   }
  // }

  // ==========================================
  // MÉTODOS DE CONTROLE
  // ==========================================

  /**
   * Obtém status de todos os jobs agendados
   */
  async obterStatusJobs() {
    return {
      ambiente: this.isProducao ? 'production' : 'development',
      jobs: [
        { nome: 'verificacao-prazos', ativo: true, frequencia: 'A cada 15 minutos' },
        { nome: 'verificacao-prazos-criticos', ativo: true, frequencia: 'A cada 5 minutos' },
        { nome: 'monitoramento-sistema', ativo: this.isProducao, frequencia: 'A cada 30 minutos' },
        { nome: 'verificacao-saude-sistema', ativo: true, frequencia: 'A cada 5 minutos' },
        { nome: 'limpeza-automatica', ativo: true, frequencia: 'Diário às 2h' },
        { nome: 'limpeza-cache', ativo: true, frequencia: 'A cada 6 horas' },
        { nome: 'processamento-grupos-15min', ativo: true, frequencia: 'A cada 15 minutos' },
        { nome: 'processamento-grupos-30min', ativo: true, frequencia: 'A cada 30 minutos' },
        { nome: 'processamento-grupos-1h', ativo: true, frequencia: 'A cada hora' },
        { nome: 'processamento-grupos-2h', ativo: true, frequencia: 'A cada 2 horas' },
        { nome: 'processamento-grupos-diario', ativo: true, frequencia: 'Diário às 9h' },
        { nome: 'relatorio-diario', ativo: this.isProducao, frequencia: 'Diário às 23h' },
        { nome: 'relatorio-semanal', ativo: this.isProducao, frequencia: 'Segundas às 8h' },
        { nome: 'otimizacao-indices', ativo: this.isProducao, frequencia: 'Domingos às 3h' },
        { nome: 'verificacao-integridade', ativo: this.isProducao, frequencia: 'Mensal dia 1 às 4h' },
      ],
    };
  }
}