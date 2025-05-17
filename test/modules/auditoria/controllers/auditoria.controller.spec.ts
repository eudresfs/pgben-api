import { Test, TestingModule } from '@nestjs/testing';
import { AuditoriaController } from '../../../../src/modules/auditoria/controllers/auditoria.controller';
import { AuditoriaService } from '../../../../src/modules/auditoria/services/auditoria.service';
import { TipoOperacao } from '../../../../src/modules/auditoria/enums/tipo-operacao.enum';
import { CreateLogAuditoriaDto } from '../../../../src/modules/auditoria/dto/create-log-auditoria.dto';
import { LogAuditoria } from '../../../../src/modules/auditoria/entities/log-auditoria.entity';
import { NotFoundException } from '@nestjs/common';

describe('AuditoriaController', () => {
  let controller: AuditoriaController;
  let service: AuditoriaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditoriaController],
      providers: [
        {
          provide: AuditoriaService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            findByEntidade: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuditoriaController>(AuditoriaController);
    service = module.get<AuditoriaService>(AuditoriaService);
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
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

      const mockResult = { id: 'mock-log-id', ...createDto };
      jest
        .spyOn(service, 'create')
        .mockResolvedValue(mockResult as LogAuditoria);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockResult);
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
        .spyOn(service, 'findAll')
        .mockResolvedValue(mockLogs as LogAuditoria[]);

      const result = await controller.findAll({});

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockLogs);
    });

    it('deve aplicar filtros quando fornecidos', async () => {
      const filtros = {
        tipo_operacao: TipoOperacao.CREATE,
        entidade_afetada: 'Usuario',
        usuario_id: 'user-1',
        data_inicio: '2023-01-01',
        data_fim: '2023-01-31',
      };

      const mockLogs = [
        {
          id: 'log-1',
          tipo_operacao: TipoOperacao.CREATE,
          entidade_afetada: 'Usuario',
          usuario_id: 'user-1',
          created_at: new Date('2023-01-15'),
        },
      ];

      jest
        .spyOn(service, 'findAll')
        .mockResolvedValue(mockLogs as LogAuditoria[]);

      const result = await controller.findAll(filtros);

      expect(service.findAll).toHaveBeenCalledWith({
        tipo_operacao: TipoOperacao.CREATE,
        entidade_afetada: 'Usuario',
        usuario_id: 'user-1',
        data_inicio: new Date('2023-01-01'),
        data_fim: new Date('2023-01-31'),
      });
      expect(result).toEqual(mockLogs);
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

      jest.spyOn(service, 'findOne').mockResolvedValue(mockLog as LogAuditoria);

      const result = await controller.findOne('log-1');

      expect(service.findOne).toHaveBeenCalledWith('log-1');
      expect(result).toEqual(mockLog);
    });

    it('deve lançar NotFoundException quando o log não é encontrado', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
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
        .spyOn(service, 'findByEntidade')
        .mockResolvedValue(mockLogs as LogAuditoria[]);

      const result = await controller.findByEntidade('Usuario', 'user-1');

      expect(service.findByEntidade).toHaveBeenCalledWith('Usuario', 'user-1');
      expect(result).toEqual(mockLogs);
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
        descricao: 'Descrição atualizada',
        created_at: new Date(),
      };

      jest.spyOn(service, 'update').mockResolvedValue(mockLog as LogAuditoria);

      const result = await controller.update('log-1', updateDto);

      expect(service.update).toHaveBeenCalledWith('log-1', updateDto);
      expect(result).toEqual(mockLog);
    });

    it('deve lançar NotFoundException quando o log não é encontrado', async () => {
      jest.spyOn(service, 'update').mockRejectedValue(new NotFoundException());

      await expect(controller.update('non-existent-id', {})).rejects.toThrow(
        NotFoundException,
      );
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

      jest.spyOn(service, 'remove').mockResolvedValue(mockLog as LogAuditoria);

      const result = await controller.remove('log-1');

      expect(service.remove).toHaveBeenCalledWith('log-1');
      expect(result).toEqual(mockLog);
    });

    it('deve lançar NotFoundException quando o log não é encontrado', async () => {
      jest.spyOn(service, 'remove').mockRejectedValue(new NotFoundException());

      await expect(controller.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
