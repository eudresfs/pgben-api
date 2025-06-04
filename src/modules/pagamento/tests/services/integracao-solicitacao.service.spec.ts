import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { IntegracaoSolicitacaoService } from '../../services/integracao-solicitacao.service';
import { StatusPagamentoEnum } from '../../enums/status-pagamento.enum';
import { NotFoundException, ConflictException } from '@nestjs/common';

/**
 * Testes unitários para o serviço de integração com o módulo de solicitação
 *
 * Verifica o funcionamento correto das operações de consulta e atualização
 * de status de solicitações relacionadas a pagamentos.
 *
 * @author Equipe PGBen
 */
describe('IntegracaoSolicitacaoService', () => {
  let service: IntegracaoSolicitacaoService;
  let httpService: HttpService;
  let configService: ConfigService;

  // Mock do HttpService
  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  };

  // Mock do ConfigService
  const mockConfigService = {
    get: jest.fn().mockImplementation((key) => {
      if (key === 'solicitacao.apiUrl') {
        return 'http://api-solicitacao.pgben.local';
      }
      if (key === 'solicitacao.apiKey') {
        return 'api-key-mock';
      }
      if (key === 'solicitacao.statusPagamentoPendente') {
        return 'PAGAMENTO_PENDENTE';
      }
      if (key === 'solicitacao.statusPagamentoRealizado') {
        return 'PAGAMENTO_REALIZADO';
      }
      if (key === 'solicitacao.statusPagamentoCancelado') {
        return 'PAGAMENTO_CANCELADO';
      }
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegracaoSolicitacaoService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<IntegracaoSolicitacaoService>(
      IntegracaoSolicitacaoService,
    );
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);

    // Limpar mocks antes de cada teste
    jest.clearAllMocks();
  });

  describe('verificarStatusSolicitacao', () => {
    const solicitacaoId = 'solicitacao-id';

    const mockSolicitacao = {
      id: solicitacaoId,
      status: 'PAGAMENTO_PENDENTE',
      cidadaoId: 'cidadao-id',
      valorAprovado: 500.0,
      createdAt: '2023-01-01T00:00:00Z',
    };

    it('deve retornar status da solicitação quando encontrada', async () => {
      // Configurar mock da resposta HTTP
      const axiosResponse: AxiosResponse = {
        data: mockSolicitacao,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} } as any,
      };

      mockHttpService.get.mockReturnValue(of(axiosResponse));

      // Executar método
      const result = await service.verificarStatusSolicitacao(solicitacaoId);

      // Verificar resultado
      expect(result).toEqual(mockSolicitacao.status);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        `http://api-solicitacao.pgben.local/solicitacoes/${solicitacaoId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'api-key-mock',
          }),
        }),
      );
    });

    it('deve lançar NotFoundException quando solicitação não encontrada', async () => {
      // Configurar mock do erro HTTP
      mockHttpService.get.mockReturnValue(
        throwError(() => ({
          response: {
            status: 404,
            data: { message: 'Solicitação não encontrada' },
          },
        })),
      );

      // Executar e verificar exceção
      await expect(
        service.verificarStatusSolicitacao(solicitacaoId),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve propagar outros erros HTTP', async () => {
      // Configurar mock do erro HTTP
      mockHttpService.get.mockReturnValue(
        throwError(() => ({
          response: {
            status: 500,
            data: { message: 'Erro interno do servidor' },
          },
        })),
      );

      // Executar e verificar exceção
      await expect(
        service.verificarStatusSolicitacao(solicitacaoId),
      ).rejects.toThrow();
    });
  });

  describe('verificarSolicitacaoElegivel', () => {
    const solicitacaoId = 'solicitacao-id';

    it('deve retornar true quando solicitação está elegível para pagamento', async () => {
      // Configurar mock para verificarStatusSolicitacao
      jest
        .spyOn(service, 'verificarStatusSolicitacao')
        .mockResolvedValue('PAGAMENTO_PENDENTE');

      // Executar método
      const result = await service.verificarSolicitacaoElegivel(solicitacaoId);

      // Verificar resultado
      expect(result).toBe(true);
      expect(service.verificarStatusSolicitacao).toHaveBeenCalledWith(
        solicitacaoId,
      );
    });

    it('deve retornar false quando solicitação não está elegível para pagamento', async () => {
      // Configurar mock para verificarStatusSolicitacao
      jest
        .spyOn(service, 'verificarStatusSolicitacao')
        .mockResolvedValue('PAGAMENTO_REALIZADO');

      // Executar método
      const result = await service.verificarSolicitacaoElegivel(solicitacaoId);

      // Verificar resultado
      expect(result).toBe(false);
    });

    it('deve propagar exceções de verificarStatusSolicitacao', async () => {
      // Configurar mock para verificarStatusSolicitacao
      jest
        .spyOn(service, 'verificarStatusSolicitacao')
        .mockRejectedValue(new NotFoundException('Solicitação não encontrada'));

      // Executar e verificar exceção
      await expect(
        service.verificarSolicitacaoElegivel(solicitacaoId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('atualizarStatusSolicitacao', () => {
    const solicitacaoId = 'solicitacao-id';
    const usuarioId = 'usuario-id';
    const statusPagamento = StatusPagamentoEnum.LIBERADO;

    const mockResposta = {
      id: solicitacaoId,
      status: 'PAGAMENTO_REALIZADO',
      updatedAt: '2023-01-02T00:00:00Z',
    };

    it('deve atualizar status da solicitação para PAGAMENTO_REALIZADO quando pagamento liberado', async () => {
      // Configurar mock da resposta HTTP
      const axiosResponse: AxiosResponse = {
        data: mockResposta,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} } as any,
      };

      mockHttpService.patch.mockReturnValue(of(axiosResponse));

      // Executar método
      const result = await service.atualizarStatusSolicitacao(
        solicitacaoId,
        statusPagamento,
        usuarioId,
      );

      // Verificar resultado
      expect(result).toBe(true);
      expect(mockHttpService.patch).toHaveBeenCalledWith(
        `http://api-solicitacao.pgben.local/solicitacoes/${solicitacaoId}/status`,
        { status: 'PAGAMENTO_REALIZADO', motivo: expect.any(String) },
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'api-key-mock',
            'x-user-id': usuarioId,
          }),
        }),
      );
    });

    it('deve atualizar status da solicitação para PAGAMENTO_CANCELADO quando pagamento cancelado', async () => {
      // Configurar mock da resposta HTTP
      const axiosResponse: AxiosResponse = {
        data: { ...mockResposta, status: 'PAGAMENTO_CANCELADO' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} } as any,
      };

      mockHttpService.patch.mockReturnValue(of(axiosResponse));

      // Executar método
      const result = await service.atualizarStatusSolicitacao(
        solicitacaoId,
        StatusPagamentoEnum.CANCELADO,
        usuarioId,
      );

      // Verificar resultado
      expect(result).toBe(true);
      expect(mockHttpService.patch).toHaveBeenCalledWith(
        `http://api-solicitacao.pgben.local/solicitacoes/${solicitacaoId}/status`,
        { status: 'PAGAMENTO_CANCELADO', motivo: expect.any(String) },
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'api-key-mock',
            'x-user-id': usuarioId,
          }),
        }),
      );
    });

    it('deve lançar ConflictException quando status de pagamento não requer atualização da solicitação', async () => {
      // Executar e verificar exceção
      await expect(
        service.atualizarStatusSolicitacao(
          solicitacaoId,
          StatusPagamentoEnum.AGENDADO,
          usuarioId,
        ),
      ).rejects.toThrow(ConflictException);

      expect(mockHttpService.patch).not.toHaveBeenCalled();
    });

    it('deve lançar NotFoundException quando solicitação não encontrada', async () => {
      // Configurar mock do erro HTTP
      mockHttpService.patch.mockReturnValue(
        throwError(() => ({
          response: {
            status: 404,
            data: { message: 'Solicitação não encontrada' },
          },
        })),
      );

      // Executar e verificar exceção
      await expect(
        service.atualizarStatusSolicitacao(
          solicitacaoId,
          StatusPagamentoEnum.LIBERADO,
          usuarioId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve propagar outros erros HTTP', async () => {
      // Configurar mock do erro HTTP
      mockHttpService.patch.mockReturnValue(
        throwError(() => ({
          response: {
            status: 500,
            data: { message: 'Erro interno do servidor' },
          },
        })),
      );

      // Executar e verificar exceção
      await expect(
        service.atualizarStatusSolicitacao(
          solicitacaoId,
          StatusPagamentoEnum.LIBERADO,
          usuarioId,
        ),
      ).rejects.toThrow();
    });
  });

  describe('obterDetalhesSolicitacao', () => {
    const solicitacaoId = 'solicitacao-id';

    const mockSolicitacao = {
      id: solicitacaoId,
      status: 'PAGAMENTO_PENDENTE',
      cidadaoId: 'cidadao-id',
      valorAprovado: 500.0,
      createdAt: '2023-01-01T00:00:00Z',
      beneficio: {
        id: 'beneficio-id',
        nome: 'Auxílio Moradia',
        descricao: 'Auxílio para famílias em situação de vulnerabilidade',
      },
      unidade: {
        id: 'unidade-id',
        nome: 'CRAS Centro',
        endereco: 'Rua Principal, 123',
      },
    };

    it('deve retornar detalhes da solicitação quando encontrada', async () => {
      // Configurar mock da resposta HTTP
      const axiosResponse: AxiosResponse = {
        data: mockSolicitacao,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} } as any,
      };

      mockHttpService.get.mockReturnValue(of(axiosResponse));

      // Executar método
      const result = await service.obterDetalhesSolicitacao(solicitacaoId);

      // Verificar resultado
      expect(result).toEqual(mockSolicitacao);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        `http://api-solicitacao.pgben.local/solicitacoes/${solicitacaoId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'api-key-mock',
          }),
          params: {
            expand: 'beneficio,unidade',
          },
        }),
      );
    });

    it('deve lançar NotFoundException quando solicitação não encontrada', async () => {
      // Configurar mock do erro HTTP
      mockHttpService.get.mockReturnValue(
        throwError(() => ({
          response: {
            status: 404,
            data: { message: 'Solicitação não encontrada' },
          },
        })),
      );

      // Executar e verificar exceção
      await expect(
        service.obterDetalhesSolicitacao(solicitacaoId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
