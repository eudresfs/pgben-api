import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RelatorioPagamentoService } from '../../../services/relatorio-pagamento.service';
import { Pagamento } from '../../../entities/pagamento.entity';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../../enums/metodo-pagamento.enum';

/**
 * Testes unitários para RelatorioPagamentoService
 *
 * Garante que os métodos de geração de relatórios e estatísticas
 * sobre pagamentos funcionem corretamente.
 *
 * @author Equipe PGBen
 */
describe('RelatorioPagamentoService', () => {
  let service: RelatorioPagamentoService;
  let pagamentoRepository: Repository<Pagamento>;

  // Dados de exemplo para testes
  const pagamentosMock = [
    {
      id: 'pagamento-id-1',
      solicitacaoId: 'solicitacao-id-1',
      valor: 500,
      status: StatusPagamentoEnum.FINALIZADO,
      metodoPagamento: MetodoPagamentoEnum.PIX,
      infoBancariaId: 'info-bancaria-id-1',
      dataLiberacao: new Date('2025-01-15'),
      dataCriacao: new Date('2025-01-10'),
      dataAtualizacao: new Date('2025-01-20'),
      liberadoPor: 'usuario-id-1',
      unidadeId: 'unidade-id-1',
      observacoes: 'Pagamento de benefício eventual',
      dadosAdicionais: {
        tipoBeneficio: 'Auxílio Moradia',
        valorAprovado: 500,
      },
    },
    {
      id: 'pagamento-id-2',
      solicitacaoId: 'solicitacao-id-2',
      valor: 300,
      status: StatusPagamentoEnum.FINALIZADO,
      metodoPagamento: MetodoPagamentoEnum.PRESENCIAL,
      dataLiberacao: new Date('2025-02-10'),
      dataCriacao: new Date('2025-02-05'),
      dataAtualizacao: new Date('2025-02-15'),
      liberadoPor: 'usuario-id-2',
      unidadeId: 'unidade-id-1',
      observacoes: 'Pagamento de benefício alimentação',
      dadosAdicionais: {
        tipoBeneficio: 'Auxílio Alimentação',
        valorAprovado: 300,
      },
    },
    {
      id: 'pagamento-id-3',
      solicitacaoId: 'solicitacao-id-3',
      valor: 1000,
      status: StatusPagamentoEnum.PAGO,
      metodoPagamento: MetodoPagamentoEnum.TRANSFERENCIA,
      infoBancariaId: 'info-bancaria-id-3',
      dataLiberacao: new Date('2025-03-05'),
      dataCriacao: new Date('2025-03-01'),
      dataAtualizacao: new Date('2025-03-05'),
      liberadoPor: 'usuario-id-1',
      unidadeId: 'unidade-id-2',
      observacoes: 'Pagamento de benefício funeral',
      dadosAdicionais: {
        tipoBeneficio: 'Auxílio Funeral',
        valorAprovado: 1000,
      },
    },
    {
      id: 'pagamento-id-4',
      solicitacaoId: 'solicitacao-id-4',
      valor: 500,
      status: StatusPagamentoEnum.CANCELADO,
      metodoPagamento: MetodoPagamentoEnum.PIX,
      infoBancariaId: 'info-bancaria-id-4',
      dataLiberacao: new Date('2025-01-20'),
      dataCriacao: new Date('2025-01-15'),
      dataAtualizacao: new Date('2025-01-22'),
      liberadoPor: 'usuario-id-2',
      unidadeId: 'unidade-id-1',
      observacoes: 'CANCELADO: Dados bancários incorretos',
      dadosAdicionais: {
        tipoBeneficio: 'Auxílio Moradia',
        valorAprovado: 500,
      },
    },
  ];

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue({}),
    execute: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelatorioPagamentoService,
        {
          provide: getRepositoryToken(Pagamento),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            find: jest.fn().mockResolvedValue(pagamentosMock),
            findAndCount: jest
              .fn()
              .mockResolvedValue([pagamentosMock, pagamentosMock.length]),
            manager: {
              query: jest.fn().mockResolvedValue([]),
            },
          },
        },
      ],
    }).compile();

    service = module.get<RelatorioPagamentoService>(RelatorioPagamentoService);
    pagamentoRepository = module.get<Repository<Pagamento>>(
      getRepositoryToken(Pagamento),
    );
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('gerarRelatorioMensal', () => {
    it('deve gerar relatório mensal por período', async () => {
      // Arrange
      const dataInicio = new Date('2025-01-01');
      const dataFim = new Date('2025-03-31');

      const mockResultado = [
        { mes: '2025-01', total: 1000, quantidade: 2 },
        { mes: '2025-02', total: 300, quantidade: 1 },
        { mes: '2025-03', total: 1000, quantidade: 1 },
      ];

      jest
        .spyOn(mockQueryBuilder, 'getRawMany')
        .mockResolvedValueOnce(mockResultado);

      // Act
      const resultado = await service.gerarRelatorioMensal(dataInicio, dataFim);

      // Assert
      expect(resultado).toEqual(mockResultado);
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'pagamento.dataLiberacao >= :dataInicio',
        { dataInicio },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'pagamento.dataLiberacao <= :dataFim',
        { dataFim },
      );
      expect(mockQueryBuilder.groupBy).toHaveBeenCalled();
    });

    it('deve filtrar por unidade quando especificado', async () => {
      // Arrange
      const dataInicio = new Date('2025-01-01');
      const dataFim = new Date('2025-03-31');
      const unidadeId = 'unidade-id-1';

      const mockResultado = [
        { mes: '2025-01', total: 500, quantidade: 1 },
        { mes: '2025-02', total: 300, quantidade: 1 },
      ];

      jest
        .spyOn(mockQueryBuilder, 'getRawMany')
        .mockResolvedValueOnce(mockResultado);

      // Act
      const resultado = await service.gerarRelatorioMensal(
        dataInicio,
        dataFim,
        unidadeId,
      );

      // Assert
      expect(resultado).toEqual(mockResultado);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'pagamento.unidadeId = :unidadeId',
        { unidadeId },
      );
    });

    it('deve filtrar apenas pagamentos finalizados/pagos quando especificado', async () => {
      // Arrange
      const dataInicio = new Date('2025-01-01');
      const dataFim = new Date('2025-03-31');
      const unidadeId = null;
      const apenasFinalizados = true;

      const mockResultado = [
        { mes: '2025-01', total: 500, quantidade: 1 },
        { mes: '2025-02', total: 300, quantidade: 1 },
        { mes: '2025-03', total: 1000, quantidade: 1 },
      ];

      jest
        .spyOn(mockQueryBuilder, 'getRawMany')
        .mockResolvedValueOnce(mockResultado);

      // Act
      const resultado = await service.gerarRelatorioMensal(
        dataInicio,
        dataFim,
        unidadeId,
        apenasFinalizados,
      );

      // Assert
      expect(resultado).toEqual(mockResultado);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'pagamento.status IN (:...statusFinalizado)',
        {
          statusFinalizado: [
            StatusPagamentoEnum.FINALIZADO,
            StatusPagamentoEnum.PAGO,
          ],
        },
      );
    });
  });

  describe('gerarRelatorioPorMetodo', () => {
    it('deve gerar relatório por método de pagamento', async () => {
      // Arrange
      const dataInicio = new Date('2025-01-01');
      const dataFim = new Date('2025-03-31');

      const mockResultado = [
        { metodoPagamento: 'pix', total: 1000, quantidade: 2 },
        { metodoPagamento: 'presencial', total: 300, quantidade: 1 },
        { metodoPagamento: 'transferencia', total: 1000, quantidade: 1 },
      ];

      jest
        .spyOn(mockQueryBuilder, 'getRawMany')
        .mockResolvedValueOnce(mockResultado);

      // Act
      const resultado = await service.gerarRelatorioPorMetodo(
        dataInicio,
        dataFim,
      );

      // Assert
      expect(resultado).toEqual(mockResultado);
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.groupBy).toHaveBeenCalled();
    });

    it('deve filtrar apenas pagamentos não cancelados', async () => {
      // Arrange
      const dataInicio = new Date('2025-01-01');
      const dataFim = new Date('2025-03-31');

      const mockResultado = [
        { metodoPagamento: 'pix', total: 500, quantidade: 1 },
        { metodoPagamento: 'presencial', total: 300, quantidade: 1 },
        { metodoPagamento: 'transferencia', total: 1000, quantidade: 1 },
      ];

      jest
        .spyOn(mockQueryBuilder, 'getRawMany')
        .mockResolvedValueOnce(mockResultado);

      // Act
      const resultado = await service.gerarRelatorioPorMetodo(
        dataInicio,
        dataFim,
      );

      // Assert
      expect(resultado).toEqual(mockResultado);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'pagamento.status != :statusCancelado',
        { statusCancelado: StatusPagamentoEnum.CANCELADO },
      );
    });
  });

  describe('gerarRelatorioPorStatus', () => {
    it('deve gerar relatório por status de pagamento', async () => {
      // Arrange
      const mockResultado = [
        { status: 'finalizado', total: 800, quantidade: 2 },
        { status: 'pago', total: 1000, quantidade: 1 },
        { status: 'cancelado', total: 500, quantidade: 1 },
      ];

      jest
        .spyOn(mockQueryBuilder, 'getRawMany')
        .mockResolvedValueOnce(mockResultado);

      // Act
      const resultado = await service.gerarRelatorioPorStatus();

      // Assert
      expect(resultado).toEqual(mockResultado);
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.groupBy).toHaveBeenCalled();
    });

    it('deve filtrar por período quando especificado', async () => {
      // Arrange
      const dataInicio = new Date('2025-01-01');
      const dataFim = new Date('2025-03-31');

      const mockResultado = [
        { status: 'finalizado', total: 800, quantidade: 2 },
        { status: 'pago', total: 1000, quantidade: 1 },
        { status: 'cancelado', total: 500, quantidade: 1 },
      ];

      jest
        .spyOn(mockQueryBuilder, 'getRawMany')
        .mockResolvedValueOnce(mockResultado);

      // Act
      const resultado = await service.gerarRelatorioPorStatus(
        dataInicio,
        dataFim,
      );

      // Assert
      expect(resultado).toEqual(mockResultado);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'pagamento.dataLiberacao >= :dataInicio',
        { dataInicio },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'pagamento.dataLiberacao <= :dataFim',
        { dataFim },
      );
    });
  });

  describe('gerarRelatorioPorUnidade', () => {
    it('deve gerar relatório por unidade', async () => {
      // Arrange
      const mockResultado = [
        {
          unidadeId: 'unidade-id-1',
          nomeUnidade: 'CRAS Centro',
          total: 1300,
          quantidade: 3,
        },
        {
          unidadeId: 'unidade-id-2',
          nomeUnidade: 'CRAS Norte',
          total: 1000,
          quantidade: 1,
        },
      ];

      jest
        .spyOn(pagamentoRepository.manager, 'query')
        .mockResolvedValueOnce(mockResultado);

      // Act
      const resultado = await service.gerarRelatorioPorUnidade();

      // Assert
      expect(resultado).toEqual(mockResultado);
      expect(pagamentoRepository.manager.query).toHaveBeenCalled();
    });

    it('deve filtrar por período quando especificado', async () => {
      // Arrange
      const dataInicio = new Date('2025-01-01');
      const dataFim = new Date('2025-03-31');

      const mockResultado = [
        {
          unidadeId: 'unidade-id-1',
          nomeUnidade: 'CRAS Centro',
          total: 1300,
          quantidade: 3,
        },
        {
          unidadeId: 'unidade-id-2',
          nomeUnidade: 'CRAS Norte',
          total: 1000,
          quantidade: 1,
        },
      ];

      jest
        .spyOn(pagamentoRepository.manager, 'query')
        .mockResolvedValueOnce(mockResultado);

      // Act
      const resultado = await service.gerarRelatorioPorUnidade(
        dataInicio,
        dataFim,
      );

      // Assert
      expect(resultado).toEqual(mockResultado);
      expect(pagamentoRepository.manager.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'WHERE p.data_liberacao >= $1 AND p.data_liberacao <= $2',
        ),
        [dataInicio, dataFim],
      );
    });
  });

  describe('gerarRelatorioPorTipoBeneficio', () => {
    it('deve gerar relatório por tipo de benefício', async () => {
      // Arrange
      const mockResultado = [
        { tipoBeneficio: 'Auxílio Moradia', total: 1000, quantidade: 2 },
        { tipoBeneficio: 'Auxílio Alimentação', total: 300, quantidade: 1 },
        { tipoBeneficio: 'Auxílio Funeral', total: 1000, quantidade: 1 },
      ];

      jest
        .spyOn(pagamentoRepository.manager, 'query')
        .mockResolvedValueOnce(mockResultado);

      // Act
      const resultado = await service.gerarRelatorioPorTipoBeneficio();

      // Assert
      expect(resultado).toEqual(mockResultado);
      expect(pagamentoRepository.manager.query).toHaveBeenCalled();
    });

    it('deve filtrar por unidade quando especificado', async () => {
      // Arrange
      const unidadeId = 'unidade-id-1';

      const mockResultado = [
        { tipoBeneficio: 'Auxílio Moradia', total: 500, quantidade: 1 },
        { tipoBeneficio: 'Auxílio Alimentação', total: 300, quantidade: 1 },
      ];

      jest
        .spyOn(pagamentoRepository.manager, 'query')
        .mockResolvedValueOnce(mockResultado);

      // Act
      const resultado = await service.gerarRelatorioPorTipoBeneficio(
        null,
        null,
        unidadeId,
      );

      // Assert
      expect(resultado).toEqual(mockResultado);
      expect(pagamentoRepository.manager.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE p.unidade_id = $1'),
        [unidadeId],
      );
    });
  });

  describe('obterEstatisticasGerais', () => {
    it('deve obter estatísticas gerais de pagamentos', async () => {
      // Arrange
      const mockEstatisticas = {
        totalPagamentos: 4,
        totalValorPago: 2300,
        totalFinalizados: 2,
        totalEmProcessamento: 1,
        totalCancelados: 1,
        mediaValorPagamento: 575,
        pagamentosPorMetodo: {
          pix: 2,
          presencial: 1,
          transferencia: 1,
        },
      };

      jest.spyOn(mockQueryBuilder, 'getRawOne').mockResolvedValueOnce({
        totalPagamentos: '4',
        totalValorPago: '2300.00',
        totalFinalizados: '2',
        totalEmProcessamento: '1',
        totalCancelados: '1',
      });

      jest.spyOn(mockQueryBuilder, 'getRawMany').mockResolvedValueOnce([
        { metodoPagamento: 'pix', quantidade: '2' },
        { metodoPagamento: 'presencial', quantidade: '1' },
        { metodoPagamento: 'transferencia', quantidade: '1' },
      ]);

      // Act
      const resultado = await service.obterEstatisticasGerais();

      // Assert
      expect(resultado).toEqual(
        expect.objectContaining({
          totalPagamentos: 4,
          totalValorPago: 2300,
          totalFinalizados: 2,
          totalEmProcessamento: 1,
          totalCancelados: 1,
          pagamentosPorMetodo: expect.any(Object),
        }),
      );
      expect(mockQueryBuilder.select).toHaveBeenCalled();
    });

    it('deve filtrar por período quando especificado', async () => {
      // Arrange
      const dataInicio = new Date('2025-01-01');
      const dataFim = new Date('2025-03-31');

      jest.spyOn(mockQueryBuilder, 'getRawOne').mockResolvedValueOnce({
        totalPagamentos: '4',
        totalValorPago: '2300.00',
        totalFinalizados: '2',
        totalEmProcessamento: '1',
        totalCancelados: '1',
      });

      jest.spyOn(mockQueryBuilder, 'getRawMany').mockResolvedValueOnce([
        { metodoPagamento: 'pix', quantidade: '2' },
        { metodoPagamento: 'presencial', quantidade: '1' },
        { metodoPagamento: 'transferencia', quantidade: '1' },
      ]);

      // Act
      const resultado = await service.obterEstatisticasGerais(
        dataInicio,
        dataFim,
      );

      // Assert
      expect(resultado).toBeDefined();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'pagamento.dataLiberacao >= :dataInicio',
        { dataInicio },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'pagamento.dataLiberacao <= :dataFim',
        { dataFim },
      );
    });
  });
});
