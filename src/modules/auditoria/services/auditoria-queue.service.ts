import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Logger } from '@nestjs/common';
import { CreateLogAuditoriaDto } from '../dto/create-log-auditoria.dto';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';

/**
 * Serviço de Fila de Auditoria - Versão MVP
 *
 * Responsável por processar logs de auditoria.
 * Implementação simplificada para o MVP com foco nas operações essenciais.
 */
@Injectable()
export class AuditoriaQueueService {
  private readonly logger = new Logger(AuditoriaQueueService.name);

  constructor(
    @InjectQueue('auditoria') private readonly auditoriaQueue: Queue,
  ) {}

  /**
   * Processa um log de auditoria (implementação simplificada para o MVP)
   *
   * @param logAuditoriaDto Dados do log de auditoria a ser registrado
   * @returns Promise com o resultado da operação
   */
  async processarLog(
    logAuditoriaDto: CreateLogAuditoriaDto,
  ): Promise<void> {
    try {
      // No MVP, simplificamos o processamento enfileirando diretamente
      // com configuração básica
      await this.auditoriaQueue.add('registrar-log', logAuditoriaDto, {
        attempts: 2,
        removeOnComplete: true,
      });

      this.logger.debug(
        `Log de auditoria processado: ${logAuditoriaDto.entidade_afetada} - ${logAuditoriaDto.tipo_operacao}`,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      this.logger.error(
        `Erro ao processar log de auditoria: ${errorMessage}`,
      );
    }
  }

  /**
   * Enfileira um log de auditoria para processamento assíncrono
   * 
   * @param logAuditoriaDto Dados do log de auditoria a ser registrado
   * @returns Promise com o resultado da operação
   */
  async enfileirarLogAuditoria(
    logAuditoriaDto: CreateLogAuditoriaDto,
  ): Promise<void> {
    return this.processarLog(logAuditoriaDto);
  }

  /**
   * Enfileira um registro de acesso a dados sensíveis para processamento assíncrono
   * 
   * @param usuarioId ID do usuário que acessou os dados
   * @param entidade Nome da entidade acessada
   * @param entidadeId ID da entidade acessada
   * @param camposSensiveis Lista de campos sensíveis acessados
   * @param ip Endereço IP de origem do acesso
   * @param userAgent User agent do navegador
   * @param url URL acessada
   * @param metodo Método HTTP utilizado
   * @returns Promise com o resultado da operação
   */
  async enfileirarAcessoDadosSensiveis(
    usuarioId: string,
    entidade: string,
    entidadeId: string,
    camposSensiveis: string[],
    ip: string,
    userAgent: string,
    url: string,
    metodo: string,
  ): Promise<void> {
    try {
      // Cria um DTO de log específico para acesso a dados sensíveis
      const logAuditoriaDto = new CreateLogAuditoriaDto();
      logAuditoriaDto.tipo_operacao = TipoOperacao.ACCESS;
      logAuditoriaDto.entidade_afetada = entidade;
      logAuditoriaDto.entidade_id = entidadeId;
      logAuditoriaDto.usuario_id = usuarioId;
      logAuditoriaDto.ip_origem = ip;
      logAuditoriaDto.user_agent = userAgent;
      logAuditoriaDto.endpoint = url;
      logAuditoriaDto.metodo_http = metodo;
      logAuditoriaDto.dados_sensiveis_acessados = camposSensiveis;
      logAuditoriaDto.descricao = `Acesso a dados sensíveis: ${camposSensiveis.join(', ')}`;

      return this.processarLog(logAuditoriaDto);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      this.logger.error(
        `Erro ao enfileirar acesso a dados sensíveis: ${errorMessage}`,
      );
    }
  }
}
