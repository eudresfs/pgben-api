import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MetricasPagamentoService } from '../../../services/metricas-pagamento.service';
import { Pagamento } from '../../../entities/pagamento.entity';
import { ComprovantePagamento } from '../../../entities/comprovante-pagamento.entity';
import { ConfirmacaoRecebimento } from '../../../entities/confirmacao-recebimento.entity';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../../enums/metodo-pagamento.enum';

/**
 * Testes unitários para MetricasPagamentoService
 *
 * Valida o funcionamento do serviço responsável por coletar
 * e disponibilizar métricas sobre as operações de pagamento.
 *
 * @author Equipe PGBen
 */
describe('MetricasPagamentoService', () => {
  let service: MetricasPagamentoService;
  let pagamentoRepository: Repository<Pagamento>;
  let comprovanteRepository: Repository<ComprovantePagamento>;
  let confirmacaoRepository: Repository<ConfirmacaoRecebimento>;

  // Mock do QueryBuilder para uso nos testes
  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue({}),
    execute: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricasPagamentoService,
        {
          provide: getRepositoryToken(Pagamento),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            manager: {
              query: jest.fn().mockResolvedValue([]),
            },
          },
        },
        {
          provide: getRepositoryToken(ComprovantePagamento),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            count: jest.fn().mockResolvedValue(0),
          },
        },
        {
          provide: getRepositoryToken(ConfirmacaoRecebimento),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            count: jest.fn().mockResolvedValue(0),
          },
        },
      ],
    }).compile();

    service = module.get<MetricasPagamentoService>(MetricasPagamentoService);
    pagamentoRepository = module.get<Repository<Pagamento>>(
      getRepositoryToken(Pagamento),
    );
    comprovanteRepository = module.get<Repository<ComprovantePagamento>>(
      getRepositoryToken(ComprovantePagamento),
    );
    confirmacaoRepository = module.get<Repository<ConfirmacaoRecebimento>>(
      getRepositoryToken(ConfirmacaoRecebimento),
    );
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('obterMetricasVolume', () => {
    it('deve retornar métricas de volume de pagamentos', async () => {
      // Arrange
      const mockMetricas = {
        totalPagamentos: 100,
        totalEmProcessamento: 20,
        totalFinalizados: 70,
        totalCancelados: 10,
        totalValorPago: 50000,
        mediaTempoProcessamento: 48, // horas
      };

      jest.spyOn(mockQueryBuilder, 'getRawOne').mockResolvedValueOnce({
        totalPagamentos: '100',
        totalEmProcessamento: '20',
        totalFinalizados: '70',
        totalCancelados: '10',
        totalValorPago: '50000.00',
        mediaTempoProcessamento: '48.00',
      });

      // Act
      const resultado = await service.obterMetricasVolume();

      // Assert
      expect(resultado).toEqual(mockMetricas);
      expect(pagamentoRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.select).toHaveBeenCalled();
    });

    it('deve filtrar por período quando especificado', async () => {
      // Arrange
      const dataInicio = new Date('2025-01-01');
      const dataFim = new Date('2025-03-31');

      const mockMetricas = {
        totalPagamentos: 50,
        totalEmProcessamento: 10,
        totalFinalizados: 35,
        totalCancelados: 5,
        totalValorPago: 25000,
        mediaTempoProcessamento: 36, // horas
      };

      jest.spyOn(mockQueryBuilder, 'getRawOne').mockResolvedValueOnce({
        totalPagamentos: '50',
        totalEmProcessamento: '10',
        totalFinalizados: '35',
        totalCancelados: '5',
        totalValorPago: '25000.00',
        mediaTempoProcessamento: '36.00',
      });

      // Act
      const resultado = await service.obterMetricasVolume(dataInicio, dataFim);

      // Assert
      expect(resultado).toEqual(mockMetricas);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'pagamento.dataCriacao >= :dataInicio',
        { dataInicio },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'pagamento.dataCriacao <= :dataFim',
        { dataFim },
      );
    });
  });

  describe('obterMetricasEficiencia', () => {
    it('deve retornar métricas de eficiência do processamento de pagamentos', async () => {
      // Arrange
      const mockMetricas = {
        tempoMedioPorStatus: [
          { status: StatusPagamentoEnum.AGENDADO, tempoMedio: 24 }, // horas
          { status: StatusPagamentoEnum.LIBERADO, tempoMedio: 48 }, // horas
          { status: StatusPagamentoEnum.PAGO, tempoMedio: 72 }, // horas
          { status: StatusPagamentoEnum.CONFIRMADO, tempoMedio: 96 }, // horas
        ],
        taxaConclusao: 0.7, // 70% dos pagamentos são concluídos
        taxaCancelamento: 0.1, // 10% dos pagamentos são cancelados
        tempoMedioTotal: 96, // horas do início ao fim do processo
      };

      jest.spyOn(mockQueryBuilder, 'getRawMany').mockResolvedValueOnce([
        { status: StatusPagamentoEnum.AGENDADO, tempoMedio: '24.00' },
        { status: StatusPagamentoEnum.LIBERADO, tempoMedio: '48.00' },
        { status: StatusPagamentoEnum.PAGO, tempoMedio: '72.00' },
        { status: StatusPagamentoEnum.CONFIRMADO, tempoMedio: '96.00' },
      ]);

      jest.spyOn(mockQueryBuilder, 'getRawOne').mockResolvedValueOnce({
        taxaConclusao: '0.70',
        taxaCancelamento: '0.10',
        tempoMedioTotal: '96.00',
      });

      // Act
      const resultado = await service.obterMetricasEficiencia();

      // Assert
      expect(resultado).toEqual(mockMetricas);
      expect(pagamentoRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.groupBy).toHaveBeenCalled();
    });

    it('deve filtrar por unidade quando especificado', async () => {
      // Arrange
      const unidadeId = 'unidade-id-1';

      const mockTempoMedioPorStatus = [
        { status: StatusPagamentoEnum.AGENDADO, tempoMedio: 24 },
        { status: StatusPagamentoEnum.LIBERADO, tempoMedio: 48 },
      ];

      jest.spyOn(mockQueryBuilder, 'getRawMany').mockResolvedValueOnce(
        mockTempoMedioPorStatus.map((item) => ({
          status: item.status,
          tempoMedio: item.tempoMedio.toString(),
        })),
      );

      jest.spyOn(mockQueryBuilder, 'getRawOne').mockResolvedValueOnce({
        taxaConclusao: '0.75',
        taxaCancelamento: '0.05',
        tempoMedioTotal: '72.00',
      });

      // Act
      const resultado = await service.obterMetricasEficiencia(
        null,
        null,
        unidadeId,
      );

      // Assert
      expect(resultado).toBeDefined();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'pagamento.unidadeId = :unidadeId',
        { unidadeId },
      );
    });
  });

  describe('obterMetricasComprovantes', () => {
    it('deve retornar métricas sobre os comprovantes de pagamento', async () => {
      // Arrange
      const mockMetricas = {
        totalComprovantes: 80,
        tempoMedioUpload: 36, // horas após pagamento
        percentualPagamentosComComprovante: 0.8, // 80% dos pagamentos têm comprovante
        tamanhoMedioArquivo: 1024, // KB
      };

      jest.spyOn(mockQueryBuilder, 'getRawOne').mockResolvedValueOnce({
        totalComprovantes: '80',
        tempoMedioUpload: '36.00',
        percentualPagamentosComComprovante: '0.80',
        tamanhoMedioArquivo: '1024.00',
      });

      jest.spyOn(comprovanteRepository, 'count').mockResolvedValueOnce(80);

      // Act
      const resultado = await service.obterMetricasComprovantes();

      // Assert
      expect(resultado).toEqual(mockMetricas);
      expect(comprovanteRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.select).toHaveBeenCalled();
    });

    it('deve filtrar por método de pagamento quando especificado', async () => {
      // Arrange
      const metodoPagamento = MetodoPagamentoEnum.PIX;

      const mockMetricas = {
        totalComprovantes: 50,
        tempoMedioUpload: 24, // horas após pagamento
        percentualPagamentosComComprovante: 0.9, // 90% dos pagamentos PIX têm comprovante
        tamanhoMedioArquivo: 800, // KB
      };

      jest.spyOn(mockQueryBuilder, 'getRawOne').mockResolvedValueOnce({
        totalComprovantes: '50',
        tempoMedioUpload: '24.00',
        percentualPagamentosComComprovante: '0.90',
        tamanhoMedioArquivo: '800.00',
      });

      // Act
      const resultado = await service.obterMetricasComprovantes(
        null,
        null,
        metodoPagamento,
      );

      // Assert
      expect(resultado).toEqual(mockMetricas);
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'p.metodoPagamento = :metodoPagamento',
        { metodoPagamento },
      );
    });
  });

  describe('obterMetricasConfirmacoes', () => {
    it('deve retornar métricas sobre as confirmações de recebimento', async () => {
      // Arrange
      const mockMetricas = {
        totalConfirmacoes: 70,
        tempoMedioConfirmacao: 72, // horas após pagamento
        percentualPagamentosConfirmados: 0.7, // 70% dos pagamentos são confirmados pelo beneficiário
        taxaConfirmacaoEspontanea: 0.6, // 60% das confirmações são espontâneas
      };

      jest.spyOn(mockQueryBuilder, 'getRawOne').mockResolvedValueOnce({
        totalConfirmacoes: '70',
        tempoMedioConfirmacao: '72.00',
        percentualPagamentosConfirmados: '0.70',
        taxaConfirmacaoEspontanea: '0.60',
      });

      jest.spyOn(confirmacaoRepository, 'count').mockResolvedValueOnce(70);

      // Act
      const resultado = await service.obterMetricasConfirmacoes();

      // Assert
      expect(resultado).toEqual(mockMetricas);
      expect(confirmacaoRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.select).toHaveBeenCalled();
    });

    it('deve filtrar por unidade quando especificado', async () => {
      // Arrange
      const unidadeId = 'unidade-id-1';

      const mockMetricas = {
        totalConfirmacoes: 40,
        tempoMedioConfirmacao: 48, // horas após pagamento
        percentualPagamentosConfirmados: 0.8, // 80% dos pagamentos da unidade são confirmados
        taxaConfirmacaoEspontanea: 0.7, // 70% das confirmações da unidade são espontâneas
      };

      jest.spyOn(mockQueryBuilder, 'getRawOne').mockResolvedValueOnce({
        totalConfirmacoes: '40',
        tempoMedioConfirmacao: '48.00',
        percentualPagamentosConfirmados: '0.80',
        taxaConfirmacaoEspontanea: '0.70',
      });

      // Act
      const resultado = await service.obterMetricasConfirmacoes(
        null,
        null,
        unidadeId,
      );

      // Assert
      expect(resultado).toEqual(mockMetricas);
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'p.unidadeId = :unidadeId',
        { unidadeId },
      );
    });
  });

  describe('obterMetricasTempoReais', () => {
    it('deve retornar métricas de tempo real sobre pagamentos', async () => {
      // Arrange
      const mockMetricas = {
        pagamentosUltimas24h: 10,
        confirmacoesPendentes: 20,
        valorLiberadoHoje: 5000,
        pagamentosMaisRecentes: [
          {
            id: 'pagamento-id-1',
            valor: 500,
            status: StatusPagamentoEnum.PAGO,
            dataAtualizacao: new Date(),
          },
          {
            id: 'pagamento-id-2',
            valor: 300,
            status: StatusPagamentoEnum.LIBERADO,
            dataAtualizacao: new Date(),
          },
        ],
        taxaConfirmacaoHoje: 0.8, // 80% dos pagamentos de hoje foram confirmados
      };

      jest.spyOn(mockQueryBuilder, 'getRawOne').mockResolvedValueOnce({
        pagamentosUltimas24h: '10',
        confirmacoesPendentes: '20',
        valorLiberadoHoje: '5000.00',
        taxaConfirmacaoHoje: '0.80',
      });

      jest.spyOn(mockQueryBuilder, 'getRawMany').mockResolvedValueOnce([
        {
          id: 'pagamento-id-1',
          valor: '500.00',
          status: StatusPagamentoEnum.PAGO,
          dataAtualizacao: new Date().toISOString(),
        },
        {
          id: 'pagamento-id-2',
          valor: '300.00',
          status: StatusPagamentoEnum.LIBERADO,
          dataAtualizacao: new Date().toISOString(),
        },
      ]);

      // Act
      const resultado = await service.obterMetricasTempoReais();

      // Assert
      expect(resultado).toMatchObject({
        pagamentosUltimas24h: 10,
        confirmacoesPendentes: 20,
        valorLiberadoHoje: 5000,
        taxaConfirmacaoHoje: 0.8,
      });
      expect(resultado.pagamentosMaisRecentes).toHaveLength(2);
      expect(pagamentoRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();
    });
  });

  describe('obterDashboard', () => {
    it('deve retornar dados consolidados para dashboard', async () => {
      // Arrange
      const mockVolume = {
        totalPagamentos: 100,
        totalEmProcessamento: 20,
        totalFinalizados: 70,
        totalCancelados: 10,
        totalValorPago: 50000,
        mediaTempoProcessamento: 48,
      };

      const mockEficiencia = {
        tempoMedioPorStatus: [
          { status: StatusPagamentoEnum.AGENDADO, tempoMedio: 24 },
        ],
        taxaConclusao: 0.7,
        taxaCancelamento: 0.1,
        tempoMedioTotal: 96,
      };

      const mockTempoReal = {
        pagamentosUltimas24h: 10,
        confirmacoesPendentes: 20,
        valorLiberadoHoje: 5000,
        pagamentosMaisRecentes: [
          {
            id: 'pagamento-id-1',
            valor: 500,
            status: StatusPagamentoEnum.PAGO,
            dataAtualizacao: new Date(),
          },
        ],
        taxaConfirmacaoHoje: 0.8,
      };

      // Mock dos métodos do serviço
      jest
        .spyOn(service, 'obterMetricasVolume')
        .mockResolvedValueOnce(mockVolume);
      jest
        .spyOn(service, 'obterMetricasEficiencia')
        .mockResolvedValueOnce(mockEficiencia);
      jest
        .spyOn(service, 'obterMetricasTempoReais')
        .mockResolvedValueOnce(mockTempoReal);

      // Act
      const resultado = await service.obterDashboard();

      // Assert
      expect(resultado).toEqual({
        volume: mockVolume,
        eficiencia: mockEficiencia,
        tempoReal: mockTempoReal,
      });
      expect(service.obterMetricasVolume).toHaveBeenCalled();
      expect(service.obterMetricasEficiencia).toHaveBeenCalled();
      expect(service.obterMetricasTempoReais).toHaveBeenCalled();
    });

    it('deve aplicar filtros a todos os métodos quando especificados', async () => {
      // Arrange
      const dataInicio = new Date('2025-01-01');
      const dataFim = new Date('2025-03-31');
      const unidadeId = 'unidade-id-1';

      // Mock dos métodos do serviço
      jest
        .spyOn(service, 'obterMetricasVolume')
        .mockResolvedValueOnce({} as any);
      jest
        .spyOn(service, 'obterMetricasEficiencia')
        .mockResolvedValueOnce({} as any);
      jest
        .spyOn(service, 'obterMetricasTempoReais')
        .mockResolvedValueOnce({} as any);

      // Act
      await service.obterDashboard(dataInicio, dataFim, unidadeId);

      // Assert
      expect(service.obterMetricasVolume).toHaveBeenCalledWith(
        dataInicio,
        dataFim,
        unidadeId,
      );
      expect(service.obterMetricasEficiencia).toHaveBeenCalledWith(
        dataInicio,
        dataFim,
        unidadeId,
      );
      expect(service.obterMetricasTempoReais).toHaveBeenCalledWith(unidadeId);
    });
  });
});
