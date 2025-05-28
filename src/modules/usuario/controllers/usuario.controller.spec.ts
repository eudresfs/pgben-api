import { Test, TestingModule } from '@nestjs/testing';
import { UsuarioController } from './usuario.controller';
import { UsuarioService } from '../services/usuario.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../auth/guards/permission.guard';
import { CreateUsuarioDto } from '../dto/create-usuario.dto';
import { UpdateUsuarioDto } from '../dto/update-usuario.dto';
import { UpdateStatusUsuarioDto } from '../dto/update-status-usuario.dto';
import { UpdateSenhaDto } from '../dto/update-senha.dto';
import { Usuario } from '../entities/usuario.entity';

/**
 * Testes unitários para o UsuarioController
 * 
 * Cobertura de testes:
 * - Listagem de usuários com filtros
 * - Busca por ID
 * - Perfil do usuário atual
 * - Criação de usuários
 * - Atualização de dados
 * - Atualização de status
 * - Atualização de senha
 * - Remoção de usuários
 */
describe('UsuarioController', () => {
  let controller: UsuarioController;
  let service: jest.Mocked<UsuarioService>;

  const mockUsuario: Usuario = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    nome: 'João da Silva',
    email: 'joao.silva@semtas.natal.gov.br',
    cpf: '123.456.789-00',
    telefone: '(84) 99999-9999',
    matricula: '12345',
    senhaHash: '$2b$12$hashedpassword',
    role_id: 'ASSISTENTE_SOCIAL',
    status: 'ativo',
    primeiro_acesso: false,
    tentativas_login: 0,
    ultimo_login: new Date(),
    unidadeId: 'unidade-123',
    setorId: 'setor-123',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    unidade_id: null,
    setor_id: null,
    solicitacoes: [],
    auditoriasCreated: [],
    auditoriasUpdated: [],
  };

  const mockRequest = {
    user: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'joao.silva@semtas.natal.gov.br',
      role: 'ASSISTENTE_SOCIAL'
    }
  };

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      updateSenha: jest.fn(),
      remove: jest.fn(),
      getProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuarioController],
      providers: [
        {
          provide: UsuarioService,
          useValue: mockService,
        },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: jest.fn(() => true) })
    .overrideGuard(PermissionGuard)
    .useValue({ canActivate: jest.fn(() => true) })
    .compile();

    controller = module.get<UsuarioController>(UsuarioController);
    service = module.get(UsuarioService);
  });

  describe('findAll', () => {
    it('deve retornar lista de usuários com paginação', async () => {
      const mockResult = {
        data: [mockUsuario],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };
      service.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(1, 10, 'João', 'ASSISTENTE_SOCIAL', 'ativo', 'unidade-123');

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'João',
        role: 'ASSISTENTE_SOCIAL',
        status: 'ativo',
        unidadeId: 'unidade-123'
      });
    });

    it('deve usar valores padrão quando parâmetros não fornecidos', async () => {
      const mockResult = {
        data: [mockUsuario],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };
      service.findAll.mockResolvedValue(mockResult);

      await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        search: undefined,
        role: undefined,
        status: undefined,
        unidadeId: undefined
      });
    });
  });

  describe('findOne', () => {
    it('deve retornar usuário por ID', async () => {
      service.findById.mockResolvedValue(mockUsuario);

      const result = await controller.findOne('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toEqual(mockUsuario);
      expect(service.findById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    });
  });

  describe('getProfile', () => {
    it('deve retornar perfil do usuário atual', async () => {
      service.getProfile.mockResolvedValue(mockUsuario);

      const result = await controller.getProfile(mockRequest);

      expect(result).toEqual(mockUsuario);
      expect(service.getProfile).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    });
  });

  describe('create', () => {
    it('deve criar novo usuário', async () => {
      const createDto: CreateUsuarioDto = {
        nome: 'João da Silva',
        email: 'joao.silva@semtas.natal.gov.br',
        cpf: '123.456.789-00',
        telefone: '(84) 99999-9999',
        matricula: '12345',
        role: 'ASSISTENTE_SOCIAL',
        unidadeId: 'unidade-123',
        setorId: 'setor-123'
      };
      service.create.mockResolvedValue(mockUsuario);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockUsuario);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('deve atualizar usuário', async () => {
      const updateDto: UpdateUsuarioDto = {
        nome: 'João Silva Santos',
        telefone: '(84) 88888-8888'
      };
      const usuarioAtualizado = { ...mockUsuario, ...updateDto };
      service.update.mockResolvedValue(usuarioAtualizado);

      const result = await controller.update('123e4567-e89b-12d3-a456-426614174000', updateDto);

      expect(result).toEqual(usuarioAtualizado);
      expect(service.update).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', updateDto);
    });
  });

  describe('updateStatus', () => {
    it('deve atualizar status do usuário', async () => {
      const updateStatusDto: UpdateStatusUsuarioDto = {
        status: 'inativo'
      };
      const usuarioAtualizado = { ...mockUsuario, status: 'inativo' };
      service.updateStatus.mockResolvedValue(usuarioAtualizado);

      const result = await controller.updateStatus('123e4567-e89b-12d3-a456-426614174000', updateStatusDto);

      expect(result).toEqual(usuarioAtualizado);
      expect(service.updateStatus).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', updateStatusDto);
    });
  });

  describe('updateSenha', () => {
    it('deve atualizar senha do usuário', async () => {
      const updateSenhaDto: UpdateSenhaDto = {
        senhaAtual: 'senhaAtual123',
        novaSenha: 'novaSenha123',
        confirmarSenha: 'novaSenha123'
      };
      const mockResponse = { message: 'Senha atualizada com sucesso' };
      service.updateSenha.mockResolvedValue(mockResponse);

      const result = await controller.updateSenha('123e4567-e89b-12d3-a456-426614174000', updateSenhaDto);

      expect(result).toEqual(mockResponse);
      expect(service.updateSenha).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', updateSenhaDto);
    });
  });

  describe('remove', () => {
    it('deve remover usuário', async () => {
      const mockResponse = { message: 'Usuário removido com sucesso' };
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove('123e4567-e89b-12d3-a456-426614174000');

      expect(service.remove).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    });
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('deve ter service injetado', () => {
    expect(service).toBeDefined();
  });
});