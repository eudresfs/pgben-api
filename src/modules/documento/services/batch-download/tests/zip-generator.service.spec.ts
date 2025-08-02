import { Test, TestingModule } from '@nestjs/testing';
import { ZipGeneratorService } from '../zip-generator.service';
import { StorageProviderFactory } from '../../../factories/storage-provider.factory';
import { Documento } from '../../../../../entities/documento.entity';
import { PassThrough } from 'stream';

/**
 * Testes unitários para o ZipGeneratorService
 * Verifica a funcionalidade de geração de ZIP streaming
 */
describe('ZipGeneratorService', () => {
  let service: ZipGeneratorService;
  let mockStorageProviderFactory: jest.Mocked<StorageProviderFactory>;
  let mockStorageProvider: any;

  beforeEach(async () => {
    // Mock do provider de storage
    mockStorageProvider = {
      nome: 'MockStorage',
      obterArquivo: jest.fn(),
    };

    // Mock da factory
    mockStorageProviderFactory = {
      getProvider: jest.fn().mockReturnValue(mockStorageProvider),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZipGeneratorService,
        {
          provide: StorageProviderFactory,
          useValue: mockStorageProviderFactory,
        },
      ],
    }).compile();

    service = module.get<ZipGeneratorService>(ZipGeneratorService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  it('deve gerar um stream ZIP com arquivos válidos', async () => {
    // Arrange
    const mockFileBuffer = Buffer.from('conteúdo do arquivo de teste');
    mockStorageProvider.obterArquivo.mockResolvedValue(mockFileBuffer);

    const arquivos: Partial<Documento>[] = [
      {
        id: '1',
        nome_arquivo: 'teste1.pdf',
        caminho: '/path/to/teste1.pdf',
        tamanho: 1024,
        cidadao_id: 'cidadao-1',
        tipo: 'RG' as any,
        nome_original: 'teste1.pdf',
        mimetype: 'application/pdf',
        data_upload: new Date(),
        usuario_upload_id: 'user-1',
        verificado: false,
        reutilizavel: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '2',
        nome_arquivo: 'teste2.pdf',
        caminho: '/path/to/teste2.pdf',
        tamanho: 2048,
        cidadao_id: 'cidadao-1',
        tipo: 'CPF' as any,
        nome_original: 'teste2.pdf',
        mimetype: 'application/pdf',
        data_upload: new Date(),
        usuario_upload_id: 'user-1',
        verificado: false,
        reutilizavel: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    const options = {
      compressionLevel: 6,
      bufferSize: 64 * 1024,
    };

    // Act
    const result = await service.gerarZipStream(arquivos as Documento[], 'job-123', options);

    // Assert
    expect(result).toBeDefined();
    expect(result.stream).toBeInstanceOf(PassThrough);
    expect(result.estimatedSize).toBeGreaterThan(0);
    expect(mockStorageProvider.obterArquivo).toHaveBeenCalledTimes(2);
  });

  it('deve lidar com arquivos não encontrados', async () => {
    // Arrange
    mockStorageProvider.obterArquivo.mockRejectedValue(new Error('Arquivo não encontrado'));

    const arquivos: Partial<Documento>[] = [
      {
        id: '1',
        nome_arquivo: 'inexistente.pdf',
        caminho: '/path/to/inexistente.pdf',
        tamanho: 1024,
        cidadao_id: 'cidadao-1',
        tipo: 'RG' as any,
        nome_original: 'inexistente.pdf',
        mimetype: 'application/pdf',
        data_upload: new Date(),
        usuario_upload_id: 'user-1',
        verificado: false,
        reutilizavel: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    // Act
    const result = await service.gerarZipStream(arquivos as Documento[], 'job-456');

    // Assert
    expect(result).toBeDefined();
    expect(result.stream).toBeInstanceOf(PassThrough);
    expect(mockStorageProvider.obterArquivo).toHaveBeenCalled();
  });

  it('deve aplicar configurações de compressão personalizadas', async () => {
    // Arrange
    const mockFileBuffer = Buffer.from('conteúdo teste');
    mockStorageProvider.obterArquivo.mockResolvedValue(mockFileBuffer);

    const arquivos: Partial<Documento>[] = [
      {
        id: '1',
        nome_arquivo: 'teste.pdf',
        caminho: '/path/to/teste.pdf',
        tamanho: 1024,
        cidadao_id: 'cidadao-1',
        tipo: 'RG' as any,
        nome_original: 'teste.pdf',
        mimetype: 'application/pdf',
        data_upload: new Date(),
        usuario_upload_id: 'user-1',
        verificado: false,
        reutilizavel: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    const options = {
      compressionLevel: 9, // Máxima compressão
      bufferSize: 128 * 1024, // Buffer maior
    };

    // Act
    const result = await service.gerarZipStream(arquivos as Documento[], 'job-789', options);

    // Assert
    expect(result).toBeDefined();
    expect(result.stream).toBeInstanceOf(PassThrough);
    expect(result.estimatedSize).toBeGreaterThan(0);
  });
});