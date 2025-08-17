import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TipoAcaoCritica } from '../enums';
import { SolicitacaoAprovacao } from '../entities';
import { firstValueFrom } from 'rxjs';
import { Request } from 'express';

/**
 * Interface para resultado da execução de uma ação
 */
export interface ResultadoExecucao {
  sucesso: boolean;
  dados?: any;
  erro?: string;
  detalhes?: any;
}

/**
 * Interface para dados de execução HTTP
 */
interface DadosExecucaoHttp {
  url: string;
  method: string;
  params?: any;
  query?: any;
  body?: any;
  headers?: any;
}

/**
 * Serviço responsável pela execução real das ações aprovadas
 * 
 * Este serviço implementa a lógica específica para cada tipo de ação crítica,
 * permitindo a execução automática após aprovação.
 */
@Injectable()
export class ExecucaoAcaoService {
  private readonly logger = new Logger(ExecucaoAcaoService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(REQUEST) private readonly request: Request,
  ) {
    // Configurar URL base para requisições internas
    const port = this.configService.get<number>('APP_PORT', 3000);
    const host = this.configService.get<string>('APP_HOST', 'localhost');
    const protocol = this.configService.get<string>('APP_PROTOCOL', 'http');
    this.baseUrl = `${protocol}://${host}:${port}`;
    
    this.logger.debug(`URL base configurada: ${this.baseUrl}`);
  }

  /**
   * Executa uma ação aprovada baseada no tipo e dados da solicitação
   * 
   * @param solicitacao - Solicitação de aprovação aprovada
   * @returns Resultado da execução
   */
  async executarAcao(solicitacao: SolicitacaoAprovacao): Promise<ResultadoExecucao> {
    try {
      this.logger.log(`Iniciando execução da ação: ${solicitacao.acao_aprovacao.tipo_acao}`);
      
      // Valida dados da ação antes da execução
      this.validarDadosAcao(solicitacao.dados_acao, solicitacao.acao_aprovacao.tipo_acao);
      
      // Executa baseado no tipo de ação
      switch (solicitacao.acao_aprovacao.tipo_acao) {
        case TipoAcaoCritica.CANCELAMENTO_SOLICITACAO:
          return await this.executarCancelamentoSolicitacao(solicitacao);
          
        case TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS:
          return await this.executarAlteracaoDadosCriticos(solicitacao);
          
        case TipoAcaoCritica.EXCLUSAO_REGISTRO:
          return await this.executarExclusaoRegistro(solicitacao);
          
        case TipoAcaoCritica.APROVACAO_PAGAMENTO:
          return await this.executarAprovacaoPagamento(solicitacao);
          
        case TipoAcaoCritica.TRANSFERENCIA_BENEFICIO:
          return await this.executarTransferenciaBeneficio(solicitacao);
          
        case TipoAcaoCritica.SUSPENSAO_BENEFICIO:
          return await this.executarSuspensaoBeneficio(solicitacao);
          
        case TipoAcaoCritica.REATIVACAO_BENEFICIO:
          return await this.executarReativacaoBeneficio(solicitacao);
          
        case TipoAcaoCritica.ALTERACAO_VALOR_BENEFICIO:
          return await this.executarAlteracaoValorBeneficio(solicitacao);
          
        default:
          throw new BadRequestException(`Tipo de ação não suportado: ${solicitacao.acao_aprovacao.tipo_acao}`);
      }
    } catch (error) {
      this.logger.error(`Erro na execução da ação ${solicitacao.acao_aprovacao.tipo_acao}:`, error);
      return {
        sucesso: false,
        erro: error.message,
        detalhes: error
      };
    }
  }

  /**
   * Executa cancelamento de solicitação de benefício
   */
  private async executarCancelamentoSolicitacao(solicitacao: SolicitacaoAprovacao): Promise<ResultadoExecucao> {
    try {
      const dadosAcao = solicitacao.dados_acao as DadosExecucaoHttp;
      
      // Extrai ID da solicitação dos dados
      const solicitacaoId = dadosAcao.params?.id || dadosAcao.body?.solicitacao_id;
      
      if (!solicitacaoId) {
        throw new BadRequestException('ID da solicitação não encontrado nos dados da ação');
      }

      // Executa a requisição HTTP para cancelar a solicitação
      const response = await this.executarRequisicaoHttp({
        url: `/api/v1/beneficio/solicitacoes/${solicitacaoId}/cancelar`,
        method: 'PUT',
        body: {
          motivo_cancelamento: 'Cancelamento aprovado via sistema de aprovação',
          justificativa: solicitacao.justificativa,
          aprovado_por: 'SISTEMA_APROVACAO'
        }
      });

      return {
        sucesso: true,
        dados: response.data,
        detalhes: {
          solicitacao_cancelada: solicitacaoId,
          metodo_original: solicitacao.metodo_execucao
        }
      };
    } catch (error) {
      throw new Error(`Falha no cancelamento da solicitação: ${error.message}`);
    }
  }

