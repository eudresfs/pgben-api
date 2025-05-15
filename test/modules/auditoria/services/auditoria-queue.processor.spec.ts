import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditoriaQueueProcessor } from '../../../../src/modules/auditoria/services/auditoria-queue.processor';
import { LogAuditoria } from '../../../../src/modules/auditoria/entities/log-auditoria.entity';
import { TipoOperacao } from '../../../../src/modules/auditoria/enums/tipo-operacao.enum';
import { Logger } from '@nestjs/common';

describe('AuditoriaQueueProcessor', () => {
  let processor: AuditoriaQueueProcessor;
  let logAuditoriaRepository: Repository<LogAuditoria>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaQueueProcessor,
        {
          provide: getRepositoryToken(LogAuditoria),
          useValue: {
            create: jest.fn().mockImplementation(dto => dto),
            save: jest.fn().mockResolvedValue({ id: 'mock-log-id' }),
            findOne: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<AuditoriaQueueProcessor>(AuditoriaQueueProcessor);
    logAuditoriaRepository = module.get<Repository<LogAuditoria>>(getRepositoryToken(LogAuditoria));
  });

  it('deve ser definido', () => {
    expect(processor).toBeDefined();
  });

  describe('processarLogAuditoria', () => {
    it('deve processar um log de auditoria com sucesso', async () => {
      const mockJob = {
        data: {
          tipo_operacao: TipoOperacao.CREATE,
          entidade_afetada: 'Usuario',
          entidade_id: '123e4567-e89b-12d3-a456-426614174000',
          descricao: 'Criação de novo usuário',
          ip_origem: '192.168.1.1',
          usuario_id: 'mock-user-id',
        },
      };

      await processor.processarLogAuditoria(mockJob as any);

      expect(logAuditoriaRepository.create).toHaveBeenCalledWith(mockJob.data);
      expect(logAuditoriaRepository.save).toHaveBeenCalled();
    });

    it('deve lidar com erros ao processar log de auditoria', async () => {
      const mockJob = {
        data: {
          tipo_operacao: TipoOperacao.CREATE,
          entidade_afetada: 'Usuario',
        },
      };

      jest.spyOn(logAuditoriaRepository, 'save').mockRejectedValueOnce(new Error('Erro ao salvar'));

      await expect(processor.processarLogAuditoria(mockJob as any)).rejects.toThrow('Erro ao salvar');
    });
  });

  describe('processarAcessoDadosSensiveis', () => {
    it('deve processar um registro de acesso a dados sensíveis', async () => {
      const mockJob = {
        data: {
          tipo_operacao: TipoOperacao.READ,
          entidade_afetada: 'Usuario',
          entidade_id: '123e4567-e89b-12d3-a456-426614174000',
          dados_sensiveis_acessados: ['cpf', 'renda_familiar'],
          ip_origem: '192.168.1.1',
          usuario_id: 'mock-user-id',
          descricao: 'Acesso a dados sensíveis',
        },
      };

      await processor.processarAcessoDadosSensiveis(mockJob as any);

      expect(logAuditoriaRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_operacao: TipoOperacao.READ,
          entidade_afetada: 'Usuario',
          entidade_id: '123e4567-e89b-12d3-a456-426614174000',
          dados_sensiveis_acessados: ['cpf', 'renda_familiar'],
        }),
      );
      expect(logAuditoriaRepository.save).toHaveBeenCalled();
    });

    it('deve adicionar descrição padrão se não fornecida', async () => {
      const mockJob = {
        data: {
          tipo_operacao: TipoOperacao.READ,
          entidade_afetada: 'Usuario',
          entidade_id: '123e4567-e89b-12d3-a456-426614174000',
          dados_sensiveis_acessados: ['cpf'],
          ip_origem: '192.168.1.1',
          usuario_id: 'mock-user-id',
        },
      };

      await processor.processarAcessoDadosSensiveis(mockJob as any);

      expect(logAuditoriaRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          descricao: expect.stringContaining('Acesso a dados sensíveis'),
        }),
      );
    });
  });
});
