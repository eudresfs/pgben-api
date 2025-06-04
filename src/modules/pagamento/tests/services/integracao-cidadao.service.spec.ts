import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { IntegracaoCidadaoService } from '../../services/integracao-cidadao.service';
import { DadosBancariosValidator } from '../../validators/dados-bancarios-validator';
import { PixValidator } from '../../validators/pix-validator';
import { NotFoundException } from '@nestjs/common';

/**
 * Testes unitários para o serviço de integração com o módulo de cidadão
 *
 * Verifica o funcionamento correto das operações de consulta de dados
 * pessoais e bancários de beneficiários.
 *
 * @author Equipe PGBen
 */
describe('IntegracaoCidadaoService', () => {
  let service: IntegracaoCidadaoService;
  let httpService: HttpService;
  let configService: ConfigService;
  let dadosBancariosValidator: DadosBancariosValidator;
  let pixValidator: PixValidator;

  // Mock do HttpService
  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  // Mock do ConfigService
  const mockConfigService = {
    get: jest.fn().mockImplementation((key) => {
      if (key === 'cidadao.apiUrl') {
        return 'http://api-cidadao.pgben.local';
      }
      if (key === 'cidadao.apiKey') {
        return 'api-key-mock';
      }
      return null;
    }),
  };

  // Mock do DadosBancariosValidator
  const mockDadosBancariosValidator = {
    validarCodigoBanco: jest.fn(),
    validarAgencia: jest.fn(),
    validarConta: jest.fn(),
    obterNomeBanco: jest.fn(),
    mascaraAgencia: jest.fn(),
    mascaraConta: jest.fn(),
    formatarAgencia: jest.fn(),
    formatarConta: jest.fn(),
  };

  // Mock do PixValidator
  const mockPixValidator = {
    validarChavePix: jest.fn(),
    mascaraChavePix: jest.fn(),
    obterTipoChavePix: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegracaoCidadaoService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DadosBancariosValidator,
          useValue: mockDadosBancariosValidator,
        },
        {
          provide: PixValidator,
          useValue: mockPixValidator,
        },
      ],
    }).compile();

    service = module.get<IntegracaoCidadaoService>(IntegracaoCidadaoService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
    dadosBancariosValidator = module.get<DadosBancariosValidator>(
      DadosBancariosValidator,
    );
    pixValidator = module.get<PixValidator>(PixValidator);

    // Limpar mocks antes de cada teste
    jest.clearAllMocks();
  });

  describe('obterDadosCidadao', () => {
    const cidadaoId = 'cidadao-id';
    const mockCidadao = {
      id: cidadaoId,
      nome: 'João da Silva',
      cpf: '12345678900',
      dataNascimento: '1990-01-01',
      endereco: {
        logradouro: 'Rua Exemplo',
        numero: '123',
        bairro: 'Centro',
        cidade: 'Natal',
        uf: 'RN',
        cep: '59000000',
      },
      contato: {
        telefone: '84999999999',
        email: 'joao@exemplo.com',
      },
    };

    it('deve retornar dados do cidadão quando encontrado', async () => {
      // Configurar mock da resposta HTTP
      const axiosResponse: AxiosResponse = {
        data: mockCidadao,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} } as any,
      };

      mockHttpService.get.mockReturnValue(of(axiosResponse));

      // Executar método
      const result = await service.obterDadosCidadao(cidadaoId);

      // Verificar resultado
      expect(result).toEqual(mockCidadao);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        `http://api-cidadao.pgben.local/cidadaos/${cidadaoId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'api-key-mock',
          }),
        }),
      );
    });

    it('deve lançar NotFoundException quando cidadão não encontrado', async () => {
      // Configurar mock do erro HTTP
      mockHttpService.get.mockReturnValue(
        throwError(() => ({
          response: {
            status: 404,
            data: { message: 'Cidadão não encontrado' },
          },
        })),
      );

      // Executar e verificar exceção
      await expect(service.obterDadosCidadao(cidadaoId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve propagar outros erros HTTP', async () => {
      // Configurar mock do erro HTTP
      mockHttpService.get.mockReturnValue(
        throwError(() => ({
          response: {
            status: 500,
            data: { message: 'Erro interno do servidor' },
          },
        })),
      );

      // Executar e verificar exceção
      await expect(service.obterDadosCidadao(cidadaoId)).rejects.toThrow();
    });
  });

  describe('obterDadosBancarios', () => {
    const cidadaoId = 'cidadao-id';
    const mockDadosBancarios = [
      {
        id: 'info-bancaria-1',
        cidadaoId: cidadaoId,
        tipo: 'CONTA_CORRENTE',
        banco: '001',
        agencia: '1234',
        conta: '56789-0',
        titularCpf: '12345678900',
        titularNome: 'João da Silva',
        principal: true,
        createdAt: '2023-01-01T00:00:00Z',
      },
      {
        id: 'info-bancaria-2',
        cidadaoId: cidadaoId,
        tipo: 'PIX',
        pixTipo: 'CPF',
        pixChave: '12345678900',
        titularCpf: '12345678900',
        titularNome: 'João da Silva',
        principal: false,
        createdAt: '2023-01-02T00:00:00Z',
      },
    ];

    it('deve retornar dados bancários quando encontrados', async () => {
      // Configurar mock da resposta HTTP
      const axiosResponse: AxiosResponse = {
        data: mockDadosBancarios,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} } as any,
      };

      mockHttpService.get.mockReturnValue(of(axiosResponse));

      // Configurar validadores
      mockDadosBancariosValidator.obterNomeBanco.mockReturnValue(
        'Banco do Brasil',
      );
      mockDadosBancariosValidator.mascaraAgencia.mockReturnValue('1**4');
      mockDadosBancariosValidator.mascaraConta.mockReturnValue('56**9-0');
      mockPixValidator.mascaraChavePix.mockReturnValue('***.456.789-**');

      // Executar método
      const result = await service.obterDadosBancarios(cidadaoId);

      // Verificar resultado
      expect(result).toEqual(mockDadosBancarios);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        `http://api-cidadao.pgben.local/cidadaos/${cidadaoId}/dados-bancarios`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'api-key-mock',
          }),
        }),
      );
    });

    it('deve lançar NotFoundException quando dados bancários não encontrados', async () => {
      // Configurar mock do erro HTTP
      mockHttpService.get.mockReturnValue(
        throwError(() => ({
          response: {
            status: 404,
            data: { message: 'Dados bancários não encontrados' },
          },
        })),
      );

      // Executar e verificar exceção
      await expect(service.obterDadosBancarios(cidadaoId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve retornar array vazio quando não há dados bancários', async () => {
      // Configurar mock da resposta HTTP com array vazio
      const axiosResponse: AxiosResponse = {
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} } as any,
      };

      mockHttpService.get.mockReturnValue(of(axiosResponse));

      // Executar método
      const result = await service.obterDadosBancarios(cidadaoId);

      // Verificar resultado
      expect(result).toEqual([]);
    });
  });

  describe('obterDadosBancariosPorId', () => {
    const cidadaoId = 'cidadao-id';
    const infoBancariaId = 'info-bancaria-1';
    const mockDadosBancarios = {
      id: infoBancariaId,
      cidadaoId: cidadaoId,
      tipo: 'CONTA_CORRENTE',
      banco: '001',
      agencia: '1234',
      conta: '56789-0',
      titularCpf: '12345678900',
      titularNome: 'João da Silva',
      principal: true,
      createdAt: '2023-01-01T00:00:00Z',
    };

    it('deve retornar dados bancários específicos quando encontrados', async () => {
      // Configurar mock da resposta HTTP
      const axiosResponse: AxiosResponse = {
        data: mockDadosBancarios,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} } as any,
      };

      mockHttpService.get.mockReturnValue(of(axiosResponse));

      // Configurar validadores
      mockDadosBancariosValidator.obterNomeBanco.mockReturnValue(
        'Banco do Brasil',
      );
      mockDadosBancariosValidator.mascaraAgencia.mockReturnValue('1**4');
      mockDadosBancariosValidator.mascaraConta.mockReturnValue('56**9-0');

      // Executar método
      const result = await service.obterDadosBancariosPorId(
        cidadaoId,
        infoBancariaId,
      );

      // Verificar resultado
      expect(result).toEqual(mockDadosBancarios);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        `http://api-cidadao.pgben.local/cidadaos/${cidadaoId}/dados-bancarios/${infoBancariaId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'api-key-mock',
          }),
        }),
      );
    });

    it('deve lançar NotFoundException quando dados bancários específicos não encontrados', async () => {
      // Configurar mock do erro HTTP
      mockHttpService.get.mockReturnValue(
        throwError(() => ({
          response: {
            status: 404,
            data: { message: 'Dados bancários não encontrados' },
          },
        })),
      );

      // Executar e verificar exceção
      await expect(
        service.obterDadosBancariosPorId(cidadaoId, infoBancariaId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validarDadosBancarios', () => {
    it('deve validar dados bancários do tipo CONTA_CORRENTE', async () => {
      const dadosBancarios = {
        tipo: 'CONTA_CORRENTE',
        banco: '001',
        agencia: '1234',
        conta: '56789-0',
      };

      // Configurar validadores
      mockDadosBancariosValidator.validarCodigoBanco.mockReturnValue(true);
      mockDadosBancariosValidator.validarAgencia.mockReturnValue(true);
      mockDadosBancariosValidator.validarConta.mockReturnValue(true);

      // Executar método
      const result = await service.validarDadosBancarios(dadosBancarios);

      // Verificar resultado
      expect(result).toBe(true);
      expect(
        mockDadosBancariosValidator.validarCodigoBanco,
      ).toHaveBeenCalledWith('001');
      expect(mockDadosBancariosValidator.validarAgencia).toHaveBeenCalledWith(
        '1234',
        '001',
      );
      expect(mockDadosBancariosValidator.validarConta).toHaveBeenCalledWith(
        '56789-0',
        '001',
      );
    });

    it('deve validar dados bancários do tipo PIX', async () => {
      const dadosBancarios = {
        tipo: 'PIX',
        pixTipo: 'CPF',
        pixChave: '12345678900',
      };

      // Configurar validadores
      mockPixValidator.validarChavePix.mockReturnValue(true);

      // Executar método
      const result = await service.validarDadosBancarios(dadosBancarios);

      // Verificar resultado
      expect(result).toBe(true);
      expect(mockPixValidator.validarChavePix).toHaveBeenCalledWith(
        '12345678900',
        'CPF',
      );
    });

    it('deve rejeitar dados bancários inválidos do tipo CONTA_CORRENTE', async () => {
      const dadosBancarios = {
        tipo: 'CONTA_CORRENTE',
        banco: '999', // banco inválido
        agencia: '1234',
        conta: '56789-0',
      };

      // Configurar validadores
      mockDadosBancariosValidator.validarCodigoBanco.mockReturnValue(false);

      // Executar método
      const result = await service.validarDadosBancarios(dadosBancarios);

      // Verificar resultado
      expect(result).toBe(false);
    });

    it('deve rejeitar dados bancários inválidos do tipo PIX', async () => {
      const dadosBancarios = {
        tipo: 'PIX',
        pixTipo: 'CPF',
        pixChave: '123456789', // CPF inválido
      };

      // Configurar validadores
      mockPixValidator.validarChavePix.mockReturnValue(false);

      // Executar método
      const result = await service.validarDadosBancarios(dadosBancarios);

      // Verificar resultado
      expect(result).toBe(false);
    });

    it('deve rejeitar tipo de dados bancários desconhecido', async () => {
      const dadosBancarios = {
        tipo: 'TIPO_DESCONHECIDO',
      };

      // Executar método
      const result = await service.validarDadosBancarios(dadosBancarios);

      // Verificar resultado
      expect(result).toBe(false);
    });
  });
});
