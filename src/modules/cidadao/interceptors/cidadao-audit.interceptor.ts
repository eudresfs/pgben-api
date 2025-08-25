import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HttpRequest } from '../../../types/express-request';
import { AuditoriaQueueService } from '../../auditoria/services/auditoria-queue.service';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { CreateLogAuditoriaDto } from '../../auditoria/dto/create-log-auditoria.dto';

/**
 * Interceptor para auditoria de acesso a dados sensíveis de cidadãos
 *
 * Registra todas as operações de acesso a dados sensíveis para compliance com LGPD
 *
 * NOTA DE PERFORMANCE: Este interceptor foi identificado como possível causa de lentidão
 * em endpoints críticos. Versão otimizada para diagnóstico e performance.
 */
@Injectable()
export class CidadaoAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CidadaoAuditInterceptor.name);

  constructor(private readonly auditoriaQueueService: AuditoriaQueueService) {}

  /**
   * Intercepta requisições para auditoria LGPD, usando padrão totalmente não-bloqueante
   *
   * OTIMIZAÇÃO DE PERFORMANCE:
   * - Processo executado em segundo plano com setTimeout
   * - Não bloqueia ou atrasa a resposta para o usuário
   * - Logging mínimo para evitar sobrecarga do log
   *
   * @param context Contexto da execução
   * @param next Handler para a próxima etapa
   * @returns Observable da resposta processada
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Capturar dados básicos da requisição
    const request = context.switchToHttp().getRequest<HttpRequest>();
    const { method, url } = request;

    // Verificação preliminar rápida para determinar se a operação precisa ser auditada
    // Esta etapa é mantida síncrona por ser muito rápida (microssegundos)
    const needsAudit = this.isSensitiveOperation(method, url);

    // Se não precisar de auditoria, simplesmente prosseguir
    if (!needsAudit) {
      return next.handle();
    }

    // Capturar timestamp inicial para medição de tempo
    const startTime = Date.now();
    const requestId = `${method}-${url.substring(0, 30)}-${startTime}`;

    // Processar a requisição normalmente e fazer a auditoria em segundo plano
    return next.handle().pipe(
      tap({
        next: (data) => {
          // Executar auditoria em segundo plano (não-bloqueante)
          setTimeout(() => {
            try {
              const duration = Date.now() - startTime;
              const { params, query, body, user } = request;
              const userId = user?.id || 'anônimo';
              const userRole = user?.role_id || 'não autenticado';

              // Log mínimo para diagnóstico
              if (duration > 500) {
                this.logger.log(
                  `AUDIT-SUCCESS [${requestId}] Duração: ${duration}ms, Usuário: ${userId}`,
                );
              }

              // Registrar em sistema de auditoria
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
                requestId,
              });
            } catch (auditError) {
              // Erro na auditoria não deve afetar o fluxo principal
              this.logger.warn(
                `Erro na auditoria [${requestId}]: ${auditError.message}`,
              );
            }
          }, 10); // Pequeno delay para garantir que não bloqueie
        },
        error: (error) => {
          // Auditoria de erro em segundo plano (não-bloqueante)
          setTimeout(() => {
            try {
              const duration = Date.now() - startTime;
              const { params, query, body, user } = request;
              const userId = user?.id || 'anônimo';
              const userRole = user?.role_id || 'não autenticado';

              // Log mínimo para erros importantes
              this.logger.warn(
                `AUDIT-ERROR [${requestId}] Duração: ${duration}ms, Erro: ${error.message.substring(0, 50)}`,
              );

              // Registrar erro em sistema de auditoria
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
                requestId,
              });
            } catch (auditError) {
              // Erro na auditoria não deve afetar o fluxo principal
              this.logger.warn(
                `Erro na auditoria de erro [${requestId}]: ${auditError.message}`,
              );
            }
          }, 10); // Pequeno delay para garantir que não bloqueie
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
    if (!body) {
      return false;
    }

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
    if (!body) {
      return [];
    }

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
    if (!body) {
      return null;
    }

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
    if (!cpf) {
      return '';
    }

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      return '***INVALID***';
    }

    return `${cpfLimpo.substring(0, 3)}.***.${cpfLimpo.substring(9)}`;
  }

  /**
   * Mascara o NIS para exibir apenas os primeiros e últimos dígitos
   */
  private maskNIS(nis: string): string {
    if (!nis) {
      return '';
    }

    const nisLimpo = nis.replace(/\D/g, '');
    if (nisLimpo.length !== 11) {
      return '***INVALID***';
    }

    return `${nisLimpo.substring(0, 3)}.***.${nisLimpo.substring(9)}`;
  }

  /**
   * Registra evento de auditoria de forma otimizada e não-bloqueante
   */
  private registerAuditEvent(event: any): void {
    // Processamento em segundo plano para não bloquear a resposta
    setTimeout(async () => {
      try {
        const logAuditoriaDto = new CreateLogAuditoriaDto();

        // Configuração básica
        logAuditoriaDto.tipo_operacao =
          event.method === 'GET'
            ? TipoOperacao.READ
            : event.method === 'POST'
              ? TipoOperacao.CREATE
              : event.method === 'DELETE'
                ? TipoOperacao.DELETE
                : TipoOperacao.UPDATE;

        logAuditoriaDto.entidade_afetada = 'Cidadao';
        logAuditoriaDto.entidade_id = this.extractEntityId(event.url);
        logAuditoriaDto.usuario_id = event.userId;
        logAuditoriaDto.endpoint = this.normalizeEndpointFromRequest(event);
        logAuditoriaDto.metodo_http = event.method;

        logAuditoriaDto.ip_origem = this.extractClientIP(event);
        logAuditoriaDto.user_agent = this.extractUserAgent(event);

        // Enfileira o log de auditoria de forma assíncrona
        this.auditoriaQueueService
          .enfileirarLogAuditoria(logAuditoriaDto)
          .catch((err) =>
            this.logger.warn(`Erro em auditoria: ${err.message}`),
          );
      } catch (error) {
        this.logger.error(
          `Erro ao registrar auditoria: ${error.message}`,
          error.stack,
        );
      }
    }, 0);
  }

  /**
   * PADRONIZAÇÃO HTTP: Normaliza endpoint removendo query parameters
   */
  private normalizeEndpoint(originalUrl: string): string {
    if (!originalUrl || typeof originalUrl !== 'string') {
      return '/unknown';
    }

    // Remove query parameters e fragmentos
    const url = originalUrl.split('?')[0].split('#')[0];
    
    // Garante que sempre comece com /
    return url.startsWith('/') ? url : `/${url}`;
  }

  /**
   * Extrai o IP do cliente considerando proxies e load balancers
   * Implementação padronizada para auditoria
   */
  private extractClientIP(event: any): string {
    const request = event.req || event.request || event;
    
    // Ordem de prioridade para extração do IP real do cliente
    const forwardedFor = request.headers?.['x-forwarded-for'] as string;
    if (forwardedFor) {
      // Pega o primeiro IP da lista (cliente original)
      const firstIP = forwardedFor.split(',')[0].trim();
      if (firstIP && firstIP !== 'unknown') {
        return firstIP;
      }
    }

    // Headers alternativos comuns em diferentes proxies
    const realIP = request.headers?.['x-real-ip'] as string;
    if (realIP && realIP !== 'unknown') {
      return realIP;
    }

    const clientIP = request.headers?.['x-client-ip'] as string;
    if (clientIP && clientIP !== 'unknown') {
      return clientIP;
    }

    // Conexão direta
    const connectionIP = request.connection?.remoteAddress;
    if (connectionIP) {
      return connectionIP;
    }

    const socketIP = request.socket?.remoteAddress;
    if (socketIP) {
      return socketIP;
    }

    // Fallback obrigatório
    return 'unknown';
  }

  /**
   * Extrai o User-Agent da requisição
   * Implementação padronizada para auditoria
   */
  private extractUserAgent(event: any): string {
    const request = event.req || event.request || event;
    const userAgent = request.headers?.['user-agent'];
    return userAgent && userAgent.trim() !== '' ? userAgent : 'unknown';
  }

  /**
   * Normaliza o endpoint removendo parâmetros dinâmicos
   * Implementação padronizada para auditoria
   */
  private normalizeEndpointFromRequest(request: any): string {
    let endpoint = request.url || request.path || '/';
    
    // Remove query parameters
    const queryIndex = endpoint.indexOf('?');
    if (queryIndex !== -1) {
      endpoint = endpoint.substring(0, queryIndex);
    }
    
    // Normaliza IDs numéricos para :id
    endpoint = endpoint.replace(/\/\d+/g, '/:id');
    
    // Normaliza UUIDs para :uuid
    endpoint = endpoint.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid');
    
    return endpoint;
  }
}
