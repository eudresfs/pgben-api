
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
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { CreateLogAuditoriaDto } from '../../auditoria/dto/create-log-auditoria.dto';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { Reflector } from '@nestjs/core';
import { AUDITORIA_METADATA_KEY } from '../decorators/auditoria.decorator';
import { DataMaskingUtil } from '../utils/data-masking.util';

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
    private readonly auditoriaService: AuditoriaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Obter metadados de auditoria do decorator
    const auditoriaMetadata = this.reflector.get<AuditoriaMetadata>(
      AUDITORIA_METADATA_KEY,
      handler,
    ) || this.reflector.get<AuditoriaMetadata>(
      AUDITORIA_METADATA_KEY,
      controller,
    );

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
      let dadosAnteriores = null;

      // Mascarar dados sensíveis se necessário
      if (mascarDados && dadosNovos) {
        dadosNovos = this.mascarDadosSensiveis(dadosNovos);
      }

      // Extrair ID da entidade da resposta ou parâmetros
      const entidadeId = this.extrairEntidadeId(dadosRequisicao, data);

      // Criar DTO de auditoria
      const logDto = new CreateLogAuditoriaDto();
      Object.assign(logDto, {
        tipo_operacao: operacao,
        entidade_afetada: entidade,
        entidade_id: entidadeId,
        usuario_id: usuario?.id,
        endpoint: dadosRequisicao.endpoint,
        metodo_http: dadosRequisicao.metodo,
        ip_origem: dadosRequisicao.ip,
        user_agent: dadosRequisicao.userAgent,
        descricao: this.gerarDescricao({
          operacao,
          entidade,
          descricao,
          sucesso,
          error,
          tempoExecucao,
        }),
        dados_anteriores: dadosAnteriores,
        dados_novos: dadosNovos,
        status_http: response.statusCode,
        tempo_execucao: tempoExecucao,
        sucesso,
        detalhes_erro: error ? {
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5).join('\n'), // Limitar stack trace
          name: error.name,
        } : null,
        metadados: {
          modulo: 'pagamento',
          controller: dadosRequisicao.endpoint,
          query: dadosRequisicao.query,
          params: dadosRequisicao.params,
          usuario: {
            email: usuario?.email,
            perfil: usuario?.perfil,
            unidadeId: usuario?.unidadeId,
          },
        },
      });

      // Registrar na auditoria
      await this.auditoriaService.create(logDto);

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
      const infoBancaria = dadosMascarados.dadosBancarios || dadosMascarados.infoBancaria;
      
      if (infoBancaria.conta) {
        infoBancaria.conta = DataMaskingUtil.maskConta(infoBancaria.conta);
      }
      
      if (infoBancaria.agencia) {
        infoBancaria.agencia = DataMaskingUtil.maskAgencia(infoBancaria.agencia);
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
      dadosMascarados.cpf = dadosMascarados.cpf.replace(/(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/, '***.***.***-**');
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
    const { operacao, entidade, descricao, sucesso, error, tempoExecucao } = dados;

    if (descricao) {
      return descricao;
    }

    const operacaoTexto = {
      [TipoOperacao.CREATE]: 'Criação',
      [TipoOperacao.UPDATE]: 'Atualização',
      [TipoOperacao.DELETE]: 'Exclusão',
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
}