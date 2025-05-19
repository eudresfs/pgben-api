import { Test, TestingModule } from '@nestjs/testing';
import { ParametroService } from '../services/parametro.service';
import { ParametroRepository } from '../repositories/parametro.repository';
import { ParametroCreateDto } from '../dtos/parametro/parametro-create.dto';
import { ParametroUpdateDto } from '../dtos/parametro/parametro-update.dto';
import { ParametroTipoEnum } from '../enums/parametro-tipo.enum';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

// Mock do Cache Manager
const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

// Mock do Repositório
const mockParametroRepository = {
  findByChave: jest.fn(),
  findAll: jest.fn(),
  findByCategoria: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

describe('ParametroService', () => {
  let service: ParametroService;
  let repository: ParametroRepository;
  let cacheManager: Cache;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParametroService,
        {
          provide: ParametroRepository,
          useValue: mockParametroRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<ParametroService>(ParametroService);
    repository = module.get<ParametroRepository>(ParametroRepository);
    cacheManager = module.get<Cache>(CACHE_MANAGER);

    // Limpar todos os mocks antes de cada teste
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
    expect(cacheManager).toBeDefined();
  });

  describe('buscarPorChave', () => {
    it('deve retornar um parâmetro pelo cache quando disponível', async () => {
      // Arrange
      const parametroMock = {
        id: '1',
        chave: 'sistema.nome',
        valor: 'PGBen',
        tipo: ParametroTipoEnum.STRING,
        descricao: 'Nome do sistema',
        categoria: 'sistema',
      };
      
      jest.spyOn(cacheManager, 'get').mockResolvedValue(parametroMock);
      
      // Act
      const resultado = await service.buscarPorChave('sistema.nome');
      
      // Assert
      expect(resultado).toEqual(parametroMock);
      expect(cacheManager.get).toHaveBeenCalledWith('parametro:sistema.nome');
      expect(repository.findByChave).not.toHaveBeenCalled();
    });

    it('deve retornar um parâmetro do repositório quando não estiver no cache', async () => {
      // Arrange
      const parametroMock = {
        id: '1',
        chave: 'sistema.nome',
        valor: 'PGBen',
        tipo: ParametroTipoEnum.STRING,
        descricao: 'Nome do sistema',
        categoria: 'sistema',
      };
      
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(repository, 'findByChave').mockResolvedValue(parametroMock);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);
      
      // Act
      const resultado = await service.buscarPorChave('sistema.nome');
      
      // Assert
      expect(resultado).toEqual(parametroMock);
      expect(cacheManager.get).toHaveBeenCalledWith('parametro:sistema.nome');
      expect(repository.findByChave).toHaveBeenCalledWith('sistema.nome');
      expect(cacheManager.set).toHaveBeenCalledWith(
        'parametro:sistema.nome',
        parametroMock,
        { ttl: 3600 }
      );
    });

    it('deve lançar NotFoundException quando o parâmetro não for encontrado', async () => {
      // Arrange
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(repository, 'findByChave').mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.buscarPorChave('parametro.inexistente'))
        .rejects
        .toThrow(NotFoundException);
      
      expect(cacheManager.get).toHaveBeenCalledWith('parametro:parametro.inexistente');
      expect(repository.findByChave).toHaveBeenCalledWith('parametro.inexistente');
    });
  });

  describe('buscarTodos', () => {
    it('deve retornar todos os parâmetros', async () => {
      // Arrange
      const parametrosMock = [
        {
          id: '1',
          chave: 'sistema.nome',
          valor: 'PGBen',
          tipo: ParametroTipoEnum.STRING,
          descricao: 'Nome do sistema',
          categoria: 'sistema',
        },
        {
          id: '2',
          chave: 'sistema.versao',
          valor: '1.0.0',
          tipo: ParametroTipoEnum.STRING,
          descricao: 'Versão do sistema',
          categoria: 'sistema',
        },
      ];
      
      jest.spyOn(repository, 'findAll').mockResolvedValue(parametrosMock);
      
      // Act
      const resultado = await service.buscarTodos();
      
      // Assert
      expect(resultado).toEqual(parametrosMock);
      expect(repository.findAll).toHaveBeenCalled();
    });
  });

  describe('buscarPorCategoria', () => {
    it('deve retornar parâmetros filtrados por categoria', async () => {
      // Arrange
      const parametrosMock = [
        {
          id: '1',
          chave: 'sistema.nome',
          valor: 'PGBen',
          tipo: ParametroTipoEnum.STRING,
          descricao: 'Nome do sistema',
          categoria: 'sistema',
        },
        {
          id: '2',
          chave: 'sistema.versao',
          valor: '1.0.0',
          tipo: ParametroTipoEnum.STRING,
          descricao: 'Versão do sistema',
          categoria: 'sistema',
        },
      ];
      
      jest.spyOn(repository, 'findByCategoria').mockResolvedValue(parametrosMock);
      
      // Act
      const resultado = await service.buscarPorCategoria('sistema');
      
      // Assert
      expect(resultado).toEqual(parametrosMock);
      expect(repository.findByCategoria).toHaveBeenCalledWith('sistema');
    });
  });

  describe('criar', () => {
    it('deve criar um novo parâmetro com sucesso', async () => {
      // Arrange
      const dto: ParametroCreateDto = {
        chave: 'novo.parametro',
        valor: 'Valor do novo parâmetro',
        tipo: ParametroTipoEnum.STRING,
        descricao: 'Descrição do novo parâmetro',
        categoria: 'novo',
      };
      
      const parametroMock = {
        id: '3',
        ...dto,
      };
      
      jest.spyOn(repository, 'findByChave').mockResolvedValue(null);
      jest.spyOn(repository, 'save').mockResolvedValue(parametroMock);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);
      
      // Act
      const resultado = await service.criar(dto);
      
      // Assert
      expect(resultado).toEqual(parametroMock);
      expect(repository.findByChave).toHaveBeenCalledWith('novo.parametro');
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining(dto));
      expect(cacheManager.set).toHaveBeenCalledWith(
        'parametro:novo.parametro',
        parametroMock,
        { ttl: 3600 }
      );
    });

    it('deve lançar BadRequestException ao tentar criar um parâmetro com chave existente', async () => {
      // Arrange
      const dto: ParametroCreateDto = {
        chave: 'parametro.existente',
        valor: 'Valor do parâmetro',
        tipo: ParametroTipoEnum.STRING,
        descricao: 'Descrição do parâmetro',
        categoria: 'existente',
      };
      
      const parametroExistente = {
        id: '4',
        ...dto,
      };
      
      jest.spyOn(repository, 'findByChave').mockResolvedValue(parametroExistente);
      
      // Act & Assert
      await expect(service.criar(dto))
        .rejects
        .toThrow(BadRequestException);
      
      expect(repository.findByChave).toHaveBeenCalledWith('parametro.existente');
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('atualizar', () => {
    it('deve atualizar um parâmetro existente com sucesso', async () => {
      // Arrange
      const chave = 'parametro.existente';
      const dto: ParametroUpdateDto = {
        valor: 'Novo valor',
        descricao: 'Nova descrição',
        categoria: 'categoria-atualizada',
      };
      
      const parametroExistente = {
        id: '5',
        chave,
        valor: 'Valor antigo',
        tipo: ParametroTipoEnum.STRING,
        descricao: 'Descrição antiga',
        categoria: 'categoria-antiga',
      };
      
      const parametroAtualizado = {
        ...parametroExistente,
        ...dto,
      };
      
      jest.spyOn(repository, 'findByChave').mockResolvedValue(parametroExistente);
      jest.spyOn(repository, 'save').mockResolvedValue(parametroAtualizado);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);
      
      // Act
      const resultado = await service.atualizar(chave, dto);
      
      // Assert
      expect(resultado).toEqual(parametroAtualizado);
      expect(repository.findByChave).toHaveBeenCalledWith(chave);
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
        ...parametroExistente,
        ...dto,
      }));
      expect(cacheManager.set).toHaveBeenCalledWith(
        `parametro:${chave}`,
        parametroAtualizado,
        { ttl: 3600 }
      );
    });

    it('deve lançar NotFoundException ao tentar atualizar um parâmetro inexistente', async () => {
      // Arrange
      const chave = 'parametro.inexistente';
      const dto: ParametroUpdateDto = {
        valor: 'Novo valor',
        descricao: 'Nova descrição',
        categoria: 'nova-categoria',
      };
      
      jest.spyOn(repository, 'findByChave').mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.atualizar(chave, dto))
        .rejects
        .toThrow(NotFoundException);
      
      expect(repository.findByChave).toHaveBeenCalledWith(chave);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('remover', () => {
    it('deve remover um parâmetro existente com sucesso', async () => {
      // Arrange
      const chave = 'parametro.existente';
      const parametroExistente = {
        id: '6',
        chave,
        valor: 'Valor',
        tipo: ParametroTipoEnum.STRING,
        descricao: 'Descrição',
        categoria: 'categoria',
      };
      
      jest.spyOn(repository, 'findByChave').mockResolvedValue(parametroExistente);
      jest.spyOn(repository, 'remove').mockResolvedValue(undefined);
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);
      
      // Act
      await service.remover(chave);
      
      // Assert
      expect(repository.findByChave).toHaveBeenCalledWith(chave);
      expect(repository.remove).toHaveBeenCalledWith(parametroExistente);
      expect(cacheManager.del).toHaveBeenCalledWith(`parametro:${chave}`);
    });

    it('deve lançar NotFoundException ao tentar remover um parâmetro inexistente', async () => {
      // Arrange
      const chave = 'parametro.inexistente';
      
      jest.spyOn(repository, 'findByChave').mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.remover(chave))
        .rejects
        .toThrow(NotFoundException);
      
      expect(repository.findByChave).toHaveBeenCalledWith(chave);
      expect(repository.remove).not.toHaveBeenCalled();
      expect(cacheManager.del).not.toHaveBeenCalled();
    });
  });

  describe('obterValorTipado', () => {
    it('deve retornar o valor tipado para um parâmetro existente', async () => {
      // Arrange
      const chave = 'numero.parametro';
      const parametroMock = {
        id: '7',
        chave,
        valor: '123',
        tipo: ParametroTipoEnum.NUMBER,
        descricao: 'Parâmetro numérico',
        categoria: 'numeros',
      };
      
      jest.spyOn(service, 'buscarPorChave').mockResolvedValue(parametroMock);
      
      // Act
      const resultado = await service.obterValorTipado<number>(chave);
      
      // Assert
      expect(resultado).toBe(123);
      expect(service.buscarPorChave).toHaveBeenCalledWith(chave);
    });

    it('deve retornar o valor padrão quando o parâmetro não existir', async () => {
      // Arrange
      const chave = 'parametro.inexistente';
      const valorPadrao = 'valor padrão';
      
      jest.spyOn(service, 'buscarPorChave').mockImplementation(() => {
        throw new NotFoundException(`Parâmetro com chave '${chave}' não encontrado`);
      });
      
      // Act
      const resultado = await service.obterValorTipado<string>(chave, valorPadrao);
      
      // Assert
      expect(resultado).toBe(valorPadrao);
      expect(service.buscarPorChave).toHaveBeenCalledWith(chave);
    });
  });
});
