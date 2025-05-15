import { Test, TestingModule } from '@nestjs/testing';
import { AuditoriaMiddleware } from '../../../../src/modules/auditoria/middlewares/auditoria.middleware';
import { AuditoriaService } from '../../../../src/modules/auditoria/services/auditoria.service';
import { AuditoriaQueueService } from '../../../../src/modules/auditoria/services/auditoria-queue.service';
import { TipoOperacao } from '../../../../src/modules/auditoria/enums/tipo-operacao.enum';
import { CreateLogAuditoriaDto } from '../../../../src/modules/auditoria/dto/create-log-auditoria.dto';
import { NextFunction, Request, Response } from 'express';

describe('AuditoriaMiddleware', () => {
  let middleware: AuditoriaMiddleware;
  let auditoriaService: AuditoriaService;
  let auditoriaQueueService: AuditoriaQueueService;

  const mockRequest = () => {
    const req: Partial<Request> = {
      method: 'GET',
      originalUrl: '/api/v1/usuarios',
      body: {},
      user: { id: 'mock-user-id', nome: 'Usuário Teste' },
      ip: '192.168.1.1',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    return req as Request;
  };

  const mockResponse = () => {
    const res: Partial<Response> = {
      statusCode: 200,
      locals: {},
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          callback();
        }
        return res;
      }),
      send: jest.fn().mockImplementation(function(body) {
        this.locals.responseBody = body;
        return this;
      })
    };
    return res as Response;
  };

  const mockNext: NextFunction = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaMiddleware,
        {
          provide: AuditoriaService,
          useValue: {
            create: jest.fn().mockResolvedValue({ id: 'mock-log-id' }),
            findAll: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
            remove: jest.fn().mockResolvedValue({})
          }
        },
        {
          provide: AuditoriaQueueService,
          useValue: {
            enfileirarLogAuditoria: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
            enfileirarAcessoDadosSensiveis: jest.fn().mockResolvedValue({ id: 'mock-sensitive-job-id' })
          }
        }
      ]
    }).compile();

    middleware = module.get<AuditoriaMiddleware>(AuditoriaMiddleware);
    auditoriaService = module.get<AuditoriaService>(AuditoriaService);
    auditoriaQueueService = module.get<AuditoriaQueueService>(AuditoriaQueueService);
  });

  it('deve ser definido', () => {
    expect(middleware).toBeDefined();
  });

  it('deve chamar next() quando executado', async () => {
    await middleware.use(mockRequest(), mockResponse(), mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('deve enfileirar log de auditoria quando a requisição é bem-sucedida', async () => {
    const req = mockRequest();
    const res = mockResponse();
    
    await middleware.use(req, res, mockNext);
    
    // Simula a resposta sendo finalizada
    res.on('finish', () => {});
    
    expect(auditoriaQueueService.enfileirarLogAuditoria).toHaveBeenCalled();
    
    // Verifica se o tipo de operação foi mapeado corretamente
    const callArgs = (auditoriaQueueService.enfileirarLogAuditoria as jest.Mock).mock.calls[0][0];
    expect(callArgs.tipo_operacao).toBe(TipoOperacao.READ);
    expect(callArgs.entidade_afetada).toBe('Usuario');
  });

  it('deve detectar dados sensíveis no corpo da requisição', async () => {
    const req = mockRequest();
    req.body = {
      nome: 'João Silva',
      cpf: '123.456.789-00',
      email: 'joao@exemplo.com',
      endereco: {
        rua: 'Rua das Flores',
        numero: 123
      }
    };
    
    const res = mockResponse();
    
    await middleware.use(req, res, mockNext);
    
    // Simula a resposta sendo finalizada
    res.on('finish', () => {});
    
    const callArgs = (auditoriaQueueService.enfileirarLogAuditoria as jest.Mock).mock.calls[0][0];
    expect(callArgs.dados_sensiveis_acessados).toContain('cpf');
    expect(callArgs.dados_sensiveis_acessados).toContain('endereco');
    expect(auditoriaQueueService.enfileirarAcessoDadosSensiveis).toHaveBeenCalled();
  });

  it('não deve auditar endpoints excluídos', async () => {
    const req = mockRequest();
    req.originalUrl = '/api/v1/health';
    
    const res = mockResponse();
    
    await middleware.use(req, res, mockNext);
    
    // Simula a resposta sendo finalizada
    res.on('finish', () => {});
    
    expect(auditoriaQueueService.enfileirarLogAuditoria).not.toHaveBeenCalled();
  });

  it('deve mapear corretamente o método HTTP para o tipo de operação', async () => {
    const httpMethods = [
      { method: 'GET', expectedType: TipoOperacao.READ },
      { method: 'POST', expectedType: TipoOperacao.CREATE },
      { method: 'PUT', expectedType: TipoOperacao.UPDATE },
      { method: 'PATCH', expectedType: TipoOperacao.UPDATE },
      { method: 'DELETE', expectedType: TipoOperacao.DELETE }
    ];
    
    for (const { method, expectedType } of httpMethods) {
      const req = mockRequest();
      req.method = method;
      
      const res = mockResponse();
      
      await middleware.use(req, res, mockNext);
      
      // Simula a resposta sendo finalizada
      res.on('finish', () => {});
      
      if (method !== 'OPTIONS') {
        const callArgs = (auditoriaQueueService.enfileirarLogAuditoria as jest.Mock).mock.calls.pop()[0];
        expect(callArgs.tipo_operacao).toBe(expectedType);
      }
    }
  });

  it('deve extrair corretamente o ID da entidade da URL', async () => {
    const req = mockRequest();
    req.originalUrl = '/api/v1/usuarios/123e4567-e89b-12d3-a456-426614174000';
    
    const res = mockResponse();
    
    await middleware.use(req, res, mockNext);
    
    // Simula a resposta sendo finalizada
    res.on('finish', () => {});
    
    const callArgs = (auditoriaQueueService.enfileirarLogAuditoria as jest.Mock).mock.calls[0][0];
    expect(callArgs.entidade_afetada).toBe('Usuario');
    expect(callArgs.entidade_id).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('deve capturar dados da resposta para operações de criação e atualização', async () => {
    const responseBody = { id: 'new-user-id', nome: 'Novo Usuário' };
    
    const req = mockRequest();
    req.method = 'POST';
    req.body = { nome: 'Novo Usuário', email: 'novo@exemplo.com' };
    
    const res = mockResponse();
    
    await middleware.use(req, res, mockNext);
    
    // Simula o envio da resposta
    res.send(JSON.stringify(responseBody));
    
    // Simula a resposta sendo finalizada
    res.on('finish', () => {});
    
    const callArgs = (auditoriaQueueService.enfileirarLogAuditoria as jest.Mock).mock.calls[0][0];
    expect(callArgs.dados_novos).toEqual(responseBody);
    expect(callArgs.dados_anteriores).toBeUndefined();
  });

  it('deve capturar dados anteriores para operações de atualização', async () => {
    const responseBody = { id: 'user-id', nome: 'Usuário Atualizado' };
    
    const req = mockRequest();
    req.method = 'PUT';
    req.originalUrl = '/api/v1/usuarios/user-id';
    req.body = { nome: 'Usuário Atualizado' };
    
    const res = mockResponse();
    
    await middleware.use(req, res, mockNext);
    
    // Simula o envio da resposta
    res.send(JSON.stringify(responseBody));
    
    // Simula a resposta sendo finalizada
    res.on('finish', () => {});
    
    const callArgs = (auditoriaQueueService.enfileirarLogAuditoria as jest.Mock).mock.calls[0][0];
    expect(callArgs.dados_novos).toEqual(responseBody);
    expect(callArgs.dados_anteriores).toEqual(req.body);
  });
});