  /**
   * Executa alteração de dados críticos
   */
  private async executarAlteracaoDadosCriticos(solicitacao: SolicitacaoAprovacao): Promise<ResultadoExecucao> {
    try {
      const dadosAcao = solicitacao.dados_acao as DadosExecucaoHttp;
      
      // Reconstrói a requisição original com dados aprovados
      const response = await this.executarRequisicaoHttp({
        url: dadosAcao.url,
        method: dadosAcao.method,
        params: dadosAcao.params,
        query: dadosAcao.query,
        body: {
          ...dadosAcao.body,
          // Remove campos de aprovação do body original
          justificativa_aprovacao: undefined,
          // Adiciona metadados de aprovação
          _aprovacao_metadata: {
            solicitacao_id: solicitacao.id,
            codigo_aprovacao: solicitacao.codigo,
            aprovado_em: new Date(),
            justificativa: solicitacao.justificativa
          }
        },
        headers: {
          ...dadosAcao.headers,
          'X-Aprovacao-Executada': 'true',
          'X-Solicitacao-Aprovacao': solicitacao.codigo
        }
      });

      return {
        sucesso: true,
        dados: response.data,
        detalhes: {
          url_executada: dadosAcao.url,
          metodo: dadosAcao.method,
          dados_alterados: dadosAcao.body
        }
      };
    } catch (error) {
      throw new Error(`Falha na alteração de dados críticos: ${error.message}`);
    }
  }

  /**
   * Executa exclusão de registro
   */
  private async executarExclusaoRegistro(solicitacao: SolicitacaoAprovacao): Promise<ResultadoExecucao> {
    try {
      const dadosAcao = solicitacao.dados_acao as DadosExecucaoHttp;
      
      // Executa a exclusão com metadados de aprovação
      const response = await this.executarRequisicaoHttp({
        url: dadosAcao.url,
        method: 'DELETE',
        params: dadosAcao.params,
        query: {
          ...dadosAcao.query,
          aprovacao_codigo: solicitacao.codigo,
          justificativa: solicitacao.justificativa
        },
        headers: {
          ...dadosAcao.headers,
          'X-Aprovacao-Executada': 'true',
          'X-Solicitacao-Aprovacao': solicitacao.codigo
        }
      });

      return {
        sucesso: true,
        dados: response.data,
        detalhes: {
          registro_excluido: dadosAcao.url,
          metodo_original: solicitacao.metodo_execucao
        }
      };
    } catch (error) {
      throw new Error(`Falha na exclusão do registro: ${error.message}`);
    }
  }

  /**
   * Executa aprovação de pagamento
   */
  private async executarAprovacaoPagamento(solicitacao: SolicitacaoAprovacao): Promise<ResultadoExecucao> {
    try {
      const dadosAcao = solicitacao.dados_acao as any;
      const pagamentoId = dadosAcao.params?.id || dadosAcao.body?.pagamento_id;
      
      if (!pagamentoId) {
        throw new BadRequestException('ID do pagamento não encontrado nos dados da ação');
      }

      // Aprova o pagamento
      const response = await this.executarRequisicaoHttp({
        url: `/api/v1/pagamento/${pagamentoId}/aprovar`,
        method: 'PUT',
        body: {
          aprovado: true,
          justificativa_aprovacao: solicitacao.justificativa,
          aprovado_por: 'SISTEMA_APROVACAO',
          codigo_solicitacao: solicitacao.codigo
        }
      });

      return {
        sucesso: true,
        dados: response.data,
        detalhes: {
          pagamento_aprovado: pagamentoId,
          valor: dadosAcao.body?.valor
        }
      };
    } catch (error) {
      throw new Error(`Falha na aprovação do pagamento: ${error.message}`);
    }
  }

