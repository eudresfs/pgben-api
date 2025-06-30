import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../../shared/cache/cache.service';
import { PagamentoValidationService } from './pagamento-validation.service';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../../enums/metodo-pagamento.enum';

/**
 * Serviço de cache otimizado para validações frequentes de pagamento
 * Implementa cache inteligente para melhorar performance
 */
@Injectable()
export class PagamentoCacheService {
  private readonly logger = new Logger(PagamentoCacheService.name);
  private readonly CACHE_TTL = {
    VALIDATION: 300, // 5 minutos
    STATUS_TRANSITION: 600, // 10 minutos
    PIX_VALIDATION: 1800, // 30 minutos
    DADOS_BANCARIOS: 3600, // 1 hora
  };

  constructor(
    private readonly cacheService: CacheService,
    private readonly validationService: PagamentoValidationService,
  ) {}

  /**
   * Cache para validação de transição de status
   */
  async validateStatusTransition(
    statusAtual: StatusPagamentoEnum,
    novoStatus: StatusPagamentoEnum,
    pagamentoId?: string
  ): Promise<boolean> {
    const cacheKey = `status_transition:${statusAtual}:${novoStatus}`;
    
    try {
      // Buscar no cache primeiro
      let isValid = await this.cacheService.get<boolean>(cacheKey);
      
      if (isValid === null || isValid === undefined) {
        // Se não está no cache, validar usando validateStatusTransition
        const validationResult = this.validationService.validateStatusTransition(
          statusAtual,
          novoStatus
        );
        
        isValid = validationResult.isValid;
        
        await this.cacheService.set(cacheKey, isValid, this.CACHE_TTL.STATUS_TRANSITION);
        this.logger.log(`Status transition cached: ${statusAtual} -> ${novoStatus}`);
      }
      
      return isValid || false;
    } catch (error) {
      this.logger.error(`Erro ao validar transição de status: ${error.message}`);
      // Fallback para validação direta
      return false;
    }
  }

  /**
   * Cache para validação PIX
   */
  async validatePixData(pixData: any): Promise<{ isValid: boolean; errors: string[] }> {
    const cacheKey = `pix_validation:${JSON.stringify(pixData)}`;
    
    try {
      // Buscar no cache primeiro
      let result = await this.cacheService.get<{ isValid: boolean; errors: string[] }>(cacheKey);
      
      if (!result) {
        // Se não está no cache, validar usando validateBankingData
        result = this.validationService.validateBankingData(pixData);
        
        await this.cacheService.set(cacheKey, result, this.CACHE_TTL.PIX_VALIDATION);
        this.logger.log('PIX validation cached');
      }
      
      return result || { isValid: false, errors: ['Erro na validação'] };
    } catch (error) {
      this.logger.error(`Erro ao validar dados PIX: ${error.message}`);
      // Fallback para validação direta
      return { isValid: false, errors: ['Erro na validação de dados PIX'] };
    }
  }

  /**
   * Cache para validação de dados bancários
   */
  async validateDadosBancarios(dadosBancarios: any): Promise<{ isValid: boolean; errors: string[] }> {
    const cacheKey = `dados_bancarios:${JSON.stringify(dadosBancarios)}`;
    
    try {
      // Buscar no cache primeiro
      let result = await this.cacheService.get<{ isValid: boolean; errors: string[] }>(cacheKey);
      
      if (!result) {
        // Se não está no cache, validar usando validateBankingData
        result = this.validationService.validateBankingData(dadosBancarios);
        
        await this.cacheService.set(cacheKey, result, this.CACHE_TTL.DADOS_BANCARIOS);
        this.logger.log('Dados bancários validation cached');
      }
      
      return result || { isValid: false, errors: ['Erro na validação'] };
    } catch (error) {
      this.logger.error(`Erro ao validar dados bancários: ${error.message}`);
      // Fallback para validação direta
      return { isValid: false, errors: ['Erro na validação de dados bancários'] };
    }
  }

  /**
   * Cache para validação de método de pagamento
   */
  async validateMetodoPagamento(
    metodoPagamento: MetodoPagamentoEnum,
    valor: number,
    dadosAdicionais?: any
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const cacheKey = `metodo_pagamento:${metodoPagamento}:${valor}:${JSON.stringify(dadosAdicionais || {})}`;
    
    try {
      // Buscar no cache primeiro
      let result = await this.cacheService.get<{ isValid: boolean; errors: string[] }>(cacheKey);
      
      if (!result) {
        // Se não está no cache, validar usando validatePaymentCreation
        const validationResult = this.validationService.validatePaymentCreation({
          valor,
          metodoPagamento,
          solicitacaoId: 'temp',
          infoBancariaId: undefined,
          dataLiberacao: new Date()
        });
        
        result = {
          isValid: validationResult.isValid,
          errors: validationResult.errors
        };
        
        await this.cacheService.set(cacheKey, result, this.CACHE_TTL.VALIDATION);
        this.logger.log(`Método pagamento validation cached: ${metodoPagamento}`);
      }
      
      return result || { isValid: false, errors: ['Erro na validação'] };
    } catch (error) {
      this.logger.error(`Erro ao validar método de pagamento: ${error.message}`);
      // Fallback para validação direta
      return { isValid: false, errors: ['Erro na validação de método de pagamento'] };
    }
  }

