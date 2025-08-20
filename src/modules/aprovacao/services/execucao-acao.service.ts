import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
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
 * Interface para dados de execução HTTP salvos no banco
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
 * Serviço responsável pela execução das ações aprovadas
 * 
 * Este serviço executa a requisição HTTP original salva em dados_acao,
 * sem lógicas específicas por tipo de ação.
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
   * Executa uma ação aprovada baseada nos dados salvos na solicitação
   * 
   * @param solicitacao - Solicitação de aprovação aprovada
   * @returns Resultado da execução
   */
  async executarAcao(solicitacao: SolicitacaoAprovacao): Promise<ResultadoExecucao> {
    try {
      this.logger.log(`Iniciando execução da ação: ${solicitacao.metodo_execucao}`);
      
      // Valida se os dados da ação estão presentes
      if (!solicitacao.dados_acao) {
        throw new BadRequestException('Dados da ação não encontrados na solicitação');
      }
      
      const dadosAcao = solicitacao.dados_acao as DadosExecucaoHttp;
      
      // Valida dados básicos da requisição
      this.validarDadosRequisicao(dadosAcao);
      
      // Executa a requisição HTTP original
      const response = await this.executarRequisicaoHttp(dadosAcao, solicitacao);
      
      this.logger.log(`Ação executada com sucesso: ${solicitacao.metodo_execucao}`);
      
      return {
        sucesso: true,
        dados: response.data,
        detalhes: {
          url_executada: dadosAcao.url,
          metodo: dadosAcao.method,
          status_resposta: response.status,
          solicitacao_codigo: solicitacao.codigo
        }
      };
    } catch (error) {
      this.logger.error(`Erro na execução da ação ${solicitacao.metodo_execucao}:`, error);
      return {
        sucesso: false,
        erro: error.message,
        detalhes: {
          solicitacao_codigo: solicitacao.codigo,
          metodo_execucao: solicitacao.metodo_execucao,
          erro_original: error
        }
      };
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
   * Executa uma requisição HTTP com base nos dados salvos na solicitação
   */
  private async executarRequisicaoHttp(dados: DadosExecucaoHttp, solicitacao: SolicitacaoAprovacao): Promise<any> {
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
      
      // Configurar requisição HTTP com dados originais
      const config = {
        method: dados.method.toLowerCase(),
        url: urlAbsoluta,
        params: dados.params,
        data: dados.body,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authorizationHeader,
          // Header para identificar que é uma execução de aprovação
          'X-Solicitacao-Aprovacao': solicitacao.codigo,
          'X-Aprovacao-Executada': 'true',
          // Headers originais da requisição
          ...dados.headers
        }
      };

      this.logger.debug(`Executando requisição HTTP: ${dados.method} ${urlAbsoluta}`);
      this.logger.debug(`Código da solicitação: ${solicitacao.codigo}`);
      
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
   * Valida se os dados da requisição são válidos para execução
   */
  private validarDadosRequisicao(dadosAcao: DadosExecucaoHttp): void {
    if (!dadosAcao.url) {
      throw new BadRequestException('URL é obrigatória nos dados da ação');
    }

    if (!dadosAcao.method) {
      throw new BadRequestException('Método HTTP é obrigatório nos dados da ação');
    }

    // Validar se o método HTTP é válido
    const metodosValidos = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    if (!metodosValidos.includes(dadosAcao.method.toUpperCase())) {
      throw new BadRequestException(`Método HTTP inválido: ${dadosAcao.method}`);
    }
  }
}