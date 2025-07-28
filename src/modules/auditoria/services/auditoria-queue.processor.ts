import { Injectable, Logger } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { LogAuditoriaRepository } from '../repositories/log-auditoria.repository';
import { CreateLogAuditoriaDto } from '../dto/create-log-auditoria.dto';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';

/**
 * Processador da Fila de Auditoria
 *
 * Responsável por processar os logs de auditoria enfileirados, garantindo
 * que o registro de operações seja feito de forma assíncrona sem impactar
 * na performance das requisições enquanto mantém a rastreabilidade
 * das operações para compliance com LGPD.
 *
 * Utiliza os decoradores @Processor e @Process do NestJS para registrar
 * os handlers dos jobs de forma declarativa.
 */
@Processor('auditoria')
export class AuditoriaQueueProcessor {
  private readonly logger = new Logger(AuditoriaQueueProcessor.name);

  constructor(
    private readonly logAuditoriaRepository: LogAuditoriaRepository,
  ) {}

  /**
   * Processa os logs de auditoria enfileirados
   *
   * @param job Trabalho contendo os dados do log de auditoria
   */
  @Process('registrar-log')
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
  @Process('registrar-acesso-dados-sensiveis')
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