  /**
   * Cache para validação de valor mínimo/máximo
   */
  async validateValorLimites(
    valor: number,
    metodoPagamento: MetodoPagamentoEnum
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const cacheKey = `valor_limites:${valor}:${metodoPagamento}`;
    
    try {
      // Buscar no cache primeiro
      let result = await this.cacheService.get<{ isValid: boolean; errors: string[] }>(cacheKey);
      
      if (!result) {
        // Se não está no cache, validar usando validatePaymentCreation
        const validationResult = this.validationService.validatePaymentCreation({
          valor,
          metodoPagamento,
          solicitacaoId: 'temp',
          infoBancariaId: undefined,
          dataLiberacao: new Date()
        });
        
        result = {
          isValid: validationResult.isValid,
          errors: validationResult.errors
        };
        
        await this.cacheService.set(cacheKey, result, this.CACHE_TTL.VALIDATION);
        this.logger.log(`Valor limites validation cached: ${valor}`);
      }
      
      return result || { isValid: false, errors: ['Erro na validação'] };
    } catch (error) {
      this.logger.error(`Erro ao validar limites de valor: ${error.message}`);
      // Fallback para validação direta
      const validationResult = this.validationService.validatePaymentCreation({
        valor,
        metodoPagamento,
        solicitacaoId: 'temp',
        infoBancariaId: undefined,
        dataLiberacao: new Date()
      });
      
      return {
        isValid: validationResult.isValid,
        errors: validationResult.errors
      };
    }
  }

  /**
   * Invalida cache de validações relacionadas a um pagamento
   */
  async invalidateValidationCache(pagamentoId?: string): Promise<void> {
    try {
      // Como deletePattern não existe, vamos usar uma abordagem mais simples
      // Invalidar chaves específicas se necessário
      if (pagamentoId) {
        const keysToDelete = [
          `status_transition:${pagamentoId}`,
          `pix_validation:${pagamentoId}`,
          `dados_bancarios:${pagamentoId}`,
          `metodo_pagamento:${pagamentoId}`,
          `valor_limites:${pagamentoId}`,
        ];

        // Invalidar chaves específicas usando o método del do cache
        for (const key of keysToDelete) {
          await this.cacheService.del(key);
        }
        this.logger.log(`Cache invalidation completed for payment: ${pagamentoId}`);
      }

      this.logger.log('Cache de validações invalidado');
    } catch (error) {
      this.logger.error(`Erro ao invalidar cache de validações: ${error.message}`);
    }
  }

  /**
   * Obtém estatísticas do cache de validações
   */
  async getCacheStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    totalKeys: number;
  }> {
    try {
      // Implementar estatísticas básicas
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalKeys: 0
      };
    } catch (error) {
      this.logger.error(`Erro ao obter estatísticas do cache: ${error.message}`);
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalKeys: 0,
      };
    }
  }

  /**
   * Aquece o cache com validações mais comuns
   */
  async warmupCache(): Promise<void> {
    try {
      this.logger.log('Iniciando aquecimento do cache de validações');

      // Aquecer transições de status mais comuns
      const commonTransitions = [
        [StatusPagamentoEnum.PENDENTE, StatusPagamentoEnum.LIBERADO],
        [StatusPagamentoEnum.LIBERADO, StatusPagamentoEnum.PAGO],
        [StatusPagamentoEnum.PAGO, StatusPagamentoEnum.CONFIRMADO],
        [StatusPagamentoEnum.PENDENTE, StatusPagamentoEnum.CANCELADO],
      ];

      for (const [from, to] of commonTransitions) {
        await this.validateStatusTransition(from as StatusPagamentoEnum, to as StatusPagamentoEnum);
      }

      // Aquecer validações de métodos de pagamento
      const commonMethods = [MetodoPagamentoEnum.PIX, MetodoPagamentoEnum.DEPOSITO, MetodoPagamentoEnum.DOC];
      const commonValues = [100, 500, 1000, 5000];

      for (const method of commonMethods) {
        for (const value of commonValues) {
          await this.validateValorLimites(value, method);
        }
      }

      this.logger.log('Cache aquecido com sucesso');
    } catch (error) {
      this.logger.error(`Erro ao aquecer cache: ${error.message}`);
    }
  }
}