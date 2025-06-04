import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { LogAuditoriaRepository } from '../repositories/log-auditoria.repository';
import { CreateLogAuditoriaDto } from '../dto/create-log-auditoria.dto';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { registeredProcessors } from '../../../config/bull.config';

/**
 * Processador da Fila de Auditoria
 *
 * Responsável por processar os logs de auditoria enfileirados, garantindo
 * que o registro de operações seja feito de forma assíncrona sem impactar
 * na performance das requisições enquanto mantém a rastreabilidade
 * das operações para compliance com LGPD.
 *
 * Esta implementação não usa o decorador @Processor para evitar duplicação
 * de processadores. Em vez disso, registra o processador manualmente na fila.
 */
@Injectable()
export class AuditoriaQueueProcessor implements OnModuleInit {
  private readonly logger = new Logger(AuditoriaQueueProcessor.name);

  constructor(
    // ← MUDANÇA: Use o repository customizado em vez do TypeORM direto
    private readonly logAuditoriaRepository: LogAuditoriaRepository,
    @InjectQueue('auditoria')
    private readonly auditoriaQueue: Queue,
  ) {}

  /**
   * Registra o processador manualmente na fila quando o módulo é inicializado
   */
  async onModuleInit() {
    try {
      // Registra o processador de logs de auditoria
      if (!registeredProcessors.has('registrar-log')) {
        await this.auditoriaQueue.process('registrar-log', async (job) => {
          return this.processarLogAuditoria(job);
        });

        registeredProcessors.add('registrar-log');
        this.logger.log('Processador registrar-log registrado com sucesso');
      } else {
        this.logger.warn(
          'Processador registrar-log já registrado, ignorando registro duplicado',
        );
      }

      // Registra o processador de acesso a dados sensíveis
      if (!registeredProcessors.has('registrar-acesso-dados-sensiveis')) {
        await this.auditoriaQueue.process(
          'registrar-acesso-dados-sensiveis',
          async (job) => {
            return this.processarAcessoDadosSensiveis(job);
          },
        );

        registeredProcessors.add('registrar-acesso-dados-sensiveis');
        this.logger.log(
          'Processador registrar-acesso-dados-sensiveis registrado com sucesso',
        );
      } else {
        this.logger.warn(
          'Processador registrar-acesso-dados-sensiveis já registrado, ignorando registro duplicado',
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao registrar processadores: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Processa os logs de auditoria enfileirados
   *
   * @param job Trabalho contendo os dados do log de auditoria
   */
  async processarLogAuditoria(job: Job<CreateLogAuditoriaDto>): Promise<void> {
    try {
      const logData = job.data;
      this.logger.debug(
        `Processando log de auditoria: ${logData.entidade_afetada} - ${logData.tipo_operacao}`,
      );

      // ← MUDANÇA: Use o método create do repository customizado
      const savedLog = await this.logAuditoriaRepository.create(logData);

      this.logger.debug(
        `Log de auditoria processado com sucesso: ID ${savedLog.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar log de auditoria: ${error.message}`,
        error.stack,
      );
      // Rejeita o job para que seja tentado novamente (conforme configuração de backoff)
      throw error;
    }
  }

  /**
   * Processa os registros de acesso a dados sensíveis
   *
   * @param job Trabalho contendo os dados de acesso a dados sensíveis
   */
  async processarAcessoDadosSensiveis(job: Job<any>): Promise<void> {
    try {
      const {
        usuarioId,
        entidade,
        entidadeId,
        camposSensiveis,
        ip,
        userAgent,
        endpoint,
        metodo,
        timestamp,
      } = job.data;

      this.logger.debug(
        `Processando acesso a dados sensíveis: ${entidade} - Campos: ${camposSensiveis.join(', ')}`,
      );

      // ← MUDANÇA: Crie um DTO e use o repository customizado
      const createLogDto: CreateLogAuditoriaDto = {
        tipo_operacao: TipoOperacao.ACCESS,
        entidade_afetada: entidade,
        entidade_id: entidadeId,
        dados_anteriores: {},
        dados_novos: {},
        usuario_id: usuarioId,
        ip_origem: ip,
        user_agent: userAgent,
        endpoint: endpoint,
        metodo_http: metodo,
        dados_sensiveis_acessados: camposSensiveis,
        data_hora: timestamp || new Date(),
        descricao: `Acesso a dados sensíveis (${camposSensiveis.join(', ')}) da entidade ${entidade}`,
        validar: function (validationGroup?: string): void {
          throw new Error('Function not implemented.');
        },
      };

      // Use o repository customizado
      const savedLog = await this.logAuditoriaRepository.create(createLogDto);

      this.logger.debug(
        `Acesso a dados sensíveis registrado com sucesso: ID ${savedLog.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar acesso a dados sensíveis: ${error.message}`,
        error.stack,
      );
      // Rejeita o job para que seja tentado novamente (conforme configuração de backoff)
      throw error;
    }
  }
}
