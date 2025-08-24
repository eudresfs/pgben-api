import { Injectable, Logger } from '@nestjs/common';
import { RequestContextHolder } from './request-context-holder.service';
import { IScopeContext } from '../interfaces/scope-context.interface';
import { ScopeType } from '../../enums/scope-type.enum';
import { SYSTEM_CONTEXT } from '../../shared/constants/system.constants';

/**
 * Serviço para injeção automática de contexto de escopo para operações do sistema
 * 
 * @description
 * Este serviço fornece métodos para executar operações do sistema com contexto
 * de escopo apropriado, evitando erros de contexto obrigatório ausente.
 */
@Injectable()
export class SystemContextService {
  private readonly logger = new Logger(SystemContextService.name);

  /**
   * Executa uma função com contexto de sistema global
   * 
   * @param fn Função a ser executada
   * @returns Resultado da função
   */
  async runWithSystemContext<T>(fn: () => Promise<T>): Promise<T> {
    // Verifica se já existe contexto
    const existingContext = RequestContextHolder.get();
    
    if (existingContext) {
      // Se já existe contexto, executa diretamente
      this.logger.debug('Contexto existente encontrado, executando diretamente');
      return fn();
    }

    // Cria contexto de sistema global
    const systemContext: IScopeContext = {
      tipo: ScopeType.GLOBAL,
      user_id: SYSTEM_CONTEXT.USER_ID,
      unidade_id: null,
    };

    this.logger.debug('Executando operação com contexto de sistema', {
      context: systemContext,
      timestamp: new Date().toISOString(),
    });

    // Executa a função com o contexto de sistema
    return RequestContextHolder.runAsync(systemContext, fn);
  }

  /**
   * Executa uma função síncrona com contexto de sistema global
   * 
   * @param fn Função síncrona a ser executada
   * @returns Resultado da função
   */
  runWithSystemContextSync<T>(fn: () => T): T {
    // Verifica se já existe contexto
    const existingContext = RequestContextHolder.get();
    
    if (existingContext) {
      // Se já existe contexto, executa diretamente
      this.logger.debug('Contexto existente encontrado, executando diretamente');
      return fn();
    }

    // Cria contexto de sistema global
    const systemContext: IScopeContext = {
      tipo: ScopeType.GLOBAL,
      user_id: SYSTEM_CONTEXT.USER_ID,
      unidade_id: null,
    };

    this.logger.debug('Executando operação síncrona com contexto de sistema', {
      context: systemContext,
      timestamp: new Date().toISOString(),
    });

    // Executa a função com o contexto de sistema
    return RequestContextHolder.run(systemContext, fn);
  }

  /**
   * Define temporariamente um contexto de sistema se não existir
   * 
   * @description
   * Útil para operações que podem ser executadas tanto em contexto de usuário
   * quanto em contexto de sistema (como listeners de eventos)
   */
  ensureSystemContext(): void {
    const existingContext = RequestContextHolder.get();
    
    if (!existingContext) {
      const systemContext: IScopeContext = {
        tipo: ScopeType.GLOBAL,
        user_id: SYSTEM_CONTEXT.USER_ID,
        unidade_id: null,
      };

      RequestContextHolder.set(systemContext);
      
      this.logger.debug('Contexto de sistema definido', {
        context: systemContext,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Verifica se o contexto atual é de sistema
   * 
   * @returns true se o contexto atual é de sistema
   */
  isSystemContext(): boolean {
    const context = RequestContextHolder.get();
    return context?.user_id === SYSTEM_CONTEXT.USER_ID;
  }

  /**
   * Obtém o contexto atual ou cria um contexto de sistema
   * 
   * @returns Contexto de escopo atual ou de sistema
   */
  getOrCreateSystemContext(): IScopeContext {
    const existingContext = RequestContextHolder.get();
    
    if (existingContext) {
      return existingContext;
    }

    return {
      tipo: ScopeType.GLOBAL,
      user_id: SYSTEM_CONTEXT.USER_ID,
      unidade_id: null,
    };
  }
}