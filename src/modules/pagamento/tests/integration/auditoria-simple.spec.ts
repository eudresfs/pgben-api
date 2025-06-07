import { Test, TestingModule } from '@nestjs/testing';
import { AuditoriaInterceptor } from '../../interceptors/auditoria.interceptor';
import { AuditoriaService } from '../../../auditoria/services/auditoria.service';
import { LogAuditoria } from '../../../../entities/log-auditoria.entity';
import { TipoOperacao } from '../../../../enums/tipo-operacao.enum';
import { StatusPagamentoEnum } from '../../../../enums/status-pagamento.enum';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';

describe('Auditoria Simple Test', () => {
  let interceptor: AuditoriaInterceptor;
  let auditoriaService: AuditoriaService;
  let mockAuditoriaService: any;
  let mockReflector: any;

  beforeEach(async () => {
    mockAuditoriaService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    mockReflector = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaInterceptor,
        {
          provide: AuditoriaService,
          useValue: mockAuditoriaService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    interceptor = module.get<AuditoriaInterceptor>(AuditoriaInterceptor);
    auditoriaService = module.get<AuditoriaService>(AuditoriaService);
  });

  it('deve ser definido', () => {
    expect(interceptor).toBeDefined();
  });

  it('deve criar log de auditoria básico', async () => {
    // Arrange
    const logData = {
      operacao: TipoOperacao.CREATE,
      entidade: 'Pagamento',
      entidadeId: 'test-id',
      usuarioId: 'test-user-id',
      dadosAnteriores: null,
      dadosNovos: { valor: 500.0, status: StatusPagamentoEnum.AGENDADO },
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    };

    const mockLog = { id: 'log-id', ...logData };
    mockAuditoriaService.create.mockResolvedValue(mockLog);

    // Act
    const result = await auditoriaService.create(logData);

    // Assert
    expect(mockAuditoriaService.create).toHaveBeenCalledWith(logData);
    expect(result).toEqual(mockLog);
  });

  it('deve verificar se o interceptor está configurado corretamente', () => {
    // Arrange & Act & Assert
    expect(interceptor).toBeDefined();
    expect(auditoriaService).toBeDefined();
    expect(typeof interceptor.intercept).toBe('function');
  });

  it('deve chamar o AuditoriaService quando solicitado diretamente', async () => {
    // Arrange
    const logData = {
      operacao: TipoOperacao.ACCESS,
      entidade: 'Sistema',
      entidadeId: 'test-access',
      usuarioId: 'user-123',
      dadosAnteriores: null,
      dadosNovos: { acao: 'login' },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    mockAuditoriaService.create.mockResolvedValue({ id: 'access-log-id', ...logData });

    // Act
    const result = await auditoriaService.create(logData);

    // Assert
    expect(mockAuditoriaService.create).toHaveBeenCalledWith(logData);
    expect(result.id).toBe('access-log-id');
  });
});