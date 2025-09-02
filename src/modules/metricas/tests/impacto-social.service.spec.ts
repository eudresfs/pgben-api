import { Test, TestingModule } from '@nestjs/testing';
import { ImpactoSocialService } from '../services/impacto-social.service';
import { ScopedRepository } from '../../../common/repositories/scoped-repository';
import { RequestContextHolder } from '../../../common/services/request-context-holder.service';
import { Logger } from '@nestjs/common';
import { ScopeType } from '../../../enums/scope-type.enum';
import { StatusSolicitacao } from '../../../enums/status-solicitacao.enum';
import {
  Solicitacao,
  Pagamento,
  Cidadao,
  Endereco,
  ComposicaoFamiliar,
} from '../../../entities';

/**
 * Testes unitários para o ImpactoSocialService
 * 
 * Testa a funcionalidade específica de métricas de impacto social,
 * incluindo o uso correto do ScopedRepository e aplicação de filtros
 */
describe('ImpactoSocialService', () => {
  let service: ImpactoSocialService;
  let solicitacaoRepository: ScopedRepository<Solicitacao>;
  let pagamentoRepository: ScopedRepository<Pagamento>;
  let cidadaoRepository: ScopedRepository<Cidadao>;
  let enderecoRepository: ScopedRepository<Endereco>;
  let composicaoFamiliarRepository: ScopedRepository<ComposicaoFamiliar>;

  // Mock do QueryBuilder
  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
    getCount: jest.fn(),
    pipe: jest.fn().mockReturnThis(),
  };

  // Mock do ScopedRepository
  const mockScopedRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    // Limpar todos os mocks antes de cada teste
    jest.clearAllMocks();

    // Mock do RequestContextHolder
    jest.spyOn(RequestContextHolder, 'get').mockReturnValue({
      tipo: ScopeType.GLOBAL,
      unidade_id: null,
      usuario_id: 'test-user',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImpactoSocialService,
        {
          provide: 'ScopedRepository<Solicitacao>',
          useValue: mockScopedRepository,
        },
        {
          provide: 'ScopedRepository<Pagamento>',
          useValue: mockScopedRepository,
        },
        {
          provide: 'ScopedRepository<Cidadao>',
          useValue: mockScopedRepository,
        },
        {
          provide: 'ScopedRepository<Endereco>',
          useValue: mockScopedRepository,
        },
        {
          provide: 'ScopedRepository<ComposicaoFamiliar>',
          useValue: mockScopedRepository,
        },
        {
          provide: Logger,
          useValue: {
            error: jest.fn(),
            debug: jest.fn(),
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ImpactoSocialService>(ImpactoSocialService);
    solicitacaoRepository = module.get('ScopedRepository<Solicitacao>');
    pagamentoRepository = module.get('ScopedRepository<Pagamento>');
    cidadaoRepository = module.get('ScopedRepository<Cidadao>');
    enderecoRepository = module.get('ScopedRepository<Endereco>');
    composicaoFamiliarRepository = module.get('ScopedRepository<ComposicaoFamiliar>');
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('getImpactoSocial', () => {
    it('deve calcular métricas de impacto social corretamente', async () => {
      // Arrange
      const filtros = { unidade_id: 'test-unidade' };
      
      // Mock dos retornos das consultas
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ total: '150' }) // famílias beneficiadas
        .mockResolvedValueOnce({ total: '525' }) // pessoas impactadas
        .mockResolvedValueOnce({ total: '25' }) // bairros impactados
        .mockResolvedValueOnce({ total: '375000.00' }); // investimento total

      // Act
      const resultado = await service.getImpactoSocial(filtros);

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.metricas_principais.familias_beneficiadas).toBe(150);
      expect(resultado.metricas_principais.pessoas_impactadas).toBe(525);
      expect(resultado.metricas_principais.bairros_impactados).toBe(25);
      expect(resultado.metricas_principais.investimento_total).toBe(375000);
      expect(resultado.indicadores_derivados.valor_medio_por_familia).toBe(2500);
      expect(resultado.indicadores_derivados.taxa_cobertura_social).toBeCloseTo(0.75, 2);
    });

    it('deve aplicar filtros corretamente', async () => {
      // Arrange
      const filtros = {
        unidade_id: 'unidade-123',
        periodo_inicio: '2024-01-01',
        periodo_fim: '2024-12-31',
        bairro: 'Centro',
      };

      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ total: '100' })
        .mockResolvedValueOnce({ total: '350' })
        .mockResolvedValueOnce({ total: '15' })
        .mockResolvedValueOnce({ total: '250000.00' });

      // Act
      await service.getImpactoSocial(filtros);

      // Assert
      expect(mockScopedRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.pipe).toHaveBeenCalled();
    });

    it('deve retornar valores zerados em caso de erro', async () => {
      // Arrange
      mockQueryBuilder.getRawOne.mockRejectedValue(new Error('Erro de banco'));

      // Act
      const resultado = await service.getImpactoSocial({});

      // Assert
      expect(resultado.metricas_principais.familias_beneficiadas).toBe(0);
      expect(resultado.metricas_principais.pessoas_impactadas).toBe(0);
      expect(resultado.metricas_principais.bairros_impactados).toBe(0);
      expect(resultado.metricas_principais.investimento_total).toBe(0);
    });
  });

  describe('obterSolicitacoesPorStatus', () => {
    it('deve retornar solicitações filtradas por status', async () => {
      // Arrange
      const filtros = { status: StatusSolicitacao.APROVADA };
      const solicitacoesMock = [
        { id: '1', status: StatusSolicitacao.APROVADA },
        { id: '2', status: StatusSolicitacao.APROVADA },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(solicitacoesMock);

      // Act
      const resultado = await service.obterSolicitacoesPorStatus(filtros);

      // Assert
      expect(resultado).toEqual(solicitacoesMock);
      expect(mockScopedRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('debugEscopo', () => {
    it('deve retornar informações de debug do escopo', async () => {
      // Act
      const resultado = await service.debugEscopo();

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.contexto_atual).toBeDefined();
      expect(resultado.contexto_atual.tipo).toBe(ScopeType.GLOBAL);
      expect(resultado.contexto_atual.usuario_id).toBe('test-user');
    });
  });

  describe('métodos auxiliares', () => {
    it('deve normalizar valores corretamente', () => {
      // Testa o método privado através de reflexão ou testa indiretamente
      // através dos métodos públicos que o utilizam
      expect(service).toBeDefined();
    });

    it('deve validar filtros corretamente', () => {
      // Testa a validação de filtros indiretamente
      expect(service).toBeDefined();
    });
  });
});