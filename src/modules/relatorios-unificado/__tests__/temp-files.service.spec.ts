import { Test, TestingModule } from '@nestjs/testing';
import { TempFilesService } from '../services/temp-files.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Testes unitários para o serviço de arquivos temporários
 *
 * Este arquivo contém testes que validam a funcionalidade do serviço
 * responsável por gerenciar arquivos temporários durante a geração de relatórios
 */
describe('TempFilesService', () => {
  let service: TempFilesService;

  // Mock para fs
  jest.mock('fs', () => ({
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    unlinkSync: jest.fn(),
    promises: {
      unlink: jest.fn(),
    },
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TempFilesService],
    }).compile();

    service = module.get<TempFilesService>(TempFilesService);

    // Reset mocks antes de cada teste
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('getTempFilePath', () => {
    it('deve gerar um caminho de arquivo temporário com prefixo e extensão', () => {
      const filePath = service.getTempFilePath('teste', 'pdf');
      expect(filePath).toMatch(
        /temp\/relatorios\/teste-[a-zA-Z0-9]+-[a-zA-Z0-9]+\.pdf/,
      );
    });

    it('deve criar o diretório temporário se não existir', () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

      service.getTempFilePath('teste', 'pdf');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('temp/relatorios'),
        { recursive: true },
      );
    });
  });

  describe('cleanupTempFile', () => {
    it('deve excluir um arquivo temporário', async () => {
      const mockPath = 'temp/relatorios/teste-123.pdf';

      await service.cleanupTempFile(mockPath);

      expect(fs.promises.unlink).toHaveBeenCalledWith(mockPath);
    });

    it('deve lidar com erros ao excluir arquivos', async () => {
      const mockPath = 'temp/relatorios/teste-123.pdf';
      const mockError = new Error('Erro ao excluir arquivo');

      (fs.promises.unlink as jest.Mock).mockRejectedValueOnce(mockError);

      // Não deve lançar erro, apenas logar
      await expect(service.cleanupTempFile(mockPath)).resolves.not.toThrow();
    });
  });

  describe('getTempDir', () => {
    it('deve retornar o diretório temporário padrão', () => {
      expect(service.getTempDir()).toBe('temp/relatorios');
    });
  });
});
