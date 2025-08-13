import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { AprovacaoService } from '../services/aprovacao.service';
import { TipoAcaoCritica } from '../enums/aprovacao.enums';

/**
 * Interface para dados de auditoria de aprovação
 */
interface DadosAuditoriaAprovacao {
  usuarioId: string;
  acao: string;
  entidade?: string;
  entidadeId?: string;
  dadosAnteriores?: any;
  dadosNovos?: any;
  ip: string;
  userAgent: string;
  endpoint: string;
  metadados: {
    requerAprovacao: boolean;
    tipoAcao?: TipoAcaoCritica;
    solicitacaoAprovacaoId?: string;
    aprovadorId?: string;
    statusAprovacao?: string;
    tempoProcessamento?: number;
    [key: string]: any;
  };
}

/**
 * Middleware para integração do sistema de aprovação com auditoria
 * 
 * Este middleware:
 * 1. Intercepta todas as requisições relacionadas a aprovações
 * 2. Registra eventos de auditoria para ações críticas
 * 3. Correlaciona solicitações de aprovação com registros de auditoria
 * 4. Enriquece logs com contexto de aprovação
 * 5. Monitora performance do sistema de aprovação
 */
@Injectable()
export class AuditoriaAprovacaoMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditoriaAprovacaoMiddleware.name);

  constructor(
    private readonly auditoriaService: AuditoriaService,
    private readonly aprovacaoService: AprovacaoService,
  ) {}

  /**
   * Processa a requisição e registra eventos de auditoria
   */
  async use(req: Request, res: Response, next: NextFunction) {
    const inicioProcessamento = Date.now();
    const usuario = req.user || req['usuario'];
    
    // Identifica se é uma requisição relacionada a aprovação
    const ehRequisicaoAprovacao = this.identificarRequisicaoAprovacao(req);
    
    if (!ehRequisicaoAprovacao || !usuario) {
      return next();
    }

    // Extrai dados da requisição para auditoria
    const dadosRequisicao = this.extrairDadosRequisicao(req, usuario);
    
    // Registra início da operação
    await this.registrarInicioOperacao(dadosRequisicao);

    // Intercepta a resposta para registrar o resultado
    const originalSend = res.send;
    let dadosResposta: any;
    
    res.send = function(data: any) {
      dadosResposta = data;
      return originalSend.call(this, data);
    };

    // Intercepta o final da resposta
    res.on('finish', async () => {
      const tempoProcessamento = Date.now() - inicioProcessamento;
      
      try {
        await this.registrarFimOperacao(
          dadosRequisicao,
          dadosResposta,
          res.statusCode,
          tempoProcessamento,
        );
      } catch (erro) {
        this.logger.error('Erro ao registrar fim da operação na auditoria:', erro.stack);
      }
    });

    next();
  }

  /**
   * Identifica se a requisição está relacionada ao sistema de aprovação
   */
  private identificarRequisicaoAprovacao(req: Request): boolean {
    const url = req.url.toLowerCase();
    const rotasAprovacao = [
      '/aprovacao',
      '/solicitacao-aprovacao',
      '/aprovador',
      '/delegacao-aprovacao',
    ];

    // Verifica se é uma rota específica de aprovação
    const ehRotaAprovacao = rotasAprovacao.some(rota => url.includes(rota));
    
    // Verifica se há headers indicando ação crítica
    const temHeaderAprovacao = req.headers['x-requer-aprovacao'] === 'true';
    
    // Verifica se o body contém dados de aprovação
    const temDadosAprovacao = req.body && (
      req.body.tipoAcao ||
      req.body.solicitacaoId ||
      req.body.aprovadorId
    );

    return ehRotaAprovacao || temHeaderAprovacao || temDadosAprovacao;
  }

  /**
   * Extrai dados relevantes da requisição para auditoria
   */
  private extrairDadosRequisicao(req: Request, usuario: any): DadosAuditoriaAprovacao {
    const acao = this.determinarAcao(req);
    const entidade = this.extrairEntidade(req);
    const entidadeId = this.extrairEntidadeId(req);
    
    return {
      usuarioId: usuario.id,
      acao,
      entidade,
      entidadeId,
      dadosAnteriores: null, // Será preenchido posteriormente se necessário
      dadosNovos: this.sanitizarDados(req.body),
      ip: this.extrairIP(req),
      userAgent: req.headers['user-agent'] || '',
      endpoint: `${req.method} ${req.url}`,
      metadados: {
        requerAprovacao: true,
        tipoAcao: req.body?.tipoAcao,
        solicitacaoAprovacaoId: req.body?.solicitacaoId || req.params?.solicitacaoId,
        aprovadorId: req.body?.aprovadorId,
        statusAprovacao: req.body?.status,
        headers: this.extrairHeadersRelevantes(req),
        query: req.query,
        params: req.params,
      },
    };
  }

  /**
   * Determina a ação sendo executada baseada na requisição
   */
  private determinarAcao(req: Request): string {
    const metodo = req.method.toUpperCase();
    const url = req.url.toLowerCase();
    
    // Mapeia rotas específicas para ações
    if (url.includes('/aprovar')) {
      return 'APROVAR_SOLICITACAO';
    }
    if (url.includes('/rejeitar')) {
      return 'REJEITAR_SOLICITACAO';
    }
    if (url.includes('/delegar')) {
      return 'DELEGAR_APROVACAO';
    }
    if (url.includes('/revogar')) {
      return 'REVOGAR_DELEGACAO';
    }
    if (url.includes('/solicitacao-aprovacao') && metodo === 'POST') {
      return 'CRIAR_SOLICITACAO_APROVACAO';
    }
    if (url.includes('/solicitacao-aprovacao') && metodo === 'GET') {
      return 'CONSULTAR_SOLICITACAO_APROVACAO';
    }
    
    // Ação genérica baseada no método HTTP
    const acoesPorMetodo = {
      'POST': 'CRIAR',
      'PUT': 'ATUALIZAR',
      'PATCH': 'ATUALIZAR_PARCIAL',
      'DELETE': 'EXCLUIR',
      'GET': 'CONSULTAR',
    };
    
    return acoesPorMetodo[metodo] || 'ACAO_DESCONHECIDA';
  }

  /**
   * Extrai o nome da entidade da requisição
   */
  private extrairEntidade(req: Request): string | undefined {
    const url = req.url.toLowerCase();
    
    if (url.includes('/solicitacao-aprovacao')) {
      return 'SolicitacaoAprovacao';
    }
    if (url.includes('/aprovador')) {
      return 'Aprovador';
    }
    if (url.includes('/delegacao-aprovacao')) {
      return 'DelegacaoAprovacao';
    }
    if (url.includes('/configuracao-aprovacao')) {
      return 'ConfiguracaoAprovacao';
    }
    
    // Tenta extrair da URL usando padrões comuns
    const matches = url.match(/\/([a-z-]+)\/[0-9a-f-]+/);
    if (matches && matches[1]) {
      return this.normalizarNomeEntidade(matches[1]);
    }
    
    return undefined;
  }

  /**
   * Extrai o ID da entidade da requisição
   */
  private extrairEntidadeId(req: Request): string | undefined {
    // Verifica parâmetros da rota
    if (req.params?.id) {
      return req.params.id;
    }
    if (req.params?.solicitacaoId) {
      return req.params.solicitacaoId;
    }
    if (req.params?.aprovadorId) {
      return req.params.aprovadorId;
    }
    
    // Verifica no body da requisição
    if (req.body?.id) {
      return req.body.id;
    }
    if (req.body?.solicitacaoId) {
      return req.body.solicitacaoId;
    }
    
    return undefined;
  }

  /**
   * Extrai IP real do cliente considerando proxies
   */
  private extrairIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      ''
    ).split(',')[0].trim();
  }

  /**
   * Extrai headers relevantes para auditoria
   */
  private extrairHeadersRelevantes(req: Request): Record<string, string> {
    const headersRelevantes = [
      'authorization',
      'x-request-id',
      'x-correlation-id',
      'x-requer-aprovacao',
      'x-origem-sistema',
    ];
    
    const headers: Record<string, string> = {};
    
    headersRelevantes.forEach(header => {
      if (req.headers[header]) {
        // Sanitiza token de autorização
        if (header === 'authorization') {
          headers[header] = 'Bearer [REDACTED]';
        } else {
          headers[header] = req.headers[header] as string;
        }
      }
    });
    
    return headers;
  }

  /**
   * Remove dados sensíveis dos dados da requisição
   */
  private sanitizarDados(dados: any): any {
    if (!dados || typeof dados !== 'object') {
      return dados;
    }
    
    const dadosLimpos = { ...dados };
    const camposSensiveis = [
      'password',
      'senha',
      'token',
      'secret',
      'key',
      'apiKey',
      'accessToken',
      'refreshToken',
    ];
    
    camposSensiveis.forEach(campo => {
      if (dadosLimpos[campo]) {
        dadosLimpos[campo] = '[REDACTED]';
      }
    });
    
    return dadosLimpos;
  }

  /**
   * Normaliza nome da entidade para padrão PascalCase
   */
  private normalizarNomeEntidade(nome: string): string {
    return nome
      .split('-')
      .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1))
      .join('');
  }

  /**
   * Registra o início da operação na auditoria
   */
  private async registrarInicioOperacao(dados: DadosAuditoriaAprovacao): Promise<void> {
    try {
      await this.auditoriaService.registrar({
        ...dados,
        descricao: `Início da operação de aprovação - ${dados.acao}`,
      });
      
      this.logger.debug(
        `Início de operação registrado: ${dados.acao} por usuário ${dados.usuarioId}`,
      );
    } catch (erro) {
      this.logger.error('Erro ao registrar início da operação:', erro.stack);
    }
  }

  /**
   * Registra o fim da operação na auditoria
   */
  private async registrarFimOperacao(
    dadosRequisicao: DadosAuditoriaAprovacao,
    dadosResposta: any,
    statusCode: number,
    tempoProcessamento: number,
  ): Promise<void> {
    try {
      const sucesso = statusCode >= 200 && statusCode < 300;
      
      // Enriquece dados com informações da resposta
      const dadosCompletos = {
        ...dadosRequisicao,
        dadosNovos: sucesso ? this.sanitizarDados(dadosResposta) : dadosRequisicao.dadosNovos,
        metadados: {
          ...dadosRequisicao.metadados,
          fase: 'FIM',
          sucesso,
          statusCode,
          tempoProcessamento,
          timestamp: new Date().toISOString(),
          erro: !sucesso ? this.extrairErro(dadosResposta) : undefined,
        },
      };
      
      await this.auditoriaService.registrar(dadosCompletos);
      
      this.logger.debug(
        `Fim de operação registrado: ${dadosRequisicao.acao} - ` +
        `Status: ${statusCode} - Tempo: ${tempoProcessamento}ms`,
      );
      
      // Registra métricas de performance se o tempo for alto
      if (tempoProcessamento > 5000) { // Mais de 5 segundos
        this.logger.warn(
          `Operação de aprovação lenta detectada: ${dadosRequisicao.acao} - ` +
          `${tempoProcessamento}ms`,
        );
      }
    } catch (erro) {
      this.logger.error('Erro ao registrar fim da operação:', erro.stack);
    }
  }

  /**
   * Extrai informações de erro da resposta
   */
  private extrairErro(dadosResposta: any): any {
    if (!dadosResposta) {
      return undefined;
    }
    
    // Se é um objeto de erro estruturado
    if (dadosResposta.error || dadosResposta.message) {
      return {
        message: dadosResposta.message || dadosResposta.error,
        code: dadosResposta.code || dadosResposta.statusCode,
        details: dadosResposta.details,
      };
    }
    
    // Se é uma string de erro
    if (typeof dadosResposta === 'string') {
      return { message: dadosResposta };
    }
    
    return undefined;
  }
}

/**
 * Middleware específico para auditoria de delegações
 */
@Injectable()
export class AuditoriaDelegacaoMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditoriaDelegacaoMiddleware.name);

  constructor(private readonly auditoriaService: AuditoriaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const url = req.url.toLowerCase();
    
    // Só processa requisições de delegação
    if (!url.includes('/delegacao')) {
      return next();
    }
    
    const usuario = req.user || req['usuario'];
    if (!usuario) {
      return next();
    }
    
    // Registra evento específico de delegação
    try {
      await this.auditoriaService.registrar({
        usuario_id: usuario.id,
        tipo_operacao: 'UPDATE' as any,
        entidade_afetada: 'Aprovacao',
        descricao: `Delegação ${req.method.toUpperCase()}`,
        entidade_id: req.params?.id,
        dados_anteriores: null,
        dados_novos: req.body,
        ip_origem: req.ip,
         user_agent: req.headers['user-agent'] || ''
      });
    } catch (erro) {
      this.logger.error('Erro ao registrar auditoria de delegação:', erro.stack);
    }
    
    next();
  }
}