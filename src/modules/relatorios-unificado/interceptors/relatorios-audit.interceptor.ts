import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RELATORIOS_CONFIG } from '../config';

/**
 * Interceptor para auditoria de operações do módulo de relatórios
 *
 * Este interceptor registra informações relevantes para auditoria sobre
 * as requisições de relatórios, incluindo tipo de relatório, formato,
 * parâmetros, usuário solicitante e permissões verificadas.
 *
 * Essas informações são importantes para compliance com LGPD, já que
 * os relatórios contêm dados potencialmente sensíveis de cidadãos.
 */
@Injectable()
export class RelatoriosAuditInterceptor implements NestInterceptor {
  /**
   * Intercepta a requisição e registra informações de auditoria
   *
   * @param context Contexto de execução da requisição
   * @param next Handler para continuar o processamento da requisição
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, path, params, query, body, user } = request;
    const startTime = Date.now();

    // Se não há serviço de auditoria disponível, apenas continua a execução
    if (!global.auditoriaService) {
      return next.handle();
    }

    // Identifica o tipo de relatório sendo solicitado
    const reportType = this.extractReportType(path);

    // Log de início de operação
    global.auditoriaService.registrarLog({
      categoria: RELATORIOS_CONFIG.AUDIT_CATEGORIES.REPORT_GENERATION,
      operacao: `RELATORIO_${reportType}_INIT`,
      detalhes: {
        metodo: method,
        caminho: path,
        tipo: reportType,
        formato: query.formato || body.formato,
        parametros: {
          ...params,
          ...query,
          ...body,
          usuario: user
            ? { id: user.id, nome: user.nome, cargo: user.cargo }
            : null,
        },
      },
      usuario: user ? user.id : null,
      origem: request.ip,
    });

    // Continua o processamento e registra a conclusão
    return next.handle().pipe(
      tap({
        next: (data) => {
          // Calcula o tempo de processamento
          const processingTime = Date.now() - startTime;

          // Log de conclusão bem-sucedida
          global.auditoriaService.registrarLog({
            categoria: RELATORIOS_CONFIG.AUDIT_CATEGORIES.REPORT_GENERATION,
            operacao: `RELATORIO_${reportType}_SUCCESS`,
            detalhes: {
              metodo: method,
              caminho: path,
              tipo: reportType,
              formato: query.formato || body.formato,
              tempoProcessamento: processingTime,
              tamanhoArquivo: data?.tamanhoBytes || 'N/A',
            },
            usuario: user ? user.id : null,
            origem: request.ip,
          });
        },
        error: (error) => {
          // Calcula o tempo de processamento
          const processingTime = Date.now() - startTime;

          // Log de erro
          global.auditoriaService.registrarLog({
            categoria: RELATORIOS_CONFIG.AUDIT_CATEGORIES.REPORT_GENERATION,
            operacao: `RELATORIO_${reportType}_ERROR`,
            detalhes: {
              metodo: method,
              caminho: path,
              tipo: reportType,
              formato: query.formato || body.formato,
              tempoProcessamento: processingTime,
              erro: {
                mensagem: error.message,
                codigo: error.status || 500,
                stack:
                  process.env.NODE_ENV !== 'production'
                    ? error.stack
                    : undefined,
              },
            },
            usuario: user ? user.id : null,
            origem: request.ip,
          });
        },
      }),
    );
  }

  /**
   * Extrai o tipo de relatório a partir do caminho da requisição
   *
   * @param path Caminho da requisição
   * @returns Tipo do relatório (BENEFICIOS, SOLICITACOES, ATENDIMENTOS, etc)
   */
  private extractReportType(path: string): string {
    // Extrai o tipo de relatório do caminho
    if (path.includes('beneficios')) return 'BENEFICIOS';
    if (path.includes('solicitacoes')) return 'SOLICITACOES';
    if (path.includes('atendimentos')) return 'ATENDIMENTOS';
    return 'GENERICO';
  }
}