  /**
   * Executa transferência de benefício
   */
  private async executarTransferenciaBeneficio(solicitacao: SolicitacaoAprovacao): Promise<ResultadoExecucao> {
    try {
      const dadosAcao = solicitacao.dados_acao as any;
      
      const response = await this.executarRequisicaoHttp({
        url: '/api/v1/beneficio/transferir',
        method: 'POST',
        body: {
          ...dadosAcao.body,
          aprovacao_codigo: solicitacao.codigo,
          justificativa_aprovacao: solicitacao.justificativa,
          processado_por: 'SISTEMA_APROVACAO'
        }
      });

      return {
        sucesso: true,
        dados: response.data,
        detalhes: {
          beneficio_transferido: dadosAcao.body?.beneficio_id,
          novo_titular: dadosAcao.body?.novo_titular_id
        }
      };
    } catch (error) {
      throw new Error(`Falha na transferência do benefício: ${error.message}`);
    }
  }

  /**
   * Executa suspensão de benefício
   */
  private async executarSuspensaoBeneficio(solicitacao: SolicitacaoAprovacao): Promise<ResultadoExecucao> {
    try {
      const dadosAcao = solicitacao.dados_acao as any;
      const beneficioId = dadosAcao.params?.id || dadosAcao.body?.beneficio_id;
      
      const response = await this.executarRequisicaoHttp({
        url: `/api/v1/beneficio/${beneficioId}/suspender`,
        method: 'PUT',
        body: {
          motivo_suspensao: dadosAcao.body?.motivo || 'Suspensão aprovada via sistema',
          justificativa: solicitacao.justificativa,
          aprovacao_codigo: solicitacao.codigo,
          data_suspensao: dadosAcao.body?.data_suspensao || new Date()
        }
      });

      return {
        sucesso: true,
        dados: response.data,
        detalhes: {
          beneficio_suspenso: beneficioId,
          motivo: dadosAcao.body?.motivo
        }
      };
    } catch (error) {
      throw new Error(`Falha na suspensão do benefício: ${error.message}`);
    }
  }

  /**
   * Executa reativação de benefício
   */
  private async executarReativacaoBeneficio(solicitacao: SolicitacaoAprovacao): Promise<ResultadoExecucao> {
    try {
      const dadosAcao = solicitacao.dados_acao as any;
      const beneficioId = dadosAcao.params?.id || dadosAcao.body?.beneficio_id;
      
      const response = await this.executarRequisicaoHttp({
        url: `/api/v1/beneficio/${beneficioId}/reativar`,
        method: 'PUT',
        body: {
          justificativa_reativacao: solicitacao.justificativa,
          aprovacao_codigo: solicitacao.codigo,
          data_reativacao: dadosAcao.body?.data_reativacao || new Date()
        }
      });

      return {
        sucesso: true,
        dados: response.data,
        detalhes: {
          beneficio_reativado: beneficioId
        }
      };
    } catch (error) {
      throw new Error(`Falha na reativação do benefício: ${error.message}`);
    }
  }

  /**
   * Executa alteração de valor de benefício
   */
  private async executarAlteracaoValorBeneficio(solicitacao: SolicitacaoAprovacao): Promise<ResultadoExecucao> {
    try {
      const dadosAcao = solicitacao.dados_acao as any;
      const beneficioId = dadosAcao.params?.id || dadosAcao.body?.beneficio_id;
      
      const response = await this.executarRequisicaoHttp({
        url: `/api/v1/beneficio/${beneficioId}/alterar-valor`,
        method: 'PUT',
        body: {
          novo_valor: dadosAcao.body?.novo_valor,
          valor_anterior: dadosAcao.body?.valor_anterior,
          justificativa: solicitacao.justificativa,
          aprovacao_codigo: solicitacao.codigo,
          data_vigencia: dadosAcao.body?.data_vigencia || new Date()
        }
      });

      return {
        sucesso: true,
        dados: response.data,
        detalhes: {
          beneficio_alterado: beneficioId,
          valor_anterior: dadosAcao.body?.valor_anterior,
          novo_valor: dadosAcao.body?.novo_valor
        }
      };
    } catch (error) {
      throw new Error(`Falha na alteração do valor do benefício: ${error.message}`);
    }
  }

  /**
   * Constrói URL absoluta a partir de uma URL relativa ou absoluta
   */
  private construirUrlAbsoluta(url: string): string {
    try {
      // Se já é uma URL absoluta, retorna como está
      new URL(url);
      return url;
    } catch {
      // Se é uma URL relativa, constrói URL absoluta
      const urlLimpa = url.startsWith('/') ? url : `/${url}`;
      const urlCompleta = `${this.baseUrl}${urlLimpa}`;
      
      this.logger.debug(`URL relativa '${url}' convertida para '${urlCompleta}'`);
      return urlCompleta;
    }
  }

