import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { CriptografiaService } from '../../src/shared/services/criptografia.service';
import * as crypto from 'crypto';

describe('Criptografia (Integração)', () => {
  let app: INestApplication;
  let criptografiaService: CriptografiaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    criptografiaService =
      moduleFixture.get<CriptografiaService>(CriptografiaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Criptografia e Descriptografia de Dados', () => {
    it('deve criptografar e descriptografar um buffer corretamente', () => {
      // Arrange
      const dadosOriginais = Buffer.from(
        'Dados sensíveis para teste de criptografia',
        'utf-8',
      );

      // Act
      const { dadosCriptografados, iv, authTag } =
        criptografiaService.cryptografarBuffer(dadosOriginais);
      const dadosDescriptografados = criptografiaService.descriptografarBuffer(
        dadosCriptografados,
        iv,
        authTag,
      );

      // Assert
      expect(dadosCriptografados).not.toEqual(dadosOriginais);
      expect(dadosDescriptografados).toEqual(dadosOriginais);
      expect(dadosDescriptografados.toString('utf-8')).toBe(
        'Dados sensíveis para teste de criptografia',
      );
    });

    it('deve falhar ao descriptografar com authTag incorreto', () => {
      // Arrange
      const dadosOriginais = Buffer.from(
        'Dados sensíveis para teste de criptografia',
        'utf-8',
      );
      const { dadosCriptografados, iv } =
        criptografiaService.cryptografarBuffer(dadosOriginais);
      const authTagIncorreto = crypto.randomBytes(16);

      // Act & Assert
      expect(() => {
        criptografiaService.descriptografarBuffer(
          dadosCriptografados,
          iv,
          authTagIncorreto,
        );
      }).toThrow();
    });

    it('deve falhar ao descriptografar com IV incorreto', () => {
      // Arrange
      const dadosOriginais = Buffer.from(
        'Dados sensíveis para teste de criptografia',
        'utf-8',
      );
      const { dadosCriptografados, authTag } =
        criptografiaService.cryptografarBuffer(dadosOriginais);
      const ivIncorreto = crypto.randomBytes(16);

      // Act & Assert
      expect(() => {
        criptografiaService.descriptografarBuffer(
          dadosCriptografados,
          ivIncorreto,
          authTag,
        );
      }).toThrow();
    });
  });

  describe('Verificação de Integridade', () => {
    it('deve gerar e verificar hash corretamente', () => {
      // Arrange
      const dadosOriginais = Buffer.from(
        'Dados para verificação de integridade',
        'utf-8',
      );

      // Act
      const hash = criptografiaService.gerarHash(dadosOriginais);
      const resultado = criptografiaService.verificarIntegridade(
        dadosOriginais,
        hash,
      );

      // Assert
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
      expect(resultado).toBe(true);
    });

    it('deve detectar alterações nos dados', () => {
      // Arrange
      const dadosOriginais = Buffer.from(
        'Dados para verificação de integridade',
        'utf-8',
      );
      const hash = criptografiaService.gerarHash(dadosOriginais);

      // Alterar os dados
      const dadosAlterados = Buffer.from(
        'Dados para verificação de integridade ALTERADOS',
        'utf-8',
      );

      // Act
      const resultado = criptografiaService.verificarIntegridade(
        dadosAlterados,
        hash,
      );

      // Assert
      expect(resultado).toBe(false);
    });

    it('deve detectar hash incorreto', () => {
      // Arrange
      const dadosOriginais = Buffer.from(
        'Dados para verificação de integridade',
        'utf-8',
      );
      const hashIncorreto = 'hash-incorreto-para-teste';

      // Act
      const resultado = criptografiaService.verificarIntegridade(
        dadosOriginais,
        hashIncorreto,
      );

      // Assert
      expect(resultado).toBe(false);
    });
  });

  describe('Tamanho dos Dados Criptografados', () => {
    it('deve aumentar o tamanho dos dados após criptografia', () => {
      // Arrange
      const dadosOriginais = Buffer.from('Dados de teste', 'utf-8');

      // Act
      const { dadosCriptografados } =
        criptografiaService.cryptografarBuffer(dadosOriginais);

      // Assert
      expect(dadosCriptografados.length).toBeGreaterThanOrEqual(
        dadosOriginais.length,
      );
    });
  });

  describe('Performance de Criptografia', () => {
    it('deve criptografar e descriptografar arquivos grandes em tempo razoável', () => {
      // Arrange
      const tamanhoArquivo = 1024 * 1024; // 1MB
      const dadosGrandes = crypto.randomBytes(tamanhoArquivo);

      // Act
      const inicio = Date.now();
      const { dadosCriptografados, iv, authTag } =
        criptografiaService.cryptografarBuffer(dadosGrandes);
      const tempoParaCriptografar = Date.now() - inicio;

      const inicioDescript = Date.now();
      const dadosDescriptografados = criptografiaService.descriptografarBuffer(
        dadosCriptografados,
        iv,
        authTag,
      );
      const tempoParaDescriptografar = Date.now() - inicioDescript;

      // Assert
      expect(dadosDescriptografados).toEqual(dadosGrandes);
      expect(tempoParaCriptografar).toBeLessThan(1000); // Menos de 1 segundo para criptografar 1MB
      expect(tempoParaDescriptografar).toBeLessThan(1000); // Menos de 1 segundo para descriptografar 1MB
    });
  });
});
