import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Logger } from '@nestjs/common';
import { CreateLogAuditoriaDto } from '../dto/create-log-auditoria.dto';
import { TipoOperacao } from '../enums/tipo-operacao.enum';

/**
 * Serviço de Fila de Auditoria
 * 
 * Responsável por enfileirar logs de auditoria para processamento assíncrono,
 * evitando impacto na performance das requisições do usuário.
 */
@Injectable()
export class AuditoriaQueueService {
  private readonly logger = new Logger(AuditoriaQueueService.name);

  constructor(
    @InjectQueue('auditoria') private readonly auditoriaQueue: Queue,
  ) {}

  /**
   * Adiciona um log de auditoria à fila para processamento assíncrono
   * 
   * @param logAuditoriaDto Dados do log de auditoria a ser registrado
   * @returns Promise com o resultado da operação de enfileiramento
   */
  async enfileirarLogAuditoria(logAuditoriaDto: CreateLogAuditoriaDto): Promise<void> {
    try {
      await this.auditoriaQueue.add('registrar-log', logAuditoriaDto, {
        attempts: 3, // Tenta 3 vezes em caso de falha
        backoff: {
          type: 'exponential',
          delay: 1000, // Delay inicial de 1 segundo entre tentativas
        },
        removeOnComplete: true, // Remove o job após conclusão com sucesso
        removeOnFail: false, // Mantém jobs com falha para investigação
      });
      
      this.logger.debug(`Log de auditoria enfileirado: ${logAuditoriaDto.entidade_afetada} - ${logAuditoriaDto.tipo_operacao}`);
    } catch (error) {
      this.logger.error(`Erro ao enfileirar log de auditoria: ${error.message}`, error.stack);
      // Em caso de falha no enfileiramento, ainda permite que a aplicação continue
    }
  }

  /**
   * Adiciona um registro de acesso a dados sensíveis à fila para processamento assíncrono
   * 
   * @param usuarioId ID do usuário que acessou os dados sensíveis
   * @param entidade Nome da entidade que contém os dados sensíveis
   * @param entidadeId ID da entidade que contém os dados sensíveis
   * @param camposSensiveis Lista de campos sensíveis acessados
   * @param ip IP do usuário
   * @param userAgent User agent do navegador/cliente
   * @param endpoint Endpoint acessado
   * @param metodo Método HTTP utilizado
   */
  async enfileirarAcessoDadosSensiveis(
    usuarioId: string,
    entidade: string,
    entidadeId: string,
    camposSensiveis: string[],
    ip: string,
    userAgent: string,
    endpoint: string,
    metodo: string,
  ): Promise<void> {
    try {
      await this.auditoriaQueue.add('registrar-acesso-dados-sensiveis', {
        usuarioId,
        entidade,
        entidadeId,
        camposSensiveis,
        ip,
        userAgent,
        endpoint,
        metodo,
        timestamp: new Date(),
      }, {
        priority: 1, // Prioridade alta para acessos a dados sensíveis
        attempts: 5, // Mais tentativas para garantir o registro
        backoff: {
          type: 'exponential',
          delay: 500, // Delay inicial menor para tentar mais rapidamente
        },
        removeOnComplete: false, // Mantém registro de acessos a dados sensíveis
      });
      
      this.logger.debug(`Acesso a dados sensíveis enfileirado: ${entidade} - Campos: ${camposSensiveis.join(', ')}`);
    } catch (error) {
      this.logger.error(`Erro ao enfileirar acesso a dados sensíveis: ${error.message}`, error.stack);
    }
  }
}
