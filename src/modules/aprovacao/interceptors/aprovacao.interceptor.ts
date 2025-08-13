import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { Request } from 'express';
import { AprovacaoService } from '../services/aprovacao.service';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { ConfiguracaoAprovacaoRepository } from '../repositories/configuracao-aprovacao.repository';
import {
  APROVACAO_METADATA_KEY,
  ConfiguracaoAprovacaoMetadata,
} from '../decorators/requer-aprovacao.decorator';
import { TipoAcaoCritica, StatusSolicitacaoAprovacao, PrioridadeAprovacao } from '../enums/aprovacao.enums';
import { GetUser } from '../../../auth/decorators/get-user.decorator';

/**
 * Interface para o contexto de execução enriquecido
 */
interface ContextoExecucao {
  usuario: any;
  request: Request;
  params: any;
  body: any;
  query: any;
  headers: any;
}

/**
 * Interceptor responsável por processar ações que requerem aprovação
 * 
 * Este interceptor:
 * 1. Identifica métodos marcados com @RequerAprovacao
 * 2. Verifica se o usuário pode auto-aprovar a ação
 * 3. Cria solicitação de aprovação quando necessário
 * 4. Registra a ação na auditoria
 * 5. Controla a execução baseada no status de aprovação
 */
@Injectable()
export class AprovacaoInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AprovacaoInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly aprovacaoService: AprovacaoService,
    private readonly auditoriaService: AuditoriaService,
    private readonly configuracaoRepository: ConfiguracaoAprovacaoRepository,
  ) {}

  /**
   * Intercepta a execução do método e aplica lógica de aprovação
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Obtém metadados de aprovação do método
    const aprovacaoConfig = this.reflector.get<ConfiguracaoAprovacaoMetadata>(
      APROVACAO_METADATA_KEY,
      context.getHandler(),
    );

    // Se não há configuração de aprovação, prossegue normalmente
    if (!aprovacaoConfig) {
      return next.handle();
    }

    // Extrai contexto da requisição
    const contextoExecucao = this.extrairContexto(context);
    
    // Valida se o usuário está autenticado
    if (!contextoExecucao.usuario) {
      throw new ForbiddenException('Usuário não autenticado para ação crítica');
    }

    this.logger.log(
      `Processando ação crítica: ${aprovacaoConfig.acao} para usuário ${contextoExecucao.usuario.id}`,
    );

    // Processa a lógica de aprovação
    return from(this.processarAprovacao(aprovacaoConfig, contextoExecucao)).pipe(
      switchMap((podeExecutar) => {
        if (podeExecutar) {
          // Executa a ação e registra na auditoria
          return next.handle().pipe(
            switchMap(async (resultado) => {
              await this.registrarExecucao(aprovacaoConfig, contextoExecucao, resultado);
              return resultado;
            }),
            catchError(async (erro) => {
              await this.registrarErro(aprovacaoConfig, contextoExecucao, erro);
              return throwError(() => erro);
            }),
          );
        } else {
          // Ação bloqueada - aguardando aprovação
          throw new ForbiddenException(
            'Ação requer aprovação. Solicitação criada e enviada para aprovadores.',
          );
        }
      }),
      catchError((erro) => {
        this.logger.error(
          `Erro ao processar aprovação para ação ${aprovacaoConfig.acao}:`,
          erro.stack,
        );
        return throwError(() => erro);
      }),
    );
  }

  /**
   * Extrai contexto da requisição HTTP
   */
  private extrairContexto(context: ExecutionContext): ContextoExecucao {
    const request = context.switchToHttp().getRequest<Request>();
    const usuario = request.user || request['usuario'];

    return {
      usuario,
      request,
      params: request.params,
      body: request.body,
      query: request.query,
      headers: request.headers,
    };
  }

  /**
   * Processa a lógica de aprovação para determinar se a ação pode ser executada
   */
  private async processarAprovacao(
    config: ConfiguracaoAprovacaoMetadata,
    contexto: ContextoExecucao,
  ): Promise<boolean> {
    try {
      // Verifica se permite auto-aprovação
      if (config.permitirAutoAprovacao) {
        const podeAutoAprovar = await this.verificarAutoAprovacao(config, contexto);
        if (podeAutoAprovar) {
          this.logger.log(
            `Auto-aprovação concedida para usuário ${contexto.usuario.id} na ação ${config.acao}`,
          );
          return true;
        }
      }

      // Verifica se já existe solicitação pendente para esta ação
      const solicitacaoPendente = await this.aprovacaoService.buscarSolicitacaoPendente(
        contexto.usuario.id,
        config.acao,
        this.gerarChaveContexto(contexto),
      );

      if (solicitacaoPendente) {
        // Verifica se foi aprovada
        if (solicitacaoPendente.status === StatusSolicitacaoAprovacao.APROVADA) {
          this.logger.log(
            `Solicitação ${solicitacaoPendente.id} já aprovada - permitindo execução`,
          );
          return true;
        }
        
        // Se ainda está pendente, bloqueia execução
        this.logger.log(
          `Solicitação ${solicitacaoPendente.id} ainda pendente - bloqueando execução`,
        );
        return false;
      }

      // Cria nova solicitação de aprovação
      await this.criarSolicitacaoAprovacao(config, contexto);
      return false;
    } catch (erro) {
      this.logger.error('Erro ao processar aprovação:', erro.stack);
      throw new BadRequestException('Erro interno ao processar solicitação de aprovação');
    }
  }

  /**
   * Verifica se o usuário pode auto-aprovar a ação
   */
  private async verificarAutoAprovacao(
    config: ConfiguracaoAprovacaoMetadata,
    contexto: ContextoExecucao,
  ): Promise<boolean> {
    // Se há condições customizadas, usa elas
    if (config.condicoesAutoAprovacao) {
      try {
        return config.condicoesAutoAprovacao(contexto);
      } catch (erro) {
        this.logger.warn('Erro ao avaliar condições de auto-aprovação:', erro.message);
        return false;
      }
    }

    // Verifica permissões padrão baseadas no perfil do usuário
    return await this.aprovacaoService.verificarPermissaoAprovador(
      contexto.usuario.id,
      config.acao,
    );
  }

  /**
   * Cria uma nova solicitação de aprovação
   */
  private async criarSolicitacaoAprovacao(
    config: ConfiguracaoAprovacaoMetadata,
    contexto: ContextoExecucao,
  ): Promise<void> {
    const dadosContexto = this.extrairDadosContexto(config, contexto);
    
    // Mapear ação do config para código de ação crítica
    const codigoAcaoCritica = this.mapearAcaoParaCodigo(config.acao);
    
    // Buscar configuração de aprovação real
    const configuracaoAprovacao = await this.configuracaoRepository.buscarPorAcaoEPerfil(
      codigoAcaoCritica,
      contexto.usuario.perfil,
      contexto.usuario.unidade_id,
    );

    if (!configuracaoAprovacao) {
      throw new BadRequestException(
        `Nenhuma configuração de aprovação encontrada para a ação ${config.acao}`,
      );
    }
    
    const solicitacao = await this.aprovacaoService.criarSolicitacaoAprovacao({
      acao_critica_id: codigoAcaoCritica,
      configuracao_aprovacao_id: configuracaoAprovacao.id,
      usuario_solicitante_id: contexto.usuario.id,
      nome: contexto.usuario.nome || 'Usuário',
      email: contexto.usuario.email || 'usuario@sistema.com',
      justificativa: contexto.body?.justificativa || contexto.body?.motivo || 'Ação crítica solicitada',
      prioridade: this.determinarPrioridade(config, contexto),
      contexto: dadosContexto,
      dados_originais: contexto.body,
      dados_propostos: contexto.body,
      perfil: contexto.usuario.perfil || 'USUARIO',
      unidade: contexto.usuario.unidade_id || 'default',
      ip_solicitante: contexto.request.ip,
      user_agent: contexto.request.headers['user-agent'],
    });

    this.logger.log(
      `Solicitação de aprovação criada: ${solicitacao.id} para ação ${config.acao}`,
    );
  }

  /**
   * Extrai dados relevantes do contexto para a solicitação
   */
  private extrairDadosContexto(
    config: ConfiguracaoAprovacaoMetadata,
    contexto: ContextoExecucao,
  ): Record<string, any> {
    const dados: Record<string, any> = {
      params: contexto.params,
      body: this.sanitizarDadosSensiveis(contexto.body),
      query: contexto.query,
    };

    // Adiciona dados específicos baseados no tipo de ação
    switch (config.acao) {
      case TipoAcaoCritica.EXCLUSAO_BENEFICIARIO:
      case TipoAcaoCritica.CANCELAMENTO_SOLICITACAO:
        dados.entidadeId = contexto.params?.id;
        break;
      case TipoAcaoCritica.ALTERACAO_DADOS_BANCARIOS:
        dados.camposAlterados = Object.keys(contexto.body || {});
        break;
    }

    return dados;
  }

  /**
   * Remove dados sensíveis do contexto antes de armazenar
   */
  private sanitizarDadosSensiveis(dados: any): any {
    if (!dados || typeof dados !== 'object') {
      return dados;
    }

    const dadosLimpos = { ...dados };
    const camposSensiveis = ['password', 'senha', 'token', 'secret', 'key'];
    
    camposSensiveis.forEach(campo => {
      if (dadosLimpos[campo]) {
        dadosLimpos[campo] = '[REDACTED]';
      }
    });

    return dadosLimpos;
  }

  /**
   * Determina a prioridade da solicitação baseada na configuração e contexto
   */
  private determinarPrioridade(
    config: ConfiguracaoAprovacaoMetadata,
    contexto: ContextoExecucao,
  ): PrioridadeAprovacao {
    // Ações de exclusão têm prioridade alta por padrão
    if (config.acao === TipoAcaoCritica.EXCLUSAO_BENEFICIARIO) {
      return PrioridadeAprovacao.ALTA;
    }

    // Outras ações têm prioridade normal
    return PrioridadeAprovacao.NORMAL;
  }

  /**
   * Gera chave única para identificar o contexto da ação
   */
  private gerarChaveContexto(contexto: ContextoExecucao): string {
    const elementos = [
      contexto.request.method,
      contexto.request.route?.path || contexto.request.url,
      contexto.params?.id || '',
    ];
    
    return elementos.filter(Boolean).join(':');
  }

  /**
   * Registra a execução bem-sucedida da ação na auditoria
   */
  private async registrarExecucao(
    config: ConfiguracaoAprovacaoMetadata,
    contexto: ContextoExecucao,
    resultado: any,
  ): Promise<void> {
    try {
      await this.auditoriaService.registrar({
        usuario_id: contexto.usuario.id,
        tipo_operacao: 'UPDATE' as any,
        entidade_afetada: 'Aprovacao',
        descricao: `Execução de ${config.acao}`,
          entidade_id: contexto.params?.id,
        dados_anteriores: null,
          dados_novos: this.sanitizarDadosSensiveis(resultado),
        ip_origem: contexto.request.ip,
        user_agent: contexto.request.headers['user-agent']
      });
    } catch (erro) {
      this.logger.error('Erro ao registrar execução na auditoria:', erro.stack);
      // Não propaga o erro para não afetar a execução principal
    }
  }

  /**
   * Mapeia o tipo de ação do decorator para código de ação crítica
   */
  private mapearAcaoParaCodigo(tipoAcao: TipoAcaoCritica): string {
    // Mapeamento direto do enum para códigos de ação crítica
    const mapeamento: Record<string, string> = {
      [TipoAcaoCritica.CANCELAMENTO_SOLICITACAO]: 'cancelar_solicitacao',
      [TipoAcaoCritica.CANCELAR_CONCESSAO]: 'cancelar_beneficio',
      [TipoAcaoCritica.EXCLUSAO_BENEFICIARIO]: 'cancelar_beneficio',
      [TipoAcaoCritica.SUSPENSAO_BENEFICIO]: 'cancelar_beneficio',
      [TipoAcaoCritica.ALTERACAO_DADOS_BANCARIOS]: 'cancelar_beneficio',
      // Adicionar mais mapeamentos conforme necessário
    };

    return mapeamento[tipoAcao] || 'cancelar_solicitacao';
  }

  /**
   * Registra erro na execução da ação
   */
  private async registrarErro(
    config: ConfiguracaoAprovacaoMetadata,
    contexto: ContextoExecucao,
    erro: any,
  ): Promise<void> {
    try {
      await this.auditoriaService.registrar({
          usuario_id: contexto.usuario.id,
          tipo_operacao: 'UPDATE' as any,
          entidade_afetada: 'Aprovacao',
          descricao: `Erro ${config.acao}`,
          entidade_id: contexto.params?.id,
        dados_anteriores: null,
          dados_novos: {
          erro: erro.message,
          stack: erro.stack,
        },
        ip_origem: contexto.request.ip,
        user_agent: contexto.request.headers['user-agent']
      });
    } catch (erroAuditoria) {
      this.logger.error('Erro ao registrar erro na auditoria:', erroAuditoria.stack);
    }
  }
}