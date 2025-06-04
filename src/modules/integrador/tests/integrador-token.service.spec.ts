import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { IntegradorToken, TokenRevogado } from '../../../entities';
import { IntegradorTokenService } from '../services/integrador-token.service';
import { IntegradorService } from '../services/integrador.service';
import { CreateTokenDto } from '../dto/create-token.dto';

/**
 * Testes unitários para o serviço de tokens de integradores.
 * Valida a geração, validação e revogação de tokens, além das verificações
 * de permissões e restrições de IP.
 */
describe('IntegradorTokenService', () => {
  let service: IntegradorTokenService;
  let integradorService: IntegradorService;
  let jwtService: JwtService;
  let tokenRepository: any;
  let tokenRevogadoRepository: any;

  // Mocks de repositórios e serviços
  const mockTokenRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockTokenRevogadoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };

  const mockIntegradorService = {
    findById: jest.fn(),
    registrarAcesso: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegradorTokenService,
        {
          provide: getRepositoryToken(IntegradorToken),
          useValue: mockTokenRepository,
        },
        {
          provide: getRepositoryToken(TokenRevogado),
          useValue: mockTokenRevogadoRepository,
        },
        {
          provide: IntegradorService,
          useValue: mockIntegradorService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<IntegradorTokenService>(IntegradorTokenService);
    integradorService = module.get<IntegradorService>(IntegradorService);
    jwtService = module.get<JwtService>(JwtService);
    tokenRepository = module.get(getRepositoryToken(IntegradorToken));
    tokenRevogadoRepository = module.get(getRepositoryToken(TokenRevogado));

    // Mock da função crypto.createHash que é usada no serviço
    jest.spyOn(global.crypto, 'createHash').mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('token-hash'),
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('createToken', () => {
    it('deve criar um token com sucesso', async () => {
      // Arrange
      const integradorId = 'integrador-id';
      const createTokenDto: CreateTokenDto = {
        nome: 'Token Teste',
        descricao: 'Token para testes',
        escopos: ['read:dados_basicos', 'write:solicitacoes'],
        diasValidade: 30,
        semExpiracao: false,
      };

      const integrador = {
        id: integradorId,
        nome: 'Integrador Teste',
        ativo: true,
        permissoesEscopo: [
          'read:dados_basicos',
          'write:solicitacoes',
          'read:cidadaos',
        ],
      };

      const tokenEntity = {
        id: 'token-id',
        integradorId,
        nome: createTokenDto.nome,
        descricao: createTokenDto.descricao,
        tokenHash: 'token-hash',
        escopos: createTokenDto.escopos,
        dataExpiracao: expect.any(Date),
        dataCriacao: new Date(),
      };

      const jwtToken = 'jwt-token-string';

      mockIntegradorService.findById.mockResolvedValue(integrador);
      mockTokenRepository.create.mockReturnValue(tokenEntity);
      mockTokenRepository.save.mockResolvedValue(tokenEntity);
      mockJwtService.sign.mockReturnValue(jwtToken);

      // Act
      const result = await service.createToken(integradorId, createTokenDto);

      // Assert
      expect(mockIntegradorService.findById).toHaveBeenCalledWith(integradorId);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: `integrador:${integradorId}`,
          name: integrador.nome,
          type: 'api_token',
          scopes: createTokenDto.escopos,
        },
        { expiresIn: '30d' },
      );
      expect(mockTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          integradorId,
          nome: createTokenDto.nome,
          descricao: createTokenDto.descricao,
          tokenHash: expect.any(String),
          escopos: createTokenDto.escopos,
          dataExpiracao: expect.any(Date),
        }),
      );
      expect(mockTokenRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        token: jwtToken,
        tokenInfo: expect.any(Object),
      });
    });

    it('deve criar um token sem expiração quando semExpiracao=true', async () => {
      // Arrange
      const integradorId = 'integrador-id';
      const createTokenDto: CreateTokenDto = {
        nome: 'Token Permanente',
        descricao: 'Token sem expiração',
        escopos: ['read:dados_basicos'],
        semExpiracao: true,
      };

      const integrador = {
        id: integradorId,
        nome: 'Integrador Teste',
        ativo: true,
        permissoesEscopo: [
          'read:dados_basicos',
          'write:solicitacoes',
          'read:cidadaos',
        ],
      };

      const tokenEntity = {
        id: 'token-id',
        integradorId,
        nome: createTokenDto.nome,
        descricao: createTokenDto.descricao,
        tokenHash: 'token-hash',
        escopos: createTokenDto.escopos,
        dataExpiracao: null, // Sem expiração
        dataCriacao: new Date(),
      };

      mockIntegradorService.findById.mockResolvedValue(integrador);
      mockTokenRepository.create.mockReturnValue(tokenEntity);
      mockTokenRepository.save.mockResolvedValue(tokenEntity);
      mockJwtService.sign.mockReturnValue('jwt-token-string');

      // Act
      const result = await service.createToken(integradorId, createTokenDto);

      // Assert
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        {}, // Sem opções de expiração
      );
      expect(mockTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dataExpiracao: null, // Confirma que token não tem expiração
        }),
      );
      expect(result.tokenInfo.dataExpiracao).toBeNull();
    });

    it('deve lançar BadRequestException quando integrador está inativo', async () => {
      // Arrange
      const integradorId = 'integrador-id';
      const createTokenDto: CreateTokenDto = {
        nome: 'Token Teste',
        escopos: ['read:dados_basicos'],
      };

      const integrador = {
        id: integradorId,
        nome: 'Integrador Inativo',
        ativo: false,
      };

      mockIntegradorService.findById.mockResolvedValue(integrador);

      // Act & Assert
      await expect(
        service.createToken(integradorId, createTokenDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockIntegradorService.findById).toHaveBeenCalledWith(integradorId);
      expect(mockTokenRepository.create).not.toHaveBeenCalled();
      expect(mockTokenRepository.save).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando escopo solicitado não é permitido', async () => {
      // Arrange
      const integradorId = 'integrador-id';
      const createTokenDto: CreateTokenDto = {
        nome: 'Token Teste',
        escopos: ['read:dados_basicos', 'admin:sistema'], // escopo não permitido
      };

      const integrador = {
        id: integradorId,
        nome: 'Integrador Teste',
        ativo: true,
        permissoesEscopo: ['read:dados_basicos', 'write:solicitacoes'],
      };

      mockIntegradorService.findById.mockResolvedValue(integrador);

      // Act & Assert
      await expect(
        service.createToken(integradorId, createTokenDto),
      ).rejects.toThrow(BadRequestException);
      expect(mockIntegradorService.findById).toHaveBeenCalledWith(integradorId);
      expect(mockTokenRepository.create).not.toHaveBeenCalled();
      expect(mockTokenRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAllByIntegrador', () => {
    it('deve retornar todos os tokens de um integrador', async () => {
      // Arrange
      const integradorId = 'integrador-id';
      const tokens = [
        {
          id: 'token-1',
          integradorId,
          nome: 'Token 1',
          dataCriacao: new Date(),
        },
        {
          id: 'token-2',
          integradorId,
          nome: 'Token 2',
          dataCriacao: new Date(),
        },
      ];

      mockIntegradorService.findById.mockResolvedValue({ id: integradorId });
      mockTokenRepository.find.mockResolvedValue(tokens);

      // Act
      const result = await service.findAllByIntegrador(integradorId);

      // Assert
      expect(mockIntegradorService.findById).toHaveBeenCalledWith(integradorId);
      expect(mockTokenRepository.find).toHaveBeenCalledWith({
        where: { integradorId },
        order: { dataCriacao: 'DESC' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toEqual(tokens[0].id);
      expect(result[1].id).toEqual(tokens[1].id);
    });
  });

  describe('findOne', () => {
    it('deve retornar um token específico pelo ID', async () => {
      // Arrange
      const tokenId = 'token-id';
      const token = {
        id: tokenId,
        integradorId: 'integrador-id',
        nome: 'Token Teste',
        dataCriacao: new Date(),
      };

      mockTokenRepository.findOne.mockResolvedValue(token);

      // Act
      const result = await service.findOne(tokenId);

      // Assert
      expect(mockTokenRepository.findOne).toHaveBeenCalledWith({
        where: { id: tokenId },
      });
      expect(result).toBeDefined();
      expect(result.id).toEqual(tokenId);
    });

    it('deve lançar NotFoundException quando token não existe', async () => {
      // Arrange
      const tokenId = 'token-inexistente';
      mockTokenRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(tokenId)).rejects.toThrow(NotFoundException);
      expect(mockTokenRepository.findOne).toHaveBeenCalledWith({
        where: { id: tokenId },
      });
    });
  });

  describe('revogarToken', () => {
    it('deve revogar um token com sucesso', async () => {
      // Arrange
      const tokenId = 'token-id';
      const motivo = 'Teste de revogação';

      const token = {
        id: tokenId,
        integradorId: 'integrador-id',
        nome: 'Token para Revogar',
        tokenHash: 'token-hash',
        revogado: false,
        dataExpiracao: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 dias no futuro
      };

      const tokenRevogado = {
        ...token,
        revogado: true,
        dataRevogacao: expect.any(Date),
        motivoRevogacao: motivo,
      };

      mockTokenRepository.findOne.mockResolvedValue(token);
      mockTokenRepository.save.mockResolvedValue(tokenRevogado);
      mockTokenRevogadoRepository.create.mockReturnValue({
        tokenHash: token.tokenHash,
        integradorId: token.integradorId,
        motivoRevogacao: motivo,
        dataExpiracao: token.dataExpiracao,
        dataLimpeza: expect.any(Date),
      });
      mockTokenRevogadoRepository.save.mockResolvedValue({});

      // Act
      const result = await service.revogarToken(tokenId, motivo);

      // Assert
      expect(mockTokenRepository.findOne).toHaveBeenCalledWith({
        where: { id: tokenId },
      });
      expect(mockTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: tokenId,
          revogado: true,
          dataRevogacao: expect.any(Date),
          motivoRevogacao: motivo,
        }),
      );
      expect(mockTokenRevogadoRepository.create).toHaveBeenCalled();
      expect(mockTokenRevogadoRepository.save).toHaveBeenCalled();
      expect(result.revogado).toBe(true);
      expect(result.motivoRevogacao).toEqual(motivo);
    });

    it('deve lançar BadRequestException ao tentar revogar um token já revogado', async () => {
      // Arrange
      const tokenId = 'token-id';
      const motivo = 'Teste de revogação';

      const token = {
        id: tokenId,
        nome: 'Token já Revogado',
        revogado: true,
        dataRevogacao: new Date(Date.now() - 1000 * 60 * 60), // 1 hora atrás
        motivoRevogacao: 'Revogado anteriormente',
      };

      mockTokenRepository.findOne.mockResolvedValue(token);

      // Act & Assert
      await expect(service.revogarToken(tokenId, motivo)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockTokenRepository.findOne).toHaveBeenCalledWith({
        where: { id: tokenId },
      });
      expect(mockTokenRepository.save).not.toHaveBeenCalled();
      expect(mockTokenRevogadoRepository.create).not.toHaveBeenCalled();
      expect(mockTokenRevogadoRepository.save).not.toHaveBeenCalled();
    });

    it('deve lançar NotFoundException ao tentar revogar um token inexistente', async () => {
      // Arrange
      const tokenId = 'token-inexistente';
      const motivo = 'Teste de revogação';

      mockTokenRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.revogarToken(tokenId, motivo)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockTokenRepository.findOne).toHaveBeenCalledWith({
        where: { id: tokenId },
      });
      expect(mockTokenRepository.save).not.toHaveBeenCalled();
      expect(mockTokenRevogadoRepository.create).not.toHaveBeenCalled();
      expect(mockTokenRevogadoRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('validateToken', () => {
    it('deve validar um token válido com sucesso', async () => {
      // Arrange
      const token = 'valid-jwt-token';
      const tokenHash = 'token-hash';
      const integradorId = 'integrador-id';

      const jwtPayload = {
        sub: `integrador:${integradorId}`,
        name: 'Integrador Teste',
        type: 'api_token',
        scopes: ['read:dados_basicos'],
      };

      const integrador = {
        id: integradorId,
        nome: 'Integrador Teste',
        ativo: true,
      };

      const tokenInfo = {
        id: 'token-id',
        integradorId,
        tokenHash,
        ultimoUso: null,
      };

      mockJwtService.verify.mockReturnValue(jwtPayload);
      mockTokenRevogadoRepository.findOne.mockResolvedValue(null); // Não está revogado
      mockIntegradorService.findById.mockResolvedValue(integrador);
      mockTokenRepository.findOne.mockResolvedValue(tokenInfo);

      // Act
      const result = await service.validateToken(token);

      // Assert
      expect(mockJwtService.verify).toHaveBeenCalledWith(token);
      expect(mockTokenRevogadoRepository.findOne).toHaveBeenCalledWith({
        where: { tokenHash },
      });
      expect(mockIntegradorService.findById).toHaveBeenCalledWith(integradorId);
      expect(mockIntegradorService.registrarAcesso).toHaveBeenCalledWith(
        integradorId,
      );
      expect(mockTokenRepository.findOne).toHaveBeenCalledWith({
        where: { tokenHash },
      });
      expect(mockTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: tokenInfo.id,
          ultimoUso: expect.any(Date),
        }),
      );
      expect(result).toEqual({
        ...jwtPayload,
        integrador,
      });
    });

    it('deve lançar UnauthorizedException quando token está revogado', async () => {
      // Arrange
      const token = 'revoked-jwt-token';
      const tokenHash = 'token-hash';
      const integradorId = 'integrador-id';

      const jwtPayload = {
        sub: `integrador:${integradorId}`,
        name: 'Integrador Teste',
        type: 'api_token',
      };

      mockJwtService.verify.mockReturnValue(jwtPayload);
      mockTokenRevogadoRepository.findOne.mockResolvedValue({
        id: 'revoked-id',
        tokenHash,
      }); // Token revogado

      // Act & Assert
      await expect(service.validateToken(token)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockJwtService.verify).toHaveBeenCalledWith(token);
      expect(mockTokenRevogadoRepository.findOne).toHaveBeenCalledWith({
        where: { tokenHash },
      });
      expect(mockIntegradorService.findById).not.toHaveBeenCalled();
      expect(mockIntegradorService.registrarAcesso).not.toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedException quando integrador está inativo', async () => {
      // Arrange
      const token = 'valid-jwt-token';
      const tokenHash = 'token-hash';
      const integradorId = 'integrador-id';

      const jwtPayload = {
        sub: `integrador:${integradorId}`,
        name: 'Integrador Inativo',
        type: 'api_token',
      };

      const integrador = {
        id: integradorId,
        nome: 'Integrador Inativo',
        ativo: false, // Integrador inativo
      };

      mockJwtService.verify.mockReturnValue(jwtPayload);
      mockTokenRevogadoRepository.findOne.mockResolvedValue(null); // Não está revogado
      mockIntegradorService.findById.mockResolvedValue(integrador);

      // Act & Assert
      await expect(service.validateToken(token)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockJwtService.verify).toHaveBeenCalledWith(token);
      expect(mockTokenRevogadoRepository.findOne).toHaveBeenCalledWith({
        where: { tokenHash },
      });
      expect(mockIntegradorService.findById).toHaveBeenCalledWith(integradorId);
      expect(mockIntegradorService.registrarAcesso).not.toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedException quando type do token não é api_token', async () => {
      // Arrange
      const token = 'wrong-type-token';

      const jwtPayload = {
        sub: 'user:123',
        name: 'Usuário',
        type: 'user_token', // Tipo incorreto
      };

      mockJwtService.verify.mockReturnValue(jwtPayload);

      // Act & Assert
      await expect(service.validateToken(token)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockJwtService.verify).toHaveBeenCalledWith(token);
      expect(mockTokenRevogadoRepository.findOne).not.toHaveBeenCalled();
      expect(mockIntegradorService.findById).not.toHaveBeenCalled();
    });
  });

  describe('hasRequiredScopes', () => {
    it('deve retornar true quando token tem todos os escopos necessários', () => {
      // Arrange
      const payload = {
        scopes: ['read:dados_basicos', 'write:solicitacoes', 'read:cidadaos'],
      };
      const requiredScopes = ['read:dados_basicos', 'write:solicitacoes'];

      // Act
      const result = service.hasRequiredScopes(payload, requiredScopes);

      // Assert
      expect(result).toBe(true);
    });

    it('deve retornar false quando token não tem todos os escopos necessários', () => {
      // Arrange
      const payload = {
        scopes: ['read:dados_basicos'],
      };
      const requiredScopes = ['read:dados_basicos', 'write:solicitacoes'];

      // Act
      const result = service.hasRequiredScopes(payload, requiredScopes);

      // Assert
      expect(result).toBe(false);
    });

    it('deve retornar true quando não há escopos requeridos', () => {
      // Arrange
      const payload = {
        scopes: ['read:dados_basicos'],
      };
      const requiredScopes = [];

      // Act
      const result = service.hasRequiredScopes(payload, requiredScopes);

      // Assert
      expect(result).toBe(true);
    });

    it('deve retornar false quando payload não tem escopos', () => {
      // Arrange
      const payload = {};
      const requiredScopes = ['read:dados_basicos'];

      // Act
      const result = service.hasRequiredScopes(payload, requiredScopes);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isIpAllowed', () => {
    it('deve retornar true quando IP está na lista de permitidos', () => {
      // Arrange
      const integrador = {
        ipPermitidos: ['192.168.1.1', '10.0.0.1', '172.16.0.1'],
      };
      const ipAddress = '192.168.1.1';

      // Act
      const result = service.isIpAllowed(integrador, ipAddress);

      // Assert
      expect(result).toBe(true);
    });

    it('deve retornar false quando IP não está na lista de permitidos', () => {
      // Arrange
      const integrador = {
        ipPermitidos: ['192.168.1.1', '10.0.0.1'],
      };
      const ipAddress = '172.16.0.1';

      // Act
      const result = service.isIpAllowed(integrador, ipAddress);

      // Assert
      expect(result).toBe(false);
    });

    it('deve retornar true quando não há lista de IPs permitidos', () => {
      // Arrange
      const integrador = {
        ipPermitidos: [],
      };
      const ipAddress = '192.168.1.1';

      // Act
      const result = service.isIpAllowed(integrador, ipAddress);

      // Assert
      expect(result).toBe(true);
    });

    it('deve retornar true quando a propriedade ipPermitidos não existe', () => {
      // Arrange
      const integrador = {};
      const ipAddress = '192.168.1.1';

      // Act
      const result = service.isIpAllowed(integrador, ipAddress);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('limparTokensRevogadosExpirados', () => {
    it('deve remover tokens revogados expirados', async () => {
      // Arrange
      mockTokenRevogadoRepository.execute.mockResolvedValue({ affected: 5 });

      // Act
      const result = await service.limparTokensRevogadosExpirados();

      // Assert
      expect(mockTokenRevogadoRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockTokenRevogadoRepository.delete).toHaveBeenCalled();
      expect(mockTokenRevogadoRepository.from).toHaveBeenCalled();
      expect(mockTokenRevogadoRepository.where).toHaveBeenCalled();
      expect(mockTokenRevogadoRepository.execute).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it('deve retornar 0 quando nenhum token for removido', async () => {
      // Arrange
      mockTokenRevogadoRepository.execute.mockResolvedValue({ affected: 0 });

      // Act
      const result = await service.limparTokensRevogadosExpirados();

      // Assert
      expect(mockTokenRevogadoRepository.execute).toHaveBeenCalled();
      expect(result).toBe(0);
    });
  });
});
