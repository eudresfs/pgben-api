import { Test, TestingModule } from '@nestjs/testing';
import { LocalStorageAdapter } from '../local-storage.adapter';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// Mock dos módulos fs e path
jest.mock('fs');
jest.mock('path');

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;
  let mockLogger: any;
  let mockConfigService: any;

  beforeEach(async () => {
    // Limpar todos os mocks
    jest.clearAllMocks();

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('/tmp/uploads'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStorageAdapter,
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

    adapter = module.get<LocalStorageAdapter>(LocalStorageAdapter);
  });

  it('deve ser definido', () => {
    expect(adapter).toBeDefined();
  });

  describe('salvarArquivo', () => {
    it('deve salvar um arquivo corretamente', async () => {
      // Arrange
      const buffer = Buffer.from('conteúdo de teste');
      const nomeArquivo = 'arquivo-teste.pdf';
      const mimetype = 'application/pdf';

      // Mock para data atual
      jest
        .spyOn(Date.prototype, 'toISOString')
        .mockReturnValue('2023-01-01T00:00:00.000Z');

      // Configurar mocks básicos
      (path.join as jest.Mock).mockReturnValue(
        '/tmp/uploads/documentos/2023/01/arquivo-teste.pdf',
      );
      (path.dirname as jest.Mock).mockReturnValue(
        '/tmp/uploads/documentos/2023/01',
      );

      // Act
      const resultado = await adapter.salvarArquivo(
        buffer,
        nomeArquivo,
        mimetype,
      );

      // Assert
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(resultado).toMatch(/documentos\/2023\/01\/.+\.pdf/);
    });

    it('deve lançar erro quando falhar ao salvar o arquivo', async () => {
      // Arrange
      const buffer = Buffer.from('conteúdo de teste');
      const nomeArquivo = 'arquivo-erro.pdf';
      const mimetype = 'application/pdf';

      // Mock para simular erro ao escrever arquivo
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Erro de escrita');
      });

      // Act & Assert
      await expect(
        adapter.salvarArquivo(buffer, nomeArquivo, mimetype),
      ).rejects.toThrow('Erro ao salvar arquivo');
    });
  });

  describe('obterArquivo', () => {
    it('deve obter um arquivo corretamente', async () => {
      // Arrange
      const caminho = 'documentos/2023/01/arquivo-teste.pdf';
      const buffer = Buffer.from('conteúdo do arquivo');

      // Configurar mocks básicos
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(buffer);
      (path.join as jest.Mock).mockReturnValue(
        '/tmp/uploads/documentos/2023/01/arquivo-teste.pdf',
      );

      // Act
      const resultado = await adapter.obterArquivo(caminho);

      // Assert
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(resultado).toEqual(buffer);
    });

    it('deve lançar erro quando o arquivo não existe', async () => {
      // Arrange
      const caminho = 'documentos/2023/01/arquivo-inexistente.pdf';

      // Configurar mocks básicos
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Act & Assert
      await expect(adapter.obterArquivo(caminho)).rejects.toThrow(
        'Arquivo não encontrado',
      );
    });
  });

  describe('removerArquivo', () => {
    it('deve excluir um arquivo corretamente', async () => {
      // Arrange
      const caminho = 'documentos/2023/01/arquivo-teste.pdf';

      // Configurar mocks básicos
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (path.join as jest.Mock).mockReturnValue(
        '/tmp/uploads/documentos/2023/01/arquivo-teste.pdf',
      );

      // Act
      await adapter.removerArquivo(caminho);

      // Assert
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('deve tratar silenciosamente quando o arquivo não existe', async () => {
      // Arrange
      const caminho = 'documentos/2023/01/arquivo-inexistente.pdf';

      // Configurar mocks básicos
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (path.join as jest.Mock).mockReturnValue(
        '/tmp/uploads/documentos/2023/01/arquivo-inexistente.pdf',
      );

      // Act
      await adapter.removerArquivo(caminho);

      // Assert
      // Verificar que o arquivo não foi removido
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('deve retornar true quando o arquivo existe', async () => {
      // Arrange
      const key = 'documentos/2023/01/arquivo-teste.pdf';

      // Configurar mocks
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (path.join as jest.Mock).mockReturnValue(
        '/tmp/uploads/documentos/2023/01/arquivo-teste.pdf',
      );

      // Act
      const resultado = await adapter.exists(key);

      // Assert
      expect(resultado).toBe(true);
    });

    it('deve retornar false quando o arquivo não existe', async () => {
      // Arrange
      const key = 'documentos/2023/01/arquivo-inexistente.pdf';

      // Configurar mocks
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Act
      const resultado = await adapter.exists(key);

      // Assert
      expect(resultado).toBe(false);
    });
  });

  describe('getUrl', () => {
    it('deve retornar a URL do arquivo', async () => {
      // Arrange
      const key = 'documentos/2023/01/arquivo-teste.pdf';

      // Configurar mocks
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Act
      const resultado = await adapter.getUrl(key);

      // Assert
      expect(resultado).toContain('/documentos/2023/01/arquivo-teste.pdf');
    });

    it('deve lançar erro quando o arquivo não existe', async () => {
      // Arrange
      const caminho = 'documentos/2023/01/arquivo-inexistente.pdf';

      // Configurar mocks
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Act & Assert
      await expect(adapter.getUrl(caminho)).rejects.toThrow(
        'Arquivo não encontrado',
      );
    });
  });

  describe('copy', () => {
    it('deve copiar um arquivo corretamente', async () => {
      // Arrange
      const sourceKey = 'documentos/2023/01/arquivo-origem.pdf';
      const destinationKey = 'documentos/2023/01/arquivo-destino.pdf';

      // Configurar mocks básicos
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (path.join as jest.Mock).mockImplementation((base, ...args) => {
        return `/tmp/uploads/${args.join('/')}`;
      });
      (path.dirname as jest.Mock).mockReturnValue(
        '/tmp/uploads/documentos/2023/01',
      );

      // Act
      const resultado = await adapter.copy(sourceKey, destinationKey);

      // Assert
      expect(fs.copyFileSync).toHaveBeenCalled();
      expect(resultado).toEqual(destinationKey);
    });

    it('deve lançar erro quando falhar ao copiar o arquivo', async () => {
      // Arrange
      const sourceKey = 'documentos/2023/01/arquivo-origem.pdf';
      const destinationKey = 'documentos/2023/01/arquivo-destino.pdf';

      // Configurar mocks
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.copyFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Erro de cópia');
      });

      // Act & Assert
      await expect(adapter.copy(sourceKey, destinationKey)).rejects.toThrow(
        'Erro ao copiar arquivo',
      );
    });
  });

  describe('list', () => {
    it('deve listar arquivos com um prefixo específico', async () => {
      // Arrange
      const prefix = 'documentos/2023/01';

      // Configurar mocks
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        'arquivo1.txt',
        'arquivo2.txt',
      ]);
      (fs.statSync as jest.Mock).mockImplementation(() => ({
        isDirectory: () => false,
      }));

      // Mock para path.relative e path.dirname
      (path.relative as jest.Mock).mockImplementation((base, file) => {
        if (file.includes('arquivo1.txt')) {
          return 'documentos/2023/01/arquivo1.txt';
        }
        if (file.includes('arquivo2.txt')) {
          return 'documentos/2023/01/arquivo2.txt';
        }
        return '';
      });
      (path.dirname as jest.Mock).mockReturnValue(
        '/tmp/uploads/documentos/2023/01',
      );

      // Act
      const resultado = await adapter.list(prefix);

      // Assert
      expect(resultado.length).toBe(2);
      expect(resultado).toContain('documentos/2023/01/arquivo1.txt');
      expect(resultado).toContain('documentos/2023/01/arquivo2.txt');
    });

    it('deve retornar uma lista vazia quando o diretório não existe', async () => {
      // Arrange
      const prefix = 'documentos/2023/02';

      // Configurar mocks
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Act
      const resultado = await adapter.list(prefix);

      // Assert
      expect(resultado).toEqual([]);
    });
  });
});
