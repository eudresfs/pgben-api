import { Test, TestingModule } from '@nestjs/testing';
import { UsuarioService } from './usuario.service';
import { UsuarioRepository } from '../repositories/usuario.repository';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Usuario } from '../entities/usuario.entity';

// Mock do bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

import * as bcrypt from 'bcrypt';

/**
 * Testes unitários para o UsuarioService
 * 
 * Cobertura de testes:
 * - Criação de usuários
 * - Busca de usuários
 * - Atualização de dados
 * - Validação de credenciais
 * - Sistema de bloqueio por tentativas
 * - Remoção de usuários
 */
describe('UsuarioService', () => {
  let service: UsuarioService;
  let repository: jest.Mocked<UsuarioRepository>;
  let dataSource: jest.Mocked<DataSource>;

  const mockUsuario = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    nome: 'João Silva',
    email: 'joao.silva@semtas.natal.gov.br',
    cpf: '12345678901',
    telefone: '(84) 99999-9999',
    matricula: 'SEMTAS001',
    senhaHash: 'hashedPassword',
    role_id: 'role-id',
    role: null,
    unidadeId: 'unidade-id',
    unidade: null,
    setorId: 'setor-id',
    setor: null,
    status: 'ativo',
    primeiro_acesso: true,
    ultimo_login: null,
    tentativas_login: 0,
    created_at: new Date(),
    updated_at: new Date(),
    removed_at: null,
    refreshTokens: [],
  } as any;

  beforeEach(async () => {
    const mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByCpf: jest.fn(),
      findByMatricula: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      updateSenha: jest.fn(),
      remove: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn().mockImplementation((callbackOrIsolation, callback) => {
        // Se apenas um parâmetro for passado, é o callback
        if (typeof callbackOrIsolation === 'function') {
          return callbackOrIsolation({});
        }
        // Se dois parâmetros, o segundo é o callback
        return callback({});
      }),
      getRepository: jest.fn(),
    };



    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuarioService,
        {
          provide: UsuarioRepository,
          useValue: mockRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<UsuarioService>(UsuarioService);
    repository = module.get(UsuarioRepository);
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('deve retornar um usuário quando encontrado', async () => {
      repository.findById.mockResolvedValue(mockUsuario);

      const result = await service.findById('123e4567-e89b-12d3-a456-426614174000');

      // O service remove a senhaHash do retorno
      const { senhaHash, ...expectedResult } = mockUsuario;
      expect(result).toEqual(expectedResult);
      expect(repository.findById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    });

    it('deve lançar NotFoundException quando usuário não encontrado', async () => {
      repository.findById.mockRejectedValue(new NotFoundException('Usuário com ID invalid-id não encontrado'));

      await expect(service.findById('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('deve retornar usuário quando email existe', async () => {
      repository.findByEmail.mockResolvedValue(mockUsuario);

      const result = await service.findByEmail('joao.silva@semtas.natal.gov.br');

      expect(result).toEqual(mockUsuario);
      expect(repository.findByEmail).toHaveBeenCalledWith('joao.silva@semtas.natal.gov.br');
    });

    it('deve normalizar email para minúsculas', async () => {
      repository.findByEmail.mockResolvedValue(mockUsuario);

      await service.findByEmail('JOAO.SILVA@SEMTAS.NATAL.GOV.BR');

      expect(repository.findByEmail).toHaveBeenCalledWith('joao.silva@semtas.natal.gov.br');
    });

    it('deve retornar null quando email não existe', async () => {
      repository.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail('inexistente@email.com');

      expect(result).toBeNull();
    });
  });

  describe('validateUserCredentials', () => {
    beforeEach(() => {
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
    });

    it('deve retornar usuário quando credenciais são válidas', async () => {
      const usuarioAtivo = { ...mockUsuario, tentativas_login: 0 };
      repository.findByEmail.mockResolvedValue(usuarioAtivo);
      repository.updateStatus.mockResolvedValue(usuarioAtivo);
      
      const mockTransaction = jest.fn().mockImplementation((callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue({
            update: jest.fn().mockResolvedValue({})
          })
        };
        return callback(mockManager);
      });
      dataSource.transaction.mockImplementation(mockTransaction);

      const result = await service.validateUserCredentials('joao.silva@semtas.natal.gov.br', 'senha123');

      expect(result).toEqual(usuarioAtivo);
    });

    it('deve retornar null quando email não existe', async () => {
      repository.findByEmail.mockResolvedValue(null);

      const result = await service.validateUserCredentials('inexistente@email.com', 'senha123');

      expect(result).toBeNull();
    });

    it('deve lançar UnauthorizedException quando usuário está bloqueado', async () => {
      const usuarioBloqueado = { 
        ...mockUsuario, 
        tentativas_login: 5,
        ultimo_login: new Date() // Tentativa recente
      };
      repository.findByEmail.mockResolvedValue(usuarioBloqueado);

      await expect(
        service.validateUserCredentials('joao.silva@semtas.natal.gov.br', 'senha123')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve retornar null e incrementar tentativas quando senha é inválida', async () => {
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));
      repository.findByEmail.mockResolvedValue(mockUsuario);
      
      const mockTransaction = jest.fn().mockImplementation((callback) => {
        const mockManager = {
          getRepository: jest.fn().mockReturnValue({
            increment: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({})
          })
        };
        return callback(mockManager);
      });
      dataSource.transaction.mockImplementation(mockTransaction);

      const result = await service.validateUserCredentials('joao.silva@semtas.natal.gov.br', 'senhaerrada');

      expect(result).toBeNull();
      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const createUsuarioDto = {
      nome: 'João da Silva',
      email: 'joao.silva@semtas.natal.gov.br',
      senha: 'Senha@123',
      cpf: '123.456.789-00',
      telefone: '(84) 99999-9999',
      matricula: '12345',
      role_id: 'ASSISTENTE_SOCIAL',
      unidadeId: 'unidade-123',
      setorId: 'setor-123'
    };



    it('deve criar usuário com sucesso', async () => {
      const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === 'usuario') {
            return {
              findOne: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockReturnValue(mockUsuario),
              save: jest.fn().mockResolvedValue(mockUsuario)
            };
          }
          if (entity === 'unidade') {
            return {
              findOne: jest.fn().mockResolvedValue({ id: 'unidade-123' })
            };
          }
          if (entity === 'setor') {
            return {
              findOne: jest.fn().mockResolvedValue({ id: 'setor-123' })
            };
          }
        })
      };
      
      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) => callback(mockManager));

      const result = await service.create(createUsuarioDto);

      expect(result.data).toBeDefined();
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('deve lançar ConflictException quando email já existe', async () => {
      const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === 'usuario') {
            return {
              findOne: jest.fn().mockResolvedValue(mockUsuario)
            };
          }
        })
      };
      
      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) => callback(mockManager));

      await expect(service.create(createUsuarioDto)).rejects.toThrow('Email já está em uso');
    });

    it('deve lançar ConflictException quando CPF já existe', async () => {
      const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === 'usuario') {
            return {
              findOne: jest.fn().mockImplementation((options) => {
                if (options.where.email) {return null;}
                if (options.where.cpf) {return mockUsuario;}
                return null;
              })
            };
          }
        })
      };
      
      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) => callback(mockManager));

      await expect(service.create(createUsuarioDto)).rejects.toThrow('CPF já está em uso');
    });

    it('deve lançar ConflictException quando matrícula já existe', async () => {
      const mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === 'usuario') {
            return {
              findOne: jest.fn().mockImplementation((options) => {
                if (options.where.email) {return null;}
                if (options.where.cpf) {return null;}
                if (options.where.matricula) {return mockUsuario;}
                return null;
              })
            };
          }
        })
      };
      
      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) => callback(mockManager));

      await expect(service.create(createUsuarioDto)).rejects.toThrow('Matrícula já está em uso');
    });
  });

  describe('remove', () => {
    it('deve remover usuário com sucesso', async () => {
      repository.findById.mockResolvedValue(mockUsuario);
      repository.remove.mockResolvedValue();

      await service.remove('123e4567-e89b-12d3-a456-426614174000');

      expect(repository.remove).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    });

    it('deve lançar NotFoundException quando usuário não existe', async () => {
      repository.findById.mockRejectedValue(new NotFoundException('Usuário com ID invalid-id não encontrado'));

      await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProfile', () => {
    it('deve retornar perfil do usuário', async () => {
      repository.findById.mockResolvedValue(mockUsuario);

      const result = await service.getProfile('123e4567-e89b-12d3-a456-426614174000');

      // O service remove a senhaHash do retorno
      const { senhaHash, ...expectedResult } = mockUsuario;
      expect(result).toEqual(expectedResult);
    });
  });
});