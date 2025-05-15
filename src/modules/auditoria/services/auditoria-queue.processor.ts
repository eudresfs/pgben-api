import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogAuditoria } from '../entities/log-auditoria.entity';
import { CreateLogAuditoriaDto } from '../dto/create-log-auditoria.dto';
import { TipoOperacao } from '../enums/tipo-operacao.enum';

/**
 * Processador da Fila de Auditoria
 * 
 * Processa de forma assíncrona os logs de auditoria, evitando impacto
 * na performance das requisições enquanto mantém a rastreabilidade
 * das operações para compliance com LGPD.
 */
@Processor('auditoria')
export class AuditoriaQueueProcessor {
  private readonly logger = new Logger(AuditoriaQueueProcessor.name);

  constructor(
    @InjectRepository(LogAuditoria)
    private readonly logAuditoriaRepository: Repository<LogAuditoria>,
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
      this.logger.debug(`Processando log de auditoria: ${logData.entidade_afetada} - ${logData.tipo_operacao}`);
      
      // Cria uma nova instância de LogAuditoria com os dados recebidos
      const logAuditoria = this.logAuditoriaRepository.create(logData);
      
      // Salva o log no banco de dados
      const savedLog = await this.logAuditoriaRepository.save(logAuditoria);
      
      this.logger.debug(`Log de auditoria processado com sucesso: ID ${savedLog.id}`);
    } catch (error) {
      this.logger.error(`Erro ao processar log de auditoria: ${error.message}`, error.stack);
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
        usuarioId, entidade, entidadeId, camposSensiveis, 
        ip, userAgent, endpoint, metodo, timestamp 
      } = job.data;
      
      this.logger.debug(`Processando acesso a dados sensíveis: ${entidade} - Campos: ${camposSensiveis.join(', ')}`);
      
      // Cria um log específico para acesso a dados sensíveis
      const logAuditoria = this.logAuditoriaRepository.create({
        tipo_operacao: TipoOperacao.ACCESS,
        entidade_afetada: entidade,
        entidade_id: entidadeId,
        dados_anteriores: null,
        dados_novos: null,
        usuario_id: usuarioId,
        ip_origem: ip,
        user_agent: userAgent,
        endpoint: endpoint,
        metodo_http: metodo,
        dados_sensiveis_acessados: camposSensiveis,
        data_hora: timestamp || new Date(),
        descricao: `Acesso a dados sensíveis (${camposSensiveis.join(', ')}) da entidade ${entidade}`,
      });
      
      // Salva o log no banco de dados
      await this.logAuditoriaRepository.save(logAuditoria);
      
      this.logger.debug(`Acesso a dados sensíveis registrado com sucesso: ID ${logAuditoria.id}`);
    } catch (error) {
      this.logger.error(`Erro ao processar acesso a dados sensíveis: ${error.message}`, error.stack);
      // Rejeita o job para que seja tentado novamente (conforme configuração de backoff)
      throw error;
    }
  }
}
