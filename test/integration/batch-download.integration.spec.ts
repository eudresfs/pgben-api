import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Documento } from '../../src/entities/documento.entity';
import { Usuario } from '../../src/entities/usuario.entity';
import { JwtService } from '@nestjs/jwt';
import { MinioService } from '../../src/shared/services/minio.service';
import { DocumentoBatchService } from '../../src/modules/documento/services/batch-download/documento-batch.service';
import { BatchJobManagerService } from '../../src/modules/documento/services/batch-download/batch-job-manager.service';
import { ZipGeneratorService } from '../../src/modules/documento/services/batch-download/zip-generator.service';
import { DocumentFilterService } from '../../src/modules/documento/services/batch-download/document-filter.service';
import { Readable } from 'stream';
import { Solicitacao } from '../../src/entities/solicitacao.entity';
import { StatusSolicitacao } from '../../src/enums/status-solicitacao.enum';
import { TipoDocumentoEnum } from '../../src/enums';
import { IDocumentoBatchFiltros } from '../../src/modules/documento/interfaces/documento-batch.interface';
import { BatchDownloadDto } from '../../src/modules/documento/dto/batch-download.dto';

describe('Batch Download (Integração)', () => {
  let module: TestingModule;
  let documentoRepository: Repository<Documento>;
  let solicitacaoRepository: Repository<Solicitacao>;
  let usuarioRepository: Repository<Usuario>;
  let jwtService: JwtService;
  let minioService: MinioService;
  let documentoBatchService: DocumentoBatchService;
  let batchJobManager: BatchJobManagerService;
  let zipGenerator: ZipGeneratorService;
  let documentFilter: DocumentFilterService;

  // Mock do MinioService para evitar chamadas reais ao MinIO
  const mockMinioService = {
    uploadArquivo: jest.fn(),
    downloadArquivo: jest.fn(),
    removerArquivo: jest.fn(),
    gerarUrlPresigned: jest.fn(),
    obterArquivoStream: jest.fn(),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MinioService)
      .useValue(mockMinioService)
      .compile();

    documentoRepository = module.get<Repository<Documento>>(
      getRepositoryToken(Documento),
    );
    solicitacaoRepository = module.get<Repository<Solicitacao>>(
      getRepositoryToken(Solicitacao),
    );
    usuarioRepository = module.get<Repository<Usuario>>(
      getRepositoryToken(Usuario),
    );
    jwtService = module.get<JwtService>(JwtService);
    documentoBatchService = module.get<DocumentoBatchService>(DocumentoBatchService);
    batchJobManager = module.get<BatchJobManagerService>(BatchJobManagerService);
    zipGenerator = module.get<ZipGeneratorService>(ZipGeneratorService);
    documentFilter = module.get<DocumentFilterService>(DocumentFilterService);

    // Token de autenticação não é mais necessário para testes diretos de serviço
  });

  beforeEach(async () => {
    // Limpar dados antes de cada teste
    const documentos = await documentoRepository.find();
    if (documentos.length > 0) {
      await documentoRepository.remove(documentos);
    }

    const solicitacoes = await solicitacaoRepository.find();
    if (solicitacoes.length > 0) {
      await solicitacaoRepository.remove(solicitacoes);
    }

    // Criar dados de teste
    await criarDadosTeste();

    jest.clearAllMocks();
  });

  afterAll(async () => {
    await module.close();
  });

  async function criarDadosTeste() {
    // Criar solicitações de teste
    const solicitacao1 = solicitacaoRepository.create({
      id: '550e8400-e29b-41d4-a716-446655440000',
      protocolo: 'SOL202400001',
      status: StatusSolicitacao.PENDENTE,
      beneficiario_id: '550e8400-e29b-41d4-a716-446655440002',
      tipo_beneficio_id: '550e8400-e29b-41d4-a716-446655440003',
      unidade_id: '550e8400-e29b-41d4-a716-446655440004',
      tecnico_id: '550e8400-e29b-41d4-a716-446655440005',
      data_abertura: new Date(),
      observacoes: 'Teste 1',
    });
    await solicitacaoRepository.save(solicitacao1);

    const solicitacao2 = solicitacaoRepository.create({
      id: '550e8400-e29b-41d4-a716-446655440001',
      protocolo: 'SOL202400002',
      status: StatusSolicitacao.EM_ANALISE,
      beneficiario_id: '550e8400-e29b-41d4-a716-446655440002',
      tipo_beneficio_id: '550e8400-e29b-41d4-a716-446655440003',
      unidade_id: '550e8400-e29b-41d4-a716-446655440004',
      tecnico_id: '550e8400-e29b-41d4-a716-446655440005',
      data_abertura: new Date(),
      observacoes: 'Teste 2',
    });
    await solicitacaoRepository.save(solicitacao2);

    // Criar documentos de teste
    const documento1 = await documentoRepository.save({
      nome_arquivo: 'documento1.pdf',
      nome_original: 'documento1.pdf',
      caminho: '/uploads/documento1.pdf',
      tamanho: 1024,
      mimetype: 'application/pdf',
      solicitacao_id: '550e8400-e29b-41d4-a716-446655440000',
      cidadao_id: '550e8400-e29b-41d4-a716-446655440000',
      tipo: TipoDocumentoEnum.COMPROVANTE_RESIDENCIA,
      descricao: 'Comprovante de residência',
      data_upload: new Date(),
      usuario_upload_id: 'test-user-id',
    });

    const documento2 = await documentoRepository.save({
      nome_arquivo: 'documento2.pdf',
      nome_original: 'documento2.pdf',
      caminho: '/uploads/documento2.pdf',
      tamanho: 2048,
      mimetype: 'application/pdf',
      solicitacao_id: '550e8400-e29b-41d4-a716-446655440001',
      cidadao_id: '550e8400-e29b-41d4-a716-446655440000',
      tipo: TipoDocumentoEnum.LAUDO_MEDICO,
      descricao: 'Laudo médico',
      data_upload: new Date(),
      usuario_upload_id: 'test-user-id',
    });

    const documento3 = await documentoRepository.save({
      nome_arquivo: 'documento3.pdf',
      nome_original: 'documento3.pdf',
      caminho: '/uploads/documento3.pdf',
      tamanho: 1536,
      mimetype: 'application/pdf',
      solicitacao_id: '550e8400-e29b-41d4-a716-446655440000',
      cidadao_id: '550e8400-e29b-41d4-a716-446655440000',
      tipo: TipoDocumentoEnum.COMPROVANTE_RESIDENCIA,
      descricao: 'Outro comprovante',
      data_upload: new Date(),
      usuario_upload_id: 'test-user-id',
    });
  }

  describe('Fluxo Completo de Download em Lote', () => {
    it('deve processar download em lote com filtros básicos', async () => {
      // Arrange
      const filtros: IDocumentoBatchFiltros = {
        tipo_documento: [TipoDocumentoEnum.COMPROVANTE_RESIDENCIA],
      };

      // Mock do stream de arquivo
      const mockFileStream = new Readable({
        read() {
          this.push('conteúdo do arquivo');
          this.push(null);
        },
      });
      mockMinioService.obterArquivoStream.mockResolvedValue(mockFileStream);

      // Act
      const usuarioId = 'test-user-id';
      const jobId = await documentoBatchService.iniciarJob(filtros, usuarioId);

      // Assert
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      expect(mockMinioService.obterArquivoStream).toHaveBeenCalled();
    });

    it('deve validar filtros antes de processar', async () => {
      // Arrange
      const filtrosInvalidos: BatchDownloadDto = {
        dataInicio: new Date('2024-01-01'),
        dataFim: new Date('2023-12-31'), // Data fim anterior à data início
      };

      // Act & Assert
      const validacao = await documentFilter.validarFiltros(filtrosInvalidos);
      expect(validacao.valido).toBe(false);
      expect(validacao.erros).toContain('Data fim deve ser posterior à data início');
    });

    it('deve respeitar limite de jobs simultâneos', async () => {
      // Arrange
      const filtros: IDocumentoBatchFiltros = {
        unidade_id: '550e8400-e29b-41d4-a716-446655440004',
      };

      // Simular que já existem jobs em execução
      jest.spyOn(batchJobManager, 'podeIniciarJob').mockResolvedValue({
        pode: false,
        motivo: 'Limite de jobs atingido',
        jobsAtivos: 5,
      });

      // Act & Assert
      const usuarioId = 'test-user-id';
      await expect(documentoBatchService.iniciarJob(filtros, usuarioId))
        .rejects.toThrow('Limite de jobs atingido');
    });

    it('deve retornar erro quando nenhum documento é encontrado', async () => {
      // Arrange
      const filtros: IDocumentoBatchFiltros = {
        unidade_id: 'test-unidade-inexistente', // ID inexistente
      };

      // Act & Assert
      const usuarioId = 'test-user-id';
      await expect(documentoBatchService.iniciarJob(filtros, usuarioId))
        .rejects.toThrow('Nenhum documento encontrado');
    });
  });

  describe('Integração entre Serviços', () => {
    it('deve validar integração DocumentFilterService', async () => {
      // Arrange
      const filtros: BatchDownloadDto = {
        solicitacaoIds: ['550e8400-e29b-41d4-a716-446655440000'],
        tiposDocumento: [TipoDocumentoEnum.COMPROVANTE_RESIDENCIA],
      };

      // Act
        const validacao = await documentFilter.validarFiltros(filtros);
        const usuario = await usuarioRepository.findOne({ where: {} });
        const documentos = await documentFilter.aplicarFiltros(filtros, usuario);

        // Assert
        expect(validacao.valido).toBe(true);
        expect(documentos).toHaveLength(2); // documento1 e documento3
        expect(documentos.every(doc => doc.tipo === TipoDocumentoEnum.COMPROVANTE_RESIDENCIA)).toBe(true);
    });

    it('deve validar integração BatchJobManagerService', async () => {
      // Arrange
      const usuarioId = 'test-user-id';

      // Act
      const podeIniciar = await batchJobManager.podeIniciarJob(usuarioId);
      const estatisticas = await batchJobManager.obterEstatisticasUsuario(usuarioId);

      // Assert
      expect(podeIniciar.pode).toBe(true);
      expect(estatisticas).toHaveProperty('jobsAtivos');
      expect(estatisticas).toHaveProperty('jobsNaFila');
    });

    it('deve validar integração ZipGeneratorService', async () => {
      // Arrange
      const documentos = await documentoRepository.find({
        where: { solicitacao_id: '550e8400-e29b-41d4-a716-446655440000' },
      });

      const mockFileStream = new Readable({
        read() {
          this.push('conteúdo do arquivo');
          this.push(null);
        },
      });
      mockMinioService.obterArquivoStream.mockResolvedValue(mockFileStream);

      // Act
      const zipResult = await zipGenerator.gerarZipStream(documentos, 'test-job-id');

      // Assert
      expect(zipResult).toBeDefined();
      expect(zipResult.stream).toBeDefined();
      expect(zipResult.estimatedSize).toBeGreaterThan(0);
    });
  });

  describe('Cenários de Volume', () => {
    it('deve processar lote pequeno (1-10 documentos)', async () => {
      // Arrange
      const filtros: IDocumentoBatchFiltros = {
        unidade_id: '550e8400-e29b-41d4-a716-446655440004',
      };

      const mockFileStream = new Readable({
        read() {
          this.push('conteúdo do arquivo');
          this.push(null);
        },
      });
      mockMinioService.obterArquivoStream.mockResolvedValue(mockFileStream);

      // Act
      const startTime = Date.now();
      const usuarioId = 'test-user-id';
      const jobId = await documentoBatchService.iniciarJob(filtros, usuarioId);
      const endTime = Date.now();

      // Assert
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      expect(endTime - startTime).toBeLessThan(5000); // Menos de 5 segundos
    });

    it('deve processar lote médio (10-100 documentos) simulado', async () => {
      // Arrange - Criar documentos adicionais para simular volume médio
      const documentosAdicionais = [];
      for (let i = 0; i < 50; i++) {
        const documento = documentoRepository.create({
          nome_arquivo: `documento_${i}.pdf`,
          nome_original: `documento_${i}.pdf`,
          caminho: `/uploads/documento_${i}.pdf`,
          tamanho: 1024 * (i + 1),
          mimetype: 'application/pdf',
          solicitacao_id: 'test-solicitacao-id',
          cidadao_id: '550e8400-e29b-41d4-a716-446655440000',
          tipo: TipoDocumentoEnum.COMPROVANTE_RESIDENCIA,
          descricao: `Documento ${i}`,
          data_upload: new Date(),
          usuario_upload_id: 'test-user-id',
        });
        documentosAdicionais.push(documento);
      }
      await documentoRepository.save(documentosAdicionais);

      const filtros: IDocumentoBatchFiltros = {
        unidade_id: '550e8400-e29b-41d4-a716-446655440004',
      };

      const mockFileStream = new Readable({
        read() {
          this.push('conteúdo do arquivo');
          this.push(null);
        },
      });
      mockMinioService.obterArquivoStream.mockResolvedValue(mockFileStream);

      // Act
      const startTime = Date.now();
      const usuarioId = 'test-user-id';
      const jobId = await documentoBatchService.iniciarJob(filtros, usuarioId);
      const endTime = Date.now();

      // Assert
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      expect(endTime - startTime).toBeLessThan(30000); // Menos de 30 segundos
      expect(mockMinioService.obterArquivoStream).toHaveBeenCalledTimes(52); // 2 originais + 50 adicionais
    });
  });

  describe('Diferentes Tipos de Documento', () => {
    it('deve processar documentos de diferentes tipos', async () => {
      // Arrange
      const filtros: IDocumentoBatchFiltros = {
        tipo_documento: [TipoDocumentoEnum.COMPROVANTE_RESIDENCIA, TipoDocumentoEnum.LAUDO_MEDICO],
      };

      const mockFileStream = new Readable({
        read() {
          this.push('conteúdo do arquivo');
          this.push(null);
        },
      });
      mockMinioService.obterArquivoStream.mockResolvedValue(mockFileStream);

      // Act
      const usuarioId = 'test-user-id';
      const jobId = await documentoBatchService.iniciarJob(filtros, usuarioId);

      // Assert
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      expect(mockMinioService.obterArquivoStream).toHaveBeenCalledTimes(3); // Todos os 3 documentos
    });

    it('deve filtrar por tipo específico', async () => {
      // Arrange
      const filtros: IDocumentoBatchFiltros = {
        tipo_documento: [TipoDocumentoEnum.LAUDO_MEDICO],
      };

      const mockFileStream = new Readable({
        read() {
          this.push('conteúdo do arquivo');
          this.push(null);
        },
      });
      mockMinioService.obterArquivoStream.mockResolvedValue(mockFileStream);

      // Act
      const usuarioId = 'test-user-id';
      const jobId = await documentoBatchService.iniciarJob(filtros, usuarioId);

      // Assert
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      expect(mockMinioService.obterArquivoStream).toHaveBeenCalledTimes(1); // Apenas documento2
    });
  });
});