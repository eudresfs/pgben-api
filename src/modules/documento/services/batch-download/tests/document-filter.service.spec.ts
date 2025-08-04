import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DocumentFilterService,
  IValidacaoFiltros,
} from '../document-filter.service';
import { Documento } from '../../../../../entities/documento.entity';
import { Usuario } from '../../../../../entities/usuario.entity';
import { BatchDownloadDto } from '../../../dto/batch-download.dto';
import { TipoDocumentoEnum } from '../../../../../enums';

describe('DocumentFilterService', () => {
  let service: DocumentFilterService;
  let documentoRepository: jest.Mocked<Repository<Documento>>;

  const mockDocumentoRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getRawOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentFilterService,
        {
          provide: getRepositoryToken(Documento),
          useValue: mockDocumentoRepository,
        },
      ],
    }).compile();

    service = module.get<DocumentFilterService>(DocumentFilterService);
    documentoRepository = module.get(getRepositoryToken(Documento));

    // Reset mocks
    jest.clearAllMocks();
    mockDocumentoRepository.createQueryBuilder.mockReturnValue(
      mockQueryBuilder,
    );
  });

  describe('validarFiltros', () => {
    it('deve retornar erro quando nenhum filtro é fornecido', async () => {
      const filtros: BatchDownloadDto = {};

      const resultado = await service.validarFiltros(filtros);

      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain(
        'Pelo menos um filtro deve ser fornecido (cidadaoIds, solicitacaoIds, tiposDocumento, dataInicio ou dataFim)',
      );
    });

    it('deve validar tipos de documento inválidos', async () => {
      const filtros: BatchDownloadDto = {
        tiposDocumento: ['TIPO_INVALIDO' as any, TipoDocumentoEnum.RG],
      };

      const resultado = await service.validarFiltros(filtros);

      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain(
        'Tipos de documento inválidos: TIPO_INVALIDO',
      );
    });

    it('deve validar datas inválidas', async () => {
      const filtros: BatchDownloadDto = {
        dataInicio: new Date('2024-12-31'),
        dataFim: new Date('2024-01-01'),
      };

      const resultado = await service.validarFiltros(filtros);

      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain(
        'Data de início não pode ser posterior à data de fim',
      );
    });

    it('deve gerar aviso para período muito longo', async () => {
      const dataInicio = new Date();
      const dataFim = new Date();
      dataFim.setFullYear(dataInicio.getFullYear() + 3); // 3 anos

      const filtros: BatchDownloadDto = {
        dataInicio: dataInicio,
        dataFim: dataFim,
      };

      // Mock da estimativa
      mockQueryBuilder.getRawOne.mockResolvedValue({
        total: '10',
        tamanho_total: '1000000',
      });

      const resultado = await service.validarFiltros(filtros);

      expect(resultado.avisos).toContain(
        'Período muito longo (mais de 2 anos). Considere filtrar por períodos menores para melhor performance.',
      );
    });

    it('deve validar IDs de cidadão inválidos', async () => {
      const filtros: BatchDownloadDto = {
        cidadaoIds: ['id-invalido', '123e4567-e89b-12d3-a456-426614174000'],
      };

      const resultado = await service.validarFiltros(filtros);

      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain('IDs de cidadão inválidos encontrados');
    });

    it('deve gerar aviso para muitos cidadãos', async () => {
      const cidadaoIds = Array.from(
        { length: 150 },
        (_, i) =>
          `123e4567-e89b-12d3-a456-42661417400${i.toString().padStart(1, '0')}`,
      );

      const filtros: BatchDownloadDto = {
        cidadaoIds,
      };

      // Mock da estimativa
      mockQueryBuilder.getRawOne.mockResolvedValue({
        total: '10',
        tamanho_total: '1000000',
      });

      const resultado = await service.validarFiltros(filtros);

      expect(resultado.avisos).toContain(
        'Muitos cidadãos selecionados (>100). Considere filtrar por outros critérios.',
      );
    });

    it('deve validar filtros válidos com estimativa', async () => {
      const filtros: BatchDownloadDto = {
        cidadaoIds: ['123e4567-e89b-12d3-a456-426614174000'],
        tiposDocumento: [TipoDocumentoEnum.RG],
      };

      // Mock da estimativa
      mockQueryBuilder.getRawOne.mockResolvedValue({
        total: '50',
        tamanho_total: '10000000', // 10MB
      });

      const resultado = await service.validarFiltros(filtros);

      expect(resultado.valido).toBe(true);
      expect(resultado.estimativa.total_documentos).toBe(50);
      expect(resultado.estimativa.tamanho_estimado).toBe(10000000);
    });

    it('deve rejeitar quando há muitos documentos', async () => {
      const filtros: BatchDownloadDto = {
        cidadaoIds: ['123e4567-e89b-12d3-a456-426614174000'],
      };

      // Mock da estimativa com muitos documentos
      mockQueryBuilder.getRawOne.mockResolvedValue({
        total: '2000', // Acima do limite de 1000
        tamanho_total: '10000000',
      });

      const resultado = await service.validarFiltros(filtros);

      expect(resultado.valido).toBe(false);
      expect(resultado.erros).toContain(
        'Muitos documentos encontrados (2000). Limite máximo: 1000',
      );
    });
  });

  describe('aplicarFiltros', () => {
    const mockUsuario = { id: 'user-123' } as Usuario;

    it('deve aplicar filtros de cidadãos', async () => {
      const filtros = {
        cidadaoIds: ['cidadao-1', 'cidadao-2'],
      };

      const mockDocumentos = [
        { id: 'doc-1', cidadao_id: 'cidadao-1' },
        { id: 'doc-2', cidadao_id: 'cidadao-2' },
      ] as Documento[];

      mockQueryBuilder.getMany.mockResolvedValue(mockDocumentos);

      const resultado = await service.aplicarFiltros(filtros, mockUsuario);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'documento.cidadao_id IN (:...cidadaoIds)',
        { cidadaoIds: ['cidadao-1', 'cidadao-2'] },
      );
      expect(resultado).toEqual(mockDocumentos);
    });

    it('deve aplicar filtros de solicitações', async () => {
      const filtros = {
        solicitacaoIds: ['sol-1', 'sol-2'],
      };

      const mockDocumentos = [
        { id: 'doc-1', solicitacao_id: 'sol-1' },
      ] as Documento[];

      mockQueryBuilder.getMany.mockResolvedValue(mockDocumentos);

      const resultado = await service.aplicarFiltros(filtros, mockUsuario);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'documento.solicitacao_id IN (:...solicitacaoIds)',
        { solicitacaoIds: ['sol-1', 'sol-2'] },
      );
      expect(resultado).toEqual(mockDocumentos);
    });

    it('deve aplicar filtros de tipos de documento', async () => {
      const filtros = {
        tiposDocumento: [TipoDocumentoEnum.RG, TipoDocumentoEnum.CPF],
      };

      const mockDocumentos = [
        { id: 'doc-1', tipo: TipoDocumentoEnum.RG },
      ] as Documento[];

      mockQueryBuilder.getMany.mockResolvedValue(mockDocumentos);

      const resultado = await service.aplicarFiltros(filtros, mockUsuario);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'documento.tipo IN (:...tipos)',
        { tipos: [TipoDocumentoEnum.RG, TipoDocumentoEnum.CPF] },
      );
      expect(resultado).toEqual(mockDocumentos);
    });

    it('deve aplicar filtros de data', async () => {
      const filtros = {
        dataInicio: new Date('2024-01-01'),
        dataFim: new Date('2024-12-31'),
      };

      const mockDocumentos = [
        { id: 'doc-1', data_upload: new Date('2024-06-15') },
      ] as Documento[];

      mockQueryBuilder.getMany.mockResolvedValue(mockDocumentos);

      const resultado = await service.aplicarFiltros(filtros, mockUsuario);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'documento.data_upload >= :dataInicio',
        { dataInicio: new Date('2024-01-01') },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'documento.data_upload <= :dataFim',
        { dataFim: new Date('2024-12-31') },
      );
      expect(resultado).toEqual(mockDocumentos);
    });

    it('deve ordenar por data de upload e limitar resultados', async () => {
      const filtros = {
        cidadaoIds: ['cidadao-1'],
      };

      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.aplicarFiltros(filtros, mockUsuario);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'documento.data_upload',
        'DESC',
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'documento.id',
        'DESC',
      );
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(100); // BATCH_SIZE
    });
  });
});
