import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditoriaQueueService } from '../../auditoria/services/auditoria-queue.service';
import { TipoOperacao } from '../../auditoria/enums/tipo-operacao.enum';
import { CreateLogAuditoriaDto } from '../../auditoria/dto/create-log-auditoria.dto';

/**
 * Interceptor para auditoria de acesso a dados sensíveis de cidadãos
 *
 * Registra todas as operações de acesso a dados sensíveis para compliance com LGPD
 */
@Injectable()
export class CidadaoAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CidadaoAuditInterceptor.name);

  // constructor(private readonly auditoriaQueueService: AuditoriaQueueService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, params, query, body, user } = request;
    const userId = user ? user['id'] : 'anônimo';
    const userRole = user ? user['role'] : 'não autenticado';

    // Identificar operação sensível
    const isSensitiveOperation = this.isSensitiveOperation(method, url);

    // Registrar início da operação
    if (isSensitiveOperation) {
      this.logger.log(
        `LGPD_AUDIT: Acesso a dados sensíveis - Usuário: ${userId}, Perfil: ${userRole}, Método: ${method}, URL: ${url}`,
      );
    }

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Registrar operação bem-sucedida
          if (isSensitiveOperation) {
            const duration = Date.now() - now;
            this.logger.log(
              `LGPD_AUDIT: Operação concluída - Duração: ${duration}ms, Usuário: ${userId}, Método: ${method}, URL: ${url}`,
            );

            // Registrar em sistema de auditoria (implementação futura)
            this.registerAuditEvent({
              userId,
              userRole,
              method,
              url,
              params,
              query,
              body: this.sanitizeBody(body),
              timestamp: new Date(),
              duration,
              status: 'success',
            });
          }
        },
        error: (error) => {
          // Registrar operação com erro
          if (isSensitiveOperation) {
            const duration = Date.now() - now;
            this.logger.error(
              `LGPD_AUDIT: Erro na operação - Duração: ${duration}ms, Usuário: ${userId}, Método: ${method}, URL: ${url}, Erro: ${error.message}`,
            );

            // Registrar em sistema de auditoria (implementação futura)
            this.registerAuditEvent({
              userId,
              userRole,
              method,
              url,
              params,
              query,
              body: this.sanitizeBody(body),
              timestamp: new Date(),
              duration,
              status: 'error',
              errorMessage: error.message,
            });
          }
        },
      }),
    );
  }

  /**
   * Verifica se a operação é sensível do ponto de vista da LGPD
   */
  private isSensitiveOperation(method: string, url: string): boolean {
    // Operações de leitura de dados pessoais
    if (
      url.includes('/v1/cidadao/') &&
      (method === 'GET' || method === 'POST')
    ) {
      return true;
    }

    // Operações de modificação de dados pessoais
    if (
      url.includes('/v1/cidadao') &&
      (method === 'PUT' || method === 'DELETE')
    ) {
      return true;
    }

    // Busca por CPF ou NIS (dados sensíveis)
    if (url.includes('/v1/cidadao/cpf/') || url.includes('/v1/cidadao/nis/')) {
      return true;
    }

    return false;
  }

  /**
   * Extrai o ID da entidade da URL
   */
  private extractEntityId(url: string): string {
    // Padrão para extrair UUID da URL
    const uuidPattern =
      /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
    const match = url.match(uuidPattern);

    if (match && match[1]) {
      return match[1];
    }

    // Se não encontrou UUID, tenta extrair CPF ou NIS
    if (url.includes('/cpf/')) {
      const cpfMatch = url.match(/\/cpf\/([^/]+)/);
      return cpfMatch ? cpfMatch[1] : 'desconhecido';
    }

    if (url.includes('/nis/')) {
      const nisMatch = url.match(/\/nis\/([^/]+)/);
      return nisMatch ? nisMatch[1] : 'desconhecido';
    }

    return 'desconhecido';
  }

  /**
   * Verifica se o corpo da requisição contém dados sensíveis
   */
  private containsSensitiveData(body: any): boolean {
    if (!body) return false;

    const sensitiveFields = [
      'cpf',
      'nis',
      'rg',
      'data_nascimento',
      'renda',
      'composicao_familiar',
    ];

    return sensitiveFields.some((field) => field in body);
  }

  /**
   * Extrai os campos sensíveis do corpo da requisição
   */
  private extractSensitiveFields(body: any): string[] {
    if (!body) return [];

    const sensitiveFields = [
      'cpf',
      'nis',
      'rg',
      'data_nascimento',
      'renda',
      'composicao_familiar',
      'telefone',
      'email',
      'endereco',
    ];

    return sensitiveFields.filter((field) => field in body);
  }

  /**
   * Remove dados sensíveis do corpo da requisição para o log de auditoria
   */
  private sanitizeBody(body: any): any {
    if (!body) return null;

    const sanitized = { ...body };

    // Mascarar dados sensíveis
    if (sanitized.cpf) {
      sanitized.cpf = this.maskCPF(sanitized.cpf);
    }

    if (sanitized.nis) {
      sanitized.nis = this.maskNIS(sanitized.nis);
    }

    if (sanitized.rg) {
      sanitized.rg = '***MASKED***';
    }

    if (sanitized.telefone) {
      sanitized.telefone = '***MASKED***';
    }

    if (sanitized.email) {
      sanitized.email = '***MASKED***';
    }

    return sanitized;
  }

  /**
   * Mascara o CPF para exibir apenas os primeiros e últimos dígitos
   */
  private maskCPF(cpf: string): string {
    if (!cpf) return '';

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) return '***INVALID***';

    return `${cpfLimpo.substring(0, 3)}.***.${cpfLimpo.substring(9)}`;
  }

  /**
   * Mascara o NIS para exibir apenas os primeiros e últimos dígitos
   */
  private maskNIS(nis: string): string {
    if (!nis) return '';

    const nisLimpo = nis.replace(/\D/g, '');
    if (nisLimpo.length !== 11) return '***INVALID***';

    return `${nisLimpo.substring(0, 3)}.***.${nisLimpo.substring(9)}`;
  }

  /**
   * Registra evento de auditoria no sistema
   * (Implementação futura - integração com sistema de auditoria)
   */
  private async registerAuditEvent(event: any): Promise<void> {
    try {
      // Mapear evento para o formato esperado pelo serviço de auditoria
      const logAuditoriaDto = new CreateLogAuditoriaDto();

      // Determinar o tipo de operação com base no método HTTP
      switch (event.method) {
        case 'POST':
          logAuditoriaDto.tipo_operacao = TipoOperacao.CREATE;
          break;
        case 'PUT':
        case 'PATCH':
          logAuditoriaDto.tipo_operacao = TipoOperacao.UPDATE;
          break;
        case 'DELETE':
          logAuditoriaDto.tipo_operacao = TipoOperacao.DELETE;
          break;
        default:
          logAuditoriaDto.tipo_operacao = TipoOperacao.READ;
      }

      // Preencher dados básicos do log
      logAuditoriaDto.entidade_afetada = 'Cidadao';
      logAuditoriaDto.entidade_id = this.extractEntityId(event.url);
      logAuditoriaDto.usuario_id = event.userId;
      logAuditoriaDto.ip_origem = event.ip || '0.0.0.0';
      logAuditoriaDto.user_agent = event.userAgent || 'Não informado';
      logAuditoriaDto.endpoint = event.url;
      logAuditoriaDto.metodo_http = event.method;
      logAuditoriaDto.descricao = `Acesso a dados de cidadão via ${event.method} ${event.url}`;

      // Se houver dados sensíveis, registrar acesso a dados sensíveis
/*       if (event.body && this.containsSensitiveData(event.body)) {
        const camposSensiveis = this.extractSensitiveFields(event.body);

        await this.auditoriaQueueService.enfileirarAcessoDadosSensiveis(
          event.userId,
          'Cidadao',
          logAuditoriaDto.entidade_id,
          camposSensiveis,
          event.ip || '0.0.0.0',
          event.userAgent || 'Não informado',
          event.url,
          event.method,
        );
      } else {
        // Caso contrário, registrar operação normal
        await this.auditoriaQueueService.enfileirarLogAuditoria(
          logAuditoriaDto,
        );
      } */

      this.logger.debug(
        `Evento de auditoria registrado: ${event.method} ${event.url}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao registrar evento de auditoria: ${error.message}`,
        error.stack,
      );
    }
  }
}
