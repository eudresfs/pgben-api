import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ScreenHandlerService } from './screen-handler.service';
import { CidadaoService } from '../../cidadao/services/cidadao.service';
import { AuthService } from '../../../auth/services/auth.service';
import { AuditEventEmitter } from '../../auditoria';
import { ScreenType } from '../enums/screen-type.enum';
import { ActionType } from '../enums/action-type.enum';
import { Sexo } from '../../../enums';
import {
  WhatsAppFlowRequestDto,
  WhatsAppFlowDataDto,
} from '../dto/whatsapp-flow-request.dto';
import { ROLES } from '../../../shared/constants/roles.constants';

/**
 * Testes unitários para ScreenHandlerService
 * 
 * Testa todas as funcionalidades de manipulação de telas do WhatsApp Flows,
 * incluindo login, recuperação de senha, busca de cidadão e validações.
 */
describe('ScreenHandlerService', () => {
  let service: ScreenHandlerService;
  let cidadaoService: jest.Mocked<CidadaoService>;
  let authService: jest.Mocked<AuthService>;
  let auditEmitter: jest.Mocked<AuditEventEmitter>;
  let configService: jest.Mocked<ConfigService>;

  // Dados de teste
  const mockCpf = '12345678901';
  const mockSenha = 'senha123';
  const mockCidadao = {
    id: '1',
    nome: 'João da Silva',
    nome_social: 'João',
    cpf: '123.456.789-01',
    rg: '12.345.678-9',
    orgao_emissor: 'SSP/RN',
    data_nascimento: '1990-01-01',
    sexo: Sexo.MASCULINO,
    nome_mae: 'Maria da Silva',
    nome_pai: 'José da Silva',
    email: 'joao@email.com',
    telefone: '(84) 99999-9999',
    nis: '12345678901',
    cns: '123456789012345',
    foto_url: 'http://example.com/foto.jpg',
    naturalidade: 'Natal',
    nacionalidade: 'Brasileira',
    estado_civil: 'Solteiro',
    escolaridade: 'Ensino Médio Completo',
    empresa: 'Empresa XYZ Ltda',
    profissao: 'Analista de Sistemas',
    renda_mensal: 3500.0,
    observacoes: 'Observações importantes',
    contatos: [],
    enderecos: null,
    composicao_familiar: [],
    dados_sociais: null,
    info_bancaria: null,
    unidade: null,
    unidade_id: '550e8400-e29b-41d4-a716-446655440000',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  };
  const mockAuthResult = {
    id: 1,
    username: 'joao.silva',
    cpf: mockCpf,
    roles: [ROLES.CIDADAO],
  };

  beforeEach(async () => {
    const mockCidadaoService = {
      findByCpf: jest.fn(),
    };

    const mockAuthService = {
      validateUser: jest.fn(),
    };

    const mockAuditEmitter = {
      emitSensitiveDataEvent: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreenHandlerService,
        {
          provide: CidadaoService,
          useValue: mockCidadaoService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: AuditEventEmitter,
          useValue: mockAuditEmitter,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ScreenHandlerService>(ScreenHandlerService);
    cidadaoService = module.get(CidadaoService);
    authService = module.get(AuthService);
    auditEmitter = module.get(AuditEventEmitter);
    configService = module.get(ConfigService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('handleScreenRequest', () => {
    it('deve processar requisição para tela INICIO', async () => {
      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.INICIO,
          action: ActionType.INIT,
          data: {},
        },
      };

      const result = await service.handleScreenRequest(request);

      expect(result).toHaveProperty('version', '3.0');
      expect(result).toHaveProperty('action', ActionType.DATA_EXCHANGE);
      expect(result.data).toHaveProperty('screen', ScreenType.INICIO);
      expect(result.data).toHaveProperty('title', 'Login PGBen');
    });

    it('deve processar requisição para tela ESQUECEU_SENHA', async () => {
      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.ESQUECEU_SENHA,
          action: ActionType.INIT,
          data: {},
        },
      };

      const result = await service.handleScreenRequest(request);

      expect(result).toHaveProperty('version', '3.0');
      expect(result).toHaveProperty('action', ActionType.DATA_EXCHANGE);
      expect(result.data).toHaveProperty('screen', ScreenType.ESQUECEU_SENHA);
      expect(result.data).toHaveProperty('title', 'Recuperar Senha');
    });

    it('deve processar requisição para tela BUSCAR_CIDADAO', async () => {
      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.BUSCAR_CIDADAO,
          action: ActionType.INIT,
          data: {},
        },
      };

      const result = await service.handleScreenRequest(request);

      expect(result).toHaveProperty('version', '3.0');
      expect(result).toHaveProperty('action', ActionType.DATA_EXCHANGE);
      expect(result.data).toHaveProperty('screen', ScreenType.BUSCAR_CIDADAO);
      expect(result.data).toHaveProperty('title', 'Buscar Cidadão');
    });

    it('deve lançar erro para tela não suportada', async () => {
      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: 'TELA_INEXISTENTE' as ScreenType,
          action: ActionType.INIT,
          data: {},
        },
      };

      await expect(service.handleScreenRequest(request)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar erro para dados de requisição inválidos', async () => {
      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: null,
          action: null,
          data: {},
        },
      };

      await expect(service.handleScreenRequest(request)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleInicioScreen', () => {
    it('deve inicializar tela de login', async () => {
      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.INICIO,
          action: ActionType.INIT,
          data: {},
        },
      };

      const result = await service.handleScreenRequest(request);

      expect(result.data).toHaveProperty('title', 'Login PGBen');
      expect(result.data).toHaveProperty('fields');
      expect(result.data).toHaveProperty('title');
      expect(result.data).toHaveProperty('fields');
    });

    it('deve processar login com sucesso', async () => {
      authService.validateUser.mockResolvedValue(mockAuthResult);
      auditEmitter.emitSensitiveDataEvent.mockResolvedValue(undefined);

      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.INICIO,
          action: ActionType.DATA_EXCHANGE,
          data: {
            username: 'test@example.com',
            password: mockSenha,
          },
        },
      };

      const result = await service.handleScreenRequest(request);

      expect(result).toHaveProperty('action', ActionType.DATA_EXCHANGE);
      expect(result.data).toHaveProperty('message', 'Login realizado com sucesso!');
      expect(result.data.dynamic_data.user).toHaveProperty('nome', 'joao.silva');
      expect(authService.validateUser).toHaveBeenCalledWith(
        mockCpf,
        mockSenha,
        expect.any(String),
      );
    });

    it('deve falhar no login com credenciais inválidas', async () => {
      authService.validateUser.mockResolvedValue(null);
      auditEmitter.emitSensitiveDataEvent.mockResolvedValue(undefined);

      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.INICIO,
          action: ActionType.DATA_EXCHANGE,
          data: {
            cpf: '123.456.789-01',
            senha: 'senha_errada',
          },
        },
      };

      const result = await service.handleScreenRequest(request);

      expect(result).toHaveProperty('action', ActionType.DATA_EXCHANGE);
      expect(result.data).toHaveProperty('cpfError');
      expect(result.data.cpfError).toBeDefined();
    });

    it('deve falhar no login sem CPF ou senha', async () => {
      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.INICIO,
          action: ActionType.DATA_EXCHANGE,
          data: {
            cpf: '',
            senha: '',
          },
        },
      };

      const result = await service.handleScreenRequest(request);

      expect(result).toHaveProperty('action', ActionType.DATA_EXCHANGE);
      expect(result.data).toHaveProperty('cpfError');
      expect(result.data.cpfError).toBeDefined();
    });

    it('deve lançar erro para ação não suportada', async () => {
      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.INICIO,
          action: 'ACAO_INEXISTENTE' as ActionType,
          data: {},
        },
      };

      await expect(service.handleScreenRequest(request)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleEsqueceuSenhaScreen', () => {
    it('deve inicializar tela de recuperação de senha', async () => {
      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.ESQUECEU_SENHA,
          action: ActionType.INIT,
          data: {},
        },
      };

      const result = await service.handleScreenRequest(request);

      expect(result.data).toHaveProperty('title', 'Recuperar Senha');
      expect(result.data).toHaveProperty('fields');
      expect(result.data).toHaveProperty('title');
    });

    it('deve processar recuperação de senha com sucesso', async () => {
      cidadaoService.findByCpf.mockResolvedValue(mockCidadao);
      auditEmitter.emitSensitiveDataEvent.mockResolvedValue(undefined);

      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.ESQUECEU_SENHA,
          action: ActionType.DATA_EXCHANGE,
          data: {
            data: {
              email: 'test@example.com',
            },
          },
        },
      };

      const result = await service.handleScreenRequest(request);

      expect(result).toHaveProperty('action', ActionType.DATA_EXCHANGE);
      expect(result.data).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('message');
      expect(auditEmitter.emitSensitiveDataEvent).toHaveBeenCalled();
    });

    it('deve processar recuperação de senha com sucesso', async () => {
      auditEmitter.emitSensitiveDataEvent.mockResolvedValue(undefined);

      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.ESQUECEU_SENHA,
          action: ActionType.DATA_EXCHANGE,
          data: {
            data: {
              email: 'test@example.com',
            },
          },
        },
      };

      const result = await service.handleScreenRequest(request);

      expect(result).toHaveProperty('action', ActionType.DATA_EXCHANGE);
      expect(result.data).toHaveProperty('success', true);
      expect(result.data).toHaveProperty('message');
    });

    it('deve falhar na recuperação sem email', async () => {
      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.ESQUECEU_SENHA,
          action: ActionType.DATA_EXCHANGE,
          data: {
            email: '',
          },
        },
      };

      const result = await service.handleScreenRequest(request);

      expect(result).toHaveProperty('action', ActionType.DATA_EXCHANGE);
      expect(result.data).toHaveProperty('emailError');
      expect(result.data.emailError).toBeDefined();
    });
  });

  describe('handleBuscarCidadaoScreen', () => {
    it('deve inicializar tela de busca de cidadão', async () => {
      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.BUSCAR_CIDADAO,
          action: ActionType.INIT,
          data: {},
        },
      };

      const result = await service.handleScreenRequest(request);

      expect(result.data).toHaveProperty('title', 'Buscar Cidadão');
      expect(result.data).toHaveProperty('fields');
      expect(result.data.title).toBeDefined();
    });

    it('deve processar busca de cidadão com sucesso', async () => {
      cidadaoService.findByCpf.mockResolvedValue(mockCidadao);
      auditEmitter.emitSensitiveDataEvent.mockResolvedValue(undefined);

      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.BUSCAR_CIDADAO,
          action: ActionType.DATA_EXCHANGE,
          data: {
            cpf: '123.456.789-01',
          },
        },
      };

      const result = await service.handleScreenRequest(request);

      expect(result).toHaveProperty('action', ActionType.DATA_EXCHANGE);
      expect(result.data).toHaveProperty('message', 'Cidadão encontrado com sucesso!');
      expect(result.data.cidadao).toHaveProperty('nome', 'João da Silva');
      expect(cidadaoService.findByCpf).toHaveBeenCalledWith(
        mockCpf,
        true,
        expect.any(String),
      );
    });

    it('deve falhar na busca com cidadão não encontrado', async () => {
      cidadaoService.findByCpf.mockResolvedValue(null);
      auditEmitter.emitSensitiveDataEvent.mockResolvedValue(undefined);

      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.BUSCAR_CIDADAO,
          action: ActionType.DATA_EXCHANGE,
          data: {
            data: {
              email: 'test@example.com',
            },
          },
        },
      };

      const result = await service.handleScreenRequest(request);

      expect(result).toHaveProperty('action', ActionType.DATA_EXCHANGE);
      expect(result.data).toHaveProperty('cpfError');
      expect(result.data.cpfError).toBeDefined();
    });

    it('deve falhar na busca sem CPF', async () => {
      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.BUSCAR_CIDADAO,
          action: ActionType.DATA_EXCHANGE,
          data: {
            data: {
              cpf: '',
            },
          },
        },
      };

      const result = await service.handleScreenRequest(request);

      expect(result).toHaveProperty('action', ActionType.DATA_EXCHANGE);
      expect(result.data).toHaveProperty('cpfError');
      expect(result.data.cpfError).toBeDefined();
    });

    it('deve incluir CPF pré-preenchido quando fornecido', async () => {
      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.BUSCAR_CIDADAO,
          action: ActionType.INIT,
          data: {
            cpf: '123.456.789-01',
          },
        },
      };

      const result = await service.handleScreenRequest(request);

      expect(result.data.dynamic_data).toHaveProperty('cpf', '123.456.789-01');
    });
  });

  describe('validateRequest', () => {
    it('deve validar requisição válida', async () => {
      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.INICIO,
          action: ActionType.INIT,
          data: {},
        },
      };

      // Não deve lançar erro
      await expect(service.handleScreenRequest(request)).resolves.toBeDefined();
    });

    it('deve lançar erro para tela ausente', async () => {
      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: null,
          action: ActionType.INIT,
          data: {},
        },
      };

      await expect(service.handleScreenRequest(request)).rejects.toThrow(
        'Tela é obrigatória',
      );
    });

    it('deve lançar erro para ação ausente', async () => {
      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.INICIO,
          action: null,
          data: {},
        },
      };

      await expect(service.handleScreenRequest(request)).rejects.toThrow(
        'Ação é obrigatória',
      );
    });

    it('deve lançar erro para tela inválida', async () => {
      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: 'TELA_INVALIDA' as ScreenType,
          action: ActionType.INIT,
          data: {},
        },
      };

      await expect(service.handleScreenRequest(request)).rejects.toThrow(
        'Tela inválida',
      );
    });

    it('deve lançar erro para ação inválida', async () => {
      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.INICIO,
          action: 'ACAO_INVALIDA' as ActionType,
          data: {},
        },
      };

      await expect(service.handleScreenRequest(request)).rejects.toThrow(
        'Ação inválida',
      );
    });
  });

  describe('Integração de auditoria', () => {
    it('deve registrar evento de auditoria no login', async () => {
      authService.validateUser.mockResolvedValue(mockAuthResult);
      auditEmitter.emitSensitiveDataEvent.mockResolvedValue(undefined);

      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.INICIO,
          action: ActionType.DATA_EXCHANGE,
          data: {
            username: 'test@example.com',
            password: mockSenha,
          },
        },
      };

      await service.handleScreenRequest(request);

      expect(auditEmitter.emitSensitiveDataEvent).toHaveBeenCalledWith(
        expect.any(String),
        'WhatsAppFlow',
        'login_attempt',
        expect.any(String),
        ['email'],
        expect.stringContaining('Tentativa de login'),
      );
    });

    it('deve registrar evento de auditoria na recuperação de senha', async () => {
      auditEmitter.emitSensitiveDataEvent.mockResolvedValue(undefined);

      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.ESQUECEU_SENHA,
          action: ActionType.DATA_EXCHANGE,
          data: {
            data: {
              email: 'test@example.com',
            },
          },
        },
      };

      await service.handleScreenRequest(request);

      expect(auditEmitter.emitSensitiveDataEvent).toHaveBeenCalledWith(
        expect.any(String),
        'WhatsAppFlow',
        'password_recovery_attempt',
        expect.any(String),
        ['email'],
        expect.stringContaining('Tentativa de recuperação'),
      );
    });

    it('deve registrar evento de auditoria na busca de cidadão', async () => {
      cidadaoService.findByCpf.mockResolvedValue(mockCidadao);
      auditEmitter.emitSensitiveDataEvent.mockResolvedValue(undefined);

      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.BUSCAR_CIDADAO,
          action: ActionType.DATA_EXCHANGE,
          data: {
            cpf: '123.456.789-01',
          },
        },
      };

      await service.handleScreenRequest(request);

      expect(auditEmitter.emitSensitiveDataEvent).toHaveBeenCalledWith(
        expect.any(String),
        'WhatsAppFlow',
        'cidadao_search',
        expect.any(String),
        ['cpf'],
        expect.stringContaining('Busca de cidadão'),
      );
    });
  });

  describe('Tratamento de erros', () => {
    it('deve capturar e tratar erros do AuthService', async () => {
      authService.validateUser.mockRejectedValue(new Error('Erro de autenticação'));
      auditEmitter.emitSensitiveDataEvent.mockResolvedValue(undefined);

      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.INICIO,
          action: ActionType.DATA_EXCHANGE,
          data: {
            username: 'test@example.com',
            password: mockSenha,
          },
        },
      };

      const result = await service.handleScreenRequest(request);

      expect(result.data).toHaveProperty('systemError');
      expect(result.data.systemError).toBeDefined();
    });

    it('deve capturar e tratar erros do CidadaoService', async () => {
      cidadaoService.findByCpf.mockRejectedValue(new Error('Erro de banco de dados'));
      auditEmitter.emitSensitiveDataEvent.mockResolvedValue(undefined);

      const request: WhatsAppFlowRequestDto = {
        encrypted_flow_data: 'encrypted_data',
        encrypted_aes_key: 'encrypted_key',
        initial_vector: 'iv_data',
        decrypted_data: {
          flow_token: 'test_flow_token',
          version: '3.0',
          screen: ScreenType.BUSCAR_CIDADAO,
          action: ActionType.DATA_EXCHANGE,
          data: {
            cpf: '123.456.789-01',
          },
        },
      };

      const result = await service.handleScreenRequest(request);

      expect(result.data).toHaveProperty('systemError');
      expect(result.data.systemError).toBeDefined();
    });
  });
});