import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AblyChannelService } from './ably-channel.service';
import { AblyService } from './ably.service';
import {
  BaseNotificationContext,
  ChannelResult,
  NotificationChannel,
  NotificationPriority
} from '../interfaces/base-notification.interface';

/**
 * Interface para dados da notificação Ably
 */
interface AblyNotificationData {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: string;
  prioridade: string;
  url: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Serviço de notificações via Ably
 * 
 * Responsável por:
 * - Enviar notificações in-app via Ably
 * - Garantir entrega confiável
 * - Gerenciar canais por usuário
 * - Fornecer logs estruturados
 * - Implementar retry automático
 */
@Injectable()
export class AblyNotificationService {
  private readonly logger = new Logger(AblyNotificationService.name);
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(
    private readonly ablyService: AblyService,
    private readonly ablyChannelService: AblyChannelService,
    private readonly configService: ConfigService
  ) {
    this.maxRetries = this.configService.get<number>('ABLY_MAX_RETRIES', 3);
    this.retryDelay = this.configService.get<number>('ABLY_RETRY_DELAY', 1000);
  }

  /**
   * Envia notificação via Ably para um usuário específico
   * 
   * @param context Contexto da notificação
   * @param notificacaoId ID da notificação no sistema
   * @returns Resultado do envio
   */
  async enviarNotificacao(
    context: BaseNotificationContext,
    notificacaoId: string
  ): Promise<ChannelResult> {
    const startTime = Date.now();
    const logContext = {
      notificacao_id: notificacaoId,
      destinatario_id: context.destinatario_id,
      tipo: context.tipo,
      prioridade: context.prioridade
    };

    this.logger.log('Iniciando envio via Ably', logContext);

    try {
      // Valida se URL está presente (obrigatória para notificações in-app)
      if (!context.url) {
        const erro = 'URL é obrigatória para notificações in-app via Ably';
        this.logger.error(erro, logContext);
        return this.criarResultadoFalha(erro);
      }

      // Prepara dados da notificação
      const notificationData: AblyNotificationData = {
        id: notificacaoId,
        titulo: context.titulo,
        conteudo: context.conteudo,
        tipo: context.tipo,
        prioridade: context.prioridade,
        url: context.url,
        timestamp: new Date(),
        metadata: context.metadata
      };

      // Envia com retry automático
      const resultado = await this.enviarComRetry(
        context.destinatario_id,
        notificationData,
        logContext
      );

      const duration = Date.now() - startTime;
      
      if (resultado.sucesso) {
        this.logger.log(`Notificação enviada via Ably com sucesso em ${duration}ms`, {
          ...logContext,
          duration
        });
      } else {
        this.logger.error(`Falha no envio via Ably após ${duration}ms`, {
          ...logContext,
          erro: resultado.erro,
          duration
        });
      }

      return resultado;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Erro inesperado no envio via Ably', {
        ...logContext,
        error: error.message,
        stack: error.stack,
        duration
      });

      return this.criarResultadoFalha(`Erro inesperado: ${error.message}`);
    }
  }

  /**
   * Envia notificação com retry automático
   * 
   * @param destinatarioId ID do destinatário
   * @param data Dados da notificação
   * @param logContext Contexto para logs
   * @returns Resultado do envio
   */
  private async enviarComRetry(
    destinatarioId: string,
    data: AblyNotificationData,
    logContext: Record<string, any>
  ): Promise<ChannelResult> {
    let ultimoErro: string = '';

    for (let tentativa = 1; tentativa <= this.maxRetries; tentativa++) {
      try {
        this.logger.debug(`Tentativa ${tentativa}/${this.maxRetries} de envio via Ably`, {
          ...logContext,
          tentativa
        });

        // Obtém o canal do usuário
        const canalResult = await this.ablyChannelService.createUserChannel(destinatarioId);
        
        if (!canalResult.success || !canalResult.data) {
          throw new Error('Não foi possível obter canal do usuário');
        }

        const canal = canalResult.data;
        
        // Publica a notificação no canal
        await canal.publish('notification', data);

        // Sucesso
        return {
          canal: NotificationChannel.ABLY,
          sucesso: true,
          dados_resposta: {
            tentativa,
            canal_nome: canal.name
          },
          timestamp: new Date()
        };

      } catch (error) {
        ultimoErro = error.message;
        
        this.logger.warn(`Tentativa ${tentativa} falhou`, {
          ...logContext,
          tentativa,
          erro: ultimoErro
        });

        // Se não é a última tentativa, aguarda antes de tentar novamente
        if (tentativa < this.maxRetries) {
          await this.delay(this.retryDelay * tentativa); // Backoff linear
        }
      }
    }

    // Todas as tentativas falharam
    return this.criarResultadoFalha(
      `Falha após ${this.maxRetries} tentativas. Último erro: ${ultimoErro}`
    );
  }

  /**
   * Envia notificação broadcast para múltiplos usuários
   * 
   * @param destinatarioIds Lista de IDs dos destinatários
   * @param data Dados da notificação
   * @returns Array de resultados
   */
  async enviarBroadcast(
    destinatarioIds: string[],
    data: Omit<AblyNotificationData, 'id'>
  ): Promise<ChannelResult[]> {
    this.logger.log(`Iniciando broadcast para ${destinatarioIds.length} usuários`, {
      total_destinatarios: destinatarioIds.length,
      tipo: data.tipo
    });

    const resultados = await Promise.allSettled(
      destinatarioIds.map(async (destinatarioId) => {
        const notificationData = {
          ...data,
          id: `broadcast_${Date.now()}_${destinatarioId}`
        };

        return this.enviarComRetry(destinatarioId, notificationData, {
          destinatario_id: destinatarioId,
          tipo: data.tipo
        });
      })
    );

    const sucessos = resultados.filter(r => r.status === 'fulfilled' && r.value.sucesso).length;
    const falhas = resultados.length - sucessos;

    this.logger.log('Broadcast concluído', {
      total: destinatarioIds.length,
      sucessos,
      falhas,
      taxa_sucesso: (sucessos / destinatarioIds.length) * 100
    });

    return resultados.map(r => 
      r.status === 'fulfilled' 
        ? r.value 
        : this.criarResultadoFalha(`Erro no broadcast: ${r.reason}`)
    );
  }

  /**
   * Verifica se o serviço Ably está disponível
   * 
   * @returns True se disponível
   */
  async verificarDisponibilidade(): Promise<boolean> {
    try {
      // Tenta obter informações de conexão
      const connectionState = this.ablyService.getConnectionState();
    return connectionState === 'connected';
    } catch (error) {
      this.logger.error('Erro ao verificar disponibilidade do Ably', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Cria resultado de falha padronizado
   * 
   * @param erro Mensagem de erro
   * @returns Resultado de falha
   */
  private criarResultadoFalha(erro: string): ChannelResult {
    return {
      canal: NotificationChannel.ABLY,
      sucesso: false,
      erro,
      timestamp: new Date()
    };
  }

  /**
   * Utilitário para delay
   * 
   * @param ms Milissegundos para aguardar
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtém métricas do serviço
   * 
   * @returns Métricas básicas
   */
  async obterMetricas(): Promise<Record<string, any>> {
    try {
      const connectionState = this.ablyService.getConnectionState();

    return {
      estado_conexao: connectionState || 'unknown',
        max_retries: this.maxRetries,
        retry_delay: this.retryDelay,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Erro ao obter métricas', { error: error.message });
      return {
        erro: error.message,
        timestamp: new Date()
      };
    }
  }
}