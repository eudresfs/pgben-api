import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PagamentoWorkflowService } from './pagamento-workflow.service';
import { PagamentoRepository } from '../repositories/pagamento.repository';
import { PagamentoSystemRepository } from '../repositories/pagamento-system.repository';
import { ConfirmacaoRepository } from '../repositories/confirmacao.repository';
import { PagamentoValidationService } from './pagamento-validation.service';
import { DocumentoService } from '../../documento/services/documento.service';
import { PagamentoEventosService } from './pagamento-eventos.service';
import { ConcessaoAutoUpdateService } from './concessao-auto-update.service';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { Pagamento } from '../../../entities/pagamento.entity';

describe('PagamentoWorkflowService - Validação Parcela Anterior', () => {
  let service: PagamentoWorkflowService;
  let pagamentoRepository: jest.Mocked<PagamentoRepository>;
  let pagamentoSystemRepository: jest.Mocked<PagamentoSystemRepository>;
  let validationService: jest.Mocked<PagamentoValidationService>;

  beforeEach(async () => {
    const mockPagamentoRepository = {
      findById: jest.fn(),
      findByIdWithRelations: jest.fn(),
      findParcelaAnterior: jest.fn(),
      update: jest.fn(),
    };

    const mockPagamentoSystemRepository = {
      findAgendadosParaLiberacao: jest.fn(),
      update: jest.fn(),
    };

    const mockValidationService = {
      validateStatusTransition: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagamentoWorkflowService,
        {
          provide: PagamentoRepository,
          useValue: mockPagamentoRepository,
        },
        {
          provide: PagamentoSystemRepository,
          useValue: mockPagamentoSystemRepository,
        },
        {
          provide: ConfirmacaoRepository,
          useValue: {},
        },
        {
          provide: PagamentoValidationService,
          useValue: mockValidationService,
        },
        {
          provide: DocumentoService,
          useValue: {},
        },
        {
          provide: PagamentoEventosService,
          useValue: {
            emitirEventoStatusAtualizado: jest.fn(),
          },
        },
        {
          provide: ConcessaoAutoUpdateService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<PagamentoWorkflowService>(PagamentoWorkflowService);
    pagamentoRepository = module.get(PagamentoRepository);
    pagamentoSystemRepository = module.get(PagamentoSystemRepository);
    validationService = module.get(PagamentoValidationService);
  });

  describe('processUpdateStatus - Validação Parcela Anterior', () => {
    it('deve permitir liberação da primeira parcela sem validar parcela anterior', async () => {
      // Arrange
      const pagamento = {
        id: '1',
        numero_parcela: 1,
        status: StatusPagamentoEnum.PENDENTE,
        concessao_id: 'concessao-1',
      } as Pagamento;

      const updateDto = {
        id: '1',
        status: StatusPagamentoEnum.LIBERADO,
      };

      pagamentoRepository.findById.mockResolvedValue(pagamento);
      validationService.validateStatusTransition.mockReturnValue({
        isValid: true,
        errors: [],
      });
      pagamentoRepository.update.mockResolvedValue({
        id: '1',
        status: StatusPagamentoEnum.LIBERADO,
        numero_parcela: 1,
        concessao_id: 'concessao-1',
      } as any);

      // Act
      const result = await service['processUpdateStatus'](updateDto, 'user-1');

      // Assert
      expect(result.success).toBe(true);
      expect(pagamentoRepository.findParcelaAnterior).not.toHaveBeenCalled();
    });

    it('deve validar parcela anterior para segunda parcela e permitir liberação se confirmada', async () => {
      // Arrange
      const pagamento = {
        id: '2',
        numero_parcela: 2,
        status: StatusPagamentoEnum.PENDENTE,
        concessao_id: 'concessao-1',
      } as Pagamento;

      const parcelaAnterior = {
        id: '1',
        numero_parcela: 1,
        status: StatusPagamentoEnum.CONFIRMADO,
        concessao_id: 'concessao-1',
      } as Pagamento;

      const updateDto = {
        id: '2',
        status: StatusPagamentoEnum.LIBERADO,
      };

      pagamentoRepository.findById.mockResolvedValue(pagamento);
      validationService.validateStatusTransition.mockReturnValue({
        isValid: true,
        errors: [],
      });
      pagamentoRepository.findParcelaAnterior.mockResolvedValue(parcelaAnterior);
      pagamentoRepository.update.mockResolvedValue({
        ...pagamento,
        status: StatusPagamentoEnum.LIBERADO,
      });

      // Act
      const result = await service['processUpdateStatus'](updateDto, 'user-1');

      // Assert
      expect(result.success).toBe(true);
      expect(pagamentoRepository.findParcelaAnterior).toHaveBeenCalledWith(
        'concessao-1',
        1,
      );
    });

    it('deve permitir liberação mesmo se parcela anterior não estiver confirmada (apenas warning)', async () => {
      // Arrange
      const pagamento = {
        id: '2',
        numero_parcela: 2,
        status: StatusPagamentoEnum.PENDENTE,
        concessao_id: 'concessao-1',
      } as Pagamento;

      const parcelaAnterior = {
        id: '1',
        numero_parcela: 1,
        status: StatusPagamentoEnum.LIBERADO, // Não confirmada
        concessao_id: 'concessao-1',
      } as Pagamento;

      const updateDto = {
        id: '2',
        status: StatusPagamentoEnum.LIBERADO,
      };

      pagamentoRepository.findById.mockResolvedValue(pagamento);
      validationService.validateStatusTransition.mockReturnValue({
        isValid: true,
        errors: [],
      });
      pagamentoRepository.findParcelaAnterior.mockResolvedValue(parcelaAnterior);
      pagamentoRepository.update.mockResolvedValue({
        id: '2',
        status: StatusPagamentoEnum.LIBERADO,
        numero_parcela: 2,
        concessao_id: 'concessao-1',
      } as any);

      // Act
      const result = await service['processUpdateStatus'](updateDto, 'user-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Status atualizado com sucesso');
      expect(pagamentoRepository.update).toHaveBeenCalled();
    });

    it('deve permitir liberação mesmo se parcela anterior não for encontrada (apenas warning)', async () => {
      // Arrange
      const pagamento = {
        id: '2',
        numero_parcela: 2,
        status: StatusPagamentoEnum.PENDENTE,
        concessao_id: 'concessao-1',
      } as Pagamento;

      const updateDto = {
        id: '2',
        status: StatusPagamentoEnum.LIBERADO,
      };

      pagamentoRepository.findById.mockResolvedValue(pagamento);
      validationService.validateStatusTransition.mockReturnValue({
        isValid: true,
        errors: [],
      });
      pagamentoRepository.findParcelaAnterior.mockResolvedValue(null);
      pagamentoRepository.update.mockResolvedValue({
        id: '2',
        status: StatusPagamentoEnum.LIBERADO,
        numero_parcela: 2,
        concessao_id: 'concessao-1',
      } as any);

      // Act
      const result = await service['processUpdateStatus'](updateDto, 'user-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Status atualizado com sucesso');
      expect(pagamentoRepository.update).toHaveBeenCalled();
    });

    it('deve permitir outras transições de status sem validar parcela anterior', async () => {
      // Arrange
      const pagamento = {
        id: '2',
        numero_parcela: 2,
        status: StatusPagamentoEnum.PENDENTE,
        concessao_id: 'concessao-1',
      } as Pagamento;

      const updateDto = {
        id: '2',
        status: StatusPagamentoEnum.CANCELADO, // Não é liberação
      };

      pagamentoRepository.findById.mockResolvedValue(pagamento);
      validationService.validateStatusTransition.mockReturnValue({
        isValid: true,
        errors: [],
      });
      pagamentoRepository.update.mockResolvedValue({
        ...pagamento,
        status: StatusPagamentoEnum.CANCELADO,
      });

      // Act
      const result = await service['processUpdateStatus'](updateDto, 'user-1');

      // Assert
      expect(result.success).toBe(true);
      expect(pagamentoRepository.findParcelaAnterior).not.toHaveBeenCalled();
    });
  });

  describe('liberarPagamento - Status Agendado', () => {
    it('deve definir status como AGENDADO quando data_liberacao for futura', async () => {
      // Arrange
      const pagamento = {
        id: '1',
        numero_parcela: 1,
        status: StatusPagamentoEnum.PENDENTE,
        concessao_id: 'concessao-1',
      } as any;

      const dadosLiberacao = { 
        data_liberacao: new Date('2025-12-31'),
        observacoes: 'Teste' 
      };

      // Mock da verificação de elegibilidade
      jest.spyOn(service, 'verificarElegibilidadeLiberacao').mockResolvedValue({
        pode_liberar: true,
      });

      pagamentoRepository.findById.mockResolvedValue(pagamento);
      pagamentoRepository.findByIdWithRelations.mockResolvedValue(pagamento);
      pagamentoRepository.update.mockResolvedValue({
        ...pagamento,
        status: StatusPagamentoEnum.AGENDADO,
      });

      // Act
      const result = await service.liberarPagamento('1', dadosLiberacao, 'user-1');

      // Assert
      expect(result.status).toBe(StatusPagamentoEnum.AGENDADO);
      expect(pagamentoRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          status: StatusPagamentoEnum.AGENDADO,
          data_liberacao: expect.any(Date),
          liberado_por: 'user-1',
          observacoes: 'Teste',
        }),
      );
    });

    it('deve definir status como LIBERADO quando data_liberacao for hoje ou passada', async () => {
      // Arrange
      const hoje = new Date();
      const pagamento = {
        id: '1',
        numero_parcela: 1,
        status: StatusPagamentoEnum.PENDENTE,
        concessao_id: 'concessao-1',
      } as any;

      const dadosLiberacao = { 
        data_liberacao: new Date(),
        observacoes: 'Teste' 
      };

      // Mock da verificação de elegibilidade
      jest.spyOn(service, 'verificarElegibilidadeLiberacao').mockResolvedValue({
        pode_liberar: true,
      });

      pagamentoRepository.findById.mockResolvedValue(pagamento);
      pagamentoRepository.findByIdWithRelations.mockResolvedValue(pagamento);
      pagamentoRepository.update.mockResolvedValue({
        ...pagamento,
        status: StatusPagamentoEnum.LIBERADO,
      });

      // Act
      const result = await service.liberarPagamento('1', dadosLiberacao, 'user-1');

      // Assert
      expect(result.status).toBe(StatusPagamentoEnum.LIBERADO);
      expect(pagamentoRepository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          status: StatusPagamentoEnum.LIBERADO,
          data_liberacao: expect.any(Date),
          liberado_por: 'user-1',
          observacoes: 'Teste',
        }),
      );
    });
  });

  describe('processarPagamentosAgendados', () => {
    it('deve processar pagamentos agendados corretamente', async () => {
      // Arrange
      const pagamentosAgendados = [
        {
          id: '1',
          numero_parcela: 1,
          status: StatusPagamentoEnum.AGENDADO,
          concessao_id: 'concessao-1',
          concessao: { id: 'concessao-1', ativa: false },
        },
        {
          id: '2',
          numero_parcela: 2,
          status: StatusPagamentoEnum.AGENDADO,
          concessao_id: 'concessao-2',
          concessao: { id: 'concessao-2', ativa: true },
        },
      ] as any[];

      pagamentoSystemRepository.findAgendadosParaLiberacao.mockResolvedValue(
        pagamentosAgendados
      );
      
      // Mock do método update do pagamentoSystemRepository
      pagamentoSystemRepository.update.mockImplementation(async (id, dados) => {
        return { id, ...dados } as any;
      });

      // Act
      const result = await service.processarPagamentosAgendados();

      // Assert
      expect(pagamentoSystemRepository.findAgendadosParaLiberacao).toHaveBeenCalled();
      expect(pagamentoSystemRepository.update).toHaveBeenCalledTimes(2);
      expect(pagamentoSystemRepository.update).toHaveBeenNthCalledWith(
        1,
        '1',
        expect.objectContaining({
          status: StatusPagamentoEnum.LIBERADO,
          observacoes: 'Liberado automaticamente pelo sistema - agendamento processado',
        })
      );
      expect(pagamentoSystemRepository.update).toHaveBeenNthCalledWith(
        2,
        '2',
        expect.objectContaining({
          status: StatusPagamentoEnum.LIBERADO,
          observacoes: 'Liberado automaticamente pelo sistema - agendamento processado',
        })
      );
      expect(result).toHaveLength(2);
    });

    it('deve tratar erros durante o processamento', async () => {
      // Arrange
      const pagamentosAgendados = [
        {
          id: '1',
          numero_parcela: 1,
          status: StatusPagamentoEnum.AGENDADO,
          concessao_id: 'concessao-1',
        },
      ] as any[];

      pagamentoSystemRepository.findAgendadosParaLiberacao.mockResolvedValue(
        pagamentosAgendados
      );
      
      // Mock do método update para simular erro
      pagamentoSystemRepository.update.mockRejectedValue(new Error('Erro de teste'));
      
      const loggerSpy = jest.spyOn(service['logger'], 'error');

      // Act
      const result = await service.processarPagamentosAgendados();

      // Assert
      expect(loggerSpy).toHaveBeenCalled();
      expect(result).toHaveLength(0); // Nenhum pagamento processado devido ao erro
    });
  });
});