import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PagamentoWorkflowService } from './pagamento-workflow.service';
import { PagamentoRepository } from '../repositories/pagamento.repository';
import { ConfirmacaoRepository } from '../repositories/confirmacao.repository';
import { PagamentoValidationService } from './pagamento-validation.service';
import { DocumentoService } from '../../documento/services/documento.service';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { Pagamento } from '../../../entities/pagamento.entity';

describe('PagamentoWorkflowService - Validação Parcela Anterior', () => {
  let service: PagamentoWorkflowService;
  let pagamentoRepository: jest.Mocked<PagamentoRepository>;
  let validationService: jest.Mocked<PagamentoValidationService>;

  beforeEach(async () => {
    const mockPagamentoRepository = {
      findById: jest.fn(),
      findParcelaAnterior: jest.fn(),
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
      ],
    }).compile();

    service = module.get<PagamentoWorkflowService>(PagamentoWorkflowService);
    pagamentoRepository = module.get(PagamentoRepository);
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
        ...pagamento,
        status: StatusPagamentoEnum.LIBERADO,
      });

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

    it('deve impedir liberação se parcela anterior não estiver confirmada', async () => {
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

      // Act
      const result = await service['processUpdateStatus'](updateDto, 'user-1');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe(
        'Não é possível liberar: parcela anterior não confirmada',
      );
      expect(result.errors).toContain(
        'Parcela anterior (1) deve estar confirmada antes da liberação desta parcela',
      );
      expect(pagamentoRepository.update).not.toHaveBeenCalled();
    });

    it('deve impedir liberação se parcela anterior não for encontrada', async () => {
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

      // Act
      const result = await service['processUpdateStatus'](updateDto, 'user-1');

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe(
        'Não é possível liberar: parcela anterior não confirmada',
      );
      expect(result.errors).toContain('Parcela anterior (1) não encontrada');
      expect(pagamentoRepository.update).not.toHaveBeenCalled();
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
});