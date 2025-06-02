import { Test, TestingModule } from '@nestjs/testing';
import { AuditoriaMiddleware } from '../../middlewares/auditoria.middleware';
import { AuditoriaService } from '../../services/auditoria.service';
import { TipoOperacao } from '../../../../enums/tipo-operacao.enum';
import { CreateLogAuditoriaDto } from '../../dto/create-log-auditoria.dto';
import { LogAuditoria } from '../../../../entities/log-auditoria.entity';
import { Request, Response } from 'express';

// Função auxiliar para criar um mock do objeto Request do Express
function createMockRequest(options: any = {}): Request {
  const mockRequest = {
    get: jest.fn(),
    header: jest.fn(),
    accepts: jest.fn(),
    acceptsCharsets: jest.fn(),
    acceptsEncodings: jest.fn(),
    acceptsLanguages: jest.fn(),
    range: jest.fn(),
    ...options,
  };

  return mockRequest as unknown as Request;
}

// Função auxiliar para criar um mock do objeto Response do Express
function createMockResponse(options: any = {}): Response {
  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    on: jest.fn().mockImplementation((event, callback) => {
      if (event === 'finish') {
        callback();
      }
      return mockResponse;
    }),
    ...options,
  };

  return mockResponse as unknown as Response;
}

describe('AuditoriaMiddleware', () => {
  let middleware: AuditoriaMiddleware;
  let auditoriaService: AuditoriaService;

  const mockAuditoriaService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaMiddleware,
        {
          provide: AuditoriaService,
          useValue: mockAuditoriaService,
        },
      ],
    }).compile();

    middleware = module.get<AuditoriaMiddleware>(AuditoriaMiddleware);
    auditoriaService = module.get<AuditoriaService>(AuditoriaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    it('deve registrar operação GET', () => {
      // Arrange
      const req = createMockRequest({
        method: 'GET',
        originalUrl: '/api/documentos/123',
        user: { id: 'user-123', nome: 'Usuário Teste' },
        ip: '127.0.0.1',
        headers: {},
      });
      const res = createMockResponse({
        statusCode: 200,
      });
      const next = jest.fn();

      const expectedLogDto = new CreateLogAuditoriaDto();
      expectedLogDto.tipo_operacao = TipoOperacao.READ;
      expectedLogDto.entidade_afetada = 'documentos';
      expectedLogDto.entidade_id = '123';
      expectedLogDto.descricao = 'Consulta de documento';
      expectedLogDto.dados_anteriores = {};
      expectedLogDto.dados_novos = {};
      expectedLogDto.usuario_id = 'user-123';
      expectedLogDto.ip_origem = '127.0.0.1';

      const mockLogAuditoria = new LogAuditoria();
      mockAuditoriaService.create.mockResolvedValue(mockLogAuditoria);

      // Act
      middleware.use(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(auditoriaService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_operacao: TipoOperacao.READ,
          entidade_afetada: 'documentos',
          entidade_id: '123',
          usuario_id: 'user-123',
          ip_origem: '127.0.0.1',
        }),
      );
    });

    it('deve registrar operação POST', () => {
      // Arrange
      const req = createMockRequest({
        method: 'POST',
        originalUrl: '/api/documentos',
        user: { id: 'user-123', nome: 'Usuário Teste' },
        ip: '127.0.0.1',
        headers: {},
        body: { nome: 'Documento Teste', conteudo: 'Conteúdo do documento' },
      });
      const res = createMockResponse({
        statusCode: 201,
      });
      const next = jest.fn();

      const mockLogAuditoria = new LogAuditoria();
      mockAuditoriaService.create.mockResolvedValue(mockLogAuditoria);

      // Act
      middleware.use(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(auditoriaService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_operacao: TipoOperacao.CREATE,
          entidade_afetada: 'documentos',
          dados_novos: req.body,
          usuario_id: 'user-123',
          ip_origem: '127.0.0.1',
        }),
      );
    });

    it('deve registrar operação PUT', () => {
      // Arrange
      const req = createMockRequest({
        method: 'PUT',
        originalUrl: '/api/documentos/123',
        user: { id: 'user-123', nome: 'Usuário Teste' },
        ip: '127.0.0.1',
        headers: {},
        body: { nome: 'Documento Atualizado', conteudo: 'Novo conteúdo' },
      });
      const res = createMockResponse({
        statusCode: 200,
      });
      const next = jest.fn();

      const mockLogAuditoria = new LogAuditoria();
      mockAuditoriaService.create.mockResolvedValue(mockLogAuditoria);

      // Act
      middleware.use(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(auditoriaService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_operacao: TipoOperacao.UPDATE,
          entidade_afetada: 'documentos',
          entidade_id: '123',
          dados_novos: req.body,
          usuario_id: 'user-123',
          ip_origem: '127.0.0.1',
        }),
      );
    });

    it('deve registrar operação DELETE', () => {
      // Arrange
      const req = createMockRequest({
        method: 'DELETE',
        originalUrl: '/api/documentos/123',
        user: { id: 'user-123', nome: 'Usuário Teste' },
        ip: '127.0.0.1',
        headers: {},
      });
      const res = createMockResponse({
        statusCode: 204,
      });
      const next = jest.fn();

      const mockLogAuditoria = new LogAuditoria();
      mockAuditoriaService.create.mockResolvedValue(mockLogAuditoria);

      // Act
      middleware.use(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(auditoriaService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_operacao: TipoOperacao.DELETE,
          entidade_afetada: 'documentos',
          entidade_id: '123',
          usuario_id: 'user-123',
          ip_origem: '127.0.0.1',
        }),
      );
    });

    it('não deve registrar operações para rotas ignoradas', () => {
      // Arrange
      const req = createMockRequest({
        method: 'GET',
        originalUrl: '/api/health',
        user: { id: 'user-123', nome: 'Usuário Teste' },
        ip: '127.0.0.1',
        headers: {},
      });
      const res = createMockResponse({
        statusCode: 200,
      });
      const next = jest.fn();

      // Act
      middleware.use(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(auditoriaService.create).not.toHaveBeenCalled();
    });

    it('deve lidar com requisições sem usuário autenticado', () => {
      // Arrange
      const req = createMockRequest({
        method: 'GET',
        originalUrl: '/api/documentos/123',
        user: null,
        ip: '127.0.0.1',
        headers: {},
      });
      const res = createMockResponse({
        statusCode: 200,
      });
      const next = jest.fn();

      const mockLogAuditoria = new LogAuditoria();
      mockAuditoriaService.create.mockResolvedValue(mockLogAuditoria);

      // Act
      middleware.use(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(auditoriaService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_operacao: TipoOperacao.READ,
          entidade_afetada: 'documentos',
          entidade_id: '123',
          usuario_id: null,
          ip_origem: '127.0.0.1',
        }),
      );
    });
  });
});
