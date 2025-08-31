import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { TextNormalizationInterceptor } from './text-normalization.interceptor';

describe('TextNormalizationInterceptor', () => {
  let interceptor: TextNormalizationInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TextNormalizationInterceptor],
    }).compile();

    interceptor = module.get<TextNormalizationInterceptor>(TextNormalizationInterceptor);

    // Mock do request
    mockRequest = {
      body: {},
    };

    // Mock do ExecutionContext
    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;

    // Mock do CallHandler
    mockCallHandler = {
      handle: () => of({}),
    };
  });

  it('deve ser definido', () => {
    expect(interceptor).toBeDefined();
  });

  describe('Critérios de Aceite', () => {
    it('deve normalizar "JOÃO DA SILVA" para "João da Silva"', () => {
      mockRequest.body = {
        nome: 'JOÃO DA SILVA',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.nome).toBe('João da Silva');
    });

    it('deve normalizar "joão da silva" para "João da Silva"', () => {
      mockRequest.body = {
        nome: 'joão da silva',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.nome).toBe('João da Silva');
    });

    it('deve manter "João da Silva" como "João da Silva"', () => {
      mockRequest.body = {
        nome: 'João da Silva',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.nome).toBe('João da Silva');
    });

    it('deve normalizar "joão" para "João"', () => {
      mockRequest.body = {
        nome: 'joão',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.nome).toBe('João');
    });

    it('deve normalizar campo sobrenome', () => {
      mockRequest.body = {
        sobrenome: 'DA SILVA SANTOS',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.sobrenome).toBe('da Silva Santos');
    });

    it('não deve alterar campos que não estão na whitelist', () => {
      const originalValue = 'VALOR_ENUM_MAIUSCULO';
      mockRequest.body = {
        status: originalValue,
        tipo: 'OUTRO_CAMPO',
        descricao: 'DESCRIÇÃO QUALQUER',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.status).toBe(originalValue);
      expect(mockRequest.body.tipo).toBe('OUTRO_CAMPO');
      expect(mockRequest.body.descricao).toBe('DESCRIÇÃO QUALQUER');
    });
  });

  describe('Casos de Teste Adicionais', () => {
    it('deve normalizar todos os artigos definidos corretamente', () => {
      mockRequest.body = {
        nome: 'MARIA DO CARMO DE SOUZA DOS SANTOS DAS NEVES',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.nome).toBe('Maria do Carmo de Souza dos Santos das Neves');
    });

    it('deve lidar com espaços extras', () => {
      mockRequest.body = {
        nome: '  JOÃO   DA   SILVA  ',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.nome).toBe('João da Silva');
    });

    it('deve processar objetos aninhados', () => {
      mockRequest.body = {
        usuario: {
          nome: 'PEDRO DOS SANTOS',
          sobrenome: 'DA COSTA',
        },
        outroObjeto: {
          nome: 'ANA DE OLIVEIRA',
        },
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.usuario.nome).toBe('Pedro dos Santos');
      expect(mockRequest.body.usuario.sobrenome).toBe('da Costa');
      expect(mockRequest.body.outroObjeto.nome).toBe('Ana de Oliveira');
    });

    it('deve ignorar valores null e undefined', () => {
      mockRequest.body = {
        nome: null,
        sobrenome: undefined,
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.nome).toBeNull();
      expect(mockRequest.body.sobrenome).toBeUndefined();
    });

    it('deve ignorar strings vazias', () => {
      mockRequest.body = {
        nome: '',
        sobrenome: '   ',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.nome).toBe('');
      expect(mockRequest.body.sobrenome).toBe('   ');
    });

    it('deve ignorar valores que não são strings', () => {
      mockRequest.body = {
        nome: 123,
        sobrenome: true,
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.nome).toBe(123);
      expect(mockRequest.body.sobrenome).toBe(true);
    });

    it('deve processar arrays com objetos', () => {
      mockRequest.body = {
        usuarios: [
          { nome: 'CARLOS DA SILVA' },
          { nome: 'MARIA DOS SANTOS' },
        ],
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.usuarios[0].nome).toBe('Carlos da Silva');
      expect(mockRequest.body.usuarios[1].nome).toBe('Maria dos Santos');
    });

    it('não deve processar quando não há body', () => {
      mockRequest.body = null;

      expect(() => {
        interceptor.intercept(mockExecutionContext, mockCallHandler);
      }).not.toThrow();
    });

    it('não deve processar quando body não é objeto', () => {
      mockRequest.body = 'string';

      expect(() => {
        interceptor.intercept(mockExecutionContext, mockCallHandler);
      }).not.toThrow();
    });
  });

  describe('Casos Especiais de Artigos', () => {
    it('deve tratar artigos no início do nome', () => {
      mockRequest.body = {
        nome: 'DE SOUZA JOÃO',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.nome).toBe('de Souza João');
    });

    it('deve tratar artigos no final do nome', () => {
      mockRequest.body = {
        nome: 'JOÃO SILVA DE',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.nome).toBe('João Silva de');
    });

    it('deve tratar múltiplos artigos consecutivos', () => {
      mockRequest.body = {
        nome: 'JOÃO DE DA SILVA',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.nome).toBe('João de da Silva');
    });
  });

  describe('Performance e Edge Cases', () => {
    it('deve lidar com nomes muito longos', () => {
      const nomeLongo = 'JOÃO '.repeat(50) + 'DA SILVA';
      mockRequest.body = {
        nome: nomeLongo,
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.nome).toContain('João');
      expect(mockRequest.body.nome).toContain('da Silva');
    });

    it('deve lidar com caracteres especiais', () => {
      mockRequest.body = {
        nome: 'JOSÉ-MARIA DA SILVA',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.nome).toBe('José-maria da Silva');
    });

    it('deve lidar com acentos', () => {
      mockRequest.body = {
        nome: 'JOSÉ DA CONCEIÇÃO',
      };

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.nome).toBe('José da Conceição');
    });
  });
});