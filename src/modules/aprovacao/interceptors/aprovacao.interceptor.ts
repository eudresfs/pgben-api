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
import { AprovacaoService } from '../services';
import { APROVACAO_METADATA_KEY, ConfiguracaoAprovacao } from '../decorators';
import { StatusSolicitacao, EstrategiaAprovacao, TipoAcaoCritica } from '../enums';
import { CacheService } from '../../../shared/services/cache.service';

/**
 * Interceptor simplificado para gerenciar aprovações
 * Verifica se uma ação requer aprovação e gerencia o fluxo
 */
@Injectable()
export class AprovacaoInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AprovacaoInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly aprovacaoService: AprovacaoService,
    private readonly cacheService: CacheService
  ) {}

  /**
   * Método para logging de erros críticos
   */
  private logError(message: string, error?: any): void {
    this.logger.error(message, error);
  }

  /**
   * Verifica se uma ação requer aprovação com cache
   * @param tipoAcao Tipo da ação a ser verificada
   * @returns Promise<boolean> indicando se requer aprovação
   */
  private async requerAprovacaoComCache(tipoAcao: TipoAcaoCritica): Promise<boolean> {
    const cacheKey = `aprovacao:requer:${tipoAcao}`;
    const cacheTTL = 300; // 5 minutos

    try {
      // Tentar obter do cache primeiro
      const cachedResult = await this.cacheService.get<boolean>(cacheKey);
      if (cachedResult !== null) {
        // Cache hit para verificação de aprovação
        return cachedResult;
      }

      // Se não estiver no cache, consultar o serviço
      const requerAprovacao = await this.aprovacaoService.requerAprovacao(tipoAcao);
      
      // Armazenar no cache
      await this.cacheService.set(cacheKey, requerAprovacao, cacheTTL);
      // Cache miss - resultado armazenado
      
      return requerAprovacao;
    } catch (error) {
      // Erro no cache para verificação de aprovação
      // Fallback para consulta direta em caso de erro no cache
      return await this.aprovacaoService.requerAprovacao(tipoAcao);
    }
  }

  /**
   * Obtém configuração de aprovação com cache
   * @param tipoAcao Tipo da ação
   * @returns Promise com a configuração de aprovação
   */
  private async obterConfiguracaoAprovacaoComCache(tipoAcao: TipoAcaoCritica): Promise<any> {
    const cacheKey = `aprovacao:config:${tipoAcao}`;
    const cacheTTL = 600; // 10 minutos

    try {
      // Tentar obter do cache primeiro
      const cachedConfig = await this.cacheService.get(cacheKey);
      if (cachedConfig !== null) {
        // Cache hit para configuração de aprovação
        return cachedConfig;
      }

      // Se não estiver no cache, consultar o serviço
      const config = await this.aprovacaoService.obterConfiguracaoAprovacao(tipoAcao);
      
      // Armazenar no cache
      await this.cacheService.set(cacheKey, config, cacheTTL);
      // Cache miss - configuração armazenada
      
      return config;
    } catch (error) {
      // Erro no cache para configuração de aprovação
      // Fallback para consulta direta em caso de erro no cache
      return await this.aprovacaoService.obterConfiguracaoAprovacao(tipoAcao);
    }
  }

  /**
   * Verifica se todas as dependências críticas estão disponíveis
   * @returns true se todas as dependências estão disponíveis, false caso contrário
   */
  private verificarDependenciasCriticas(): boolean {
    // Iniciando verificação de dependências críticas
    
    // Verifica se o reflector existe e tem o método get
    if (!this.reflector || typeof this.reflector.get !== 'function') {
      this.logError('Dependência crítica não disponível: Reflector não está inicializado');
      return false;
    }

    // Verifica se o aprovacaoService existe e tem os métodos necessários
    if (!this.aprovacaoService || typeof this.aprovacaoService.requerAprovacao !== 'function') {
      this.logError('Dependência crítica não disponível: AprovacaoService não está inicializado');
      return false;
    }

    // Todas as dependências críticas estão disponíveis
    
    return true;
  }

  /**
   * Intercepta requisições para verificar se requerem aprovação
   * @param context Contexto de execução da requisição
   * @param next Handler para continuar o pipeline
   * @returns Observable com a resposta da requisição
   */
  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const { user } = request;

    try {
      // Verificar se as dependências críticas estão disponíveis
      // TEMPORARIAMENTE DESABILITADO PARA TESTES
      // Verificando dependências críticas antes da interceptação
      // if (!this.verificarDependenciasCriticas()) {
      //   this.logError('Falha na verificação de dependências críticas - bloqueando execução');
      //   throw new BadRequestException(
      //     'Sistema de aprovação não disponível. Tente novamente em alguns instantes.'
      //   );
      // }

      // Obtém a configuração de aprovação do decorator
      const configuracao = this.reflector.get<ConfiguracaoAprovacao>(
        APROVACAO_METADATA_KEY,
        context.getHandler()
      );

      // Se não há configuração de aprovação, executa normalmente
      if (!configuracao) {
        return next.handle();
      }

      const usuario = request.user;

      if (!usuario) {
        throw new BadRequestException('Usuário não autenticado');
      }
      // Verifica se a ação requer aprovação (com cache)
      const requerAprovacao = await this.requerAprovacaoComCache(
        configuracao.tipo
      );

      if (!requerAprovacao) {
        return next.handle();
      }

      // Verifica se é uma auto-aprovação permitida
      const podeAutoAprovar = await this.verificarAutoAprovacao(configuracao, usuario);
      
      if (podeAutoAprovar) {
        return next.handle();
      }

      // Verifica se já existe uma solicitação aprovada para esta ação
      const solicitacaoExistente = await this.verificarSolicitacaoExistente(
        request,
        configuracao.tipo
      );

      if (solicitacaoExistente) {
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
      this.logError('Erro no interceptor de aprovação', error);
      
      if (error instanceof BadRequestException) {
        return throwError(() => error);
      }
      
      return throwError(() => new BadRequestException(
        'Erro no sistema de aprovação. A ação não pode ser executada no momento.'
      ));
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
    const autoAprovacaoPermitida = configuracao.permitirAutoAprovacao === true || 
                                   (configuracao.perfilAutoAprovacao && configuracao.perfilAutoAprovacao.length > 0);
    
    if (!autoAprovacaoPermitida) {
      return false;
    }

    try {
      // Obtém a configuração completa da ação (com cache)
      const acaoAprovacao = await this.obterConfiguracaoAprovacaoComCache(
        configuracao.tipo
      );

      // Verifica estratégia de autoaprovação por perfil
      if (acaoAprovacao.estrategia === EstrategiaAprovacao.AUTOAPROVACAO_PERFIL) {
        const perfisPermitidos = this.obterPerfisAutoAprovacao(acaoAprovacao, configuracao);

        if (!perfisPermitidos.length) {
          return false;
        }

        const resultadoValidacao = await this.validarUsuarioParaAutoAprovacao(
          usuario.id, 
          perfisPermitidos
        );

        return resultadoValidacao.podeAutoAprovar;
      }

      // Fallback para verificação de permissões gerais
      return await this.verificarPermissaoGeralAutoAprovacao(usuario.id);

    } catch (error) {
      this.logError('Erro ao verificar auto-aprovação', error);
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
    const usuario = await this.aprovacaoService.obterUsuario(usuarioId);
    
    if (!usuario) {
      return {
        podeAutoAprovar: false,
        motivo: `Usuário não encontrado: ${usuarioId}`
      };
    }
    if (usuario.status?.toLowerCase() !== 'ativo') {
      return {
        podeAutoAprovar: false,
        perfilUsuario: usuario.perfil,
        motivo: 'Usuário não está ativo no sistema'
      };
    }

    const perfilUsuario = usuario.perfil;
    
    if (!perfilUsuario) {
      return {
        podeAutoAprovar: false,
        motivo: 'Perfil do usuário não encontrado ou não definido'
      };
    }

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
      this.logError(`Erro ao verificar permissões gerais para usuário ${usuarioId}`, error);
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

    // Validação básica do formato do ID
    if (typeof solicitacaoId !== 'string' || solicitacaoId.trim().length === 0) {
      // ID de solicitação inválido
      return null;
    }

    try {
      // Validação adicional: verificar se é um UUID válido ou código válido
      const isValidUUID = this.isValidUUID(solicitacaoId);
      const isValidCode = this.isValidSolicitacaoCode(solicitacaoId);
      
      if (!isValidUUID && !isValidCode) {
        // Formato de solicitação inválido
        return null;
      }

      let solicitacao = null;

      // Tentar buscar por UUID primeiro, depois por código
      if (isValidUUID) {
        try {
          solicitacao = await this.aprovacaoService.obterSolicitacao(solicitacaoId);
        } catch (error) {
          // Solicitação não encontrada por UUID
        }
      } else if (isValidCode) {
        // Buscar por código usando o novo método
        solicitacao = await this.aprovacaoService.buscarPorCodigo(solicitacaoId);
      }
      
      if (!solicitacao) {
        return null;
      }
      
      if (solicitacao.status === StatusSolicitacao.APROVADA && 
          solicitacao.acao_aprovacao.tipo_acao === tipoAcao) {
        return solicitacao;
      }
    } catch (error) {
      this.logError(`Erro ao buscar solicitação ${solicitacaoId}:`, error.message);
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

  /**
   * Valida se o ID é um UUID válido
   */
  private isValidUUID(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  }

  /**
   * Valida se o código é um código de solicitação válido (formato SOL-XXX-XXX)
   */
  private isValidSolicitacaoCode(codigo: string): boolean {
    return /^SOL-[A-Z0-9]+-[A-Z0-9]+$/i.test(codigo);
  }
}