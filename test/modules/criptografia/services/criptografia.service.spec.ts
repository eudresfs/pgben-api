import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CriptografiaService } from '../../../../src/modules/criptografia/services/criptografia.service';

describe('CriptografiaService', () => {
  let service: CriptografiaService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
      ],
      providers: [
        CriptografiaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ENCRYPTION_KEY')
                return 'chave-de-criptografia-de-32-caracteres';
              if (key === 'ENCRYPTION_IV') return 'vetor-de-16-chars';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CriptografiaService>(CriptografiaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('criptografar', () => {
    it('deve criptografar um texto corretamente', () => {
      const textoOriginal = 'Dados sensíveis para criptografar';
      const textoCriptografado = service.criptografar(textoOriginal);

      // O texto criptografado não deve ser igual ao original
      expect(textoCriptografado).not.toEqual(textoOriginal);

      // O texto criptografado deve ser uma string não vazia
      expect(typeof textoCriptografado).toBe('string');
      expect(textoCriptografado.length).toBeGreaterThan(0);
    });

    it('deve gerar criptografias diferentes para o mesmo texto em chamadas distintas', () => {
      const textoOriginal = 'Dados sensíveis para criptografar';

      const criptografia1 = service.criptografar(textoOriginal);
      const criptografia2 = service.criptografar(textoOriginal);

      // Devido ao IV aleatório, as criptografias devem ser diferentes
      expect(criptografia1).not.toEqual(criptografia2);
    });

    it('deve retornar string vazia ao criptografar null ou undefined', () => {
      expect(service.criptografar(null)).toBe('');
      expect(service.criptografar(undefined)).toBe('');
    });

    it('deve criptografar objetos convertendo-os para JSON', () => {
      const objetoOriginal = { nome: 'João', cpf: '123.456.789-00' };
      const textoCriptografado = service.criptografar(objetoOriginal);

      // O texto criptografado deve ser uma string não vazia
      expect(typeof textoCriptografado).toBe('string');
      expect(textoCriptografado.length).toBeGreaterThan(0);
    });
  });

  describe('descriptografar', () => {
    it('deve descriptografar corretamente um texto previamente criptografado', () => {
      const textoOriginal = 'Dados sensíveis para criptografar';
      const textoCriptografado = service.criptografar(textoOriginal);
      const textoDescriptografado = service.descriptografar(textoCriptografado);

      expect(textoDescriptografado).toEqual(textoOriginal);
    });

    it('deve retornar string vazia ao descriptografar null ou undefined', () => {
      expect(service.descriptografar(null)).toBe('');
      expect(service.descriptografar(undefined)).toBe('');
    });

    it('deve descriptografar e converter para objeto quando o conteúdo original era um objeto', () => {
      const objetoOriginal = { nome: 'João', cpf: '123.456.789-00' };
      const textoCriptografado = service.criptografar(objetoOriginal);
      const objetoDescriptografado =
        service.descriptografarParaObjeto(textoCriptografado);

      expect(objetoDescriptografado).toEqual(objetoOriginal);
    });

    it('deve lançar erro ao tentar descriptografar um texto inválido', () => {
      const textoInvalido = 'texto-nao-criptografado';

      expect(() => service.descriptografar(textoInvalido)).toThrow();
    });
  });

  describe('criptografarArquivo', () => {
    it('deve criptografar um buffer de arquivo corretamente', () => {
      const conteudoOriginal = Buffer.from('Conteúdo do arquivo sensível');
      const conteudoCriptografado =
        service.criptografarArquivo(conteudoOriginal);

      // O conteúdo criptografado não deve ser igual ao original
      expect(conteudoCriptografado.equals(conteudoOriginal)).toBe(false);

      // O conteúdo criptografado deve ser um Buffer não vazio
      expect(Buffer.isBuffer(conteudoCriptografado)).toBe(true);
      expect(conteudoCriptografado.length).toBeGreaterThan(0);
    });

    it('deve retornar Buffer vazio ao criptografar null ou undefined', () => {
      expect(service.criptografarArquivo(null).length).toBe(0);
      expect(service.criptografarArquivo(undefined).length).toBe(0);
    });
  });

  describe('descriptografarArquivo', () => {
    it('deve descriptografar corretamente um buffer previamente criptografado', () => {
      const conteudoOriginal = Buffer.from('Conteúdo do arquivo sensível');
      const conteudoCriptografado =
        service.criptografarArquivo(conteudoOriginal);
      const conteudoDescriptografado = service.descriptografarArquivo(
        conteudoCriptografado,
      );

      expect(conteudoDescriptografado.equals(conteudoOriginal)).toBe(true);
    });

    it('deve retornar Buffer vazio ao descriptografar null ou undefined', () => {
      expect(service.descriptografarArquivo(null).length).toBe(0);
      expect(service.descriptografarArquivo(undefined).length).toBe(0);
    });

    it('deve lançar erro ao tentar descriptografar um buffer inválido', () => {
      const bufferInvalido = Buffer.from('buffer-nao-criptografado');

      expect(() => service.descriptografarArquivo(bufferInvalido)).toThrow();
    });
  });

  describe('gerarHash', () => {
    it('deve gerar um hash para uma string', () => {
      const textoOriginal = 'Texto para gerar hash';
      const hash = service.gerarHash(textoOriginal);

      // O hash deve ser uma string não vazia
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);

      // O hash não deve ser igual ao texto original
      expect(hash).not.toEqual(textoOriginal);
    });

    it('deve gerar o mesmo hash para o mesmo texto', () => {
      const textoOriginal = 'Texto para gerar hash';

      const hash1 = service.gerarHash(textoOriginal);
      const hash2 = service.gerarHash(textoOriginal);

      // Os hashes devem ser iguais
      expect(hash1).toEqual(hash2);
    });

    it('deve gerar hashes diferentes para textos diferentes', () => {
      const texto1 = 'Texto 1';
      const texto2 = 'Texto 2';

      const hash1 = service.gerarHash(texto1);
      const hash2 = service.gerarHash(texto2);

      // Os hashes devem ser diferentes
      expect(hash1).not.toEqual(hash2);
    });

    it('deve retornar string vazia ao gerar hash de null ou undefined', () => {
      expect(service.gerarHash(null)).toBe('');
      expect(service.gerarHash(undefined)).toBe('');
    });
  });

  describe('verificarHash', () => {
    it('deve verificar corretamente um hash válido', () => {
      const textoOriginal = 'Texto para verificar hash';
      const hash = service.gerarHash(textoOriginal);

      const resultado = service.verificarHash(textoOriginal, hash);

      expect(resultado).toBe(true);
    });

    it('deve rejeitar um hash inválido', () => {
      const textoOriginal = 'Texto para verificar hash';
      const hashInvalido = 'hash-invalido';

      const resultado = service.verificarHash(textoOriginal, hashInvalido);

      expect(resultado).toBe(false);
    });

    it('deve rejeitar quando o texto é diferente do original', () => {
      const textoOriginal = 'Texto para verificar hash';
      const hash = service.gerarHash(textoOriginal);

      const resultado = service.verificarHash('Texto diferente', hash);

      expect(resultado).toBe(false);
    });
  });
});
