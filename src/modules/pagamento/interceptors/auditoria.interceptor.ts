import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { AuditEventType } from '../../auditoria/events/types/audit-event.types';
import { Reflector } from '@nestjs/core';
import { AUDITORIA_METADATA_KEY } from '../decorators/auditoria.decorator';
import { DataMaskingUtil } from '../utils/data-masking.util';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';

/**
 * Interface para metadados de auditoria
 */
export interface AuditoriaMetadata {
  entidade: string;
  operacao: TipoOperacao;
  descricao?: string;
  mascarDados?: boolean;
}

/**
 * Interceptor de Auditoria para o Módulo de Pagamento
 *
 * Captura automaticamente informações das requisições HTTP e registra
 * logs de auditoria para todas as operações críticas do módulo de pagamento.
 *
 * Funcionalidades:
 * - Captura dados da requisição (método, URL, IP, user-agent)
 * - Extrai informações do usuário autenticado
 * - Registra timestamp de início e fim da operação
 * - Mascara dados sensíveis antes de registrar
 * - Trata erros sem impactar a operação principal
 *
 * @author Equipe PGBen
 */
@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditoriaInterceptor.name);

  constructor(
    private readonly auditEventEmitter: AuditEventEmitter,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Obter metadados de auditoria do decorator
    const auditoriaMetadata =
      this.reflector.get<AuditoriaMetadata>(AUDITORIA_METADATA_KEY, handler) ||
      this.reflector.get<AuditoriaMetadata>(AUDITORIA_METADATA_KEY, controller);

    // Se não há metadados de auditoria, pular o interceptor
    if (!auditoriaMetadata) {
      return next.handle();
    }

    const startTime = Date.now();
    const dadosRequisicao = this.extrairDadosRequisicao(request);
    const usuario = this.extrairUsuario(request);

    return next.handle().pipe(
      tap((data) => {
        // Registrar sucesso da operação
        this.registrarAuditoria({
          ...auditoriaMetadata,
          dadosRequisicao,
          usuario,
          response,
          data,
          sucesso: true,
          tempoExecucao: Date.now() - startTime,
        }).catch((error) => {
          this.logger.error(
            `Erro ao registrar auditoria de sucesso: ${error.message}`,
            error.stack,
          );
        });
      }),
      catchError((error) => {
        // Registrar erro da operação
        this.registrarAuditoria({
          ...auditoriaMetadata,
          dadosRequisicao,
          usuario,
          response,
          error,
          sucesso: false,
          tempoExecucao: Date.now() - startTime,
        }).catch((auditError) => {
          this.logger.error(
            `Erro ao registrar auditoria de erro: ${auditError.message}`,
            auditError.stack,
          );
        });

        // Re-throw o erro original
        throw error;
      }),
    );
  }

  /**
   * Extrai dados relevantes da requisição HTTP
   */
  private extrairDadosRequisicao(request: Request) {
    return {
      metodo: request.method,
      url: request.url,
      endpoint: request.route?.path || request.url,
      ip: this.extrairIP(request),
      userAgent: request.get('User-Agent') || 'Desconhecido',
      headers: this.filtrarHeaders(request.headers),
      query: request.query,
      params: request.params,
    };
  }

  /**
   * Extrai informações do usuário autenticado
   */
  private extrairUsuario(request: Request) {
    const user = (request as any).user;
    if (!user) {
      return null;
    }

    return {
      id: user.id || user.sub,
      email: user.email,
      perfil: user.perfil || user.role,
      unidadeId: user.unidadeId,
      nome: user.nome || user.name,
    };
  }

  /**
   * Extrai o endereço IP real da requisição
   */
  private extrairIP(request: Request): string {
    return (
      request.ip ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      (request.connection as any)?.socket?.remoteAddress ||
      request.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
      request.get('X-Real-IP') ||
      'Desconhecido'
    );
  }

  /**
   * Filtra headers sensíveis antes de registrar
   */
  private filtrarHeaders(headers: any): any {
    const headersSeguras = { ...headers };

    // Remover headers sensíveis
    delete headersSeguras.authorization;
    delete headersSeguras.cookie;
    delete headersSeguras['x-api-key'];
    delete headersSeguras['x-auth-token'];

    return headersSeguras;
  }

  /**
   * Registra o log de auditoria
   */
  private async registrarAuditoria(dados: {
    entidade: string;
    operacao: TipoOperacao;
    descricao?: string;
    mascarDados?: boolean;
    dadosRequisicao: any;
    usuario: any;
    response: Response;
    data?: any;
    error?: any;
    sucesso: boolean;
    tempoExecucao: number;
  }): Promise<void> {
    try {
      const {
        entidade,
        operacao,
        descricao,
        mascarDados = true,
        dadosRequisicao,
        usuario,
        response,
        data,
        error,
        sucesso,
        tempoExecucao,
      } = dados;

      // Preparar dados para auditoria
      let dadosNovos = data;
      const dadosAnteriores = null;

      // Mascarar dados sensíveis se necessário
      if (mascarDados && dadosNovos) {
        dadosNovos = this.mascarDadosSensiveis(dadosNovos);
      }

      // Extrair ID da entidade da resposta ou parâmetros
      const entidadeId = this.extrairEntidadeId(dadosRequisicao, data);

      // Registrar na auditoria usando o novo AuditEventEmitter
      const auditData = {
        entityName: entidade,
        entityId: entidadeId,
        userId: usuario?.id,
        previousData: dadosAnteriores,
        newData: dadosNovos,
        description: this.gerarDescricao({
          operacao,
          entidade,
          descricao,
          sucesso,
          error,
          tempoExecucao,
        }),
        riskLevel: this.determinarNivelRisco(operacao, entidade, error),
        sensitiveFields: this.identificarCamposSensiveis(dadosNovos),
        metadata: {
          modulo: 'pagamento',
          controller: dadosRequisicao.endpoint,
          endpoint: dadosRequisicao.endpoint,
          metodo_http: dadosRequisicao.metodo,
          ip_origem: dadosRequisicao.ip,
          user_agent: dadosRequisicao.userAgent,
          query: dadosRequisicao.query,
          params: dadosRequisicao.params,
          status_http: response.statusCode,
          tempo_execucao: tempoExecucao,
          sucesso,
          detalhes_erro: error
            ? {
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 5).join('\n'),
                name: error.name,
              }
            : null,
          usuario: {
            email: usuario?.email,
            perfil: usuario?.perfil,
            unidadeId: usuario?.unidadeId,
          },
        },
      };

      // Emitir evento baseado no tipo de operação
      switch (operacao) {
        case TipoOperacao.CREATE:
          await this.auditEventEmitter.emitEntityCreated(
            auditData.entityName,
            auditData.entityId,
            auditData.newData || {},
            auditData.userId,
          );
          break;
        case TipoOperacao.UPDATE:
          await this.auditEventEmitter.emitEntityUpdated(
            auditData.entityName,
            auditData.entityId,
            auditData.previousData || {},
            auditData.newData || {},
            auditData.userId,
          );
          break;
        case TipoOperacao.DELETE:
          await this.auditEventEmitter.emitEntityDeleted(
            auditData.entityName,
            auditData.entityId,
            auditData.previousData || {},
            auditData.userId,
          );
          break;
        default:
          await this.auditEventEmitter.emitSystemEvent(
            AuditEventType.SYSTEM_INFO,
            {
              description:
                auditData.description || `${operacao} em ${entidade}`,
              userId: auditData.userId,
              entityName: auditData.entityName,
              entityId: auditData.entityId,
            },
          );
      }

      this.logger.debug(
        `Auditoria registrada: ${operacao} em ${entidade} por usuário ${usuario?.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Falha ao registrar auditoria: ${error.message}`,
        error.stack,
      );
      // Não re-throw para não impactar a operação principal
    }
  }

  /**
   * Mascara dados sensíveis antes de registrar na auditoria
   */
  private mascarDadosSensiveis(dados: any): any {
    if (!dados || typeof dados !== 'object') {
      return dados;
    }

    const dadosMascarados = { ...dados };

    // Mascarar dados bancários
    if (dadosMascarados.dadosBancarios || dadosMascarados.infoBancaria) {
      const infoBancaria =
        dadosMascarados.dadosBancarios || dadosMascarados.infoBancaria;

      if (infoBancaria.conta) {
        infoBancaria.conta = DataMaskingUtil.maskConta(infoBancaria.conta);
      }

      if (infoBancaria.agencia) {
        infoBancaria.agencia = DataMaskingUtil.maskAgencia(
          infoBancaria.agencia,
        );
      }

      if (infoBancaria.pixChave || infoBancaria.chavePix) {
        const chave = infoBancaria.pixChave || infoBancaria.chavePix;
        const tipo = infoBancaria.pixTipo || infoBancaria.pixType;

        if (chave && tipo) {
          const chaveMascarada = DataMaskingUtil.maskPixKey(chave, tipo);
          if (infoBancaria.pixChave) {
            infoBancaria.pixChave = chaveMascarada;
          }
          if (infoBancaria.chavePix) {
            infoBancaria.chavePix = chaveMascarada;
          }
        }
      }
    }

    // Mascarar outros campos sensíveis
    if (dadosMascarados.cpf) {
      dadosMascarados.cpf = dadosMascarados.cpf.replace(
        /(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/,
        '***.***.***-**',
      );
    }

    if (dadosMascarados.senha || dadosMascarados.password) {
      dadosMascarados.senha = '***';
      dadosMascarados.password = '***';
    }

    return dadosMascarados;
  }

  /**
   * Extrai o ID da entidade dos dados da requisição ou resposta
   */
  private extrairEntidadeId(dadosRequisicao: any, data: any): string | null {
    // Tentar extrair do parâmetro da URL
    if (dadosRequisicao.params?.id) {
      return dadosRequisicao.params.id;
    }

    // Tentar extrair da resposta
    if (data?.id) {
      return data.id;
    }

    // Tentar extrair de arrays de dados
    if (Array.isArray(data) && data.length > 0 && data[0].id) {
      return data[0].id;
    }

    return null;
  }

  /**
   * Gera descrição automática da operação
   */
  private gerarDescricao(dados: {
    operacao: TipoOperacao;
    entidade: string;
    descricao?: string;
    sucesso: boolean;
    error?: any;
    tempoExecucao: number;
  }): string {
    const { operacao, entidade, descricao, sucesso, error, tempoExecucao } =
      dados;

    if (descricao) {
      return descricao;
    }

    const operacaoTexto =
      {
        CREATE: 'Criação',
        UPDATE: 'Atualização',
        DELETE: 'Exclusão',
        READ: 'Consulta',
        [TipoOperacao.READ]: 'Consulta',
      }[operacao] || operacao;

    const statusTexto = sucesso ? 'realizada com sucesso' : 'falhou';
    const tempoTexto = `em ${tempoExecucao}ms`;

    let resultado = `${operacaoTexto} de ${entidade} ${statusTexto} ${tempoTexto}`;

    if (!sucesso && error) {
      resultado += ` - Erro: ${error.message}`;
    }

    return resultado;
  }

  /**
   * Determina o nível de risco baseado na operação e contexto
   */
  private determinarNivelRisco(
    operacao: string,
    entidade: string,
    error?: any,
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    // Operações de pagamento são sempre de alto risco
    if (entidade.toLowerCase().includes('pagamento')) {
      return 'HIGH';
    }

    // Operações com erro são de risco médio
    if (error) {
      return 'MEDIUM';
    }

    // Operações de criação e exclusão são de risco médio
    if (operacao === 'CREATE' || operacao === 'DELETE') {
      return 'MEDIUM';
    }

    // Outras operações são de baixo risco
    return 'LOW';
  }

  /**
   * Identifica campos sensíveis nos dados
   */
  private identificarCamposSensiveis(dados: any): string[] {
    if (!dados || typeof dados !== 'object') {
      return [];
    }

    const camposSensiveis = [];
    const chavesComuns = Object.keys(dados);

    // Campos financeiros
    const camposFinanceiros = [
      'valor',
      'conta_bancaria',
      'agencia',
      'banco',
      'pix',
    ];
    camposFinanceiros.forEach((campo) => {
      if (chavesComuns.some((key) => key.toLowerCase().includes(campo))) {
        camposSensiveis.push(campo);
      }
    });

    // Campos de identificação
    const camposIdentificacao = ['cpf', 'cnpj', 'rg', 'documento'];
    camposIdentificacao.forEach((campo) => {
      if (chavesComuns.some((key) => key.toLowerCase().includes(campo))) {
        camposSensiveis.push(campo);
      }
    });

    return camposSensiveis;
  }
}
