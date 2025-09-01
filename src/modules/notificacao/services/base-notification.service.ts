import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { NotificacaoSistema, StatusNotificacaoProcessamento } from '../../../entities/notification.entity';
import { EmailService } from '../../../common/services/email.service';
import { TemplateValidationService } from './template-validation.service';
import { AblyNotificationService } from './ably-notification.service';
import { NotificationContextFactory } from './notification-context.factory';
import {
  BaseNotificationContext,
  NotificationResult,
  ChannelResult,
  NotificationChannel,
  NotificationMetrics,
  RetryConfig
} from '../interfaces/base-notification.interface';

/**
 * Serviço base de notificações padronizado
 * 
 * Responsável por:
 * - Orquestrar o envio de notificações por todos os canais
 * - Validar templates obrigatoriamente
 * - Garantir logs estruturados
 * - Implementar retry automático
 * - Fornecer métricas e observabilidade
 * - Seguir princípios DRY
 */
@Injectable()
export class BaseNotificationService {
  private readonly logger = new Logger(BaseNotificationService.name);
  private readonly retryConfig: RetryConfig;
  private readonly metricas: NotificationMetrics;

  constructor(
    @InjectRepository(NotificacaoSistema)
    private readonly notificacaoRepository: Repository<NotificacaoSistema>,
    private readonly templateValidationService: TemplateValidationService,
    private readonly ablyNotificationService: AblyNotificationService,
    private readonly emailService: EmailService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    public readonly contextFactory: NotificationContextFactory
  ) {
    // Configuração de retry
    this.retryConfig = {
      max_tentativas: this.configService.get<number>('NOTIFICATION_MAX_RETRIES', 3),
      intervalo_base: this.configService.get<number>('NOTIFICATION_RETRY_INTERVAL', 1000),
      multiplicador_backoff: this.configService.get<number>('NOTIFICATION_BACKOFF_MULTIPLIER', 2),
      intervalo_maximo: this.configService.get<number>('NOTIFICATION_MAX_INTERVAL', 30000)
    };

    // Inicializa métricas
    this.metricas = {
      total_enviadas: 0,
      total_sucessos: 0,
      total_falhas: 0,
      taxa_sucesso: 0,
      tempo_medio_processamento: 0,
      metricas_por_canal: {
        [NotificationChannel.EMAIL]: [],
        [NotificationChannel.IN_APP]: [],
        [NotificationChannel.ABLY]: [],
        [NotificationChannel.SMS]: []
      }
    };
  }