  /**
   * Executa uma requisição HTTP com tratamento de erros
   */
  private async executarRequisicaoHttp(dados: DadosExecucaoHttp): Promise<any> {
    try {
      // Construir URL absoluta
      const urlAbsoluta = this.construirUrlAbsoluta(dados.url);
      
      // Validar URL antes da execução
      try {
        new URL(urlAbsoluta);
      } catch (urlError) {
        throw new Error(`URL inválida: ${urlAbsoluta}. Erro: ${urlError.message}`);
      }
      
      // Extrair token de autorização da requisição atual
      const authorizationHeader = this.request.headers.authorization;
      if (!authorizationHeader) {
        throw new Error('Token de autorização não encontrado na requisição atual');
      }
      
      // Filtrar metadados de aprovação do body antes de enviar
      const bodyFiltrado = this.filtrarMetadadosAprovacao(dados.body);
      
      const config = {
        method: dados.method.toLowerCase(),
        url: urlAbsoluta,
        params: dados.params,
        data: bodyFiltrado,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authorizationHeader,
          ...dados.headers
        }
      };

      this.logger.debug(`Executando requisição HTTP: ${dados.method} ${urlAbsoluta}`);
      
      const response = await firstValueFrom(
        this.httpService.request(config)
      );

      this.logger.debug(`Requisição HTTP executada com sucesso: ${response.status}`);
      
      return response;
    } catch (error) {
      this.logger.error(`Erro na requisição HTTP: ${error.message}`);
      
      if (error.response) {
        throw new Error(`HTTP ${error.response.status}: ${error.response.data?.message || error.message}`);
      }
      
      throw new Error(`Erro de rede: ${error.message}`);
    }
  }

  /**
   * Filtra metadados de aprovação do body antes de enviar requisições HTTP
   * Remove propriedades específicas do sistema de aprovação que não devem
   * ser enviadas para endpoints externos
   */
  private filtrarMetadadosAprovacao(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    // Criar cópia do objeto para não modificar o original
    const bodyFiltrado = { ...body };

    // Remover metadados de aprovação
    delete bodyFiltrado._aprovacao_metadata;
    delete bodyFiltrado.justificativa_aprovacao;
    delete bodyFiltrado.codigo_aprovacao;
    delete bodyFiltrado.solicitacao_aprovacao_id;

    // Se o body é um array, filtrar cada item
    if (Array.isArray(body)) {
      return body.map(item => this.filtrarMetadadosAprovacao(item));
    }

    // Filtrar recursivamente objetos aninhados
    Object.keys(bodyFiltrado).forEach(key => {
      if (bodyFiltrado[key] && typeof bodyFiltrado[key] === 'object') {
        bodyFiltrado[key] = this.filtrarMetadadosAprovacao(bodyFiltrado[key]);
      }
    });

    return bodyFiltrado;
  }

  /**
   * Valida se os dados da ação são válidos para execução
   */
  private validarDadosAcao(dadosAcao: any, tipoAcao: TipoAcaoCritica): void {
    if (!dadosAcao) {
      throw new BadRequestException('Dados da ação não fornecidos');
    }

    // Validações específicas por tipo de ação
    switch (tipoAcao) {
      case TipoAcaoCritica.CANCELAMENTO_SOLICITACAO:
        if (!dadosAcao.params?.id && !dadosAcao.body?.solicitacao_id) {
          throw new BadRequestException('ID da solicitação é obrigatório para cancelamento');
        }
        break;
        
      case TipoAcaoCritica.APROVACAO_PAGAMENTO:
        if (!dadosAcao.params?.id && !dadosAcao.body?.pagamento_id) {
          throw new BadRequestException('ID do pagamento é obrigatório');
        }
        break;
        
      case TipoAcaoCritica.ALTERACAO_VALOR_BENEFICIO:
        if (!dadosAcao.body?.novo_valor) {
          throw new BadRequestException('Novo valor é obrigatório para alteração');
        }
        break;
        
      case TipoAcaoCritica.ALTERACAO_DADOS_CRITICOS:
        if (!dadosAcao.url || !dadosAcao.method) {
          throw new BadRequestException('URL e método HTTP são obrigatórios para alteração de dados');
        }
        break;
        
      case TipoAcaoCritica.EXCLUSAO_REGISTRO:
        if (!dadosAcao.url) {
          throw new BadRequestException('URL é obrigatória para exclusão de registro');
        }
        break;
    }
  }
}