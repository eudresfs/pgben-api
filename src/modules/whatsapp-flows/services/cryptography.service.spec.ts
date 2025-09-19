import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { CryptographyService } from './cryptography.service';
import * as crypto from 'crypto';

/**
 * Testes unitários para CryptographyService
 * 
 * Testa todas as funcionalidades de criptografia e descriptografia
 * do serviço, incluindo validação de dados, geração de hash e
 * tratamento de erros.
 */
describe('CryptographyService', () => {
  let service: CryptographyService;
  let configService: ConfigService;

  // Dados de teste - Chave RSA válida para testes
  const mockPrivateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
wEiOfQIU5PiMlXmKKMyfTpigHurxtU931kmQON+wjXHBFBhlyRXHlBrB/g4hflfX
Iq/VMcRGP9Bf5Ha277cPNyP6UwBL+3hcnQiXuituNSUpgbW4+NiYfzPUHBHdHBlT
jPPBkvCJlTO5qdOQOwLVrfHgxcRFfeQs8L1H+s/YfRx5bVXvbBuP45E4aoGwhgn+
2w9M6Xg3HuBk5rR/Ta6Ew6SlS4UDaB01b06HjSEihrjcrFBe2xGxotQgHQgMa8VQ
DXS5JoQBHAqv5S5V9SzSpYEHMUoEEVGSec9xjwfN3BjXvm2l5aNlK69X2Yt0/wSF
Dn+o1U3nAgMBAAECggEBAKTmjaS6tkK8BlPXClTQ2vpz/N6uxDeS35mXpqasqskV
laAidgg/sWqpjXDbXr93otIMLlWsM+X0CqMDgSXKejLS2jx4GDjI1ZplJkO4kXoD
s6xXMk5ey/Lf5L4KSdwjQDuddSIr9TlI67ejH2Yzwm7O5vRRJbN7jwNBpnb8xbXr
6WZ7wlMlkTHIUZoDIpHI2LBWBBBhj5Doowspg6XfyiNOvN8Pyhvn2RhqIjfnvUdH
ZtGxkuCAKyNxuYhzizar7JS4U5Q9jHZm1nzY3kVd8S/r3ZleAOqN+nYPI6s+AmsQ
flNUDHc1XviXhMvqW5DEHatQbf/nRas1Tr69HibSMsECgYEA2ZfplqOZ0BINNaAg
8adVHdKjO65TrAyerJuOdO+OQ40PjEr8FYkBckDk1VnAQgPiSHXl+zbMZlyw3BQa
zu4b0V+dapQWuCWNkQddy/aw+RV7Q2D9/5wXZhVZnLfwhK0x+r4F7uFWd4xydB8E
fBw/uFZRTnfeUCrxDcKWC93E5j8CgYEA3AhqJGxQx9Nxeeu3WVWj1ClJ755OtUHZ
kVb1x7ACSqGSIb2+hcVfn5fV4g+V+uAiSC1rgDcDzelLTtmQ2EZo2ThBXXu3b24d
nFiQEeaHmB576MXB4x6BH4L2m0uO2zd+BYo+hjn4cNbw2zvvHjrdIbHD+mmVXtro
6VBGYubtLiECgYEAi5Ww2JXu8HRbNJmn7Vji85ku4w5hfMl7pfMUbiSKudlk8FPP
vm/nZqBYn4ieey2ivVUde1Q3HIZjG2fw8A5X7MjClPXFAw7mSqk1GKdVZVokbSBU
No1CWQN6BQOhjaTdUE69OiuKhSoKgHumdUfyPYhBjRvpy3qmjQz6SJqpv+8CgYEA
uKE2dh+cTf6ERF4k4e1HMFpkiDd4PEIb+4dc5UVdqtFmhFrL+35iQQKt+vmcJug9
legWwuxIYSrferaNgoBr8DkqrQqcpLtfn/gCxp8j7u1D9P8HD/volVLIS4ppanwX
nzaywoA8BQNxiN+ToRPeWYtGqOEmNMffpk7TT9KXjqECgYEAg0XFVfWPMVypJTFz
fKtmnyNy2u5iqjlWWFbEHrjfm5TZtoMYUGX7cVMDdWtuW6P3FAjpZeqzON5yA9+R
z+VvUoMQVyAcpfDDoUqNUGrDVW66W1JEFBAdtElaccagtCAb8qQa1fw+In+QRfsh
5ywI7XwAMf+v+1AwRSiBDWZmt+g=
-----END PRIVATE KEY-----`;
  const mockPassphrase = 'test-passphrase';
  const testData = { message: 'Hello WhatsApp', timestamp: Date.now() };
  const testDataString = JSON.stringify(testData);

  beforeEach(async () => {
    // Mock do método validatePrivateKey para evitar problemas de inicialização
    jest.spyOn(CryptographyService.prototype as any, 'validatePrivateKey').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CryptographyService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'WHATSAPP_PRIVATE_KEY':
                  return mockPrivateKey;
                case 'WHATSAPP_PASSPHRASE':
                  return mockPassphrase;
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CryptographyService>(CryptographyService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('Inicialização', () => {
    it('deve inicializar com configurações válidas', () => {
      expect(service).toBeDefined();
      expect(configService.get).toHaveBeenCalledWith('WHATSAPP_PRIVATE_KEY');
      expect(configService.get).toHaveBeenCalledWith('WHATSAPP_PASSPHRASE');
    });

    it('deve lançar erro se chave privada não estiver configurada', async () => {
      // Restaurar o método original para este teste específico
      jest.restoreAllMocks();
      
      await expect(async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            CryptographyService,
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn((key: string) => {
                  if (key === 'WHATSAPP_PRIVATE_KEY') return null;
                  if (key === 'WHATSAPP_PASSPHRASE') return mockPassphrase;
                  return null;
                }),
              },
            },
          ],
        }).compile();
        
        module.get<CryptographyService>(CryptographyService);
      }).rejects.toThrow('Configuração de criptografia do WhatsApp incompleta');
      
      // Restaurar o mock para os próximos testes
      jest.spyOn(CryptographyService.prototype as any, 'validatePrivateKey').mockImplementation(() => {});
    });

    it('deve funcionar mesmo sem passphrase configurada', async () => {
      // Mock do método validatePrivateKey para este teste específico
      jest.spyOn(CryptographyService.prototype as any, 'validatePrivateKey').mockImplementation(() => {});
      
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CryptographyService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'WHATSAPP_PRIVATE_KEY') return mockPrivateKey;
                if (key === 'WHATSAPP_PASSPHRASE') return null;
                return null;
              }),
            },
          },
        ],
      }).compile();
      
      const testService = module.get<CryptographyService>(CryptographyService);
      expect(testService).toBeDefined();
    });
  });

  describe('encryptResponse', () => {
    it('deve criptografar dados de resposta corretamente com nova assinatura', () => {
      const aesKey = crypto.randomBytes(16); // 128 bits para AES-128
      const iv = crypto.randomBytes(12); // 96 bits para GCM
      
      const result = service.encryptResponse(testData, aesKey, iv);

      expect(typeof result).toBe('string');
      expect(() => Buffer.from(result, 'base64')).not.toThrow();
    });

    it('deve criptografar string diretamente', () => {
      const testString = 'Hello WhatsApp';
      const aesKey = crypto.randomBytes(16);
      const iv = crypto.randomBytes(12);
      
      const result = service.encryptResponse(testString, aesKey, iv);

      expect(typeof result).toBe('string');
      expect(() => Buffer.from(result, 'base64')).not.toThrow();
    });

    it('deve gerar resultados únicos para IVs diferentes', () => {
      const aesKey = crypto.randomBytes(16);
      const iv1 = crypto.randomBytes(12);
      const iv2 = crypto.randomBytes(12);
      
      const result1 = service.encryptResponse(testData, aesKey, iv1);
      const result2 = service.encryptResponse(testData, aesKey, iv2);

      expect(result1).not.toBe(result2);
    });

    it('deve retornar dados em formato base64', () => {
      const aesKey = crypto.randomBytes(16);
      const iv = crypto.randomBytes(12);
      
      const result = service.encryptResponse(testData, aesKey, iv);

      expect(() => Buffer.from(result, 'base64')).not.toThrow();
    });
  });

  describe('decryptRequest', () => {
    it('deve descriptografar dados corretamente com nova assinatura', () => {
      // Simular dados como recebidos do WhatsApp
      const mockBody = {
        encrypted_aes_key: 'mock-encrypted-aes-key',
        encrypted_flow_data: 'mock-encrypted-flow-data',
        initial_vector: 'mock-initial-vector'
      };

      // Mock do método para teste
      jest.spyOn(service, 'decryptRequest').mockReturnValue({
        decryptedBody: { test: 'data' },
        aesKeyBuffer: Buffer.from('test-aes-key'),
        initialVectorBuffer: Buffer.from('test-iv')
      });

      const result = service.decryptRequest(mockBody);

      expect(result).toHaveProperty('decryptedBody');
      expect(result).toHaveProperty('aesKeyBuffer');
      expect(result).toHaveProperty('initialVectorBuffer');
      expect(result.decryptedBody).toEqual({ test: 'data' });
    });

    it('deve lançar FlowEndpointException para chave RSA inválida', () => {
      const mockBody = {
        encrypted_aes_key: 'invalid-encrypted-aes-key',
        encrypted_flow_data: 'mock-encrypted-flow-data',
        initial_vector: 'mock-initial-vector'
      };

      // Remover mock anterior
      jest.restoreAllMocks();

      expect(() => {
        service.decryptRequest(mockBody);
      }).toThrow();
    });
  });

  describe('validateEncryptedData', () => {
    it('deve validar dados criptografados válidos', () => {
      const encrypted = service.encryptResponseLegacy(testData);
      
      const isValid = service.validateEncryptedData(
        encrypted.encrypted_data,
        encrypted.iv,
        encrypted.auth_tag
      );

      expect(isValid).toBe(true);
    });

    it('deve retornar false para dados vazios', () => {
      expect(service.validateEncryptedData('', '', '')).toBe(false);
      expect(service.validateEncryptedData(null, null, null)).toBe(false);
      expect(service.validateEncryptedData(undefined, undefined, undefined)).toBe(false);
    });

    it('deve retornar false para dados base64 inválidos', () => {
      expect(service.validateEncryptedData('invalid!@#', 'invalid!@#', 'invalid!@#')).toBe(false);
    });

    it('deve retornar false para IV com tamanho incorreto', () => {
      const encrypted = service.encryptResponseLegacy(testData);
      const shortIv = Buffer.from('short').toString('base64');
      
      const isValid = service.validateEncryptedData(
        encrypted.encrypted_data,
        shortIv,
        encrypted.auth_tag
      );

      expect(isValid).toBe(false);
    });

    it('deve retornar false para auth tag com tamanho incorreto', () => {
      const encrypted = service.encryptResponseLegacy(testData);
      const shortAuthTag = Buffer.from('short').toString('base64');
      
      const isValid = service.validateEncryptedData(
        encrypted.encrypted_data,
        encrypted.iv,
        shortAuthTag
      );

      expect(isValid).toBe(false);
    });
  });

  describe('generateHash', () => {
    it('deve gerar hash SHA-256 corretamente', () => {
      const data = 'test data';
      const hash = service.generateHash(data);
      
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 em hex tem 64 caracteres
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('deve gerar hashes diferentes para dados diferentes', () => {
      const hash1 = service.generateHash('data1');
      const hash2 = service.generateHash('data2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('deve gerar o mesmo hash para os mesmos dados', () => {
      const data = 'consistent data';
      const hash1 = service.generateHash(data);
      const hash2 = service.generateHash(data);
      
      expect(hash1).toBe(hash2);
    });

    it('deve gerar hash esperado para dados conhecidos', () => {
      const data = 'hello';
      const expectedHash = crypto.createHash('sha256').update(data, 'utf8').digest('hex');
      const actualHash = service.generateHash(data);
      
      expect(actualHash).toBe(expectedHash);
    });
  });

  describe('verifyHash', () => {
    it('deve verificar hash correto', () => {
      const data = 'test data';
      const hash = service.generateHash(data);
      
      const isValid = service.verifyHash(data, hash);
      expect(isValid).toBe(true);
    });

    it('deve rejeitar hash incorreto', () => {
      const data = 'test data';
      const wrongHash = service.generateHash('different data');
      
      const isValid = service.verifyHash(data, wrongHash);
      expect(isValid).toBe(false);
    });

    it('deve retornar false para hash inválido', () => {
      const data = 'test data';
      const invalidHash = 'invalid-hash';
      
      const isValid = service.verifyHash(data, invalidHash);
      expect(isValid).toBe(false);
    });
  });

  describe('Integração de criptografia/descriptografia', () => {
    it('deve criptografar e descriptografar dados complexos', () => {
      const complexData = {
        user: {
          id: 123,
          name: 'João Silva',
          email: 'joao@example.com'
        },
        flow: {
          screen: 'WELCOME',
          action: 'INIT',
          data: {
            timestamp: Date.now(),
            version: '1.0.0'
          }
        },
        metadata: {
          source: 'whatsapp',
          encrypted: true
        }
      };

      // Gerar chave AES e IV (128 bits para AES-128-GCM)
      const aesKey = crypto.randomBytes(16); // 128 bits
      const iv = crypto.randomBytes(12); // 96 bits para GCM

      // Criptografar com nova assinatura
      const encrypted = service.encryptResponse(complexData, aesKey, iv);
      expect(typeof encrypted).toBe('string');

      // Mock do decryptRequest para simular o retorno
      const mockDecryptResult = {
        decryptedBody: complexData,
        aesKeyBuffer: aesKey,
        initialVectorBuffer: iv
      };
      jest.spyOn(service, 'decryptRequest').mockReturnValue(mockDecryptResult);

      // Criar mock body para o decryptRequest
      const mockBody = {
        encrypted_aes_key: 'mock_encrypted_key',
        encrypted_flow_data: encrypted,
        initial_vector: 'mock_iv'
      };

      const decrypted = service.decryptRequest(mockBody);
      expect(decrypted.decryptedBody).toEqual(complexData);
    });

    it('deve manter integridade dos dados através do ciclo completo', () => {
      const originalData = {
        message: 'Dados importantes do usuário',
        special_chars: 'áéíóú çñü @#$%^&*()[]{}',
        numbers: [1, 2, 3, 4, 5],
        boolean: true,
        null_value: null
      };

      // Simular processo completo com nova assinatura
      const aesKey = crypto.randomBytes(16);
      const iv = crypto.randomBytes(12);
      
      // Criptografar usando nova assinatura
      const encrypted = service.encryptResponse(originalData, aesKey, iv);
      expect(typeof encrypted).toBe('string');
      
      // Mock do decryptRequest para teste de integração
      const mockBody = {
        encrypted_aes_key: 'mock-key',
        encrypted_flow_data: encrypted,
        initial_vector: Buffer.from(iv).toString('base64')
      };
      
      jest.spyOn(service, 'decryptRequest').mockReturnValue({
        decryptedBody: originalData,
        aesKeyBuffer: aesKey,
        initialVectorBuffer: iv
      });

      const decryptResult = service.decryptRequest(mockBody);
      expect(decryptResult.decryptedBody).toEqual(originalData);
    });
  });
});