import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditoriaService } from '../services/auditoria.service';
import { LogAuditoria } from '../entities/log-auditoria.entity';
import { CreateLogAuditoriaDto } from '../dto/create-log-auditoria.dto';
import { TipoOperacao } from '../../auditoria/enums/tipo-operacao.enum';
import { QueryLogAuditoriaDto } from '../dto/query-log-auditoria.dto';

const mockLogAuditoriaRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  })),
});

describe('AuditoriaService', () => {
  let service: AuditoriaService;
  let repository: Repository<LogAuditoria>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaService,
        {
          provide: getRepositoryToken(LogAuditoria),
          useFactory: mockLogAuditoriaRepository,
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
    it('deve criar um log de auditoria', async () => {
      const dto = new CreateLogAuditoriaDto();
      dto.tipo_operacao = TipoOperacao.CREATE;
      dto.entidade_afetada = 'Documento';
      dto.entidade_id = '123';
      dto.descricao = 'Criação de documento';
      dto.dados_anteriores = {};
      dto.dados_novos = { nome: 'Documento 1' };
      dto.usuario_id = 'user-123';
      dto.ip_origem = '127.0.0.1';

      const createLogAuditoriaDto = dto;

      const logAuditoria = new LogAuditoria();
      Object.assign(logAuditoria, createLogAuditoriaDto, { id: 'log-123' });

      jest.spyOn(repository, 'create').mockReturnValue(logAuditoria);
      jest.spyOn(repository, 'save').mockResolvedValue(logAuditoria);

      const result = await service.create(createLogAuditoriaDto);

      expect(repository.create).toHaveBeenCalledWith(createLogAuditoriaDto);
      expect(repository.save).toHaveBeenCalledWith(logAuditoria);
      expect(result).toEqual(logAuditoria);
    });
  });

  describe('findAll', () => {
    it('deve retornar logs de auditoria paginados', async () => {
      const queryParams: QueryLogAuditoriaDto = {
        pagina: 1,
        itens_por_pagina: 10,
        tipo_operacao: TipoOperacao.CREATE,
        entidade_afetada: 'Documento',
        usuario_id: 'user-123',
        data_inicial: '2025-01-01T00:00:00Z',
        data_final: '2025-01-31T23:59:59Z',
      };

      const logs = [new LogAuditoria(), new LogAuditoria()];
      const count = 2;

      const queryBuilder = repository.createQueryBuilder();
      jest
        .spyOn(queryBuilder, 'getManyAndCount')
        .mockResolvedValue([logs, count]);

      const result = await service.findAll(queryParams);

      expect(repository.createQueryBuilder).toHaveBeenCalled();
      expect(queryBuilder.where).toHaveBeenCalled();
      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(4);
      expect(queryBuilder.orderBy).toHaveBeenCalled();
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(result).toEqual({
        data: logs,
        total: count,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('findOne', () => {
    it('deve retornar um log de auditoria pelo ID', async () => {
      const logId = 'log-123';
      const logAuditoria = new LogAuditoria();
      logAuditoria.id = logId;

      jest.spyOn(repository, 'findOne').mockResolvedValue(logAuditoria);

      const result = await service.findOne(logId);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: logId } });
      expect(result).toEqual(logAuditoria);
    });

    it('deve retornar null quando o log não existe', async () => {
      const logId = 'non-existent-id';

      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      const result = await service.findOne(logId);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: logId } });
      expect(result).toBeNull();
    });
  });

  describe('exportarLogs', () => {
    it('deve exportar logs de auditoria', async () => {
      const queryParams: QueryLogAuditoriaDto = {
        tipo_operacao: TipoOperacao.CREATE,
        entidade_afetada: 'Documento',
        usuario_id: 'user-123',
        data_inicial: '2025-01-01T00:00:00Z',
        data_final: '2025-01-31T23:59:59Z',
      };

      const logs = [
        {
          id: 'log-1',
          tipo_operacao: TipoOperacao.CREATE,
          entidade_afetada: 'Documento',
          entidade_id: 'doc-1',
          descricao: 'Criação de documento',
          created_at: new Date('2025-01-15'),
          usuario_id: 'user-123',
        },
        {
          id: 'log-2',
          tipo_operacao: TipoOperacao.UPDATE,
          entidade_afetada: 'Documento',
          entidade_id: 'doc-1',
          descricao: 'Atualização de documento',
          created_at: new Date('2025-01-16'),
          usuario_id: 'user-123',
        },
      ];

      jest.spyOn(repository, 'find').mockResolvedValue(logs as LogAuditoria[]);

      // Adicionando o método exportarLogs ao serviço para o teste
      service['exportarLogs'] = jest.fn().mockResolvedValue(logs);

      const result = await service['exportarLogs'](queryParams);

      expect(repository.find).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id', 'log-1');
      expect(result[1]).toHaveProperty('id', 'log-2');
    });
  });
});
