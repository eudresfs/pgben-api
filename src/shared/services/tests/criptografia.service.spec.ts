import { Test, TestingModule } from '@nestjs/testing';
import { CriptografiaService } from '../criptografia.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

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

  const mockMasterKey = Buffer.from(
    'chave-mestra-de-teste-com-32-bytes-12',
    'utf-8',
  );
  const mockIv = Buffer.from('iv-de-teste-16byt', 'utf-8');
  const mockAuthTag = Buffer.from('auth-tag-teste-16-bytes-teste', 'utf-8');
  const mockHash = 'hash-de-teste-para-verificacao-de-integridade';

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

  const mockConfigService = {
    get: jest.fn().mockImplementation((key) => {
      if (key === 'ENCRYPTION_KEY_PATH') {return './test-encryption.key';}
      return null;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock para crypto.randomBytes
    (crypto.randomBytes as jest.Mock).mockImplementation((size) => {
      if (size === 16) {return mockIv;}
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
        {
          provide: CriptografiaService,
          useFactory: () => {
            return new CriptografiaService(
              mockConfigService as unknown as ConfigService,
            );
          },
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CriptografiaService>(CriptografiaService);
    // Sobrescrever a chave mestra para testes
    Object.defineProperty(service, 'masterKey', { value: mockMasterKey });
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('criptografarBuffer', () => {
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
      const resultado = service.criptografarBuffer(dadosOriginais);

      // Assert
      expect(crypto.createCipheriv).toHaveBeenCalledWith(
        'aes-256-gcm',
        mockMasterKey,
        mockIv,
        { authTagLength: 16 },
      );
      expect(mockCipher.update).toHaveBeenCalledWith(dadosOriginais);
      expect(mockCipher.final).toHaveBeenCalled();
      expect(mockCipher.getAuthTag).toHaveBeenCalled();

      expect(resultado).toEqual({
        dadosCriptografados: dadosCriptografados,
        iv: mockIv,
        authTag: mockAuthTag,
      });
    });
  });

  describe('descriptografarBuffer', () => {
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
      const resultado = service.descriptografarBuffer(
        dadosCriptografados,
        mockIv,
        mockAuthTag,
      );

      // Assert
      expect(crypto.createDecipheriv).toHaveBeenCalledWith(
        'aes-256-gcm',
        mockMasterKey,
        mockIv,
        { authTagLength: 16 },
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
        service.descriptografarBuffer(dadosCriptografados, mockIv, mockAuthTag);
      }).toThrow('Erro ao descriptografar dados: Falha na autenticação');
    });
  });

  describe('gerarHash', () => {
    it('deve gerar um hash SHA-256 para um buffer', () => {
      // Arrange
      const dados = Buffer.from('dados para hash', 'utf-8');

      mockHashObject.update.mockReturnThis();
      mockHashObject.digest.mockReturnValue(mockHash);

      // Act
      const resultado = service.gerarHash(dados);

      // Assert
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(mockHashObject.update).toHaveBeenCalledWith(dados);
      expect(mockHashObject.digest).toHaveBeenCalledWith('hex');

      expect(resultado).toEqual(mockHash);
    });
  });

  describe('verificarHash', () => {
    it('deve retornar true quando o hash corresponde aos dados', () => {
      // Arrange
      const dados = Buffer.from('dados para verificação', 'utf-8');
      const hashOriginal = 'hash-original';

      mockHashObject.update.mockReturnThis();
      mockHashObject.digest.mockReturnValue(hashOriginal);

      // Act
      const resultado = service.verificarHash(dados, hashOriginal);

      // Assert
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(mockHashObject.update).toHaveBeenCalledWith(dados);
      expect(mockHashObject.digest).toHaveBeenCalledWith('hex');

      expect(resultado).toBe(true);
    });

    it('deve retornar false quando o hash não corresponde aos dados', () => {
      // Arrange
      const dados = Buffer.from('dados para verificação', 'utf-8');
      const hashOriginal = 'hash-original';
      const hashCalculado = 'hash-diferente';

      mockHashObject.update.mockReturnThis();
      mockHashObject.digest.mockReturnValue(hashCalculado);

      // Act
      const resultado = service.verificarHash(dados, hashOriginal);

      // Assert
      expect(resultado).toBe(false);
    });
  });
});
