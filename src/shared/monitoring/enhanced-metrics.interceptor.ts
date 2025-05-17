import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
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
  constructor(private readonly metricsService: EnhancedMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const { method, url, ip } = request;

    // Extrair a rota base sem parâmetros para evitar cardinalidade alta
    const route = this.normalizeRoute(url);

    // Obter informações do usuário, se disponíveis
    const userRole = this.getUserRole(request);

    // Incrementar contador de requisições em andamento
    this.metricsService.incrementHttpRequestsInProgress(
      method,
      route,
      userRole,
    );

    const startTime = process.hrtime();

    return next.handle().pipe(
      tap({
        next: (data) => {
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

          // Decrementar contador de requisições em andamento
          this.metricsService.decrementHttpRequestsInProgress(
            method,
            route,
            userRole,
          );

          // Verificar e registrar acesso a dados protegidos pela LGPD
          this.checkAndRecordLgpdDataAccess(request, data, route);
        },
        error: (error) => {
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

          // Decrementar contador de requisições em andamento
          this.metricsService.decrementHttpRequestsInProgress(
            method,
            route,
            userRole,
          );

          // Registrar evento de segurança para erros de autorização (401, 403)
          if (statusCode === 401 || statusCode === 403) {
            this.metricsService.recordSecurityEvent(
              'authorization_failure',
              'warning',
              'api',
            );

            // Registrar falha de autorização
            if (statusCode === 403 && request.user) {
              this.metricsService.recordAuthorizationFailure(
                route,
                'unknown', // Papel necessário não está disponível aqui
                this.getUserRole(request),
              );
            }
          }

          // Registrar evento de segurança para erros do servidor (5xx)
          if (statusCode >= 500) {
            this.metricsService.recordSecurityEvent(
              'server_error',
              'error',
              'api',
            );
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
