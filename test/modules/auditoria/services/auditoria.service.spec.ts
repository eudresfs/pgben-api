import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditoriaService } from '../../../../src/modules/auditoria/services/auditoria.service';
import { LogAuditoria } from '../../../../src/modules/auditoria/entities/log-auditoria.entity';
import { TipoOperacao } from '../../../../src/modules/auditoria/enums/tipo-operacao.enum';
import { CreateLogAuditoriaDto } from '../../../../src/modules/auditoria/dto/create-log-auditoria.dto';
import { NotFoundException } from '@nestjs/common';

describe('AuditoriaService', () => {
  let service: AuditoriaService;
  let repository: Repository<LogAuditoria>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaService,
        {
          provide: getRepositoryToken(LogAuditoria),
          useValue: {
            create: jest.fn().mockImplementation((dto) => dto),
            save: jest.fn().mockResolvedValue({ id: 'mock-log-id' }),
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
          },
        },
      ],
    }).compile();

    service = module.get<AuditoriaService>(AuditoriaService);
    repository = module.get<Repository<LogAuditoria>>(
      getRepositoryToken(LogAuditoria),
    );
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('deve criar um novo log de auditoria', async () => {
      const createDto = new CreateLogAuditoriaDto();
      createDto.tipo_operacao = TipoOperacao.CREATE;
      createDto.entidade_afetada = 'Usuario';
      createDto.entidade_id = '123e4567-e89b-12d3-a456-426614174000';
      createDto.descricao = 'Criação de novo usuário';
      createDto.ip_origem = '192.168.1.1';
      createDto.usuario_id = 'mock-user-id';

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 'mock-log-id' });
    });

    it('deve validar os dados antes de criar', async () => {
      const invalidDto = new CreateLogAuditoriaDto();
      // Não definimos campos obrigatórios

      // Mockamos o método de validação para simular falha
      jest
        .spyOn(CreateLogAuditoriaDto.prototype, 'validar')
        .mockImplementation(() => {
          throw new Error('Dados inválidos');
        });

      await expect(service.create(invalidDto)).rejects.toThrow(
        'Dados inválidos',
      );
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('deve retornar uma lista de logs de auditoria', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          tipo_operacao: TipoOperacao.CREATE,
          entidade_afetada: 'Usuario',
          created_at: new Date(),
        },
        {
          id: 'log-2',
          tipo_operacao: TipoOperacao.UPDATE,
          entidade_afetada: 'Documento',
          created_at: new Date(),
        },
      ];

      jest
        .spyOn(repository, 'find')
        .mockResolvedValueOnce(mockLogs as LogAuditoria[]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalled();
      expect(result).toEqual(mockLogs);
    });

    it('deve aplicar filtros quando fornecidos', async () => {
      const filtros = {
        tipo_operacao: TipoOperacao.CREATE,
        entidade_afetada: 'Usuario',
        usuario_id: 'user-1',
        data_inicio: new Date('2023-01-01'),
        data_fim: new Date('2023-01-31'),
      };

      await service.findAll(filtros);

      expect(repository.find).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tipo_operacao: TipoOperacao.CREATE,
          entidade_afetada: 'Usuario',
          usuario_id: 'user-1',
          created_at: expect.any(Object),
        }),
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('deve retornar um log de auditoria pelo ID', async () => {
      const mockLog = {
        id: 'log-1',
        tipo_operacao: TipoOperacao.CREATE,
        entidade_afetada: 'Usuario',
        created_at: new Date(),
      };

      jest
        .spyOn(repository, 'findOne')
        .mockResolvedValueOnce(mockLog as LogAuditoria);

      const result = await service.findOne('log-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'log-1' },
      });
      expect(result).toEqual(mockLog);
    });

    it('deve lançar NotFoundException quando o log não é encontrado', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('deve atualizar um log de auditoria existente', async () => {
      const updateDto = {
        descricao: 'Descrição atualizada',
      };

      const mockLog = {
        id: 'log-1',
        tipo_operacao: TipoOperacao.CREATE,
        entidade_afetada: 'Usuario',
        descricao: 'Descrição original',
        created_at: new Date(),
      };

      jest
        .spyOn(repository, 'findOne')
        .mockResolvedValueOnce(mockLog as LogAuditoria);

      await service.update('log-1', updateDto);

      expect(repository.update).toHaveBeenCalledWith('log-1', updateDto);
    });

    it('deve lançar NotFoundException quando o log não é encontrado', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);

      await expect(service.update('non-existent-id', {})).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deve remover um log de auditoria existente', async () => {
      const mockLog = {
        id: 'log-1',
        tipo_operacao: TipoOperacao.CREATE,
        entidade_afetada: 'Usuario',
        created_at: new Date(),
      };

      jest
        .spyOn(repository, 'findOne')
        .mockResolvedValueOnce(mockLog as LogAuditoria);

      await service.remove('log-1');

      expect(repository.delete).toHaveBeenCalledWith('log-1');
    });

    it('deve lançar NotFoundException quando o log não é encontrado', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('findByEntidade', () => {
    it('deve retornar logs de auditoria para uma entidade específica', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          tipo_operacao: TipoOperacao.CREATE,
          entidade_afetada: 'Usuario',
          entidade_id: 'user-1',
          created_at: new Date(),
        },
        {
          id: 'log-2',
          tipo_operacao: TipoOperacao.UPDATE,
          entidade_afetada: 'Usuario',
          entidade_id: 'user-1',
          created_at: new Date(),
        },
      ];

      jest
        .spyOn(repository, 'find')
        .mockResolvedValueOnce(mockLogs as LogAuditoria[]);

      const result = await service.findByEntidade('Usuario', 'user-1');

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          entidade_afetada: 'Usuario',
          entidade_id: 'user-1',
        },
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual(mockLogs);
    });
  });
});
