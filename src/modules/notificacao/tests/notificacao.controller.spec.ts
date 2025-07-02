import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { NotificacaoController } from '../controllers/notificacao.controller';
import { NotificacaoService } from '../services/notificacao.service';
import { StatusNotificacaoProcessamento } from '../../../entities/notification.entity';
import { FiltrosNotificacaoDto } from '../dto/filtros-notificacao.dto';

describe('NotificacaoController', () => {
  let controller: NotificacaoController;
  let service: NotificacaoService;

  const mockNotificacaoService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    marcarComoLida: jest.fn(),
    arquivar: jest.fn(),
    marcarTodasComoLidas: jest.fn(),
    contadorNaoLidas: jest.fn(),
    criar: jest.fn(),
  };

  const mockRequest = {
    user: {
      id: 'user-123',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificacaoController],
      providers: [
        {
          provide: NotificacaoService,
          useValue: mockNotificacaoService,
        },
      ],
    }).compile();

    controller = module.get<NotificacaoController>(NotificacaoController);
    service = module.get<NotificacaoService>(NotificacaoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('deve listar notificações com filtros básicos', async () => {
      const filtros: FiltrosNotificacaoDto = {
        page: 1,
        limit: 10,
      };

      const mockResult = {
        items: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          pages: 0,
        },
        filtros: {},
        estatisticas: {
          naoLidas: 0,
          arquivadas: 0,
        },
      };

      mockNotificacaoService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockRequest, filtros);

      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: undefined,
        tipo: undefined,
        categoria: undefined,
        prioridade: undefined,
        dataInicio: undefined,
        dataFim: undefined,
        lidas: undefined,
        arquivadas: false,
        ordenarPor: 'created_at',
        ordem: 'DESC',
        busca: undefined,
        userId: 'user-123',
      });

      expect(result).toEqual(mockResult);
    });

    it('deve aplicar filtros avançados corretamente', async () => {
      const filtros: FiltrosNotificacaoDto = {
        page: 2,
        limit: 20,
        status: StatusNotificacaoProcessamento.ENVIADA,
        tipo: 'sistema',
        categoria: 'alerta',
        prioridade: 'alta',
        dataInicio: '2024-01-01',
        dataFim: '2024-12-31',
        lidas: false,
        arquivadas: true,
        ordenarPor: 'prioridade',
        ordem: 'ASC',
        busca: 'teste',
      };

      const mockResult = {
        items: [],
        meta: {
          total: 0,
          page: 2,
          limit: 20,
          pages: 0,
        },
        filtros: filtros,
        estatisticas: {
          naoLidas: 0,
          arquivadas: 0,
        },
      };

      mockNotificacaoService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockRequest, filtros);

      expect(service.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
        status: StatusNotificacaoProcessamento.ENVIADA,
        tipo: 'sistema',
        categoria: 'alerta',
        prioridade: 'alta',
        dataInicio: new Date('2024-01-01'),
        dataFim: expect.any(Date), // Data ajustada para final do dia
        lidas: false,
        arquivadas: true,
        ordenarPor: 'prioridade',
        ordem: 'ASC',
        busca: 'teste',
        userId: 'user-123',
      });

      expect(result).toEqual(mockResult);
    });

    it('deve validar data de início inválida', async () => {
      const filtros: FiltrosNotificacaoDto = {
        dataInicio: 'data-invalida',
      };

      await expect(controller.findAll(mockRequest, filtros)).rejects.toThrow(
        new BadRequestException(
          'Data de início inválida. Use o formato YYYY-MM-DD',
        ),
      );
    });

    it('deve validar data de fim inválida', async () => {
      const filtros: FiltrosNotificacaoDto = {
        dataFim: 'data-invalida',
      };

      await expect(controller.findAll(mockRequest, filtros)).rejects.toThrow(
        new BadRequestException(
          'Data de fim inválida. Use o formato YYYY-MM-DD',
        ),
      );
    });

    it('deve validar período inválido (início posterior ao fim)', async () => {
      const filtros: FiltrosNotificacaoDto = {
        dataInicio: '2024-12-31',
        dataFim: '2024-01-01',
      };

      await expect(controller.findAll(mockRequest, filtros)).rejects.toThrow(
        new BadRequestException(
          'Data de início não pode ser posterior à data de fim',
        ),
      );
    });

    it('deve ajustar data de fim para final do dia', async () => {
      const filtros: FiltrosNotificacaoDto = {
        dataFim: '2024-01-01',
      };

      const mockResult = {
        items: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          pages: 0,
        },
        filtros: {},
        estatisticas: {
          naoLidas: 0,
          arquivadas: 0,
        },
      };

      mockNotificacaoService.findAll.mockResolvedValue(mockResult);

      await controller.findAll(mockRequest, filtros);

      const chamada = mockNotificacaoService.findAll.mock.calls[0][0];
      const dataFimAjustada = chamada.dataFim;

      expect(dataFimAjustada.getHours()).toBe(23);
      expect(dataFimAjustada.getMinutes()).toBe(59);
      expect(dataFimAjustada.getSeconds()).toBe(59);
      expect(dataFimAjustada.getMilliseconds()).toBe(999);
    });

    it('deve usar valores padrão quando filtros não são fornecidos', async () => {
      const filtros: FiltrosNotificacaoDto = {};

      const mockResult = {
        items: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          pages: 0,
        },
        filtros: {},
        estatisticas: {
          naoLidas: 0,
          arquivadas: 0,
        },
      };

      mockNotificacaoService.findAll.mockResolvedValue(mockResult);

      await controller.findAll(mockRequest, filtros);

      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: undefined,
        tipo: undefined,
        categoria: undefined,
        prioridade: undefined,
        dataInicio: undefined,
        dataFim: undefined,
        lidas: undefined,
        arquivadas: false,
        ordenarPor: 'created_at',
        ordem: 'DESC',
        busca: undefined,
        userId: 'user-123',
      });
    });
  });
});