  /**
   * Envia notificação seguindo o fluxo padronizado completo
   * 
   * @param context Contexto da notificação
   * @returns Resultado completo do envio
   */
  async enviarNotificacao(context: BaseNotificationContext): Promise<NotificationResult> {
    const startTime = Date.now();
    const logContext = {
      destinatario_id: context.destinatario_id,
      tipo: context.tipo,
      prioridade: context.prioridade,
      canais: context.canais
    };

    this.logger.log('Iniciando envio de notificação padronizada', logContext);

    try {
      // 1. Validação obrigatória de template
      const validacaoTemplate = await this.templateValidationService.validarTemplate(context);
      
      if (!validacaoTemplate.valido) {
        const erro = `Validação de template falhou: ${validacaoTemplate.erros.join(', ')}`;
        this.logger.error(erro, logContext);
        
        return this.criarResultadoFalha('template_validation_failed', erro, startTime);
      }

      // 2. Criação da notificação no banco
      const notificacao = await this.criarNotificacaoSistema(context);
      
      this.logger.log('Notificação criada no sistema', {
        ...logContext,
        notificacao_id: notificacao.id
      });

      // 3. Envio por todos os canais solicitados
      const resultadosCanais = await this.enviarPorCanais(context, notificacao.id);

      // 4. Atualização do status da notificação
      await this.atualizarStatusNotificacao(notificacao.id, resultadosCanais);

      // 5. Emissão de eventos
      this.emitirEventos(context, notificacao.id, resultadosCanais);

      // 6. Atualização de métricas
      this.atualizarMetricas(resultadosCanais, Date.now() - startTime);

      const sucesso = resultadosCanais.some(r => r.sucesso);
      const duration = Date.now() - startTime;

      this.logger.log(`Notificação processada em ${duration}ms`, {
        ...logContext,
        notificacao_id: notificacao.id,
        sucesso,
        canais_sucesso: resultadosCanais.filter(r => r.sucesso).length,
        canais_falha: resultadosCanais.filter(r => !r.sucesso).length,
        duration
      });

      return {
        notificacao_id: notificacao.id,
        sucesso,
        resultados_canais: resultadosCanais,
        erro_geral: sucesso ? undefined : 'Falha em todos os canais',
        timestamp: new Date()
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Erro inesperado no envio de notificação', {
        ...logContext,
        error: error.message,
        stack: error.stack,
        duration
      });

      return this.criarResultadoFalha('unexpected_error', error.message, startTime);
    }
  }

  /**
   * Envia notificação por todos os canais especificados
   * 
   * @param context Contexto da notificação
   * @param notificacaoId ID da notificação
   * @returns Array de resultados por canal
   */
  private async enviarPorCanais(
    context: BaseNotificationContext,
    notificacaoId: string
  ): Promise<ChannelResult[]> {
    const resultados: ChannelResult[] = [];

    // Processa canais em paralelo para melhor performance
    const promessasEnvio = context.canais.map(async (canal) => {
      try {
        switch (canal) {
          case NotificationChannel.EMAIL:
            return await this.enviarPorEmail(context, notificacaoId);
          
          case NotificationChannel.ABLY:
          case NotificationChannel.IN_APP:
            return await this.ablyNotificationService.enviarNotificacao(context, notificacaoId);
          
          case NotificationChannel.SMS:
            return await this.enviarPorSMS(context, notificacaoId);
          
          default:
            return this.criarResultadoCanalFalha(canal, 'Canal não suportado');
        }
      } catch (error) {
        this.logger.error(`Erro no envio por canal ${canal}`, {
          canal,
          notificacao_id: notificacaoId,
          error: error.message
        });
        
        return this.criarResultadoCanalFalha(canal, error.message);
      }
    });

    const resultadosCanais = await Promise.allSettled(promessasEnvio);
    
    resultadosCanais.forEach((resultado, index) => {
      if (resultado.status === 'fulfilled') {
        resultados.push(resultado.value);
      } else {
        const canal = context.canais[index];
        resultados.push(this.criarResultadoCanalFalha(canal, resultado.reason));
      }
    });

    return resultados;
  }

  /**
   * Envia notificação por e-mail
   * 
   * @param context Contexto da notificação
   * @param notificacaoId ID da notificação
   * @returns Resultado do envio
   */
  private async enviarPorEmail(
    context: BaseNotificationContext,
    notificacaoId: string
  ): Promise<ChannelResult> {
    try {
      if (!context.template_email) {
        throw new Error('Template de e-mail é obrigatório para envio por e-mail');
      }

      // Aqui seria a integração com o EmailService existente
      // Por enquanto, simula o envio
      await this.emailService.sendEmail({
         to: context.destinatario_id,
         template: context.template_email,
         context: context.dados_contexto
       });

      return {
        canal: NotificationChannel.EMAIL,
        sucesso: true,
        dados_resposta: {
          template_usado: context.template_email,
          notificacao_id: notificacaoId
        },
        timestamp: new Date()
      };

    } catch (error) {
      return this.criarResultadoCanalFalha(NotificationChannel.EMAIL, error.message);
    }
  }

  /**
   * Envia notificação por SMS (placeholder)
   * 
   * @param context Contexto da notificação
   * @param notificacaoId ID da notificação
   * @returns Resultado do envio
   */
  private async enviarPorSMS(
    context: BaseNotificationContext,
    notificacaoId: string
  ): Promise<ChannelResult> {
    // Implementação futura do SMS
    return this.criarResultadoCanalFalha(NotificationChannel.SMS, 'SMS não implementado ainda');
  }

  /**
   * Cria notificação no sistema
   * 
   * @param context Contexto da notificação
   * @returns Notificação criada
   */
  private async criarNotificacaoSistema(context: BaseNotificationContext): Promise<NotificacaoSistema> {
    const notificacao = this.notificacaoRepository.create({
      destinatario_id: context.destinatario_id,
      template_id: null, // Template será resolvido pelo template_email
      dados_contexto: {
        ...context.dados_contexto,
        tipo: context.tipo,
        prioridade: context.prioridade,
        titulo: context.titulo,
        conteudo: context.conteudo,
        url: context.url,
        canais: context.canais,
        template_email: context.template_email
      },
      status: StatusNotificacaoProcessamento.EM_PROCESSAMENTO,
      tentativas_entrega: [],
      tentativas_envio: 0,
      numero_tentativas: 0
    });

    return await this.notificacaoRepository.save(notificacao);
  }

  /**
   * Atualiza status da notificação baseado nos resultados
   * 
   * @param notificacaoId ID da notificação
   * @param resultados Resultados dos canais
   */
  private async atualizarStatusNotificacao(
    notificacaoId: string,
    resultados: ChannelResult[]
  ): Promise<void> {
    const algumSucesso = resultados.some(r => r.sucesso);
    const todosSucesso = resultados.every(r => r.sucesso);
    
    let status: StatusNotificacaoProcessamento;
    
    if (todosSucesso) {
      status = StatusNotificacaoProcessamento.ENVIADA;
    } else if (algumSucesso) {
      status = StatusNotificacaoProcessamento.ENVIADA; // Parcialmente enviada
    } else {
      status = StatusNotificacaoProcessamento.FALHA;
    }

    await this.notificacaoRepository.update(notificacaoId, {
      status,
      tentativas_entrega: resultados.map(r => ({
        data_tentativa: r.timestamp,
        canal: r.canal,
        sucesso: r.sucesso,
        mensagem_erro: r.erro,
        dados_resposta: r.dados_resposta
      })),
      data_envio: algumSucesso ? new Date() : null,
      ultima_tentativa: new Date()
    });
  }

  /**
   * Emite eventos baseados nos resultados
   * 
   * @param context Contexto da notificação
   * @param notificacaoId ID da notificação
   * @param resultados Resultados dos canais
   */
  private emitirEventos(
    context: BaseNotificationContext,
    notificacaoId: string,
    resultados: ChannelResult[]
  ): void {
    const algumSucesso = resultados.some(r => r.sucesso);
    
    if (algumSucesso) {
      this.eventEmitter.emit('notification.sent', {
        notificacao_id: notificacaoId,
        destinatario_id: context.destinatario_id,
        tipo: context.tipo,
        canais_sucesso: resultados.filter(r => r.sucesso).map(r => r.canal),
        timestamp: new Date()
      });
    } else {
      this.eventEmitter.emit('notification.failed', {
        notificacao_id: notificacaoId,
        destinatario_id: context.destinatario_id,
        tipo: context.tipo,
        erros: resultados.map(r => ({ canal: r.canal, erro: r.erro })),
        timestamp: new Date()
      });
    }
  }

  /**
   * Atualiza métricas do serviço
   * 
   * @param resultados Resultados dos canais
   * @param duracao Duração do processamento
   */
  private atualizarMetricas(resultados: ChannelResult[], duracao: number): void {
    this.metricas.total_enviadas++;
    
    const algumSucesso = resultados.some(r => r.sucesso);
    if (algumSucesso) {
      this.metricas.total_sucessos++;
    } else {
      this.metricas.total_falhas++;
    }
    
    this.metricas.taxa_sucesso = (this.metricas.total_sucessos / this.metricas.total_enviadas) * 100;
    
    // Atualiza tempo médio (média móvel simples)
    this.metricas.tempo_medio_processamento = 
      (this.metricas.tempo_medio_processamento + duracao) / 2;
    
    // Atualiza métricas por canal
    resultados.forEach(resultado => {
      this.metricas.metricas_por_canal[resultado.canal].push(resultado);
      
      // Mantém apenas os últimos 100 resultados por canal
      if (this.metricas.metricas_por_canal[resultado.canal].length > 100) {
        this.metricas.metricas_por_canal[resultado.canal].shift();
      }
    });
  }

  /**
   * Cria resultado de falha geral
   * 
   * @param tipo Tipo do erro
   * @param erro Mensagem de erro
   * @param startTime Tempo de início
   * @returns Resultado de falha
   */
  private criarResultadoFalha(tipo: string, erro: string, startTime: number): NotificationResult {
    return {
      notificacao_id: '',
      sucesso: false,
      resultados_canais: [],
      erro_geral: `${tipo}: ${erro}`,
      timestamp: new Date()
    };
  }

  /**
   * Cria resultado de falha para canal específico
   * 
   * @param canal Canal que falhou
   * @param erro Mensagem de erro
   * @returns Resultado de falha do canal
   */
  private criarResultadoCanalFalha(canal: NotificationChannel, erro: string): ChannelResult {
    return {
      canal,
      sucesso: false,
      erro,
      timestamp: new Date()
    };
  }

  /**
   * Obtém métricas atuais do serviço
   * 
   * @returns Métricas completas
   */
  obterMetricas(): NotificationMetrics {
    return { ...this.metricas };
  }

  /**
   * Redefine métricas (útil para testes)
   */
  redefinirMetricas(): void {
    this.metricas.total_enviadas = 0;
    this.metricas.total_sucessos = 0;
    this.metricas.total_falhas = 0;
    this.metricas.taxa_sucesso = 0;
    this.metricas.tempo_medio_processamento = 0;
    
    Object.keys(this.metricas.metricas_por_canal).forEach(canal => {
      this.metricas.metricas_por_canal[canal as NotificationChannel] = [];
    });
  }
}