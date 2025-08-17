import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AprovacaoService } from '../services/aprovacao.service';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { ConfiguracaoAprovacaoRepository } from '../repositories/configuracao-aprovacao.repository';
import {
  APROVACAO_METADATA_KEY,
  ConfiguracaoAprovacaoMetadata,
} from '../decorators/requer-aprovacao.decorator';
import { TipoAcaoCritica, PrioridadeAprovacao } from '../enums/aprovacao.enums';
import { Usuario } from '../../../entities/usuario.entity';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';

/**
 * Interface para o contexto da ação crítica
 */
interface ContextoAcaoCritica {
  usuario: Usuario;
  parametros: any[];
  dadosRequisicao: {
    ip: string;
    userAgent: string;
    url: string;
    metodo: string;
  };
  metadados: Record<string, any>;
}

/**
 * Interceptor para processar ações críticas que podem requerer aprovação
 * 
 * Este interceptor é responsável por:
 * - Verificar se uma ação requer aprovação
 * - Criar solicitações de aprovação quando necessário
 * - Executar ações diretamente quando permitido
 * - Registrar todas as operações na auditoria
 */
@Injectable()
export class AcaoCriticaInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AcaoCriticaInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly aprovacaoService: AprovacaoService,
    private readonly auditoriaService: AuditoriaService,
    private readonly configuracaoRepository: ConfiguracaoAprovacaoRepository,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // Obter configuração de aprovação do decorator
    const aprovacaoConfig = this.reflector.get<ConfiguracaoAprovacaoMetadata>(
      APROVACAO_METADATA_KEY,
      context.getHandler(),
    );

    // Se não há configuração de aprovação, executar normalmente
    if (!aprovacaoConfig) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const usuario = request.user as Usuario;
    const args = context.getArgs();

    // Validar se o usuário está autenticado
    if (!usuario) {
      throw new BadRequestException('Usuário não autenticado');
    }

    // Construir contexto da ação
    const contextoAcao = this.construirContextoAcao(
      usuario,
      args,
      request,
      aprovacaoConfig,
    );

    this.logger.debug(
      `Processando ação crítica: ${aprovacaoConfig.acao} para usuário ${usuario.id}`,
    );

    try {
      // Verificar se a ação requer aprovação
      const requerAprovacao = await this.aprovacaoService.verificarSeRequerAprovacao(
        aprovacaoConfig.acao,
        usuario,
        contextoAcao,
      );

      if (!requerAprovacao) {
        // Executar ação diretamente
        return this.executarAcaoDireta(next, contextoAcao, aprovacaoConfig);
      }

      // Criar solicitação de aprovação
      return this.criarSolicitacaoAprovacao(contextoAcao, aprovacaoConfig);
    } catch (error) {
      this.logger.error(
        `Erro ao processar ação crítica ${aprovacaoConfig.acao}:`,
        error.stack,
      );

      // Registrar erro na auditoria
      await this.registrarErroAuditoria(contextoAcao, aprovacaoConfig, error);

      throw error;
    }
  }

  /**
   * Constrói o contexto da ação crítica com todas as informações necessárias
   */
  private construirContextoAcao(
    usuario: Usuario,
    args: any[],
    request: Request,
    config: ConfiguracaoAprovacaoMetadata,
  ): ContextoAcaoCritica {
    return {
      usuario,
      parametros: args,
      dadosRequisicao: {
        ip: this.extrairIpRequisicao(request),
        userAgent: request.get('User-Agent') || 'Unknown',
        url: request.url,
        metodo: request.method,
      },
      metadados: {
        timestamp: new Date().toISOString(),
        acao: config.acao,
        entidadeAlvo: config.entidadeAlvo,
        descricao: config.descricaoAcao,
        controlador: request.route?.path || 'Unknown',
      },
    };
  }

  /**
   * Executa a ação diretamente quando não requer aprovação
   */
  private executarAcaoDireta(
    next: CallHandler,
    contexto: ContextoAcaoCritica,
    config: ConfiguracaoAprovacaoMetadata,
  ): Observable<any> {
    this.logger.debug(
      `Executando ação direta: ${config.acao} para usuário ${contexto.usuario.id}`,
    );

    return next.handle().pipe(
      tap(async (resultado) => {
        // Registrar execução direta na auditoria se configurado
        if (config.sempreAuditar) {
          await this.registrarExecucaoDiretaAuditoria(contexto, config, resultado);
        }

        this.logger.debug(
          `Ação direta executada com sucesso: ${config.acao}`,
        );
      }),
    );
  }

  /**
   * Cria uma solicitação de aprovação
   */
  private async criarSolicitacaoAprovacao(
    contexto: ContextoAcaoCritica,
    config: ConfiguracaoAprovacaoMetadata,
  ): Promise<Observable<any>> {
    this.logger.debug(
      `Criando solicitação de aprovação: ${config.acao} para usuário ${contexto.usuario.id}`,
    );

    // Extrair dados da ação dos parâmetros
    const dadosAcao = this.extrairDadosAcao(contexto.parametros);
    const entidadeAlvoId = this.extrairEntidadeAlvoId(contexto.parametros);

    // Buscar configuração de aprovação real
    const configuracaoAprovacao = await this.configuracaoRepository.buscarPorAcaoEPerfil(
      config.acao,
      contexto.usuario.role?.codigo,
      contexto.usuario.unidade_id,
    );

    if (!configuracaoAprovacao) {
      throw new BadRequestException(
        `Nenhuma configuração de aprovação encontrada para a ação ${config.acao}`,
      );
    }

    const solicitacao = await this.aprovacaoService.criarSolicitacaoAprovacao({
      acao_critica_id: config.acao,
      configuracao_aprovacao_id: configuracaoAprovacao.id,
      usuario_solicitante_id: contexto.usuario.id,
      nome: contexto.usuario.nome,
      email: contexto.usuario.email,
      prioridade: configuracaoAprovacao.prioridade || PrioridadeAprovacao.NORMAL,
      justificativa: dadosAcao.justificativa || 'Solicitação via sistema',
      contexto: {
        ...contexto.metadados,
        parametros: contexto.parametros,
        dadosRequisicao: contexto.dadosRequisicao,
        dadosAcao: dadosAcao,
      },
    });

    this.logger.log(
      `Solicitação de aprovação criada: ${solicitacao.id} para ação ${config.acao}`,
    );

    // Retornar resposta da solicitação criada
    return new Observable((observer) => {
      observer.next({
        success: true,
        message: 'Solicitação de aprovação criada com sucesso',
        data: {
          solicitacao_id: solicitacao.id,
          status: solicitacao.status,
          acao: config.acao,
          entidade_alvo: config.entidadeAlvo,
        },
      });
      observer.complete();
    });
  }

  /**
   * Extrai o IP da requisição considerando proxies
   */
  private extrairIpRequisicao(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'Unknown'
    );
  }

  /**
   * Extrai dados da ação dos parâmetros da requisição
   */
  private extrairDadosAcao(parametros: any[]): Record<string, any> {
    // Assumir que o último parâmetro pode conter dados da ação
    const ultimoParametro = parametros[parametros.length - 1];
    
    if (typeof ultimoParametro === 'object' && ultimoParametro !== null) {
      return ultimoParametro;
    }

    // Se não há objeto, criar um com os parâmetros básicos
    return {
      parametros: parametros,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Extrai o ID da entidade alvo dos parâmetros
   */
  private extrairEntidadeAlvoId(parametros: any[]): string {
    // Assumir que o primeiro parâmetro é geralmente o ID
    const primeiroParametro = parametros[0];
    
    if (typeof primeiroParametro === 'string') {
      return primeiroParametro;
    }

    if (typeof primeiroParametro === 'object' && primeiroParametro?.id) {
      return primeiroParametro.id;
    }

    return 'unknown';
  }

  /**
   * Registra execução direta na auditoria
   */
  private async registrarExecucaoDiretaAuditoria(
    contexto: ContextoAcaoCritica,
    config: ConfiguracaoAprovacaoMetadata,
    resultado: any,
  ): Promise<void> {
    try {
      await this.auditoriaService.registrar({
        tipo_operacao: TipoOperacao.ACCESS,
        usuario_id: contexto.usuario.id,
        descricao: `EXECUCAO_DIRETA_${config.acao}`,
        entidade_afetada: config.entidadeAlvo || 'Unknown',
        entidade_id: this.extrairEntidadeAlvoId(contexto.parametros),
        dados_anteriores: null,
        dados_novos: resultado,
        ip_origem: contexto.dadosRequisicao.ip,
        user_agent: contexto.dadosRequisicao.userAgent,
        endpoint: contexto.dadosRequisicao.url,
        metodo_http: contexto.dadosRequisicao.metodo,
      });
    } catch (error) {
      this.logger.error('Erro ao registrar execução direta na auditoria:', error);
    }
  }

  /**
   * Registra erro na auditoria
   */
  private async registrarErroAuditoria(
    contexto: ContextoAcaoCritica,
    config: ConfiguracaoAprovacaoMetadata,
    error: any,
  ): Promise<void> {
    try {
      await this.auditoriaService.registrar({
        tipo_operacao: TipoOperacao.ACCESS,
        usuario_id: contexto.usuario.id,
        descricao: `ERRO_${config.acao} - ${error.message}`,
        entidade_afetada: config.entidadeAlvo || 'Unknown',
        entidade_id: this.extrairEntidadeAlvoId(contexto.parametros),
        dados_anteriores: null,
        dados_novos: null,
        ip_origem: contexto.dadosRequisicao.ip,
        user_agent: contexto.dadosRequisicao.userAgent,
        endpoint: contexto.dadosRequisicao.url,
        metodo_http: contexto.dadosRequisicao.metodo,
      });
    } catch (auditError) {
      this.logger.error('Erro ao registrar erro na auditoria:', auditError);
    }
  }
}