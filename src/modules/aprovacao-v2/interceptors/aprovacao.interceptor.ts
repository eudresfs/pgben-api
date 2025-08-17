import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AprovacaoService } from '../services';
import { APROVACAO_METADATA_KEY, ConfiguracaoAprovacao } from '../decorators';
import { StatusSolicitacao, EstrategiaAprovacao } from '../enums';

/**
 * Interceptor simplificado para gerenciar aprovações
 * Verifica se uma ação requer aprovação e gerencia o fluxo
 */
@Injectable()
export class AprovacaoInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AprovacaoInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly aprovacaoService: AprovacaoService
  ) {}

  /**
   * Métodos helper para logging seguro
   */
  private safeLog(message: string, ...args: any[]): void {
    if (this.logger && typeof this.logger.log === 'function') {
      this.logger.log(message, ...args);
    } else {
      console.log(`[AprovacaoInterceptor] ${message}`, ...args);
    }
  }

  private safeWarn(message: string, ...args: any[]): void {
    if (this.logger && typeof this.logger.warn === 'function') {
      this.logger.warn(message, ...args);
    } else {
      console.warn(`[AprovacaoInterceptor] ${message}`, ...args);
    }
  }

  private safeError(message: string, ...args: any[]): void {
    if (this.logger && typeof this.logger.error === 'function') {
      this.logger.error(message, ...args);
    } else {
      console.error(`[AprovacaoInterceptor] ${message}`, ...args);
    }
  }

  private safeDebug(message: string, ...args: any[]): void {
    if (this.logger && typeof this.logger.debug === 'function') {
      this.logger.debug(message, ...args);
    } else {
      console.debug(`[AprovacaoInterceptor] ${message}`, ...args);
    }
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    // Verificação de segurança para dependências críticas
    if (!this.reflector || !this.aprovacaoService) {
      this.safeWarn('Dependências críticas não disponíveis, executando sem verificação de aprovação');
      return next.handle();
    }

    // Obtém a configuração de aprovação do decorator
    const configuracao = this.reflector.get<ConfiguracaoAprovacao>(
      APROVACAO_METADATA_KEY,
      context.getHandler()
    );

    // Se não há configuração de aprovação, executa normalmente
    if (!configuracao) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const usuario = request.user;

    if (!usuario) {
      throw new BadRequestException('Usuário não autenticado');
    }

    try {
      // Verifica se a ação requer aprovação
      const requerAprovacao = await this.aprovacaoService.requerAprovacao(
        configuracao.tipo
      );

      if (!requerAprovacao) {
        // Se não requer aprovação, executa normalmente
        this.safeDebug(
          `Ação ${configuracao.tipo} não requer aprovação, executando diretamente`
        );
        return next.handle();
      }

      // Verifica se é uma auto-aprovação permitida
      const podeAutoAprovar = await this.verificarAutoAprovacao(configuracao, usuario);
      if (podeAutoAprovar) {
        this.safeLog(
          `Auto-aprovação permitida para usuário ${usuario.id} na ação ${configuracao.tipo}`
        );
        return next.handle();
      }

      // Verifica se já existe uma solicitação aprovada para esta ação
      const solicitacaoExistente = await this.verificarSolicitacaoExistente(
        request,
        configuracao.tipo
      );

      if (solicitacaoExistente) {
        this.safeLog(
          `Executando ação ${configuracao.tipo} com aprovação prévia: ${solicitacaoExistente.codigo}`
        );
        return next.handle();
      }

      // Cria nova solicitação de aprovação
      const solicitacao = await this.criarSolicitacaoAprovacao(
        request,
        configuracao,
        usuario.id
      );

      // Retorna informações da solicitação criada ao invés de executar a ação
      return new Observable(observer => {
        observer.next({
          message: 'Solicitação de aprovação criada com sucesso',
          solicitacao: {
            id: solicitacao.id,
            codigo: solicitacao.codigo,
            status: solicitacao.status,
            tipo_acao: configuracao.tipo,
            descricao: configuracao.descricao
          },
          aprovacao_necessaria: true
        });
        observer.complete();
      });

    } catch (error) {
      this.safeError(
        `Erro no interceptor de aprovação: ${error.message}`,
        error.stack
      );
      return throwError(() => error);
    }
  }

  /**
   * Verifica se o usuário pode auto-aprovar a ação baseado na estratégia configurada
   */
  private async verificarAutoAprovacao(
    configuracao: ConfiguracaoAprovacao,
    usuario: any
  ): Promise<boolean> {
    // Verifica se auto-aprovação está habilitada
    if (!configuracao.permitirAutoAprovacao) {
      return false;
    }

    try {
      // Obtém a configuração completa da ação
      const acaoAprovacao = await this.aprovacaoService.obterConfiguracaoAprovacao(
        configuracao.tipo
      );

      // Verifica estratégia de autoaprovação por perfil
      if (acaoAprovacao.estrategia === EstrategiaAprovacao.AUTOAPROVACAO_PERFIL) {
        // Obter perfis de auto-aprovação usando método centralizado
        const perfisPermitidos = this.obterPerfisAutoAprovacao(acaoAprovacao, configuracao);

        if (!perfisPermitidos.length) {
          this.safeWarn('Perfis de auto-aprovação não configurados');
          return false;
        }

        // Validar usuário para auto-aprovação
        const resultadoValidacao = await this.validarUsuarioParaAutoAprovacao(
          usuario.id, 
          perfisPermitidos
        );

        if (resultadoValidacao.podeAutoAprovar) {
          this.safeLog(
            `Auto-aprovação permitida para usuário ${usuario.id} ` +
            `com perfil '${resultadoValidacao.perfilUsuario}' (perfis permitidos: [${perfisPermitidos.join(', ')}])`
          );
          return true;
        }

        this.safeLog(
          `Auto-aprovação negada para usuário ${usuario.id}: ${resultadoValidacao.motivo}`
        );
      }

      // Fallback para verificação de permissões gerais
      const temPermissaoGeral = await this.verificarPermissaoGeralAutoAprovacao(usuario.id);
      
      if (temPermissaoGeral) {
        this.safeLog(
          `Auto-aprovação permitida por permissão geral para usuário ${usuario.id}`
        );
        return true;
      }

      return false;

    } catch (error) {
      this.safeError(
        `Erro ao verificar auto-aprovação: ${error.message}`,
        error.stack
      );
      return false;
    }
  }

  /**
   * Obtém a lista de perfis permitidos para auto-aprovação
   * Prioriza configuração da entidade, depois decorator
   */
  private obterPerfisAutoAprovacao(
    acaoAprovacao: any,
    configuracao: ConfiguracaoAprovacao
  ): string[] {
    let perfisAutoAprovacao: string[] = [];
    
    // Prioridade 1: Configuração da entidade (array)
    if (acaoAprovacao.perfil_auto_aprovacao && Array.isArray(acaoAprovacao.perfil_auto_aprovacao)) {
      perfisAutoAprovacao = acaoAprovacao.perfil_auto_aprovacao.filter(perfil => 
        perfil && typeof perfil === 'string' && perfil.trim().length > 0
      );
    } 
    // Prioridade 2: Configuração da entidade (string única - compatibilidade)
    else if (acaoAprovacao.perfil_auto_aprovacao && typeof acaoAprovacao.perfil_auto_aprovacao === 'string') {
      const perfil = acaoAprovacao.perfil_auto_aprovacao.trim();
      if (perfil.length > 0) {
        perfisAutoAprovacao = [perfil];
      }
    } 
    // Prioridade 3: Configuração do decorator
    else if (configuracao.perfilAutoAprovacao) {
      if (Array.isArray(configuracao.perfilAutoAprovacao)) {
        perfisAutoAprovacao = configuracao.perfilAutoAprovacao.filter(perfil => 
          perfil && typeof perfil === 'string' && perfil.trim().length > 0
        );
      } else {
        // Como perfilAutoAprovacao é definido como string[] na interface,
        // este bloco não deveria ser executado, mas mantemos para compatibilidade
        const perfilValue = configuracao.perfilAutoAprovacao as any;
        if (typeof perfilValue === 'string') {
          const perfil = perfilValue.trim();
          if (perfil.length > 0) {
            perfisAutoAprovacao = [perfil];
          }
        }
      }
    }

    // Normalizar perfis (remover espaços)
    return perfisAutoAprovacao.map(perfil => perfil.trim());
  }

  /**
   * Valida se o usuário pode realizar auto-aprovação
   * Retorna resultado detalhado da validação
   */
  private async validarUsuarioParaAutoAprovacao(
    usuarioId: string,
    perfisAutoAprovacao: string[]
  ): Promise<{
    podeAutoAprovar: boolean;
    perfilUsuario?: string;
    motivo?: string;
  }> {
    // Buscar dados completos do usuário através do service
    const usuario = await this.aprovacaoService.obterUsuario(usuarioId);
    
    if (!usuario) {
      return {
        podeAutoAprovar: false,
        motivo: `Usuário não encontrado: ${usuarioId}`
      };
    }

    // Verificar se o usuário está ativo
    if (usuario.status && usuario.status !== 'ATIVO') {
      return {
        podeAutoAprovar: false,
        perfilUsuario: usuario.perfil,
        motivo: 'Usuário não está ativo no sistema'
      };
    }

    // Verificar se possui perfil
    const perfilUsuario = usuario.perfil;
    
    if (!perfilUsuario) {
      return {
        podeAutoAprovar: false,
        motivo: 'Perfil do usuário não encontrado ou não definido'
      };
    }

    // Verificar se o perfil do usuário está na lista de perfis permitidos
    const podeAutoAprovar = perfisAutoAprovacao.some(perfil => 
      perfil.toLowerCase() === perfilUsuario.toLowerCase()
    );
    
    if (!podeAutoAprovar) {
      return {
        podeAutoAprovar: false,
        perfilUsuario,
        motivo: `Perfil '${perfilUsuario}' não está entre os perfis permitidos [${perfisAutoAprovacao.join(', ')}]`
      };
    }

    return {
      podeAutoAprovar: true,
      perfilUsuario
    };
  }

  /**
   * Verifica se o usuário possui permissões gerais para auto-aprovação
   */
  private async verificarPermissaoGeralAutoAprovacao(usuarioId: string): Promise<boolean> {
    try {
      // Verificar através do service de aprovação que tem acesso aos services necessários
      return await this.aprovacaoService.verificarPermissaoGeral(usuarioId, ['ADMIN', 'auto_approve']);
    } catch (error) {
      this.safeError(
        `Erro ao verificar permissões gerais para usuário ${usuarioId}: ${error.message}`,
        error.stack
      );
      return false;
    }
  }

  /**
   * Verifica se já existe uma solicitação aprovada para esta ação
   */
  private async verificarSolicitacaoExistente(
    request: any,
    tipoAcao: string
  ): Promise<any> {
    // Verifica se há um header ou parâmetro indicando uma solicitação aprovada
    const solicitacaoId = request.headers['x-solicitacao-aprovacao'] || 
                         request.query.solicitacao_aprovacao;

    if (!solicitacaoId) {
      return null;
    }

    try {
      const solicitacao = await this.aprovacaoService.obterSolicitacao(solicitacaoId);
      
      if (solicitacao.status === StatusSolicitacao.APROVADA && 
          solicitacao.acao_aprovacao.tipo_acao === tipoAcao) {
        return solicitacao;
      }
    } catch (error) {
      this.safeWarn(`Solicitação ${solicitacaoId} não encontrada ou inválida`);
    }

    return null;
  }

  /**
   * Cria uma nova solicitação de aprovação
   */
  private async criarSolicitacaoAprovacao(
    request: any,
    configuracao: ConfiguracaoAprovacao,
    usuarioId: string
  ) {
    // Extrai dados relevantes da requisição
    const dadosAcao = {
      url: request.url,
      method: request.method,
      params: request.params,
      query: request.query,
      body: request.body
    };

    // Gera justificativa padrão se não fornecida
    const justificativa = request.body?.justificativa || 
                         `Solicitação de ${configuracao.descricao || configuracao.tipo}`;

    // Determina o método de execução
    const metodoExecucao = `${request.method} ${request.route?.path || request.url}`;

    return this.aprovacaoService.criarSolicitacaoComEstrategia(
      {
        tipo_acao: configuracao.tipo,
        justificativa,
        dados_acao: dadosAcao,
        metodo_execucao: metodoExecucao
      },
      usuarioId,
      configuracao
    );
  }
}