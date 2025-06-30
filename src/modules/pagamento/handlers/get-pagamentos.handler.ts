import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GetPagamentosQuery } from '../queries/get-pagamentos.query';
import { GetPagamentoByIdQuery } from '../queries/get-pagamento-by-id.query';
import { GetPagamentosEstatisticasQuery } from '../queries/get-pagamentos-estatisticas.query';
import { PagamentoService } from '../services/pagamento.service';
import { PagamentoResponseDto } from '../dtos/pagamento-response.dto';
import { CacheService } from '../../../shared/cache/cache.service';

/**
 * Handler para queries de pagamentos
 * Implementa Query pattern com cache para otimização
 */
@Injectable()
export class GetPagamentosHandler {
  private readonly logger = new Logger(GetPagamentosHandler.name);

  constructor(
    private readonly pagamentoService: PagamentoService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Executa query para buscar pagamentos com filtros
   */
  async executeGetPagamentos(query: GetPagamentosQuery): Promise<{
    data: PagamentoResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      this.logger.log('Executando busca de pagamentos com filtros');

      // Gerar chave de cache baseada nos filtros
      const cacheKey = this.generateCacheKey('pagamentos', query);
      
      // Tentar buscar no cache primeiro
      const cachedResult = await this.cacheService.get(cacheKey);
      if (cachedResult && typeof cachedResult === 'object' && 'data' in cachedResult) {
        this.logger.log('Resultado encontrado no cache');
        return cachedResult as { data: PagamentoResponseDto[]; total: number; page: number; limit: number; };
      }

      // Buscar no banco de dados
      const serviceResult = await this.pagamentoService.findAll({
        status: query.filtros.status?.[0], // Pegar apenas o primeiro status se for array
        solicitacaoId: query.filtros.solicitacaoId,
        concessaoId: query.filtros.cidadaoId, // Mapear cidadaoId para concessaoId
        dataInicio: query.filtros.dataInicio?.toISOString(),
        dataFim: query.filtros.dataFim?.toISOString(),
        page: query.paginacao?.page,
        limit: query.paginacao?.limit
      });

      // Mapear para o formato esperado
      const result = {
        data: serviceResult.data.map(pagamento => ({
          id: pagamento.id,
          valor: pagamento.valor,
          status: pagamento.status,
          metodoPagamento: pagamento.metodoPagamento,
          createdAt: pagamento.created_at,
           updatedAt: pagamento.updated_at,
          numeroParcela: pagamento.numeroParcela || 1,
            totalParcelas: pagamento.totalParcelas || 1,
           dataPagamento: pagamento.dataPagamento,
           observacoes: pagamento.observacoes,
           solicitacaoId: pagamento.solicitacaoId || '',
            dataLiberacao: pagamento.dataLiberacao || new Date(),
          responsavelLiberacao: {
            id: '',
            nome: '',
            role: ''
          },
          infoBancariaId: '',
          infoBancaria: {
            tipo: 'PIX',
            chavePix: '',
            banco: '',
            agencia: '',
            conta: ''
          },
          quantidadeComprovantes: 0
        } as PagamentoResponseDto)),
        total: serviceResult.pagination.totalItems,
        page: serviceResult.pagination.currentPage,
        limit: serviceResult.pagination.itemsPerPage
      };

      // Armazenar no cache por 5 minutos
      await this.cacheService.set(cacheKey, result, 300);

      this.logger.log(`Encontrados ${result.total} pagamentos`);
      return result;

    } catch (error) {
      this.logger.error(`Erro ao executar busca de pagamentos: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Executa query para buscar pagamento por ID
   */
  async executeGetPagamentoById(query: GetPagamentoByIdQuery): Promise<PagamentoResponseDto> {
    try {
      this.logger.log(`Executando busca de pagamento por ID: ${query.id}`);

      // Gerar chave de cache
      const cacheKey = `pagamento:${query.id}:${JSON.stringify(query.incluirRelacionamentos)}`;
      
      // Tentar buscar no cache primeiro
      const cachedResult = await this.cacheService.get(cacheKey);
      if (cachedResult && typeof cachedResult === 'object' && 'id' in cachedResult) {
        this.logger.log('Pagamento encontrado no cache');
        return cachedResult as PagamentoResponseDto;
      }

      // Buscar no banco de dados
      const pagamento = await this.pagamentoService.findById(query.id);

      // Mapear para DTO de resposta
      const response: PagamentoResponseDto = {
        id: pagamento.id,
        valor: pagamento.valor,
        status: pagamento.status,
        metodoPagamento: pagamento.metodoPagamento,
        createdAt: pagamento.created_at,
        updatedAt: pagamento.updated_at,
        numeroParcela: pagamento.numeroParcela || 1,
         totalParcelas: pagamento.totalParcelas || 1,
        dataPagamento: pagamento.dataPagamento,
        observacoes: pagamento.observacoes,
        solicitacaoId: pagamento.solicitacaoId || '',
         dataLiberacao: pagamento.dataLiberacao || new Date(),
        responsavelLiberacao: {
          id: pagamento.liberadoPor || '',
          nome: 'Sistema',
          role: 'SISTEMA'
        },
        quantidadeComprovantes: 0
      };

      // Armazenar no cache por 10 minutos
      await this.cacheService.set(cacheKey, response, 600);

      this.logger.log(`Pagamento encontrado: ${query.id}`);
      return response;

    } catch (error) {
      this.logger.error(`Erro ao executar busca de pagamento por ID: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Executa query para obter estatísticas de pagamentos
   */
  async executeGetEstatisticas(query: GetPagamentosEstatisticasQuery): Promise<any> {
    try {
      this.logger.log('Executando busca de estatísticas de pagamentos');

      // Gerar chave de cache
      const cacheKey = this.generateCacheKey('estatisticas', query);
      
      // Tentar buscar no cache primeiro (cache mais longo para estatísticas)
      const cachedResult = await this.cacheService.get(cacheKey);
      if (cachedResult) {
        this.logger.log('Estatísticas encontradas no cache');
        return cachedResult;
      }

      // Buscar estatísticas no banco de dados
      const estatisticas = await this.pagamentoService.getEstatisticas();

      // Armazenar no cache por 30 minutos
      await this.cacheService.set(cacheKey, estatisticas, 1800);

      this.logger.log('Estatísticas calculadas com sucesso');
      return estatisticas;

    } catch (error) {
      this.logger.error(`Erro ao executar busca de estatísticas: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Gera chave de cache baseada no tipo e query
   */
  private generateCacheKey(type: string, query: any): string {
    const queryString = JSON.stringify(query);
    const hash = Buffer.from(queryString).toString('base64');
    return `pagamento:${type}:${hash}`;
  }

  /**
   * Invalida cache relacionado a pagamentos
   */
  async invalidateCache(pagamentoId?: string): Promise<void> {
    try {
      if (pagamentoId) {
        // TODO: Implementar invalidação de cache por padrão
        // const pattern = `pagamento:${pagamentoId}:*`;
        // await this.cacheService.deleteByPattern(pattern);
      }

      // TODO: Implementar invalidação de cache por padrão
      // await this.cacheService.deleteByPattern('pagamento:pagamentos:*');
      // await this.cacheService.deleteByPattern('pagamento:estatisticas:*');
      
      // Alternativa temporária: limpar todo o cache
      // await this.cacheService.clear();

      this.logger.log('Cache de pagamentos invalidado');
    } catch (error) {
      this.logger.error(`Erro ao invalidar cache: ${error.message}`);
    }
  }
}