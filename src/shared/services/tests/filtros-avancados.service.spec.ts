import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { FiltrosAvancadosService } from '../../../common/services/filtros-avancados.service';
import { FiltrosAvancadosCacheService } from '../../../common/cache/filtros-avancados-cache.service';
import { PaginationParamsDto } from '../../dtos/pagination-params.dto';
import { Prioridade } from '../../../enums/prioridade.enum';
import { PeriodoPredefinido } from '../../../enums/periodo-predefinido.enum';

/**
 * Testes unitários para o FiltrosAvancadosService
 * 
 * Este arquivo contém testes que validam a funcionalidade do serviço
 * responsável por aplicar filtros avançados, paginação e cálculos de período
 */
describe('FiltrosAvancadosService', () => {
  let service: FiltrosAvancadosService;
  let dataSource: DataSource;
  let queryBuilder: SelectQueryBuilder<any>;

  beforeEach(async () => {
    // Mock do QueryBuilder
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getCount: jest.fn().mockResolvedValue(0),
      getMany: jest.fn().mockResolvedValue([]),
    } as any;

    // Mock do DataSource
    const mockDataSource = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    // Mock do FiltrosAvancadosCacheService
    const mockCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(true),
      clear: jest.fn().mockResolvedValue(undefined),
      cacheQueryResult: jest.fn().mockImplementation((entity, filtros, queryFn) => queryFn()),
      cacheCount: jest.fn().mockImplementation((entity, filtros, countFn) => countFn()),
      invalidateEntity: jest.fn().mockResolvedValue(undefined),
      getStats: jest.fn().mockReturnValue({ hits: 0, misses: 0, hitRatio: 0 }),
      getCacheInfo: jest.fn().mockReturnValue({ totalEntries: 0, totalMemory: 0 }),
      hashObject: jest.fn().mockReturnValue('mock-hash'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FiltrosAvancadosService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: FiltrosAvancadosCacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<FiltrosAvancadosService>(FiltrosAvancadosService);
    dataSource = module.get<DataSource>(DataSource);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('aplicarFiltrosData', () => {
    it('deve aplicar filtros de data corretamente', () => {
      const filtros = {
        created_at_inicio: new Date('2024-01-01'),
        created_at_fim: new Date('2024-12-31'),
        updated_at_inicio: new Date('2024-06-01'),
      };

      const mapeamento = {
        created_at: 'created_at',
        updated_at: 'updated_at',
      };

      service.aplicarFiltrosData(queryBuilder, 'entidade', filtros, mapeamento);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'entidade.created_at >= :created_at_inicio',
        { created_at_inicio: filtros.created_at_inicio },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'entidade.created_at <= :created_at_fim',
        { created_at_fim: filtros.created_at_fim },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'entidade.updated_at >= :updated_at_inicio',
        { updated_at_inicio: filtros.updated_at_inicio },
      );
    });

    it('não deve aplicar filtros quando as datas não estão definidas', () => {
      const filtros = {};
      const mapeamento = {
        created_at: 'created_at',
      };

      service.aplicarFiltrosData(queryBuilder, 'entidade', filtros, mapeamento);

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('aplicarPaginacao', () => {
    it('deve aplicar paginação corretamente', async () => {
      const mockItems = [{ id: 1 }, { id: 2 }];
      const mockTotal = 100;
      
      // Resetar mocks para este teste específico
      queryBuilder.getCount = jest.fn().mockResolvedValue(mockTotal);
      queryBuilder.getMany = jest.fn().mockResolvedValue(mockItems);
      queryBuilder.skip = jest.fn().mockReturnThis();
      queryBuilder.take = jest.fn().mockReturnThis();

      const filtros = { limit: 10, offset: 10 };
      const resultado = await service.aplicarPaginacao(queryBuilder, filtros);

      expect(queryBuilder.skip).toHaveBeenCalledWith(10);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(resultado).toEqual({
        items: mockItems,
        total: mockTotal,
      });
    });

    it('deve usar valores padrão quando page e limit não são fornecidos', async () => {
      const filtros = {};

      const mockItems = [{ id: 1 }];
      const mockTotal = 50;
      queryBuilder.getCount = jest.fn().mockResolvedValue(mockTotal);
      queryBuilder.getMany = jest.fn().mockResolvedValue(mockItems);

      const resultado = await service.aplicarPaginacao(queryBuilder, filtros);

      expect(queryBuilder.skip).toHaveBeenCalledWith(0); // offset 0 por padrão
      expect(queryBuilder.take).toHaveBeenCalledWith(1000); // limit 1000 por padrão
      expect(resultado).toEqual({
        items: mockItems,
        total: mockTotal,
      });
    });

    it('deve usar o limit fornecido quando especificado', async () => {
      const filtros = {
        limit: 50,
        offset: 0,
      };

      const mockItems = [{ id: 1 }];
      const mockTotal = 50;
      queryBuilder.getCount = jest.fn().mockResolvedValue(mockTotal);
      queryBuilder.getMany = jest.fn().mockResolvedValue(mockItems);

      const resultado = await service.aplicarPaginacao(queryBuilder, filtros);

      expect(queryBuilder.take).toHaveBeenCalledWith(50);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(resultado).toEqual({
        items: mockItems,
        total: mockTotal,
      });
    });
  });

  describe('normalizarFiltros', () => {
    it('deve normalizar filtros removendo propriedades de paginação', () => {
      const filtros = {
        page: 1,
        limit: 10,
        status: ['ativo'],
        data_inicio: '2024-01-01',
      };

      const resultado = service.normalizarFiltros(filtros);

      expect(resultado).toEqual({
        status: ['ativo'],
        data_inicio: '2024-01-01',
        limit: 10,
        offset: 0,
        incluir_arquivados: false,
      });
      expect(resultado).not.toHaveProperty('page');
    });

    it('deve retornar objeto com valores padrão quando não há filtros específicos', () => {
      const filtros: PaginationParamsDto = { 
        page: 1, 
        limit: 10,
        offset: 0 
      };

      const resultado = service.normalizarFiltros(filtros);

      expect(resultado).toEqual({
        limit: 10,
        offset: 0,
        incluir_arquivados: false,
      });
    });
});



  describe('aplicarFiltros', () => {
    it('deve aplicar filtros avançados corretamente', () => {
      const filtros = {
        unidades: ['uuid1', 'uuid2'],
        prioridade: Prioridade.ALTA,
        incluir_arquivados: false,
        limit: 10,
        offset: 0,
      };

      const configuracao = {
        campoUnidade: 'unidade_id',
        campoPrioridade: 'prioridade',
      };

      const resultado = service.aplicarFiltros(
        queryBuilder,
        filtros,
        'entidade',
        configuracao,
      );

      expect(resultado).toBe(queryBuilder);
      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('construirResultado', () => {
    it('deve construir resultado com metadados corretos', () => {
      const dados = [{ id: 1 }, { id: 2 }];
      const total = 10;
      const filtros = { limit: 5, offset: 0, page: 1 };
      const tempoExecucao = 150;

      const resultado = service.construirResultado(
        dados,
        total,
        filtros,
        tempoExecucao,
      );

      expect(resultado.items).toEqual(dados);
      expect(resultado.total).toBe(total);
      expect(resultado.meta.totalPages).toBe(2);
      expect(resultado.meta.hasNextPage).toBe(true);
      expect(resultado.meta.hasPreviousPage).toBe(false);
    });
  });





  describe('calcularPeriodo', () => {
    it('deve calcular período de 7 dias corretamente', () => {
      const resultado = service.calcularPeriodo(PeriodoPredefinido.ULTIMOS_7_DIAS);

      expect(resultado.dataInicio).toBeInstanceOf(Date);
      expect(resultado.dataFim).toBeInstanceOf(Date);
      expect(resultado.dataInicio).toBeInstanceOf(Date);
      expect(resultado.dataFim).toBeInstanceOf(Date);

      // Verificar se a diferença é aproximadamente 7 dias
      const diffDias = Math.ceil(
        (resultado.dataFim.getTime() - resultado.dataInicio.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      expect(diffDias).toBe(7);
    });

    it('deve calcular período de 30 dias corretamente', () => {
      const resultado = service.calcularPeriodo(PeriodoPredefinido.ULTIMOS_30_DIAS);

      const diffDias = Math.ceil(
        (resultado.dataFim.getTime() - resultado.dataInicio.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      expect(diffDias).toBe(30);
    });

    it('deve calcular período do mês atual corretamente', () => {
      const resultado = service.calcularPeriodo(PeriodoPredefinido.MES_ATUAL);
      const agora = new Date();
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

      expect(resultado.dataInicio.getDate()).toBe(inicioMes.getDate());
      expect(resultado.dataInicio.getMonth()).toBe(inicioMes.getMonth());
    });
  });

  describe('validarPeriodoPersonalizado', () => {
    it('deve validar período personalizado válido', () => {
      const dataInicio = '2024-01-01';
      const dataFim = '2024-01-31';

      const resultado = service.validarPeriodoPersonalizado(dataInicio, dataFim);

      expect(resultado.valido).toBe(true);
      expect(resultado.erro).toBeUndefined();
    });

    it('deve invalidar período com data fim anterior à data início', () => {
      const dataInicio = '2024-01-31';
      const dataFim = '2024-01-01';

      const resultado = service.validarPeriodoPersonalizado(dataInicio, dataFim);

      expect(resultado.valido).toBe(false);
      expect(resultado.erro).toBe('Data de início deve ser anterior ou igual à data de fim');
    });
  });

  describe('integração - métodos combinados', () => {
    it('deve aplicar múltiplos tipos de filtros em sequência', () => {
      const filtros = {
        unidades: ['uuid1'],
        prioridade: Prioridade.ALTA,
        created_at_inicio: new Date('2024-01-01'),
        page: 2,
        limit: 20,
      };

      // Aplicar filtros de data
      service.aplicarFiltrosData(queryBuilder, 'entidade', filtros, {
        created_at: 'created_at',
      });

      // Aplicar filtros avançados
      const configuracao = {
        campoUnidade: 'unidade_id',
        campoPrioridade: 'prioridade',
      };

      service.aplicarFiltros(queryBuilder, filtros, 'entidade', configuracao);

      // Verificar se os filtros foram aplicados
      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });

    it('deve normalizar filtros e construir resultado completo', () => {
      const filtros: PaginationParamsDto = { 
        limit: 10, 
        offset: 0, 
        page: 1 
      };
      const dados = [{ id: 1 }, { id: 2 }];
      const total = 5;

      const filtrosNormalizados = service.normalizarFiltros(filtros);
      const resultado = service.construirResultado(dados, total, filtrosNormalizados);

      expect(filtrosNormalizados).toBeDefined();
      expect(resultado.items).toEqual(dados);
      expect(resultado.total).toBe(total);
      expect(resultado.meta).toBeDefined();
    });
  });
});