import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConcessaoAutoUpdateService } from './concessao-auto-update.service';
import { Pagamento } from '../../../entities/pagamento.entity';
import { Concessao } from '../../../entities/concessao.entity';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
import { ConcessaoService } from '../../beneficio/services/concessao.service';

describe('ConcessaoAutoUpdateService', () => {
  let service: ConcessaoAutoUpdateService;
  let pagamentoRepository: Repository<Pagamento>;
  let concessaoRepository: Repository<Concessao>;
  let notificacaoService: NotificacaoService;
  let concessaoService: ConcessaoService;

  const mockPagamentoRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockConcessaoRepository = {
    update: jest.fn(),
    findOne: jest.fn(),
  };

  const mockNotificacaoService = {
    criarNotificacaoSistema: jest.fn(),
  };

  const mockConcessaoService = {
    atualizarStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConcessaoAutoUpdateService,
        {
          provide: getRepositoryToken(Pagamento),
          useValue: mockPagamentoRepository,
        },
        {
          provide: getRepositoryToken(Concessao),
          useValue: mockConcessaoRepository,
        },
        {
          provide: NotificacaoService,
          useValue: mockNotificacaoService,
        },
        {
          provide: ConcessaoService,
          useValue: mockConcessaoService,
        },
      ],
    }).compile();

    service = module.get<ConcessaoAutoUpdateService>(ConcessaoAutoUpdateService);
    pagamentoRepository = module.get<Repository<Pagamento>>(getRepositoryToken(Pagamento));
    concessaoRepository = module.get<Repository<Concessao>>(getRepositoryToken(Concessao));
    notificacaoService = module.get<NotificacaoService>(NotificacaoService);
    concessaoService = module.get<ConcessaoService>(ConcessaoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verificarEAtualizarConcessao', () => {
    it('deve cessar a concessão quando todas as parcelas estão confirmadas', async () => {
      // Arrange
      const pagamento = {
        id: 'pag-1',
        concessao_id: 'conc-1',
        numero_parcela: 3,
        status: StatusPagamentoEnum.CONFIRMADO,
        concessao: {
          solicitacao: {
            tecnico_id: 'tecnico-1',
          },
        },
      } as Pagamento;

      const pagamentosConcessao = [
        { 
          id: 'pag-1', 
          numero_parcela: 1, 
          status: StatusPagamentoEnum.CONFIRMADO, 
          concessao_id: 'conc-1',
          concessao: {
            solicitacao: {
              tecnico_id: 'tecnico-1',
            },
          },
        },
        { id: 'pag-2', numero_parcela: 2, status: StatusPagamentoEnum.CONFIRMADO, concessao_id: 'conc-1' },
        { id: 'pag-3', numero_parcela: 3, status: StatusPagamentoEnum.CONFIRMADO, concessao_id: 'conc-1' },
      ] as Pagamento[];

      mockPagamentoRepository.find.mockResolvedValue(pagamentosConcessao);
      mockConcessaoRepository.update.mockResolvedValue({ affected: 1 });
      mockNotificacaoService.criarNotificacaoSistema.mockResolvedValue({});

      // Act
      await service.verificarEAtualizarConcessao(pagamento);

      // Assert
      expect(mockConcessaoRepository.update).toHaveBeenCalledWith(
        { id: 'conc-1' },
        expect.objectContaining({
          status: StatusConcessao.CESSADO,
          dataEncerramento: expect.any(Date),
          motivoEncerramento: 'Concessão cessada devido à confirmação do recebimento de todas as parcelas',
        }),
      );

      expect(mockNotificacaoService.criarNotificacaoSistema).toHaveBeenCalledWith(
        expect.objectContaining({
          destinatario_id: 'tecnico-1',
          titulo: 'Concessão Cessada',
          conteudo: expect.stringContaining('3 parcelas'),
        }),
      );
    });

    it('não deve cessar a concessão quando nem todas as parcelas estão confirmadas', async () => {
      // Arrange
      const pagamento = {
        id: 'pag-1',
        concessao_id: 'conc-1',
        numero_parcela: 2,
        status: StatusPagamentoEnum.CONFIRMADO,
      } as Pagamento;

      const pagamentosConcessao = [
        { id: 'pag-1', numero_parcela: 1, status: StatusPagamentoEnum.CONFIRMADO, concessao_id: 'conc-1' },
        { id: 'pag-2', numero_parcela: 2, status: StatusPagamentoEnum.CONFIRMADO, concessao_id: 'conc-1' },
        { id: 'pag-3', numero_parcela: 3, status: StatusPagamentoEnum.PENDENTE, concessao_id: 'conc-1' },
      ] as Pagamento[];

      mockPagamentoRepository.find.mockResolvedValue(pagamentosConcessao);

      // Act
      await service.verificarEAtualizarConcessao(pagamento);

      // Assert
      expect(mockConcessaoRepository.update).not.toHaveBeenCalled();
      expect(mockNotificacaoService.criarNotificacaoSistema).not.toHaveBeenCalled();
    });

    it('deve retornar early se pagamento não tem concessao_id', async () => {
      // Arrange
      const pagamento = {
        id: 'pag-1',
        concessao_id: null,
        numero_parcela: 1,
        status: StatusPagamentoEnum.CONFIRMADO,
      } as Pagamento;

      // Act
      await service.verificarEAtualizarConcessao(pagamento);

      // Assert
      expect(mockPagamentoRepository.find).not.toHaveBeenCalled();
      expect(mockConcessaoRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('processarAtualizacaoConcessao', () => {
    it('deve ativar concessão quando primeira parcela é confirmada', async () => {
      // Arrange
      const pagamento = {
        id: 'pag-1',
        concessao_id: 'conc-1',
        numero_parcela: 1,
        status: StatusPagamentoEnum.CONFIRMADO,
      } as Pagamento;

      mockConcessaoService.atualizarStatus.mockResolvedValue({});

      // Act
      await service.processarAtualizacaoConcessao(
        pagamento,
        StatusPagamentoEnum.CONFIRMADO,
        'user-1',
        'pag-1',
      );

      // Assert
      expect(mockConcessaoService.atualizarStatus).toHaveBeenCalledWith(
        'conc-1',
        StatusConcessao.ATIVO,
        'user-1',
        'Ativação automática - Primeira parcela do pagamento pag-1 atualizada para confirmado',
      );
    });

    it('não deve ativar concessão se não for primeira parcela', async () => {
      // Arrange
      const pagamento = {
        id: 'pag-2',
        concessao_id: 'conc-1',
        numero_parcela: 2,
        status: StatusPagamentoEnum.CONFIRMADO,
      } as Pagamento;

      // Act
      await service.processarAtualizacaoConcessao(
        pagamento,
        StatusPagamentoEnum.CONFIRMADO,
        'user-1',
        'pag-2',
      );

      // Assert
      expect(mockConcessaoService.atualizarStatus).not.toHaveBeenCalled();
    });

    it('deve ativar concessão quando primeira parcela é liberada', async () => {
      // Arrange
      const pagamento = {
        id: 'pag-1',
        concessao_id: 'conc-1',
        numero_parcela: 1,
        status: StatusPagamentoEnum.LIBERADO,
      } as Pagamento;

      mockConcessaoService.atualizarStatus.mockResolvedValue({});

      // Act
      await service.processarAtualizacaoConcessao(
        pagamento,
        StatusPagamentoEnum.LIBERADO,
        'user-1',
        'pag-1',
      );

      // Assert
      expect(mockConcessaoService.atualizarStatus).toHaveBeenCalledWith(
        'conc-1',
        StatusConcessao.ATIVO,
        'user-1',
        'Ativação automática - Primeira parcela do pagamento pag-1 atualizada para liberado',
      );
    });
  });

  describe('podeSerCessada', () => {
    it('deve retornar true quando todas as parcelas estão confirmadas', async () => {
      // Arrange
      const pagamentosConcessao = [
        { id: 'pag-1', status: StatusPagamentoEnum.CONFIRMADO },
        { id: 'pag-2', status: StatusPagamentoEnum.CONFIRMADO },
        { id: 'pag-3', status: StatusPagamentoEnum.CONFIRMADO },
      ] as Pagamento[];

      mockPagamentoRepository.find.mockResolvedValue(pagamentosConcessao);

      // Act
      const resultado = await service.podeSerCessada('conc-1');

      // Assert
      expect(resultado).toBe(true);
    });

    it('deve retornar false quando nem todas as parcelas estão confirmadas', async () => {
      // Arrange
      const pagamentosConcessao = [
        { id: 'pag-1', status: StatusPagamentoEnum.CONFIRMADO },
        { id: 'pag-2', status: StatusPagamentoEnum.PENDENTE },
        { id: 'pag-3', status: StatusPagamentoEnum.CONFIRMADO },
      ] as Pagamento[];

      mockPagamentoRepository.find.mockResolvedValue(pagamentosConcessao);

      // Act
      const resultado = await service.podeSerCessada('conc-1');

      // Assert
      expect(resultado).toBe(false);
    });

    it('deve retornar false quando não há pagamentos', async () => {
      // Arrange
      mockPagamentoRepository.find.mockResolvedValue([]);

      // Act
      const resultado = await service.podeSerCessada('conc-1');

      // Assert
      expect(resultado).toBe(false);
    });
  });

  describe('obterEstatisticasParcelas', () => {
    it('deve retornar estatísticas corretas das parcelas', async () => {
      // Arrange
      const pagamentosConcessao = [
        { id: 'pag-1', status: StatusPagamentoEnum.CONFIRMADO },
        { id: 'pag-2', status: StatusPagamentoEnum.CONFIRMADO },
        { id: 'pag-3', status: StatusPagamentoEnum.PENDENTE },
        { id: 'pag-4', status: StatusPagamentoEnum.PENDENTE },
      ] as Pagamento[];

      mockPagamentoRepository.find.mockResolvedValue(pagamentosConcessao);

      // Act
      const estatisticas = await service.obterEstatisticasParcelas('conc-1');

      // Assert
      expect(estatisticas).toEqual({
        total: 4,
        confirmadas: 2,
        pendentes: 2,
        percentualConcluido: 50,
      });
    });

    it('deve retornar estatísticas zeradas quando não há pagamentos', async () => {
      // Arrange
      mockPagamentoRepository.find.mockResolvedValue([]);

      // Act
      const estatisticas = await service.obterEstatisticasParcelas('conc-1');

      // Assert
      expect(estatisticas).toEqual({
        total: 0,
        confirmadas: 0,
        pendentes: 0,
        percentualConcluido: 0,
      });
    });
  });
});