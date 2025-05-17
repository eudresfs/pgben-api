import { Test, TestingModule } from '@nestjs/testing';
import { GlobalExceptionFilter } from '../exception.filter';
import { LoggingService } from '../logging.service';
import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Testes unitários para o filtro de exceções global
 *
 * Verifica o comportamento do filtro ao capturar diferentes tipos de exceções
 * e formatar as respostas de erro apropriadamente
 */
describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let loggingService: LoggingService;

  // Mock do serviço de logging
  const mockLoggingService = {
    error: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalExceptionFilter,
        {
          provide: LoggingService,
          useValue: mockLoggingService,
        },
      ],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);
    loggingService = module.get<LoggingService>(LoggingService);
  });

  it('deve ser definido', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('deve lidar com HttpException', () => {
      // Mock da exceção HTTP
      const exception = new HttpException(
        'Mensagem de erro',
        HttpStatus.BAD_REQUEST,
      );

      // Mock da resposta
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      // Mock da requisição
      const mockRequest = {
        url: '/api/test',
        method: 'GET',
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'test-agent',
        },
        user: {
          id: 'user-123',
        },
      } as unknown as Request;

      // Mock do host de argumentos
      const mockArgumentsHost = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: jest.fn().mockReturnValue(mockResponse),
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ArgumentsHost;

      // Executar o filtro
      filter.catch(exception, mockArgumentsHost);

      // Verificar se o status e o corpo da resposta foram definidos corretamente
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalled();

      // Capturar o argumento passado para json
      const jsonArg = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonArg).toEqual(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Mensagem de erro',
          path: '/api/test',
        }),
      );

      // Verificar se o erro foi registrado
      expect(mockLoggingService.error).toHaveBeenCalled();
      const errorCall = mockLoggingService.error.mock.calls[0];
      expect(errorCall[0]).toContain('Exceção capturada');
      expect(errorCall[0]).toContain('GET');
      expect(errorCall[0]).toContain('/api/test');
      expect(errorCall[2]).toBe('ExceptionFilter');
    });

    it('deve lidar com exceções internas do servidor', () => {
      // Mock de uma exceção interna
      const exception = new Error('Erro interno');

      // Mock da resposta
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      // Mock da requisição
      const mockRequest = {
        url: '/api/test',
        method: 'POST',
        ip: '127.0.0.1',
        headers: {},
      } as unknown as Request;

      // Mock do host de argumentos
      const mockArgumentsHost = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: jest.fn().mockReturnValue(mockResponse),
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ArgumentsHost;

      // Executar o filtro
      filter.catch(exception, mockArgumentsHost);

      // Verificar se o status e o corpo da resposta foram definidos corretamente
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalled();

      // Capturar o argumento passado para json
      const jsonArg = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonArg).toEqual(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Erro interno do servidor',
          path: '/api/test',
        }),
      );

      // Verificar se o erro foi registrado
      expect(mockLoggingService.error).toHaveBeenCalled();
      const errorCall = mockLoggingService.error.mock.calls[0];
      expect(errorCall[0]).toContain('Exceção capturada');
      expect(errorCall[0]).toContain('POST');
      expect(errorCall[0]).toContain('/api/test');
      expect(errorCall[2]).toBe('ExceptionFilter');
    });

    it('deve preservar a mensagem de erro original para InternalServerErrorException', () => {
      // Mock de uma exceção interna do NestJS
      const exception = new InternalServerErrorException(
        'Erro específico do servidor',
      );

      // Mock da resposta
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      // Mock da requisição
      const mockRequest = {
        url: '/api/test',
        method: 'PUT',
        ip: '127.0.0.1',
        headers: {},
      } as unknown as Request;

      // Mock do host de argumentos
      const mockArgumentsHost = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: jest.fn().mockReturnValue(mockResponse),
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ArgumentsHost;

      // Executar o filtro
      filter.catch(exception, mockArgumentsHost);

      // Verificar se o status e o corpo da resposta foram definidos corretamente
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalled();

      // Capturar o argumento passado para json
      const jsonArg = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonArg).toEqual(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Erro específico do servidor',
          path: '/api/test',
        }),
      );

      // Verificar se o erro foi registrado
      expect(mockLoggingService.error).toHaveBeenCalled();
      const errorCall = mockLoggingService.error.mock.calls[0];
      expect(errorCall[0]).toContain('Exceção capturada');
      expect(errorCall[0]).toContain('PUT');
      expect(errorCall[0]).toContain('/api/test');
      expect(errorCall[2]).toBe('ExceptionFilter');
    });

    it('deve lidar com exceções em ambiente de produção', () => {
      // Salvar o ambiente original
      const originalEnv = process.env.NODE_ENV;

      // Definir o ambiente como produção
      process.env.NODE_ENV = 'production';

      // Mock de uma exceção interna
      const exception = new Error('Detalhes sensíveis do erro');

      // Mock da resposta
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      // Mock da requisição
      const mockRequest = {
        url: '/api/test',
        method: 'DELETE',
        ip: '127.0.0.1',
        headers: {},
      } as unknown as Request;

      // Mock do host de argumentos
      const mockArgumentsHost = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: jest.fn().mockReturnValue(mockResponse),
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ArgumentsHost;

      // Executar o filtro
      filter.catch(exception, mockArgumentsHost);

      // Verificar se o status e o corpo da resposta foram definidos corretamente
      // Em produção, não devemos expor detalhes do erro
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalled();

      // Capturar o argumento passado para json
      const jsonArg = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonArg).toEqual(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Erro interno do servidor',
          path: '/api/test',
        }),
      );

      // Verificar se o erro foi registrado com os detalhes completos
      expect(mockLoggingService.error).toHaveBeenCalled();
      const errorCall = mockLoggingService.error.mock.calls[0];
      expect(errorCall[0]).toContain('Exceção capturada');
      expect(errorCall[0]).toContain('DELETE');
      expect(errorCall[0]).toContain('/api/test');
      expect(errorCall[2]).toBe('ExceptionFilter');

      // Restaurar o ambiente original
      process.env.NODE_ENV = originalEnv;
    });
  });
});
