import { Test, TestingModule } from '@nestjs/testing';
import { CriptografiaService } from '../criptografia.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';

// Mock do módulo crypto
jest.mock('crypto', () => {
  const originalCrypto = jest.requireActual('crypto');
  return {
    ...originalCrypto,
    randomBytes: jest.fn(),
    createCipheriv: jest.fn(),
    createDecipheriv: jest.fn(),
    createHash: jest.fn(),
  };
});

describe('CriptografiaService', () => {
  let service: CriptografiaService;

  // Mocks para os testes
  const mockMasterKey = Buffer.from(
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    'hex',
  );
  const mockIv = Buffer.from('0123456789abcdef0123456789abcdef', 'hex');
  const mockAuthTag = Buffer.from('0123456789abcdef0123456789abcdef', 'hex');

  // Mock para o Logger
  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  // Mock para o ConfigService
  const mockConfigService = {
    get: jest.fn().mockImplementation((key, defaultValue) => {
      const config = {
        // Chave hexadecimal válida de 32 bytes (64 caracteres em hex)
        ENCRYPTION_KEY:
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        TIPOS_DOCUMENTOS_SENSIVEIS: [
          'ATESTADO_MEDICO',
          'LAUDO_MEDICO',
          'DOCUMENTO_IDENTIDADE',
          'CPF',
          'CARTAO_NIS',
          'DECLARACAO_SAUDE',
          'PRONTUARIO_MEDICO',
        ],
      };
      return config[key] || defaultValue;
    }),
  };

  // Mocks para objetos do crypto
  const mockCipher = {
    update: jest.fn(),
    final: jest.fn(),
    getAuthTag: jest.fn(),
  };

  const mockDecipher = {
    update: jest.fn(),
    final: jest.fn(),
    setAuthTag: jest.fn(),
  };

  const mockHashObject = {
    update: jest.fn(),
    digest: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock para crypto.randomBytes
    (crypto.randomBytes as jest.Mock).mockImplementation((size) => {
      if (size === 16) return mockIv;
      return Buffer.alloc(size);
    });

    // Mock para crypto.createCipheriv
    (crypto.createCipheriv as jest.Mock).mockReturnValue(mockCipher);

    // Mock para crypto.createDecipheriv
    (crypto.createDecipheriv as jest.Mock).mockReturnValue(mockDecipher);

    // Mock para crypto.createHash
    (crypto.createHash as jest.Mock).mockReturnValue(mockHashObject);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CriptografiaService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<CriptografiaService>(CriptografiaService);

    // Sobrescrever o logger para evitar logs durante os testes
    Object.defineProperty(service, 'logger', { value: mockLogger });
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('criptografar', () => {
    it('deve criptografar um buffer corretamente', () => {
      // Arrange
      const dadosOriginais = Buffer.from(
        'dados de teste para criptografia',
        'utf-8',
      );
      const dadosCriptografados = Buffer.from('dados criptografados', 'utf-8');

      mockCipher.update.mockReturnValue(dadosCriptografados);
      mockCipher.final.mockReturnValue(Buffer.alloc(0));
      mockCipher.getAuthTag.mockReturnValue(mockAuthTag);

      // Act
      const resultado = service.criptografar(dadosOriginais);

      // Assert
      expect(crypto.createCipheriv).toHaveBeenCalledWith(
        'aes-256-gcm',
        mockMasterKey,
        mockIv,
      );
      expect(mockCipher.update).toHaveBeenCalledWith(dadosOriginais);
      expect(mockCipher.final).toHaveBeenCalled();
      expect(mockCipher.getAuthTag).toHaveBeenCalled();

      expect(resultado).toEqual({
        bufferCriptografado: dadosCriptografados,
        iv: mockIv.toString('hex'),
        authTag: mockAuthTag.toString('hex'),
      });
    });

    it('deve lidar com erros durante a criptografia', () => {
      // Arrange
      const dadosOriginais = Buffer.from(
        'dados de teste para criptografia',
        'utf-8',
      );
      const mockError = new Error('Erro de criptografia');

      mockCipher.update.mockImplementation(() => {
        throw mockError;
      });

      // Act & Assert
      expect(() => {
        service.criptografar(dadosOriginais);
      }).toThrow('Erro ao criptografar documento: Erro de criptografia');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao criptografar documento'),
      );
    });
  });

  describe('descriptografar', () => {
    it('deve descriptografar um buffer corretamente', () => {
      // Arrange
      const dadosCriptografados = Buffer.from('dados criptografados', 'utf-8');
      const dadosDescriptografados = Buffer.from(
        'dados originais descriptografados',
        'utf-8',
      );

      mockDecipher.update.mockReturnValue(dadosDescriptografados);
      mockDecipher.final.mockReturnValue(Buffer.alloc(0));

      // Act
      const resultado = service.descriptografar(
        dadosCriptografados,
        mockIv.toString('hex'),
        mockAuthTag.toString('hex'),
      );

      // Assert
      expect(crypto.createDecipheriv).toHaveBeenCalledWith(
        'aes-256-gcm',
        mockMasterKey,
        mockIv,
      );
      expect(mockDecipher.setAuthTag).toHaveBeenCalledWith(mockAuthTag);
      expect(mockDecipher.update).toHaveBeenCalledWith(dadosCriptografados);
      expect(mockDecipher.final).toHaveBeenCalled();

      expect(resultado).toEqual(dadosDescriptografados);
    });

    it('deve lançar erro quando a autenticação falha', () => {
      // Arrange
      const dadosCriptografados = Buffer.from('dados criptografados', 'utf-8');

      mockDecipher.update.mockImplementation(() => {
        throw new Error('Falha na autenticação');
      });

      // Act & Assert
      expect(() => {
        service.descriptografar(
          dadosCriptografados,
          mockIv.toString('hex'),
          mockAuthTag.toString('hex'),
        );
      }).toThrow('Erro ao descriptografar documento: Falha na autenticação');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao descriptografar documento'),
      );
    });
  });

  describe('deveSerCriptografado', () => {
    it('deve retornar true para tipos de documentos sensíveis', () => {
      // Arrange
      const tiposSensiveis = [
        'ATESTADO_MEDICO',
        'LAUDO_MEDICO',
        'DOCUMENTO_IDENTIDADE',
        'CPF',
        'CARTAO_NIS',
        'DECLARACAO_SAUDE',
        'PRONTUARIO_MEDICO',
      ];

      // Act & Assert
      tiposSensiveis.forEach((tipo) => {
        expect(service.deveSerCriptografado(tipo)).toBe(true);
      });
    });

    it('deve retornar false para tipos de documentos não sensíveis', () => {
      // Arrange
      const tiposNaoSensiveis = ['COMPROVANTE_RESIDENCIA', 'FOTO', 'OUTRO'];

      // Act & Assert
      tiposNaoSensiveis.forEach((tipo) => {
        expect(service.deveSerCriptografado(tipo)).toBe(false);
      });
    });
  });
});
