import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EnhancedMetricsService } from './enhanced-metrics.service';

/**
 * Interceptor de Métricas Aprimorado
 *
 * Intercepta todas as requisições HTTP e registra métricas avançadas como:
 * - Contador de requisições com informações de perfil de usuário
 * - Duração das requisições
 * - Requisições em andamento
 * - Eventos de segurança e compliance LGPD
 */
@Injectable()
export class EnhancedMetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger('EnhancedMetricsInterceptor');

  constructor(private readonly metricsService: EnhancedMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // CORRIGIDO: Redução de logs e simplificação do interceptor
    this.logger.debug(
      `🔥 EnhancedMetricsInterceptor: Iniciando para ${context.getType()}`,
    );

    // Verificar se é uma requisição HTTP
    if (context.getType() !== 'http') {
      // Não é HTTP, apenas passar adiante
      this.logger.debug(`🔥 EnhancedMetricsInterceptor: Não é HTTP, ignorando`);
      return next.handle();
    }

    // Obter informações da requisição
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const { method, url, ip } = request;

    // Log simplificado para debugging
    this.logger.debug(`🔥 Métricas: ${method} ${url}`);

    // Extrair a rota normalizada e informações do usuário
    const route = this.normalizeRoute(url);
    const userRole = this.getUserRole(request);

    // Incrementar contador de requisições em andamento
    try {
      this.metricsService.incrementHttpRequestsInProgress(
        method,
        route,
        userRole,
      );
    } catch (err) {
      this.logger.error(`Erro ao registrar métrica inicial: ${err.message}`);
      // Não deixar o erro interromper o fluxo
    }

    const startTime = process.hrtime();

    // IMPORTANTE: Primeiro, garantir que o request continue seu fluxo
    // Usar finalize para garantir que as métricas sejam sempre processadas
    return next.handle().pipe(
      tap({
        next: (data) => {
          try {
            const response = ctx.getResponse();
            const statusCode = response.statusCode;

            // Calcular duração da requisição
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const durationSeconds = seconds + nanoseconds / 1e9;

            // Registrar métricas HTTP
            this.metricsService.recordHttpRequest(
              method,
              route,
              statusCode,
              userRole,
            );
            this.metricsService.recordHttpRequestDuration(
              method,
              route,
              statusCode,
              durationSeconds,
              userRole,
            );

            // Verificar LGPD somente se necessário
            if (
              route.includes('cidadao') ||
              route.includes('beneficiario') ||
              route.includes('documento')
            ) {
              this.checkAndRecordLgpdDataAccess(request, data, route);
            }

            this.logger.debug(
              `🔥 Métricas finalizadas: ${method} ${url} - ${statusCode}`,
            );
          } catch (err) {
            this.logger.error(
              `Erro no processamento de métricas: ${err.message}`,
            );
            // Não deixar o erro interromper o fluxo
          } finally {
            // Garantir que o contador seja decrementado mesmo em caso de erro
            try {
              this.metricsService.decrementHttpRequestsInProgress(
                method,
                route,
                userRole,
              );
            } catch (err) {
              this.logger.error(`Erro ao decrementar contador: ${err.message}`);
            }
          }
        },
        error: (error) => {
          try {
            const statusCode = error.status || 500;

            // Calcular duração da requisição
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const durationSeconds = seconds + nanoseconds / 1e9;

            // Registrar métricas HTTP
            this.metricsService.recordHttpRequest(
              method,
              route,
              statusCode,
              userRole,
            );
            this.metricsService.recordHttpRequestDuration(
              method,
              route,
              statusCode,
              durationSeconds,
              userRole,
            );

            // Registrar eventos de segurança apenas para erros relevantes
            if (statusCode === 401 || statusCode === 403) {
              this.metricsService.recordSecurityEvent(
                'authorization_failure',
                'warning',
                'api',
              );
            } else if (statusCode >= 500) {
              this.metricsService.recordSecurityEvent(
                'server_error',
                'error',
                'api',
              );
            }

            this.logger.debug(
              `🔥 Métricas de erro: ${method} ${url} - ${statusCode}`,
            );
          } catch (err) {
            this.logger.error(
              `Erro no processamento de métricas de erro: ${err.message}`,
            );
            // Não deixar o erro interromper o fluxo
          } finally {
            // Garantir que o contador seja decrementado mesmo em caso de erro
            try {
              this.metricsService.decrementHttpRequestsInProgress(
                method,
                route,
                userRole,
              );
            } catch (err) {
              this.logger.error(`Erro ao decrementar contador: ${err.message}`);
            }
          }
        },
      }),
    );
  }

  /**
   * Normaliza a rota para evitar cardinalidade alta nas métricas
   * Exemplo: /users/123 -> /users/:id
   */
  private normalizeRoute(url: string): string {
    // Remover query string
    const path = url.split('?')[0];

    // Substituir IDs numéricos, UUIDs e outros identificadores por placeholders
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(
        /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '/:uuid',
      )
      .replace(/\/[^\/]+\.(pdf|doc|docx|jpg|png|xlsx)$/i, '/:.file');
  }

  /**
   * Obtém o papel do usuário a partir da requisição
   */
  private getUserRole(request: any): string {
    if (!request.user) {
      return 'anonymous';
    }

    if (Array.isArray(request.user.roles) && request.user.roles.length > 0) {
      return request.user.roles[0]; // Usar o primeiro papel como identificador
    }

    if (request.user.role) {
      return request.user.role;
    }

    return 'authenticated';
  }

  /**
   * Verifica e registra acesso a dados protegidos pela LGPD
   */
  private checkAndRecordLgpdDataAccess(
    request: any,
    data: any,
    route: string,
  ): void {
    // Verificar se a rota está relacionada a dados pessoais
    const lgpdRoutes = [
      '/api/cidadaos',
      '/api/beneficiarios',
      '/api/documentos',
    ];

    const isLgpdRoute = lgpdRoutes.some((lgpdRoute) =>
      route.startsWith(lgpdRoute),
    );

    if (!isLgpdRoute) {
      return;
    }

    // Determinar o tipo de dados LGPD
    let dataType = 'unknown';
    if (route.includes('cidadaos')) {
      dataType = 'dados_pessoais';
    } else if (route.includes('beneficiarios')) {
      dataType = 'dados_beneficio';
    } else if (route.includes('documentos')) {
      dataType = 'documentos';
    }

    // Determinar a operação
    let operation = 'unknown';
    if (request.method === 'GET') {
      operation = 'leitura';
    } else if (request.method === 'POST') {
      operation = 'criacao';
    } else if (request.method === 'PUT' || request.method === 'PATCH') {
      operation = 'atualizacao';
    } else if (request.method === 'DELETE') {
      operation = 'exclusao';
    }

    // Verificar se o acesso foi autorizado (assumimos que sim, já que chegamos aqui)
    const authorized = true;

    // Registrar o acesso
    this.metricsService.recordLgpdDataAccess(
      dataType,
      operation,
      authorized,
      this.getUserRole(request),
    );
  }
}
