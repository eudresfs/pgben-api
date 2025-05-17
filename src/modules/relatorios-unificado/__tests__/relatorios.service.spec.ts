import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RelatoriosService } from '../services/relatorios.service';
import { TempFilesService } from '../services/temp-files.service';
import {
  Solicitacao,
  StatusSolicitacao,
} from '../../solicitacao/entities/solicitacao.entity';
import { Unidade, StatusUnidade } from '../../unidade/entities/unidade.entity';
import { TipoBeneficio } from '../../beneficio/entities/tipo-beneficio.entity';
import { Role } from '../../../shared/enums/role.enum';
import { UnauthorizedException } from '@nestjs/common';

describe('RelatoriosService', () => {
  let service: RelatoriosService;

  // Mocks para repositórios
  const mockSolicitacaoRepository = {
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }),
    count: jest.fn().mockResolvedValue(0),
  };

  const mockUnidadeRepository = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockTipoBeneficioRepository = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  // Mock para o serviço de arquivos temporários
  const mockTempFilesService = {
    createTempFile: jest.fn().mockResolvedValue('/tmp/test.pdf'),
    removeTempFile: jest.fn().mockResolvedValue(undefined),
  };

  // Mock para o Cache Manager
  const mockCacheManager = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };

  // Dados de exemplo para testes
  const mockSolicitacoes = [
    {
      id: '1',
      protocolo: 'PROT-001',
      data_abertura: new Date('2025-01-05'),
      data_liberacao: new Date('2025-01-10'),
      status: 'LIBERADA',
      beneficiario: {
        id: '1',
        nome: 'João Silva',
        cpf: '12345678900',
      },
      tipo_beneficio: {
        id: '1',
        nome: 'Cesta Básica',
        valor: 150,
      },
      unidade: {
        id: '1',
        nome: 'CRAS Centro',
      },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelatoriosService,
        {
          provide: getRepositoryToken(Solicitacao),
          useValue: mockSolicitacaoRepository,
        },
        {
          provide: getRepositoryToken(Unidade),
          useValue: mockUnidadeRepository,
        },
        {
          provide: getRepositoryToken(TipoBeneficio),
          useValue: mockTipoBeneficioRepository,
        },
        {
          provide: TempFilesService,
          useValue: mockTempFilesService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<RelatoriosService>(RelatoriosService);

    // Limpar todos os mocks antes de cada teste
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('gerarRelatorioBeneficiosConcedidos', () => {
    it('deve rejeitar usuários sem permissão', async () => {
      const mockUser = { id: 1, nome: 'Usuário Teste', role: 'CIDADAO' };

      await expect(
        service.gerarRelatorioBeneficiosConcedidos({
          dataInicio: '2025-01-01',
          dataFim: '2025-01-31',
          formato: 'pdf' as 'pdf' | 'excel' | 'csv',
          user: mockUser,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve aceitar usuários com permissão', async () => {
      const mockUser = { id: 1, nome: 'Usuário Teste', role: Role.ADMIN };

      // Configurar mock para retornar dados
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockSolicitacaoRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // Não deve lançar exceção
      await expect(
        service.gerarRelatorioBeneficiosConcedidos({
          dataInicio: '2025-01-01',
          dataFim: '2025-01-31',
          formato: 'pdf' as 'pdf' | 'excel' | 'csv',
          user: mockUser,
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('gerarRelatorioSolicitacoesPorStatus', () => {
    it('deve rejeitar usuários sem permissão', async () => {
      const mockUser = { id: 1, nome: 'Usuário Teste', role: 'CIDADAO' };

      await expect(
        service.gerarRelatorioSolicitacoesPorStatus({
          dataInicio: '2025-01-01',
          dataFim: '2025-01-31',
          formato: 'pdf' as 'pdf' | 'excel' | 'csv',
          user: mockUser,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve aceitar usuários com permissão', async () => {
      const mockUser = { id: 1, nome: 'Usuário Teste', role: Role.ADMIN };

      // Configurar mock para retornar dados
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockSolicitacaoRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // Não deve lançar exceção
      await expect(
        service.gerarRelatorioSolicitacoesPorStatus({
          dataInicio: '2025-01-01',
          dataFim: '2025-01-31',
          formato: 'pdf' as 'pdf' | 'excel' | 'csv',
          user: mockUser,
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('gerarRelatorioAtendimentosPorUnidade', () => {
    it('deve rejeitar usuários sem permissão', async () => {
      const mockUser = { id: 1, nome: 'Usuário Teste', role: 'CIDADAO' };

      await expect(
        service.gerarRelatorioAtendimentosPorUnidade({
          dataInicio: '2025-01-01',
          dataFim: '2025-01-31',
          formato: 'pdf' as 'pdf' | 'excel' | 'csv',
          user: mockUser,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve aceitar usuários com permissão', async () => {
      const mockUser = { id: 1, nome: 'Usuário Teste', role: Role.ADMIN };

      // Configurar mock para retornar unidades
      mockUnidadeRepository.find.mockResolvedValue([
        { id: '1', nome: 'Unidade A', status: StatusUnidade.ATIVO },
        { id: '2', nome: 'Unidade B', status: StatusUnidade.ATIVO },
      ]);

      // Configurar mock para contagem
      mockSolicitacaoRepository.count
        .mockResolvedValueOnce(10) // Total unidade 1
        .mockResolvedValueOnce(5) // Liberadas unidade 1
        .mockResolvedValueOnce(15) // Total unidade 2
        .mockResolvedValueOnce(8); // Liberadas unidade 2

      // Não deve lançar exceção
      await expect(
        service.gerarRelatorioAtendimentosPorUnidade({
          dataInicio: '2025-01-01',
          dataFim: '2025-01-31',
          formato: 'pdf' as 'pdf' | 'excel' | 'csv',
          user: mockUser,
        }),
      ).resolves.toBeDefined();
    });
  });

  it('deve verificar permissões do usuário', async () => {
    const options = {
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31',
      formato: 'pdf' as 'pdf' | 'excel' | 'csv',
      user: { id: 1, nome: 'Usuário Teste', role: 'CIDADAO' },
    };

    await expect(
      service.gerarRelatorioBeneficiosConcedidos(options),
    ).rejects.toThrow('Você não tem permissão para gerar este relatório');
  });

  it('deve buscar do cache se disponível', async () => {
    const mockCacheData = {
      buffer: Buffer.from('cached content'),
      contentType: 'application/pdf',
    };
    mockCacheManager.get.mockResolvedValueOnce(mockCacheData);

    const pdfOptions = {
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31',
      formato: 'pdf' as 'pdf' | 'excel' | 'csv',
      user: { id: 1, nome: 'Usuário Teste', role: Role.ADMIN },
    };

    const result = await service.gerarRelatorioBeneficiosConcedidos(pdfOptions);

    expect(result).toEqual(mockCacheData);
    expect(mockCacheManager.get).toHaveBeenCalledWith(
      expect.stringContaining('relatorio-beneficios-concedidos'),
    );
    // Não deve chamar a estratégia se o cache está disponível
    expect(mockTempFilesService.createTempFile).not.toHaveBeenCalled();
  });

  it('deve gerar relatório em PDF quando solicitado', async () => {
    // Configurar mock do repositório
    mockSolicitacaoRepository.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(mockSolicitacoes),
    });

    const result = await service.gerarRelatorioBeneficiosConcedidos({
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31',
      formato: 'pdf' as 'pdf' | 'excel' | 'csv',
      user: { id: 1, nome: 'Usuário Teste', role: Role.ADMIN },
    });

    expect(result).toBeDefined();
    expect(mockTempFilesService.createTempFile).toHaveBeenCalledWith(
      'relatorio-beneficios-concedidos',
      expect.any(Object),
      expect.objectContaining({
        dataInicio: expect.any(Date),
        dataFim: expect.any(Date),
      }),
    );
    expect(mockCacheManager.set).toHaveBeenCalled();
  });

  it('deve gerar relatório em Excel quando solicitado', async () => {
    const excelOptions = {
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31',
      formato: 'excel' as 'pdf' | 'excel' | 'csv',
      user: { id: 1, nome: 'Usuário Teste', role: Role.ADMIN },
    };

    await service.gerarRelatorioBeneficiosConcedidos(excelOptions);

    expect(mockTempFilesService.createTempFile).toHaveBeenCalled();
    expect(mockTempFilesService.removeTempFile).not.toHaveBeenCalled();
  });

  it('deve gerar relatório em CSV quando solicitado', async () => {
    const csvOptions = {
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31',
      formato: 'csv' as 'pdf' | 'excel' | 'csv',
      user: { id: 1, nome: 'Usuário Teste', role: Role.ADMIN },
    };

    const result = await service.gerarRelatorioBeneficiosConcedidos(csvOptions);

    expect(result).toBeDefined();
    expect(mockTempFilesService.createTempFile).toHaveBeenCalledWith(
      'relatorio-beneficios-concedidos',
      expect.any(Array),
      expect.objectContaining({
        dataInicio: expect.any(Date),
        dataFim: expect.any(Date),
      }),
    );
    expect(mockCacheManager.set).toHaveBeenCalled();
    expect(mockUnidadeRepository.find).toHaveBeenCalledWith({
      where: { status: 'ATIVO' },
    });
    expect(mockSolicitacaoRepository.count).toHaveBeenCalledTimes(4);
  });

  it('deve filtrar por unidade quando especificado', async () => {
    const optionsComUnidade = {
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31',
      formato: 'pdf' as 'pdf' | 'excel' | 'csv',
      user: { id: 1, nome: 'Usuário Teste', role: Role.ADMIN },
      unidadeId: '1',
    };

    mockUnidadeRepository.findOne.mockResolvedValueOnce({
      id: 1,
      nome: 'Unidade Teste',
    });

    await service.gerarRelatorioBeneficiosConcedidos(optionsComUnidade);

    expect(mockUnidadeRepository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(
      mockSolicitacaoRepository.createQueryBuilder().andWhere,
    ).toHaveBeenCalledWith(
      expect.stringContaining('unidade.id = :unidadeId'),
      expect.objectContaining({ unidadeId: 1 }),
    );
  });

  it('deve filtrar por tipo de benefício quando especificado', async () => {
    const optionsComTipoBeneficio = {
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31',
      formato: 'pdf' as 'pdf' | 'excel' | 'csv',
      user: { id: 1, nome: 'Usuário Teste', role: Role.ADMIN },
      tipoBeneficioId: '1',
    };

    mockTipoBeneficioRepository.findOne.mockResolvedValueOnce({
      id: 1,
      nome: 'Auxílio Moradia',
    });

    await service.gerarRelatorioBeneficiosConcedidos(optionsComTipoBeneficio);

    expect(mockTipoBeneficioRepository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(
      mockSolicitacaoRepository.createQueryBuilder().andWhere,
    ).toHaveBeenCalledWith(
      expect.stringContaining('tipoBeneficio.id = :tipoBeneficioId'),
      expect.objectContaining({ tipoBeneficioId: 1 }),
    );
  });
});

describe('RelatoriosService', () => {
  let service: RelatoriosService;

  // Mocks para repositórios
  const mockSolicitacaoRepository = {
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }),
    count: jest.fn().mockResolvedValue(0),
  };

  const mockUnidadeRepository = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockTipoBeneficioRepository = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  // Mock para o serviço de arquivos temporários
  const mockTempFilesService = {
    createTempFile: jest.fn().mockResolvedValue('/tmp/test.pdf'),
    removeTempFile: jest.fn().mockResolvedValue(undefined),
  };

  // Mock para o Cache Manager
  const mockCacheManager = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };

  // Dados de exemplo para testes
  const mockSolicitacoes = [
    {
      id: '1',
      protocolo: 'PROT-001',
      data_abertura: new Date('2025-01-05'),
      data_liberacao: new Date('2025-01-10'),
      status: 'LIBERADA',
      beneficiario: {
        id: '1',
        nome: 'João Silva',
        cpf: '12345678900',
      },
      tipo_beneficio: {
        id: '1',
        nome: 'Cesta Básica',
        valor: 150,
      },
      unidade: {
        id: '1',
        nome: 'CRAS Centro',
      },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelatoriosService,
        {
          provide: getRepositoryToken(Solicitacao),
          useValue: mockSolicitacaoRepository,
        },
        {
          provide: getRepositoryToken(Unidade),
          useValue: mockUnidadeRepository,
        },
        {
          provide: getRepositoryToken(TipoBeneficio),
          useValue: mockTipoBeneficioRepository,
        },
        {
          provide: TempFilesService,
          useValue: mockTempFilesService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<RelatoriosService>(RelatoriosService);

    // Limpar todos os mocks antes de cada teste
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('gerarRelatorioBeneficiosConcedidos', () => {
    it('deve rejeitar usuários sem permissão', async () => {
      const mockUser = { id: 1, nome: 'Usuário Teste', role: 'CIDADAO' };

      await expect(
        service.gerarRelatorioBeneficiosConcedidos({
          dataInicio: '2025-01-01',
          dataFim: '2025-01-31',
          formato: 'pdf' as 'pdf' | 'excel' | 'csv',
          user: mockUser,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve aceitar usuários com permissão', async () => {
      const mockUser = { id: 1, nome: 'Usuário Teste', role: Role.ADMIN };

      // Configurar mock para retornar dados
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockSolicitacaoRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // Não deve lançar exceção
      await expect(
        service.gerarRelatorioBeneficiosConcedidos({
          dataInicio: '2025-01-01',
          dataFim: '2025-01-31',
          formato: 'pdf' as 'pdf' | 'excel' | 'csv',
          user: mockUser,
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('gerarRelatorioSolicitacoesPorStatus', () => {
    it('deve rejeitar usuários sem permissão', async () => {
      const mockUser = { id: 1, nome: 'Usuário Teste', role: 'CIDADAO' };

      await expect(
        service.gerarRelatorioSolicitacoesPorStatus({
          dataInicio: '2025-01-01',
          dataFim: '2025-01-31',
          formato: 'pdf' as 'pdf' | 'excel' | 'csv',
          user: mockUser,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve aceitar usuários com permissão', async () => {
      const mockUser = { id: 1, nome: 'Usuário Teste', role: Role.ADMIN };

      // Configurar mock para retornar dados
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockSolicitacaoRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // Não deve lançar exceção
      await expect(
        service.gerarRelatorioSolicitacoesPorStatus({
          dataInicio: '2025-01-01',
          dataFim: '2025-01-31',
          formato: 'pdf' as 'pdf' | 'excel' | 'csv',
          user: mockUser,
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('gerarRelatorioAtendimentosPorUnidade', () => {
    it('deve rejeitar usuários sem permissão', async () => {
      const mockUser = { id: 1, nome: 'Usuário Teste', role: 'CIDADAO' };

      await expect(
        service.gerarRelatorioAtendimentosPorUnidade({
          dataInicio: '2025-01-01',
          dataFim: '2025-01-31',
          formato: 'pdf' as 'pdf' | 'excel' | 'csv',
          user: mockUser,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve aceitar usuários com permissão', async () => {
      const mockUser = { id: 1, nome: 'Usuário Teste', role: Role.ADMIN };

      // Configurar mock para retornar unidades
      mockUnidadeRepository.find.mockResolvedValue([
        { id: '1', nome: 'Unidade A', status: StatusUnidade.ATIVO },
        { id: '2', nome: 'Unidade B', status: StatusUnidade.ATIVO },
      ]);

      // Configurar mock para contagem
      mockSolicitacaoRepository.count
        .mockResolvedValueOnce(10) // Total unidade 1
        .mockResolvedValueOnce(5) // Liberadas unidade 1
        .mockResolvedValueOnce(15) // Total unidade 2
        .mockResolvedValueOnce(8); // Liberadas unidade 2

      // Não deve lançar exceção
      await expect(
        service.gerarRelatorioAtendimentosPorUnidade({
          dataInicio: '2025-01-01',
          dataFim: '2025-01-31',
          formato: 'pdf' as 'pdf' | 'excel' | 'csv',
          user: mockUser,
        }),
      ).resolves.toBeDefined();
    });
  });

  it('deve verificar permissões do usuário', async () => {
    const options = {
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31',
      formato: 'pdf' as 'pdf' | 'excel' | 'csv',
      user: { id: 1, nome: 'Usuário Teste', role: 'CIDADAO' },
    };

    await expect(
      service.gerarRelatorioBeneficiosConcedidos(options),
    ).rejects.toThrow('Você não tem permissão para gerar este relatório');
  });

  it('deve buscar do cache se disponível', async () => {
    const mockCacheData = {
      buffer: Buffer.from('cached content'),
      contentType: 'application/pdf',
    };
    mockCacheManager.get.mockResolvedValueOnce(mockCacheData);

    const pdfOptions = {
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31',
      formato: 'pdf' as 'pdf' | 'excel' | 'csv',
      user: { id: 1, nome: 'Usuário Teste', role: Role.ADMIN },
    };

    const result = await service.gerarRelatorioBeneficiosConcedidos(pdfOptions);

    expect(result).toEqual(mockCacheData);
    expect(mockCacheManager.get).toHaveBeenCalledWith(
      expect.stringContaining('relatorio-beneficios-concedidos'),
    );
    // Não deve chamar a estratégia se o cache está disponível
    expect(mockTempFilesService.createTempFile).not.toHaveBeenCalled();
  });

  it('deve gerar relatório em PDF quando solicitado', async () => {
    // Configurar mock do repositório
    mockSolicitacaoRepository.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(mockSolicitacoes),
    });

    const result = await service.gerarRelatorioBeneficiosConcedidos({
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31',
      formato: 'pdf' as 'pdf' | 'excel' | 'csv',
      user: { id: 1, nome: 'Usuário Teste', role: Role.ADMIN },
    });

    expect(result).toBeDefined();
    expect(mockTempFilesService.createTempFile).toHaveBeenCalledWith(
      'relatorio-beneficios-concedidos',
      expect.any(Object),
      expect.objectContaining({
        dataInicio: expect.any(Date),
        dataFim: expect.any(Date),
      }),
    );
    expect(mockCacheManager.set).toHaveBeenCalled();
  });

  it('deve gerar relatório em Excel quando solicitado', async () => {
    const excelOptions = {
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31',
      formato: 'excel' as 'pdf' | 'excel' | 'csv',
      user: { id: 1, nome: 'Usuário Teste', role: Role.ADMIN },
    };

    await service.gerarRelatorioBeneficiosConcedidos(excelOptions);

    expect(mockTempFilesService.createTempFile).toHaveBeenCalled();
    expect(mockTempFilesService.removeTempFile).not.toHaveBeenCalled();
  });

  it('deve gerar relatório em CSV quando solicitado', async () => {
    const csvOptions = {
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31',
      formato: 'csv' as 'pdf' | 'excel' | 'csv',
      user: { id: 1, nome: 'Usuário Teste', role: Role.ADMIN },
    };

    const result = await service.gerarRelatorioBeneficiosConcedidos(csvOptions);

    expect(result).toBeDefined();
    expect(mockTempFilesService.createTempFile).toHaveBeenCalledWith(
      'relatorio-beneficios-concedidos',
      expect.any(Array),
      expect.objectContaining({
        dataInicio: expect.any(Date),
        dataFim: expect.any(Date),
      }),
    );
    expect(mockCacheManager.set).toHaveBeenCalled();
    expect(mockUnidadeRepository.find).toHaveBeenCalledWith({
      where: { status: 'ATIVO' },
    });
    expect(mockSolicitacaoRepository.count).toHaveBeenCalledTimes(4);
  });

  it('deve filtrar por unidade quando especificado', async () => {
    const optionsComUnidade = {
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31',
      formato: 'pdf' as 'pdf' | 'excel' | 'csv',
      user: { id: 1, nome: 'Usuário Teste', role: Role.ADMIN },
      unidadeId: '1',
    };

    mockUnidadeRepository.findOne.mockResolvedValueOnce({
      id: 1,
      nome: 'Unidade Teste',
    });

    await service.gerarRelatorioBeneficiosConcedidos(optionsComUnidade);

    expect(mockUnidadeRepository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(
      mockSolicitacaoRepository.createQueryBuilder().andWhere,
    ).toHaveBeenCalledWith(
      expect.stringContaining('unidade.id = :unidadeId'),
      expect.objectContaining({ unidadeId: 1 }),
    );
  });

  it('deve filtrar por tipo de benefício quando especificado', async () => {
    const optionsComTipoBeneficio = {
      dataInicio: '2025-01-01',
      dataFim: '2025-01-31',
      formato: 'pdf' as 'pdf' | 'excel' | 'csv',
      user: { id: 1, nome: 'Usuário Teste', role: Role.ADMIN },
      tipoBeneficioId: '1',
    };

    mockTipoBeneficioRepository.findOne.mockResolvedValueOnce({
      id: 1,
      nome: 'Auxílio Moradia',
    });

    await service.gerarRelatorioBeneficiosConcedidos(optionsComTipoBeneficio);

    expect(mockTipoBeneficioRepository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(
      mockSolicitacaoRepository.createQueryBuilder().andWhere,
    ).toHaveBeenCalledWith(
      expect.stringContaining('tipoBeneficio.id = :tipoBeneficioId'),
      expect.objectContaining({ tipoBeneficioId: 1 }),
    );
  });
});
