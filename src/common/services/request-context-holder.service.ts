import { AsyncLocalStorage } from 'async_hooks';
import { Injectable } from '@nestjs/common';
import { IScopeContext } from '../interfaces/scope-context.interface';
import { InvalidScopeContextException } from '../exceptions/scope.exceptions';

/**
 * Serviço responsável por gerenciar o contexto de escopo da requisição
 * 
 * @description
 * Utiliza AsyncLocalStorage para manter o contexto de escopo isolado
 * por requisição, garantindo thread-safety em aplicações assíncronas
 */
@Injectable()
export class RequestContextHolder {
  private static asyncLocalStorage = new AsyncLocalStorage<IScopeContext>();

  /**
   * Define o contexto de escopo para a requisição atual
   * 
   * @param context - Contexto de escopo a ser definido
   */
  static set(context: IScopeContext): void {
    this.asyncLocalStorage.enterWith(context);
  }

  /**
   * Obtém o contexto de escopo da requisição atual
   * 
   * @returns Contexto de escopo ou undefined se não estiver definido
   */
  static get(): IScopeContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Obtém o contexto de escopo da requisição atual ou lança exceção
   * 
   * @returns Contexto de escopo
   * @throws InvalidScopeContextException se o contexto não estiver definido
   */
  static getRequired(): IScopeContext {
    const context = this.get();
    if (!context) {
      throw new InvalidScopeContextException(
        'Contexto de escopo não encontrado. Verifique se o middleware está configurado.'
      );
    }
    return context;
  }

  /**
   * Executa uma função com um contexto específico
   * 
   * @param context - Contexto a ser usado durante a execução
   * @param fn - Função a ser executada
   * @returns Resultado da função
   */
  static run<T>(context: IScopeContext, fn: () => T): T {
    return this.asyncLocalStorage.run(context, fn);
  }

  /**
   * Executa uma função assíncrona com um contexto específico
   * 
   * @param context - Contexto a ser usado durante a execução
   * @param fn - Função assíncrona a ser executada
   * @returns Promise com o resultado da função
   */
  static async runAsync<T>(context: IScopeContext, fn: () => Promise<T>): Promise<T> {
    return this.asyncLocalStorage.run(context, fn);
  }

  /**
   * Limpa o contexto atual
   * 
   * @description
   * Útil para testes ou situações onde é necessário limpar o estado
   */
  static clear(): void {
    this.asyncLocalStorage.disable();
  }

  /**
   * Verifica se há um contexto ativo
   * 
   * @returns true se há contexto ativo, false caso contrário
   */
  static hasContext(): boolean {
    return !!this.get();
  }
}