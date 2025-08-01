import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull } from 'typeorm';
import { ModuleRef } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
// import { ScheduleAdapterService } from '../../../shared/schedule/schedule-adapter.service'; // Removido temporariamente
import { NotificationTemplate } from '../../../entities/notification-template.entity';
import {
  NotificacaoSistema,
  StatusNotificacaoProcessamento,
} from '../../../entities/notification.entity';
import {
  CanalNotificacao,
  ResultadoEnvio,
} from '../interfaces/notification-channel.interface';
import { TemplateRendererService } from './template-renderer.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { CreateNotificationTemplateDto } from '../dto/create-notification-template.dto';
import { EmailService } from '../../../common/services/email.service';
import { NOTIFICATION_CREATED } from '../events/notification.events';
import { NotificationCreatedEvent } from '../events/notification-created.event';

/**
 * Serviço Gerenciador de Notificações
 *
 * Responsável por coordenar os processos de criação, agendamento e envio
 * de notificações através dos diferentes canais disponíveis
 */
@Injectable()
export class NotificationManagerService implements OnModuleInit {
  private readonly logger = new Logger(NotificationManagerService.name);
  private canaisNotificacao: Map<string, CanalNotificacao> = new Map();

  constructor(
    @InjectRepository(NotificationTemplate)
    private templateRepository: Repository<NotificationTemplate>,
    @InjectRepository(NotificacaoSistema)
    private notificacaoRepository: Repository<NotificacaoSistema>,
    private templateRenderer: TemplateRendererService,
    private moduleRef: ModuleRef,
    // private scheduleAdapter: ScheduleAdapterService, // Removido temporariamente
    private emailService: EmailService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Resolve o UsuarioService de forma lazy para evitar dependência circular
   * @returns UsuarioService instance
   */
  private async getUsuarioService() {
    const { UsuarioService } = await import(
      '../../usuario/services/usuario.service'
    );
    return this.moduleRef.get(UsuarioService, { strict: false });
  }

  /**
   * Inicializa os canais de notificação disponíveis de forma assíncrona
   * Método chamado automaticamente na inicialização do módulo
   */
  async onModuleInit() {
    // Inicialização assíncrona sem bloqueio
    setImmediate(async () => {
      try {
        this.logger.log('Inicializando o gerenciador de notificações');
        await this.registrarCanaisDisponiveis();
        // await this.iniciarProcessamentoFila(); // Removido temporariamente - depende do ScheduleAdapter
        this.logger.log('Gerenciador de notificações inicializado com sucesso');
      } catch (error) {
        this.logger.error(
          `Erro na inicialização do gerenciador de notificações: ${error.message}`,
          error.stack,
        );
      }
    });
  }

  /**
   * Cria um novo template de notificação
   *
   * @param createTemplateDto DTO com dados do template
   * @returns Template criado
   */
  async criarTemplate(
    createTemplateDto: CreateNotificationTemplateDto,
  ): Promise<NotificationTemplate> {
    // Verificar se os canais informados estão disponíveis
    for (const canal of createTemplateDto.canais_disponiveis) {
      if (!this.canaisNotificacao.has(canal)) {
        this.logger.warn(
          `Canal ${canal} informado no template não está disponível no sistema`,
        );
      }
    }

    const template = this.templateRepository.create({
      ...createTemplateDto,
      ativo: createTemplateDto.ativo ?? true,
    });

    return this.templateRepository.save(template);
  }

  /**
   * Cria uma nova notificação e a envia ou agenda seu envio
   *
   * @param createNotificationDto DTO com dados da notificação
   * @returns Notificação criada
   */
  async criarNotificacao(
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificacaoSistema> {
    // Função para verificar se é um UUID válido
    const isValidUUID = (str: string): boolean => {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };

    let template;

    // Se o template_id é fornecido e é um UUID válido, busca por ID primeiro
    if (
      createNotificationDto.template_id &&
      isValidUUID(createNotificationDto.template_id)
    ) {
      template = await this.templateRepository.findOne({
        where: { id: createNotificationDto.template_id },
      });

      // Se não encontrou por ID, tenta buscar por código
      if (!template) {
        template = await this.templateRepository.findOne({
          where: { codigo: createNotificationDto.template_id },
        });
      }
    } else if (createNotificationDto.template_id) {
      // Se não é um UUID válido mas existe, busca por código primeiro
      template = await this.templateRepository.findOne({
        where: { codigo: createNotificationDto.template_id },
      });
    }

    // Se template_id foi fornecido mas não encontrado, lança erro
    if (createNotificationDto.template_id && !template) {
      throw new Error(
        `Template com ID/código ${createNotificationDto.template_id} não encontrado`,
      );
    }

    // Se template foi encontrado mas está inativo, lança erro
    if (template && !template.ativo) {
      throw new Error(
        `Template com ID ${createNotificationDto.template_id} está inativo`,
      );
    }

    // Criar a notificação
    const notificacao = this.notificacaoRepository.create({
      destinatario_id: createNotificationDto.destinatario_id,
      template_id: template?.id,
      dados_contexto: createNotificationDto.dados_contexto,
      status: StatusNotificacaoProcessamento.PENDENTE,
      tentativas_envio: 0,
      data_agendamento: createNotificationDto.data_agendamento,
    });

    const notificacaoSalva = await this.notificacaoRepository.save(notificacao);

    // Se não houver data de agendamento, enviar imediatamente
    if (!createNotificationDto.data_agendamento) {
      this.processarNotificacao(notificacaoSalva.id).catch((err) => {
        this.logger.error(
          `Erro ao processar notificação ${notificacaoSalva.id}: ${err.message}`,
          err.stack,
        );
      });
    } else {
      // Agendar o envio
      this.agendarNotificacao(notificacaoSalva);
    }

    return notificacaoSalva;
  }

  /**
   * Busca um template de notificação por ID
   *
   * @param id ID do template
   * @returns Template encontrado
   */
  async buscarTemplatePorId(id: string): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findOne({ where: { id } });

    if (!template) {
      throw new Error(`Template com ID ${id} não encontrado`);
    }

    return template;
  }

  /**
   * Lista todos os templates de notificação
   *
   * @param options Opções de filtro e paginação
   * @returns Lista paginada de templates
   */
  async listarTemplates(
    options: {
      page?: number;
      limit?: number;
      ativo?: boolean;
    } = {},
  ) {
    const { page = 1, limit = 10, ativo } = options;

    const queryBuilder = this.templateRepository.createQueryBuilder('template');

    if (ativo !== undefined) {
      queryBuilder.where('template.ativo = :ativo', { ativo });
    }

    // Calcular paginação
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Ordenação
    queryBuilder.orderBy('template.nome', 'ASC');

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Desativa um template de notificação
   *
   * @param id ID do template
   * @returns Template atualizado
   */
  async desativarTemplate(id: string): Promise<NotificationTemplate> {
    const template = await this.buscarTemplatePorId(id);

    if (!template.ativo) {
      return template; // Já está inativo
    }

    template.ativo = false;
    return this.templateRepository.save(template);
  }

  /**
   * Ativa um template de notificação
   *
   * @param id ID do template
   * @returns Template atualizado
   */
  async ativarTemplate(id: string): Promise<NotificationTemplate> {
    const template = await this.buscarTemplatePorId(id);

    if (template.ativo) {
      return template; // Já está ativo
    }

    template.ativo = true;
    return this.templateRepository.save(template);
  }

  /**
   * Processa uma notificação, enviando-a através dos canais adequados
   *
   * @param notificacaoId ID da notificação a processar
   */
  async processarNotificacao(notificacaoId: string): Promise<void> {
    const notificacao = await this.notificacaoRepository.findOne({
      where: { id: notificacaoId },
      relations: ['template'],
    });

    if (!notificacao) {
      throw new Error(`Notificação com ID ${notificacaoId} não encontrada`);
    }

    if (notificacao.status === StatusNotificacaoProcessamento.ENVIADA) {
      this.logger.debug(`Notificação ${notificacaoId} já enviada, ignorando`);
      return;
    }

    // Atualizar status para em processamento
    notificacao.status = StatusNotificacaoProcessamento.EM_PROCESSAMENTO;
    notificacao.ultima_tentativa = new Date();
    notificacao.tentativas_envio += 1;
    await this.notificacaoRepository.save(notificacao);

    try {
      // Se não há template, usar template padrão
      if (!notificacao.template) {
        this.logger.debug(
          `Notificação ${notificacaoId} não possui template configurado, usando template padrão`,
        );

        // Criar template padrão temporário
        const mensagemPadrao =
          notificacao.dados_contexto?.mensagem ||
          notificacao.dados_contexto?.titulo ||
          'Você tem uma nova notificação.';
        const templatePadrao = {
          codigo: 'default',
          assunto: 'Nova Notificação',
          corpo: mensagemPadrao,
          corpo_html: `<p>${mensagemPadrao}</p>`,
          canais_disponiveis: ['ably', 'email'],
        };

        // Atribuir template padrão temporariamente para processamento
        notificacao.template = templatePadrao as any;
      }

      // Iterar sobre os canais suportados pelo template
      let sucessoEmAlgumCanal = false;

      // Garantir que canais_disponiveis seja sempre um array
      const canaisDisponiveis = Array.isArray(
        notificacao.template.canais_disponiveis,
      )
        ? notificacao.template.canais_disponiveis
        : [notificacao.template.canais_disponiveis];

      this.logger.debug(
        `Processando notificação ${notificacaoId} com canais: ${JSON.stringify(canaisDisponiveis)}`,
      );
      this.logger.debug(
        `Canais registrados no momento: ${Array.from(this.canaisNotificacao.keys()).join(', ')}`,
      );

      for (const canalId of canaisDisponiveis) {
        // Limpar possíveis espaços e garantir string
        const canalIdLimpo = String(canalId).trim();
        const canal = this.canaisNotificacao.get(canalIdLimpo);

        if (!canal) {
          this.logger.warn(
            `Canal ${canalIdLimpo} não encontrado para notificação ${notificacaoId}. Canais registrados: ${Array.from(this.canaisNotificacao.keys()).join(', ')}`,
          );
          continue;
        }

        // Verificar disponibilidade do canal
        const disponivel = await canal.verificarDisponibilidade();
        if (!disponivel) {
          this.logger.warn(
            `Canal ${canalIdLimpo} não está disponível no momento`,
          );
          continue;
        }

        // Enviar notificação por este canal
        try {
          const resultado = await canal.enviar(notificacao);

          if (resultado.sucesso) {
            sucessoEmAlgumCanal = true;

            // Registrar sucesso deste canal
            notificacao.dados_envio = notificacao.dados_envio || {};
            notificacao.dados_envio[canalId] = {
              sucesso: true,
              data_envio: resultado.data_envio,
              identificador_externo: resultado.identificador_externo,
              mensagem: resultado.mensagem,
            };
          } else {
            // Registrar falha deste canal
            notificacao.dados_envio = notificacao.dados_envio || {};
            notificacao.dados_envio[canalId] = {
              sucesso: false,
              data_tentativa: resultado.data_envio,
              erro: resultado.mensagem,
            };
          }
        } catch (canalError) {
          this.logger.error(
            `Erro no canal ${canalId} ao enviar notificação ${notificacaoId}: ${canalError.message}`,
            canalError.stack,
          );
        }
      }

      // Atualizar status final da notificação
      if (sucessoEmAlgumCanal) {
        notificacao.status = StatusNotificacaoProcessamento.ENVIADA;
        notificacao.data_envio = new Date();
      } else if (notificacao.tentativas_envio >= 3) {
        notificacao.status = StatusNotificacaoProcessamento.FALHA;
      } else {
        notificacao.status = StatusNotificacaoProcessamento.PENDENTE;
        // Agendar nova tentativa em 5 minutos
        setTimeout(
          () => {
            this.processarNotificacao(notificacaoId).catch((err) => {
              this.logger.error(
                `Erro ao reprocessar notificação ${notificacaoId}: ${err.message}`,
              );
            });
          },
          5 * 60 * 1000,
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro geral ao processar notificação ${notificacaoId}: ${error.message}`,
        error.stack,
      );

      notificacao.status =
        notificacao.tentativas_envio >= 3
          ? StatusNotificacaoProcessamento.FALHA
          : StatusNotificacaoProcessamento.PENDENTE;
    }

    // Salvar estado final da notificação
    await this.notificacaoRepository.save(notificacao);
  }

  /**
   * Agenda o envio de uma notificação para uma data futura
   * TEMPORARIAMENTE DESABILITADO - Depende do ScheduleAdapter
   *
   * @param notificacao Notificação a ser agendada
   */
  private agendarNotificacao(notificacao: NotificacaoSistema): void {
    this.logger.warn(
      'Agendamento de notificações temporariamente desabilitado',
    );
    // Processar imediatamente como fallback
    this.processarNotificacao(notificacao.id).catch((err) => {
      this.logger.error(
        `Erro ao processar notificação ${notificacao.id}: ${err.message}`,
      );
    });
  }

  /**
   * Registra os canais de notificação disponíveis no sistema
   * Cada canal implementa a interface CanalNotificacao
   */
  private async registrarCanaisDisponiveis(): Promise<void> {
    try {
      // Canal Ably (Principal - Tempo Real)
      const canalAbly: CanalNotificacao = {
        canal_id: 'ably',
        verificarDisponibilidade: async () => {
          try {
            const { AblyService } = await import('./ably.service');
            const ablyService = this.moduleRef.get(AblyService, {
              strict: false,
            });
            return ablyService && (await ablyService.isConnected());
          } catch {
            return false;
          }
        },
        enviar: async (
          notificacao: NotificacaoSistema,
        ): Promise<ResultadoEnvio> => {
          try {
            const { AblyService } = await import('./ably.service');
            const ablyService = this.moduleRef.get(AblyService, {
              strict: false,
            });

            if (!ablyService) {
              throw new Error('Serviço Ably não disponível');
            }

            // Buscar dados do usuário destinatário
            const usuarioService = await this.getUsuarioService();
            const usuario = await usuarioService.findById(
              notificacao.destinatario_id,
            );

            if (!usuario) {
              throw new Error('Usuário destinatário não encontrado');
            }

            // Renderizar template se disponível
            let titulo = 'Nova Notificação';
            let conteudo = 'Você tem uma nova notificação.';

            if (notificacao.template) {
              const templateRenderizado =
                this.templateRenderer.renderizarNotificacao(
                  notificacao.template,
                  notificacao.dados_contexto || {},
                );
              titulo = templateRenderizado.assunto;
              conteudo = templateRenderizado.conteudo;
            }

            // Preparar dados da notificação para o Ably
            const dadosNotificacao = {
              id: notificacao.id,
              titulo,
              conteudo,
              tipo: notificacao.template?.tipo || 'info',
              prioridade: notificacao.template?.prioridade || 'normal',
              dados_contexto: notificacao.dados_contexto,
              timestamp: new Date().toISOString(),
              destinatario_id: notificacao.destinatario_id,
            };

            // Enviar via Ably para canal específico do usuário
            const canalUsuario = `user:${notificacao.destinatario_id}:notifications`;
            const resultado = await ablyService.publishMessage(
              canalUsuario,
              'notification',
              dadosNotificacao,
            );

            if (resultado.success) {
              return {
                sucesso: true,
                mensagem: 'Notificação Ably enviada com sucesso',
                data_envio: new Date(),
                identificador_externo: resultado.messageId,
                dados_resposta: {
                  canal: canalUsuario,
                  messageId: resultado.messageId,
                  tipo: 'ably_realtime',
                },
              };
            } else {
              throw new Error(resultado.error || 'Falha no envio via Ably');
            }
          } catch (error) {
            this.logger.error(
              `Erro ao enviar notificação via Ably: ${error.message}`,
              error.stack,
            );
            return {
              sucesso: false,
              mensagem: `Erro ao enviar via Ably: ${error.message}`,
              data_envio: new Date(),
              erro: error as Error,
            };
          }
        },
      };

      this.canaisNotificacao.set('ably', canalAbly);
      this.logger.log('Canal de notificação registrado: ably (Principal)');

      // Verificar se o EmailService está disponível e configurado
      try {
        // Verificar se o EmailService está habilitado e configurado
        const emailDisponivel =
          this.emailService && this.emailService.isEmailEnabled();

        this.logger.debug(
          `EmailService disponível: ${!!this.emailService}, habilitado: ${emailDisponivel}`,
        );

        if (emailDisponivel) {
          // Criar um canal de email usando o EmailService compartilhado
          const canalEmail: CanalNotificacao = {
            canal_id: 'email',
            verificarDisponibilidade: async () => emailDisponivel,
            enviar: async (
              notificacao: NotificacaoSistema,
            ): Promise<ResultadoEnvio> => {
              try {
                this.logger.debug(
                  `Tentando enviar email para usuário ID: ${notificacao.destinatario_id}`,
                );
                this.logger.debug(`Assunto: ${notificacao.template.assunto}`);
                this.logger.debug(
                  `Dados contexto: ${JSON.stringify(notificacao.dados_contexto)}`,
                );

                // Buscar o email do usuário pelo ID
                const usuarioService = await this.getUsuarioService();
                const usuario = await usuarioService.findById(
                  notificacao.destinatario_id,
                );
                if (!usuario || !usuario.email) {
                  throw new Error(
                    `Usuário com ID ${notificacao.destinatario_id} não encontrado ou sem email`,
                  );
                }

                this.logger.debug(
                  `Email do usuário encontrado: ${usuario.email}`,
                );

                const sucesso = await this.emailService.sendEmail({
                  to: usuario.email,
                  subject: notificacao.template.assunto,
                  template: {
                    type: 'inline',
                    source:
                      notificacao.template.corpo_html ||
                      notificacao.template.corpo,
                  },
                  context: notificacao.dados_contexto,
                });

                return {
                  sucesso,
                  mensagem: sucesso
                    ? 'Email enviado com sucesso'
                    : 'Falha no envio do email',
                  data_envio: new Date(),
                  dados_resposta: {
                    enviado: sucesso,
                    email_destinatario: usuario.email,
                  },
                };
              } catch (error) {
                this.logger.error(
                  `Erro detalhado ao enviar email: ${error.message}`,
                  error.stack,
                );
                return {
                  sucesso: false,
                  mensagem: `Erro ao enviar email: ${error.message}`,
                  data_envio: new Date(),
                  erro: error as Error,
                };
              }
            },
          };

          this.canaisNotificacao.set('email', canalEmail);
          this.logger.log('Canal de notificação registrado: email');
        } else {
          this.logger.warn(
            'EmailService não está habilitado ou configurado. Notificações por email não serão enviadas.',
          );
        }
      } catch (e) {
        this.logger.warn(
          'Erro ao verificar EmailService. Notificações por email não serão enviadas.',
          e.message,
        );
      }

      // Canal sistema removido - SSE não está mais disponível

      this.logger.log(
        `Total de ${this.canaisNotificacao.size} canais de notificação registrados`,
      );
      this.logger.debug(
        `Canais registrados: ${Array.from(this.canaisNotificacao.keys()).join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao registrar canais de notificação: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Inicia o processamento da fila de notificações pendentes
   */
  private async iniciarProcessamentoFila(): Promise<void> {
    try {
      // Buscar todas as notificações pendentes antigas que não foram processadas
      const notificacoesPendentes = await this.notificacaoRepository.find({
        where: { status: StatusNotificacaoProcessamento.PENDENTE },
        order: { created_at: 'ASC' },
      });

      this.logger.log(
        `Iniciando processamento de ${notificacoesPendentes.length} notificações pendentes`,
      );

      // Processar cada notificação com um pequeno intervalo para não sobrecarregar
      for (const [index, notificacao] of notificacoesPendentes.entries()) {
        // Verificar se está agendada para o futuro
        if (
          notificacao.data_agendamento &&
          notificacao.data_agendamento > new Date()
        ) {
          this.agendarNotificacao(notificacao);
          continue;
        }

        // Atrasar o processamento proporcionalmente ao índice para não sobrecarregar
        setTimeout(() => {
          this.processarNotificacao(notificacao.id).catch((err) => {
            this.logger.error(
              `Erro ao processar notificação pendente ${notificacao.id}: ${err.message}`,
            );
          });
        }, index * 500); // 500ms de intervalo entre cada processamento
      }

      // TODO: Configurar job para verificar notificações pendentes periodicamente
      // Temporariamente desabilitado - depende do ScheduleAdapter
      this.logger.warn(
        'Verificação periódica de notificações pendentes temporariamente desabilitada',
      );
    } catch (error) {
      this.logger.error(
        `Erro ao iniciar processamento da fila de notificações: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Verifica e processa notificações pendentes periodicamente
   */
  private async verificarNotificacoesPendentes(): Promise<void> {
    try {
      const agora = new Date();

      // Buscar notificações pendentes que não estão agendadas para o futuro
      const notificacoesPendentes = await this.notificacaoRepository.find({
        where: [
          {
            status: StatusNotificacaoProcessamento.PENDENTE,
            data_agendamento: IsNull(),
          },
          {
            status: StatusNotificacaoProcessamento.PENDENTE,
            data_agendamento: LessThanOrEqual(agora),
          },
        ],
        order: { created_at: 'ASC' },
        take: 50, // Limitar quantidade para não sobrecarregar
      });

      if (notificacoesPendentes.length > 0) {
        this.logger.debug(
          `Processando ${notificacoesPendentes.length} notificações pendentes`,
        );

        // Processar cada notificação com intervalo para não sobrecarregar
        for (const [index, notificacao] of notificacoesPendentes.entries()) {
          setTimeout(() => {
            this.processarNotificacao(notificacao.id).catch((err) => {
              this.logger.error(
                `Erro ao processar notificação pendente ${notificacao.id}: ${err.message}`,
              );
            });
          }, index * 200); // 200ms de intervalo entre cada processamento
        }
      }
    } catch (error) {
      this.logger.error(
        `Erro ao verificar notificações pendentes: ${error.message}`,
        error.stack,
      );
    }
  }
}
