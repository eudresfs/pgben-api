import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ResultadoBeneficioCessadoService } from './resultado-beneficio-cessado.service';
import { ResultadoBeneficioCessado } from '../../../entities/resultado-beneficio-cessado.entity';
import { Concessao } from '../../../entities/concessao.entity';
import { Usuario } from '../../../entities/usuario.entity';
import { DocumentoComprobatorio } from '../../../entities/documento-comprobatorio.entity';
import { CreateResultadoBeneficioCessadoDto } from '../dto/create-resultado-beneficio-cessado.dto';
import { MotivoEncerramentoBeneficio } from '../../../enums/motivo-encerramento-beneficio.enum';
import { StatusVulnerabilidade } from '../../../enums/status-vulnerabilidade.enum';
import { TipoDocumentoComprobatorio } from '../../../enums/tipo-documento-comprobatorio.enum';
import { StatusConcessao } from '../../../enums/status-concessao.enum';

describe('ResultadoBeneficioCessadoService', () => {
  let service: ResultadoBeneficioCessadoService;
  let resultadoRepository: Repository<ResultadoBeneficioCessado>;
  let concessaoRepository: Repository<Concessao>;
  let usuarioRepository: Repository<Usuario>;
  let documentoRepository: Repository<DocumentoComprobatorio>;
  let dataSource: DataSource;
  let queryRunner: any;

  // Mocks de dados
  const mockUsuario: Partial<Usuario> = {
    id: 'user-123',
    nome: 'João Silva',
    email: 'joao@teste.com',
  };

  const mockConcessao: Partial<Concessao> = {
    id: 'concessao-123',
    solicitacaoId: 'solicitacao-123',
    status: StatusConcessao.CESSADO,
    dataInicio: new Date(),
  };

  const mockCreateDto: CreateResultadoBeneficioCessadoDto = {
    concessaoId: 'concessao-123',
    motivoEncerramento: MotivoEncerramentoBeneficio.SUPERACAO_VULNERABILIDADE,
    descricaoMotivo: 'Família superou situação de vulnerabilidade',
    statusVulnerabilidade: StatusVulnerabilidade.SUPERADA,
    avaliacaoVulnerabilidade: 'Situação de vulnerabilidade foi superada',
    acompanhamentoPosterior: true,
    detalhesAcompanhamento: 'Acompanhamento trimestral no CRAS',
    documentosComprobatorios: [
        {
          tipo: TipoDocumentoComprobatorio.COMPROVANTE_RENDA,
          nomeArquivo: 'carteira_trabalho.pdf',
          caminhoArquivo: '/uploads/carteira_trabalho.pdf',
          tipoMime: 'application/pdf',
          tamanhoArquivo: 1024,
          descricao: 'Carteira de trabalho assinada',
        },
      ],
  };

  const mockResultado: Partial<ResultadoBeneficioCessado> = {
    id: 'resultado-123',
    concessaoId: 'concessao-123',
    tipoMotivoEncerramento: MotivoEncerramentoBeneficio.SUPERACAO_VULNERABILIDADE,
    motivoDetalhado: 'Família superou situação de vulnerabilidade',
    statusVulnerabilidade: StatusVulnerabilidade.SUPERADA,
    descricaoVulnerabilidade: 'Situação de vulnerabilidade foi superada',
    vulnerabilidadeSuperada: true,
    tecnicoResponsavelId: 'user-123',
    dataRegistro: new Date(),
    documentosComprobatorios: [
        {
          id: 'doc-123',
          tipo: TipoDocumentoComprobatorio.COMPROVANTE_RENDA,
          nomeArquivo: 'carteira_trabalho.pdf',
          caminhoArquivo: '/uploads/carteira_trabalho.pdf',
          tipoMime: 'application/pdf',
          tamanhoArquivo: 1024,
          descricao: 'Carteira de trabalho assinada',
          dataUpload: new Date(),
          usuarioUploadId: 'user-123',
          validado: false,
        } as DocumentoComprobatorio,
      ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultadoBeneficioCessadoService,
        {
          provide: getRepositoryToken(ResultadoBeneficioCessado),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Concessao),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DocumentoComprobatorio),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                findOne: jest.fn(),
                create: jest.fn(),
                save: jest.fn(),
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ResultadoBeneficioCessadoService>(ResultadoBeneficioCessadoService);
    resultadoRepository = module.get<Repository<ResultadoBeneficioCessado>>(
      getRepositoryToken(ResultadoBeneficioCessado),
    );
    concessaoRepository = module.get<Repository<Concessao>>(
      getRepositoryToken(Concessao),
    );
    usuarioRepository = module.get<Repository<Usuario>>(
      getRepositoryToken(Usuario),
    );
    documentoRepository = module.get<Repository<DocumentoComprobatorio>>(
      getRepositoryToken(DocumentoComprobatorio),
    );
    dataSource = module.get<DataSource>(DataSource);
    queryRunner = dataSource.createQueryRunner();
  });

  describe('registrar', () => {
    it('deve registrar um resultado com sucesso', async () => {
      // Arrange
      queryRunner.manager.findOne
        .mockResolvedValueOnce(mockConcessao as Concessao) // primeira chamada para concessão
        .mockResolvedValueOnce(null) // segunda chamada para resultado existente
        .mockResolvedValueOnce(mockUsuario as Usuario); // terceira chamada para usuário
      queryRunner.manager.create.mockReturnValue(mockResultado as ResultadoBeneficioCessado);
      queryRunner.manager.save.mockResolvedValue(mockResultado as ResultadoBeneficioCessado);
      jest.spyOn(resultadoRepository, 'findOne').mockResolvedValue(mockResultado as ResultadoBeneficioCessado);
      jest.spyOn(documentoRepository, 'create').mockReturnValue({} as DocumentoComprobatorio);
      jest.spyOn(documentoRepository, 'save').mockResolvedValue({} as DocumentoComprobatorio);

      // Act
      const resultado = await service.registrarResultado(mockCreateDto, 'user-123');

      // Assert
      expect(resultado).toBeDefined();
      expect(queryRunner.manager.findOne).toHaveBeenCalledWith(Concessao, {
        where: { id: 'concessao-123' },
        relations: ['solicitacao'],
      });
      expect(queryRunner.manager.save).toHaveBeenCalled();
    });

    it('deve lançar erro se concessão não for encontrada', async () => {
      // Arrange
      queryRunner.manager.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.registrarResultado(mockCreateDto, 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar erro se concessão não estiver cessada', async () => {
      // Arrange
      const concessaoAtiva = { ...mockConcessao, status: StatusConcessao.ATIVO };
      queryRunner.manager.findOne.mockResolvedValue(concessaoAtiva as Concessao);

      // Act & Assert
      await expect(service.registrarResultado(mockCreateDto, 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar erro se já existir resultado para a concessão', async () => {
      // Arrange
      queryRunner.manager.findOne
        .mockResolvedValueOnce(mockConcessao as Concessao) // primeira chamada para concessão
        .mockResolvedValueOnce(mockResultado as ResultadoBeneficioCessado); // segunda chamada para resultado existente

      // Act & Assert
      await expect(service.registrarResultado(mockCreateDto, 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar erro se técnico não for encontrado', async () => {
      // Arrange
      jest.spyOn(concessaoRepository, 'findOne').mockResolvedValue(mockConcessao as Concessao);
      jest.spyOn(resultadoRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(usuarioRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.registrarResultado(mockCreateDto, 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('buscarPorId', () => {
    it('deve retornar resultado por ID', async () => {
      // Arrange
      jest.spyOn(resultadoRepository, 'findOne').mockResolvedValue(mockResultado as ResultadoBeneficioCessado);

      // Act
      const resultado = await service.buscarPorId('resultado-123');

      // Assert
      expect(resultado).toBeDefined();
      expect(resultadoRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'resultado-123' },
        relations: ['concessao', 'tecnicoResponsavel', 'documentosComprobatorios', 'documentosComprobatorios.usuarioUpload'],
      });
    });

    it('deve lançar erro se resultado não for encontrado', async () => {
      // Arrange
      jest.spyOn(resultadoRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.buscarPorId('resultado-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });



  describe('listar', () => {
    it('deve listar resultados com filtros', async () => {
      // Arrange
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockResultado], 1]),
      };

      jest.spyOn(resultadoRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const filtros = {
        motivoEncerramento: MotivoEncerramentoBeneficio.SUPERACAO_VULNERABILIDADE,
        statusVulnerabilidade: StatusVulnerabilidade.SUPERADA,
        page: 1,
        limit: 10,
      };

      // Act
      const resultado = await service.listar(filtros);

      // Assert
      expect(resultado).toBeDefined();
      expect(resultado.resultados).toHaveLength(1);
      expect(resultado.total).toBe(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('deve aplicar filtros de data corretamente', async () => {
      // Arrange
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      jest.spyOn(resultadoRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const filtros = {
        dataInicio: new Date('2024-01-01'),
        dataFim: new Date('2024-12-31'),
        page: 1,
        limit: 10,
      };

      // Act
      await service.listar(filtros);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'resultado.dataRegistro >= :dataInicio',
        { dataInicio: new Date('2024-01-01') },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'resultado.dataRegistro <= :dataFim',
        { dataFim: new Date('2024-12-31') },
      );
    });
  });

  describe('validarRegrasNegocio', () => {
    it('deve validar regras de negócio com sucesso', async () => {
      // Arrange
      jest.spyOn(concessaoRepository, 'findOne').mockResolvedValue(mockConcessao as Concessao);
      jest.spyOn(resultadoRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service['validarRegrasNegocio'](mockCreateDto, mockConcessao as Concessao),
      ).resolves.not.toThrow();
    });

    it('deve validar documentos obrigatórios para superação', async () => {
      // Arrange
      const dtoSemDocumentos = {
        ...mockCreateDto,
        documentosComprobatorios: [],
      };

      jest.spyOn(concessaoRepository, 'findOne').mockResolvedValue(mockConcessao as Concessao);
      jest.spyOn(resultadoRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service['validarRegrasNegocio'](dtoSemDocumentos, mockConcessao as Concessao),
      ).rejects.toThrow(BadRequestException);
    });
  });
});