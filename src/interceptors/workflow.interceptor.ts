import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { WorkflowSolicitacaoService } from '@/modules/solicitacao/services/workflow-solicitacao.service';
import { StatusSolicitacao } from '@/enums';

/**
 * Interceptor que atualiza automaticamente o status da solicitação após operações de criação
 * de dados de benefício, movendo para AGUARDANDO_DOCUMENTOS
 */
@Injectable()
export class WorkflowInterceptor implements NestInterceptor {
  private readonly logger = new Logger(WorkflowInterceptor.name);

  constructor(
    private readonly workflowService: WorkflowSolicitacaoService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const methodName = handler.name;

    return next.handle().pipe(
      tap(async (result) => {
        // Só atualiza workflow para operações de criação
        if (methodName === 'create' && result?.solicitacao_id) {
          try {
            await this.workflowService.atualizarStatus(
              result.solicitacao_id,
              StatusSolicitacao.PENDENTE,
              'Sistema - Dados do benefício criados',
            );

            this.logger.log(
              `Workflow atualizado para PENDENTE - Solicitação: ${result.solicitacao_id}`,
            );
          } catch (error) {
            // Log do erro mas não falha a operação principal
            this.logger.error(
              `Erro ao atualizar workflow para solicitação ${result.solicitacao_id}:`,
              error.stack,
            );
            
            // Não propaga o erro para não afetar a resposta principal
            // O dado foi criado com sucesso, apenas o workflow falhou
          }
        }
      }),
      catchError((error) => {
        // Em caso de erro na operação principal, apenas propaga
        throw error;
      }),
    );
  }
}