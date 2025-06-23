import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PagamentoService } from './pagamento.service';
import { Pagamento } from '../../../entities/pagamento.entity';
import { SolicitacaoService } from '../../solicitacao/services/solicitacao.service';
import { BeneficioService } from '../../beneficio/services/beneficio.service';
import { Logger } from '@nestjs/common';
import { PeriodicidadeEnum } from '../../../enums/periodicidade.enum';

describe('PagamentoService - calcularDataProximaParcela', () => {
  let service: PagamentoService;
  let pagamentoRepository: Repository<Pagamento>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(async () => {
    // Mock do logger
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
      verbose: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagamentoService,
        {
          provide: getRepositoryToken(Pagamento),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: SolicitacaoService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: BeneficioService,
          useValue: {
            findConcessaoById: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<PagamentoService>(PagamentoService);
    pagamentoRepository = module.get<Repository<Pagamento>>(getRepositoryToken(Pagamento));
    
    // Injeta o logger mock no service
    (service as any).logger = mockLogger;
  });

  describe('Validações de entrada', () => {
    it('deve lançar erro para data de início inválida', () => {
      expect(() => {
        (service as any).calcularDataProximaParcela(null, 'mensal', 1);
      }).toThrow('Data de início deve ser uma data válida');

      expect(() => {
        (service as any).calcularDataProximaParcela(new Date('invalid'), 'mensal', 1);
      }).toThrow('Data de início deve ser uma data válida');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Data de início inválida fornecida para cálculo de parcela',
        expect.any(Object)
      );
    });

    it('deve lançar erro para número de parcela inválido', () => {
      const dataInicio = new Date('2024-01-15');

      expect(() => {
        (service as any).calcularDataProximaParcela(dataInicio, 'mensal', -1);
      }).toThrow('Número da parcela deve ser um número não negativo');

      expect(() => {
        (service as any).calcularDataProximaParcela(dataInicio, 'mensal', 'invalid' as any);
      }).toThrow('Número da parcela deve ser um número não negativo');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Número da parcela inválido',
        expect.any(Object)
      );
    });

    it('deve lançar erro para periodicidade inválida', () => {
      const dataInicio = new Date('2024-01-15');

      expect(() => {
        (service as any).calcularDataProximaParcela(dataInicio, null, 1);
      }).toThrow('Periodicidade deve ser uma string válida');

      expect(() => {
        (service as any).calcularDataProximaParcela(dataInicio, '', 1);
      }).toThrow('Periodicidade deve ser uma string válida');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Periodicidade inválida fornecida',
        expect.any(Object)
      );
    });
  });

  describe('Cálculos de periodicidade', () => {
    const dataInicio = new Date('2024-01-15');

    it('deve retornar data de início para benefício único', () => {
      const resultado = (service as any).calcularDataProximaParcela(
        dataInicio,
        PeriodicidadeEnum.UNICO,
        0
      );

      expect(resultado).toEqual(dataInicio);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Calculando data para benefício de parcela única',
        expect.any(Object)
      );
    });

    it('deve retornar data de início para primeira parcela (índice 0)', () => {
      const resultado = (service as any).calcularDataProximaParcela(
        dataInicio,
        PeriodicidadeEnum.MENSAL,
        0
      );

      expect(resultado).toEqual(dataInicio);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Retornando data de início para primeira parcela',
        expect.any(Object)
      );
    });

    it('deve calcular corretamente para periodicidade mensal', () => {
      const resultado = (service as any).calcularDataProximaParcela(
        dataInicio,
        PeriodicidadeEnum.MENSAL,
        2
      );

      expect(resultado.getFullYear()).toBe(2024);
      expect(resultado.getMonth()).toBe(2); // Março (0-indexed)
      expect(resultado.getDate()).toBe(15);
    });

    it('deve calcular corretamente para periodicidade bimestral', () => {
      const resultado = (service as any).calcularDataProximaParcela(
        dataInicio,
        PeriodicidadeEnum.BIMESTRAL,
        2
      );

      expect(resultado.getFullYear()).toBe(2024);
      expect(resultado.getMonth()).toBe(4); // Maio (0-indexed)
      expect(resultado.getDate()).toBe(15);
    });

    it('deve calcular corretamente para periodicidade trimestral', () => {
      const resultado = (service as any).calcularDataProximaParcela(
        dataInicio,
        PeriodicidadeEnum.TRIMESTRAL,
        2
      );

      expect(resultado.getFullYear()).toBe(2024);
      expect(resultado.getMonth()).toBe(6); // Julho (0-indexed)
      expect(resultado.getDate()).toBe(15);
    });

    it('deve calcular corretamente para periodicidade semestral', () => {
      const resultado = (service as any).calcularDataProximaParcela(
        dataInicio,
        PeriodicidadeEnum.SEMESTRAL,
        2
      );

      expect(resultado.getFullYear()).toBe(2025);
      expect(resultado.getMonth()).toBe(0); // Janeiro (0-indexed)
      expect(resultado.getDate()).toBe(15);
    });

    it('deve calcular corretamente para periodicidade anual', () => {
      const resultado = (service as any).calcularDataProximaParcela(
        dataInicio,
        PeriodicidadeEnum.ANUAL,
        2
      );

      expect(resultado.getFullYear()).toBe(2026);
      expect(resultado.getMonth()).toBe(0); // Janeiro (0-indexed)
      expect(resultado.getDate()).toBe(15);
    });

    it('deve usar padrão mensal para periodicidade não reconhecida', () => {
      const resultado = (service as any).calcularDataProximaParcela(
        dataInicio,
        'periodicidade_inexistente',
        1
      );

      expect(resultado.getFullYear()).toBe(2024);
      expect(resultado.getMonth()).toBe(1); // Fevereiro (0-indexed)
      expect(resultado.getDate()).toBe(15);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Periodicidade não reconhecida, usando padrão mensal',
        expect.any(Object)
      );
    });
  });

  describe('Tratamento de fins de mês', () => {
    it('deve ajustar data para último dia do mês quando necessário', () => {
      // 31 de janeiro -> 28 de fevereiro (ano não bissexto)
      const dataInicio = new Date('2023-01-31');
      const resultado = (service as any).calcularDataProximaParcela(
        dataInicio,
        PeriodicidadeEnum.MENSAL,
        1
      );

      expect(resultado.getFullYear()).toBe(2023);
      expect(resultado.getMonth()).toBe(1); // Fevereiro
      expect(resultado.getDate()).toBe(28); // Último dia de fevereiro

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Ajuste realizado para fim de mês',
        expect.objectContaining({
          diaOriginal: 31,
          diaAjustado: 28,
          ultimoDiaDoMes: 28
        })
      );
    });

    it('deve ajustar data para 29 de fevereiro em ano bissexto', () => {
      // 31 de janeiro -> 29 de fevereiro (ano bissexto)
      const dataInicio = new Date('2024-01-31');
      const resultado = (service as any).calcularDataProximaParcela(
        dataInicio,
        PeriodicidadeEnum.MENSAL,
        1
      );

      expect(resultado.getFullYear()).toBe(2024);
      expect(resultado.getMonth()).toBe(1); // Fevereiro
      expect(resultado.getDate()).toBe(29); // 29 de fevereiro (ano bissexto)
    });

    it('deve manter data original quando não há necessidade de ajuste', () => {
      // 15 de janeiro -> 15 de fevereiro (sem ajuste necessário)
      const dataInicio = new Date('2024-01-15');
      const resultado = (service as any).calcularDataProximaParcela(
        dataInicio,
        PeriodicidadeEnum.MENSAL,
        1
      );

      expect(resultado.getFullYear()).toBe(2024);
      expect(resultado.getMonth()).toBe(1); // Fevereiro
      expect(resultado.getDate()).toBe(15); // Mantém o dia original
    });

    it('deve ajustar para 30 de abril quando vem de 31 de março', () => {
      // 31 de março -> 30 de abril
      const dataInicio = new Date('2024-03-31');
      const resultado = (service as any).calcularDataProximaParcela(
        dataInicio,
        PeriodicidadeEnum.MENSAL,
        1
      );

      expect(resultado.getFullYear()).toBe(2024);
      expect(resultado.getMonth()).toBe(3); // Abril
      expect(resultado.getDate()).toBe(30); // Último dia de abril
    });
  });

  describe('Imutabilidade de parâmetros', () => {
    it('não deve modificar a data de início original', () => {
      const dataInicio = new Date('2024-01-15');
      const dataOriginal = new Date(dataInicio.getTime());

      (service as any).calcularDataProximaParcela(
        dataInicio,
        PeriodicidadeEnum.MENSAL,
        3
      );

      // Verifica se a data original não foi modificada
      expect(dataInicio.getTime()).toBe(dataOriginal.getTime());
    });
  });

  describe('Logging e auditoria', () => {
    it('deve logar sucesso no cálculo', () => {
      const dataInicio = new Date('2024-01-15');
      
      (service as any).calcularDataProximaParcela(
        dataInicio,
        PeriodicidadeEnum.MENSAL,
        1
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Data da próxima parcela calculada com sucesso',
        expect.objectContaining({
          dataInicio: dataInicio.toISOString(),
          periodicidade: PeriodicidadeEnum.MENSAL,
          numeroParcela: 1,
          dataCalculada: expect.any(String)
        })
      );
    });
  });

  describe('Casos extremos', () => {
    it('deve funcionar com datas muito futuras', () => {
      const dataInicio = new Date('2050-12-31');
      const resultado = (service as any).calcularDataProximaParcela(
        dataInicio,
        PeriodicidadeEnum.ANUAL,
        10
      );

      expect(resultado.getFullYear()).toBe(2060);
      expect(resultado.getMonth()).toBe(11); // Dezembro
      expect(resultado.getDate()).toBe(31);
    });

    it('deve funcionar com número alto de parcelas', () => {
      const dataInicio = new Date('2024-01-15');
      const resultado = (service as any).calcularDataProximaParcela(
        dataInicio,
        PeriodicidadeEnum.MENSAL,
        120 // 10 anos
      );

      expect(resultado.getFullYear()).toBe(2034);
      expect(resultado.getMonth()).toBe(0); // Janeiro
      expect(resultado.getDate()).toBe(15);
    });

    it('deve funcionar com periodicidade em maiúscula', () => {
      const dataInicio = new Date('2024-01-15');
      const resultado = (service as any).calcularDataProximaParcela(
        dataInicio,
        'MENSAL',
        1
      );

      expect(resultado.getFullYear()).toBe(2024);
      expect(resultado.getMonth()).toBe(1); // Fevereiro
      expect(resultado.getDate()).toBe(15);
    });
  });
});