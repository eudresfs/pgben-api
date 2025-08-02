import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchJobManagerService } from '../batch-job-manager.service';
import { DocumentoBatchJob } from '../../../../../entities/documento-batch-job.entity';
import { StatusDownloadLoteEnum } from '../../../../../entities/documento-batch-job.entity';

/**
 * Testes unitários para BatchJobManagerService
 * 
 * Valida o gerenciamento de jobs simultâneos por usuário,
 * incluindo rate limiting e controle de concorrência
 */
describe('BatchJobManagerService', () => {
  let service: BatchJobManagerService;
  let repository: Repository<DocumentoBatchJob>;

  // Mock do repositório
  const mockRepository = {
    count: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchJobManagerService,
        {
          provide: getRepositoryToken(DocumentoBatchJob),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BatchJobManagerService>(BatchJobManagerService);
    repository = module.get<Repository<DocumentoBatchJob>>(
      getRepositoryToken(DocumentoBatchJob),
    );

    // Limpar mocks antes de cada teste
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
  });

  describe('podeIniciarJob', () => {
    it('deve permitir iniciar job quando usuário não tem jobs ativos', async () => {
      // Arrange
      const usuarioId = 'user-123';
      mockRepository.count.mockResolvedValue(0);

      // Act
      const resultado = await service.podeIniciarJob(usuarioId);

      // Assert
      expect(resultado.pode).toBe(true);
      expect(resultado.motivo).toBeUndefined();
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: {
          usuario_id: usuarioId,
          status: [
            StatusDownloadLoteEnum.PENDING,
            StatusDownloadLoteEnum.PROCESSING,
          ],
        },
      });
    });

    it('deve permitir iniciar job quando usuário tem menos que o máximo de jobs', async () => {
      // Arrange
      const usuarioId = 'user-123';
      mockRepository.count.mockResolvedValue(1); // 1 job ativo, máximo é 2

      // Act
      const resultado = await service.podeIniciarJob(usuarioId);

      // Assert
      expect(resultado.pode).toBe(true);
      expect(resultado.motivo).toBeUndefined();
    });

    it('deve rejeitar quando usuário já tem o máximo de jobs ativos', async () => {
      // Arrange
      const usuarioId = 'user-123';
      mockRepository.count.mockResolvedValue(2); // Máximo de jobs atingido

      // Act
      const resultado = await service.podeIniciarJob(usuarioId);

      // Assert
      expect(resultado.pode).toBe(false);
      expect(resultado.motivo).toContain('Limite de 2 jobs simultâneos atingido');
    });
  });

  describe('adicionarJobFila', () => {
    it('deve permitir adicionar job quando usuário pode iniciar', async () => {
      // Arrange
      const usuarioId = 'user-123';
      const filtros = { tipo: 'documento' };
      mockRepository.count.mockResolvedValue(0);

      // Act & Assert
      await expect(
        service.adicionarJobFila(usuarioId, filtros),
      ).resolves.not.toThrow();
    });

    it('deve lançar exceção quando usuário não pode iniciar job', async () => {
      // Arrange
      const usuarioId = 'user-123';
      const filtros = { tipo: 'documento' };
      mockRepository.count.mockResolvedValue(2); // Máximo atingido

      // Act & Assert
      await expect(
        service.adicionarJobFila(usuarioId, filtros),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('obterEstatisticasUsuario', () => {
    it('deve retornar estatísticas do usuário', async () => {
      // Arrange
      const usuarioId = 'user-123';
      mockRepository.count
        .mockResolvedValueOnce(1) // jobsAtivos
        .mockResolvedValueOnce(5) // jobsConcluidos
        .mockResolvedValueOnce(2) // jobsFalharam
        .mockResolvedValueOnce(8); // totalJobs

      // Act
      const resultado = await service.obterEstatisticasUsuario(usuarioId);

      // Assert
      expect(resultado).toEqual({
        jobsAtivos: 1,
        jobsConcluidos: 5,
        jobsFalharam: 2,
        totalJobs: 8,
      });
      expect(mockRepository.count).toHaveBeenCalledTimes(4);
    });
  });

  describe('cancelarJobsExpirados', () => {
    it('deve cancelar jobs expirados', async () => {
      // Arrange
      const jobsExpirados = [
        {
          id: 'job-expired-1',
          status: StatusDownloadLoteEnum.PROCESSING,
          created_at: new Date(Date.now() - 45 * 60 * 1000), // 45 minutos atrás
        },
        {
          id: 'job-expired-2',
          status: StatusDownloadLoteEnum.PROCESSING,
          created_at: new Date(Date.now() - 60 * 60 * 1000), // 60 minutos atrás
        },
      ];
      
      mockRepository.find.mockResolvedValue(jobsExpirados);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      // Act
      const resultado = await service.cancelarJobsExpirados();

      // Assert
      expect(resultado).toBe(jobsExpirados.length);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          status: [
            StatusDownloadLoteEnum.PENDING,
            StatusDownloadLoteEnum.PROCESSING,
          ],
          created_at: expect.any(Object),
        },
      });
      expect(mockRepository.update).toHaveBeenCalledTimes(2);
    });

    it('deve retornar 0 quando não há jobs expirados', async () => {
      // Arrange
      mockRepository.find.mockResolvedValue([]);

      // Act
      const resultado = await service.cancelarJobsExpirados();

      // Assert
      expect(resultado).toBe(0);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });
});