import { RequestContextHolder } from '../services/request-context-holder.service';
import { ScopeType } from '../../enums/scope-type.enum';

describe('RequestContextHolder', () => {
  beforeEach(() => {
    // Limpar contexto antes de cada teste
    RequestContextHolder.clear();
  });

  afterEach(() => {
    // Limpar contexto após cada teste
    RequestContextHolder.clear();
  });

  describe('set e get', () => {
    it('deve definir e recuperar contexto corretamente', () => {
      const context = {
        tipo: ScopeType.UNIDADE,
        user_id: 'user-123',
        unidade_id: 'unidade-456'
      };

      RequestContextHolder.set(context);
      const retrievedContext = RequestContextHolder.get();

      expect(retrievedContext).toEqual(context);
    });

    it('deve retornar undefined quando não há contexto', () => {
      const context = RequestContextHolder.get();
      expect(context).toBeUndefined();
    });
  });

  describe('getRequired', () => {
    it('deve retornar contexto quando existe', () => {
      const context = {
        tipo: ScopeType.PROPRIO,
        user_id: 'user-789',
        unidade_id: 'unidade-101'
      };

      RequestContextHolder.set(context);
      const retrievedContext = RequestContextHolder.getRequired();

      expect(retrievedContext).toEqual(context);
    });

    it('deve lançar erro quando não há contexto', () => {
      expect(() => {
        RequestContextHolder.getRequired();
      }).toThrow('Contexto de escopo não encontrado. Verifique se o middleware está configurado.');
    });
  });

  describe('hasContext', () => {
    it('deve retornar true quando há contexto', () => {
      RequestContextHolder.set({
        tipo: ScopeType.GLOBAL,
        user_id: 'user-456',
        unidade_id: 'unidade-789'
      });

      expect(RequestContextHolder.hasContext()).toBe(true);
    });

    it('deve retornar false quando não há contexto', () => {
      expect(RequestContextHolder.hasContext()).toBe(false);
    });
  });

  describe('run', () => {
    it('deve executar função com contexto isolado', () => {
      const context1 = {
        tipo: ScopeType.UNIDADE,
        user_id: 'user-1',
        unidade_id: 'unidade-1'
      };

      const context2 = {
        tipo: ScopeType.PROPRIO,
        user_id: 'user-2',
        unidade_id: 'unidade-2'
      };

      RequestContextHolder.set(context1);

      const result = RequestContextHolder.run(context2, () => {
        const currentContext = RequestContextHolder.get();
        expect(currentContext).toEqual(context2);
        return 'test-result';
      });

      expect(result).toBe('test-result');
      expect(RequestContextHolder.get()).toEqual(context1);
    });

    it('deve restaurar contexto anterior após execução', () => {
      const originalContext = {
        tipo: ScopeType.GLOBAL,
        user_id: 'original-user',
        unidade_id: 'original-unidade'
      };

      const tempContext = {
        tipo: ScopeType.UNIDADE,
        user_id: 'temp-user',
        unidade_id: 'temp-unidade'
      };

      RequestContextHolder.set(originalContext);

      RequestContextHolder.run(tempContext, () => {
        // Contexto temporário deve estar ativo
        expect(RequestContextHolder.get()).toEqual(tempContext);
      });

      // Contexto original deve ser restaurado
      expect(RequestContextHolder.get()).toEqual(originalContext);
    });
  });

  describe('runAsync', () => {
    it('deve executar função assíncrona com contexto isolado', async () => {
      const context = {
        tipo: ScopeType.PROPRIO,
        user_id: 'async-user',
        unidade_id: 'async-unidade'
      };

      const result = await RequestContextHolder.runAsync(context, async () => {
        const currentContext = RequestContextHolder.get();
        expect(currentContext).toEqual(context);
        
        // Simular operação assíncrona
        await new Promise(resolve => setTimeout(resolve, 10));
        
        return 'async-result';
      });

      expect(result).toBe('async-result');
    });

    it('deve manter contexto durante operações assíncronas', async () => {
      const context = {
        tipo: ScopeType.UNIDADE,
        user_id: 'async-user-2',
        unidade_id: 'async-unidade-2'
      };

      await RequestContextHolder.runAsync(context, async () => {
        // Verificar contexto antes da operação assíncrona
        expect(RequestContextHolder.get()).toEqual(context);
        
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Verificar contexto após a operação assíncrona
        expect(RequestContextHolder.get()).toEqual(context);
      });
    });
  });

  describe('clear', () => {
    it('deve limpar contexto existente', () => {
      RequestContextHolder.set({
        tipo: ScopeType.GLOBAL,
        user_id: 'user-clear',
        unidade_id: 'unidade-clear'
      });

      expect(RequestContextHolder.hasContext()).toBe(true);
      
      RequestContextHolder.clear();
      
      expect(RequestContextHolder.hasContext()).toBe(false);
      expect(RequestContextHolder.get()).toBeUndefined();
    });

    it('deve ser seguro chamar clear quando não há contexto', () => {
      expect(() => {
        RequestContextHolder.clear();
      }).not.toThrow();
    });
  });

  describe('isolamento de contexto', () => {
    it('deve manter contextos isolados entre execuções paralelas', async () => {
      const context1 = {
        tipo: ScopeType.UNIDADE,
        user_id: 'parallel-user-1',
        unidade_id: 'parallel-unidade-1'
      };

      const context2 = {
        tipo: ScopeType.PROPRIO,
        user_id: 'parallel-user-2',
        unidade_id: 'parallel-unidade-2'
      };

      const promises = [
        RequestContextHolder.runAsync(context1, async () => {
          await new Promise(resolve => setTimeout(resolve, 20));
          return RequestContextHolder.get();
        }),
        RequestContextHolder.runAsync(context2, async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return RequestContextHolder.get();
        })
      ];

      const results = await Promise.all(promises);

      expect(results[0]).toEqual(context1);
      expect(results[1]).toEqual(context2);
    });
  });
});