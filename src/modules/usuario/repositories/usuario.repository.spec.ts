import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DeepPartial, DataSource } from 'typeorm';
import { UsuarioRepository } from './usuario.repository';
import { Usuario } from '../entities/usuario.entity';
import { CreateUsuarioDto } from '../dto/create-usuario.dto';
import { UpdateUsuarioDto } from '../dto/update-usuario.dto';
import { NotFoundException } from '@nestjs/common';

/**
 * Testes unitários para o UsuarioRepository
 * 
 * Cobertura de testes:
 * - Criação de usuários
 * - Busca por ID, email, CPF
 * - Listagem com filtros e paginação
 * - Atualização de dados
 * - Atualização de status
 * - Atualização de senha
 * - Soft delete
 * - Contagem de registros
 */
describe('UsuarioRepository', () => {
  let repository: UsuarioRepository;
  let typeormRepository: jest.Mocked<Repository<Usuario>>;

  const mockRole = {
    id: 'role-id',
    nome: 'ASSISTENTE_SOCIAL',
    descricao: 'Assistente Social',
    ativo: true,
    usuarios: [],
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockUnidade = {
    id: 'unidade-123',
    nome: 'Unidade Teste',
    endereco: 'Endereço Teste',
    telefone: '(84) 99999-9999',
    email: 'unidade@test.com',
    ativo: true,
    setores: [],
    usuarios: [],
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockSetor = {
    id: 'setor-123',
    nome: 'Setor Teste',
    descricao: 'Descrição do Setor',
    ativo: true,
    unidade: mockUnidade,
    unidadeId: 'unidade-123',
    usuarios: [],
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockUsuario: Usuario = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    nome: 'João da Silva',
    email: 'joao.silva@semtas.natal.gov.br',
    cpf: '123.456.789-00',
    telefone: '(84) 99999-9999',
    matricula: '12345',
    senhaHash: '$2b$12$hashedpassword',
    role: mockRole,
    role_id: 'role-id',
    status: 'ativo',
    primeiro_acesso: false,
    tentativas_login: 0,
    ultimo_login: new Date(),
    unidadeId: 'unidade-123',
    setorId: 'setor-123',
    created_at: new Date(),
    updated_at: new Date(),
    removed_at: null,
    unidade: mockUnidade,
    setor: mockSetor,
    refreshTokens: [],
    solicitacoes: [],
    auditoriasCreated: [],
    auditoriasUpdated: []
  } as any;

  beforeEach(async () => {
    const mockTypeormRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(),
      count: jest.fn(),
    };

    const mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockTypeormRepository),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuarioRepository,
        {
          provide: getRepositoryToken(Usuario),
          useValue: mockTypeormRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    repository = module.get<UsuarioRepository>(UsuarioRepository);
    typeormRepository = module.get(getRepositoryToken(Usuario));
  });

  describe('create', () => {
    it('deve criar um novo usuário', async () => {
      const createDto: CreateUsuarioDto = {
        nome: 'João da Silva',
        email: 'joao.silva@semtas.natal.gov.br',
        senha: 'Senha@123',
        cpf: '123.456.789-00',
        telefone: '(84) 99999-9999',
        matricula: '12345',
        role_id: 'role-id',
        unidadeId: 'unidade-123',
        setorId: 'setor-123'
      };

      typeormRepository.create.mockReturnValue(mockUsuario as any);
      typeormRepository.save.mockResolvedValue(mockUsuario);

      const result = await repository.create(createDto);

      expect(typeormRepository.create).toHaveBeenCalledWith(createDto);
      expect(typeormRepository.save).toHaveBeenCalledWith(mockUsuario);
      expect(result).toEqual(mockUsuario);
    });
  });

  describe('findById', () => {
    it('deve retornar usuário por ID', async () => {
      typeormRepository.findOne.mockResolvedValue(mockUsuario);

      const result = await repository.findById('123e4567-e89b-12d3-a456-426614174000');

      expect(typeormRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123e4567-e89b-12d3-a456-426614174000' },
        relations: ['unidade', 'setor']
      });
      expect(result).toEqual(mockUsuario);
    });

    it('deve lançar NotFoundException quando usuário não encontrado', async () => {
      typeormRepository.findOne.mockResolvedValue(null);

      await expect(repository.findById('id-inexistente'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('deve retornar usuário por email', async () => {
      typeormRepository.findOne.mockResolvedValue(mockUsuario);

      const result = await repository.findByEmail('joao.silva@semtas.natal.gov.br');

      expect(typeormRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'joao.silva@semtas.natal.gov.br' }
      });
      expect(result).toEqual(mockUsuario);
    });

    it('deve retornar null quando email não encontrado', async () => {
      typeormRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByEmail('email@inexistente.com');

      expect(result).toBeNull();
    });
  });

  describe('findByCpf', () => {
    it('deve retornar usuário por CPF', async () => {
      typeormRepository.findOne.mockResolvedValue(mockUsuario);

      const result = await repository.findByCpf('123.456.789-00');

      expect(typeormRepository.findOne).toHaveBeenCalledWith({
        where: { cpf: '123.456.789-00' }
      });
      expect(result).toEqual(mockUsuario);
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de usuários', async () => {
      typeormRepository.findAndCount.mockResolvedValue([[mockUsuario], 1]);

      const options = {
        skip: 0,
        take: 10,
        where: {
          nome: 'João',
          role_id: 'role-id',
          status: 'ativo',
          unidadeId: 'unidade-123'
        }
      };

      const result = await repository.findAll(options);

      expect(result).toEqual([[mockUsuario], 1]);
      expect(typeormRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {
          nome: 'João',
          role_id: 'role-id',
          status: 'ativo',
          unidadeId: 'unidade-123'
        },
        order: { created_at: 'DESC' }
      });
    });

    it('deve aplicar filtros corretamente', async () => {
      typeormRepository.findAndCount.mockResolvedValue([[mockUsuario], 1]);

      const options = {
        where: {
          search: 'João',
          role: 'ASSISTENTE_SOCIAL',
          status: 'ativo',
          unidadeId: 'unidade-123'
        }
      };

      const result = await repository.findAll(options);

      expect(typeormRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {
          search: 'João',
          role: 'ASSISTENTE_SOCIAL',
          status: 'ativo',
          unidadeId: 'unidade-123'
        },
        order: { created_at: 'DESC' }
      });
      expect(result).toEqual([[mockUsuario], 1]);
    });
  });

  describe('update', () => {
    it('deve atualizar usuário', async () => {
      const updateDto: UpdateUsuarioDto = {
        nome: 'João Silva Santos',
        cpf: '123.456.789-00',
        telefone: '(84) 88888-8888'
      };
      const usuarioAtualizado = { ...mockUsuario, ...updateDto };

      typeormRepository.update.mockResolvedValue({ affected: 1 } as any);
      typeormRepository.findOne.mockResolvedValue(usuarioAtualizado);

      const result = await repository.update('123e4567-e89b-12d3-a456-426614174000', updateDto);

      expect(typeormRepository.update).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        updateDto
      );
      expect(result).toEqual(usuarioAtualizado);
    });

    it('deve lançar NotFoundException quando usuário não encontrado para atualização', async () => {
      typeormRepository.update.mockResolvedValue({ affected: 0 } as any);

      await expect(repository.update('id-inexistente', { nome: 'Novo Nome' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('deve atualizar status do usuário', async () => {
      const updateData: DeepPartial<Usuario> = {
        status: 'inativo'
      };
      const usuarioAtualizado = { ...mockUsuario, status: 'inativo' };

      typeormRepository.update.mockResolvedValue({ affected: 1 } as any);
      typeormRepository.findOne.mockResolvedValue(usuarioAtualizado);

      const result = await repository.updateStatus('123e4567-e89b-12d3-a456-426614174000', 'inativo');

      expect(typeormRepository.update).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        updateData
      );
      expect(result).toEqual(usuarioAtualizado);
    });
  });

  describe('updateSenha', () => {
    it('deve atualizar senha do usuário', async () => {
      const updateData: DeepPartial<Usuario> = {
        senhaHash: 'novaSenhaHash',
        primeiro_acesso: false
      };
      const usuarioAtualizado = { ...mockUsuario, senhaHash: 'novaSenhaHash' };

      typeormRepository.update.mockResolvedValue({ affected: 1 } as any);
      typeormRepository.findOne.mockResolvedValue(usuarioAtualizado);

      const result = await repository.updateSenha('123e4567-e89b-12d3-a456-426614174000', 'novaSenhaHash');

      expect(typeormRepository.update).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        updateData
      );
      expect(result).toEqual(usuarioAtualizado);
    });
  });

  describe('remove', () => {
    it('deve fazer soft delete do usuário', async () => {
      typeormRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await repository.remove('123e4567-e89b-12d3-a456-426614174000');

      expect(typeormRepository.softDelete).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    });

    it('deve lançar NotFoundException quando usuário não encontrado para remoção', async () => {
      typeormRepository.softDelete.mockResolvedValue({ affected: 0 } as any);

      await expect(repository.remove('id-inexistente'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('count', () => {
    it('deve retornar contagem de usuários', async () => {
      typeormRepository.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(typeormRepository.count).toHaveBeenCalledWith({ where: undefined });
    });

    it('deve retornar contagem de usuários com filtro', async () => {
      const whereCondition = { status: 'ativo' };
      typeormRepository.count.mockResolvedValue(3);

      const result = await repository.count(whereCondition);

      expect(result).toBe(3);
      expect(typeormRepository.count).toHaveBeenCalledWith({ where: whereCondition });
    });
  });

  it('deve estar definido', () => {
    expect(repository).toBeDefined();
  });
});