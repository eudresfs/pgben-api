import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { AppLogger } from '../../shared/logger/logger.service';
import { RequestContext } from '../../src/shared/request-context/request-context.dto';
import { UsuarioService } from '../../src/modules/usuario/services/usuario.service';
import { Role } from '../../shared/enums/role.enum';
import { ROLE } from '../constants/role.constant';
import {
  AuthTokenOutput,
  UserAccessTokenClaims,
} from '../../src/auth/dtos/auth-token-output.dto';
import { UserOutput } from '../../src/auth/adapters/usuario-adapter';
import { AuthService } from '../../src/auth/services/auth.service';
import { PermissionService } from '../../src/auth/services/permission.service';
import { RefreshTokenService } from '../../src/auth/services/refresh-token.service';
import { AuditEventEmitter } from '../../src/modules/auditoria/events/emitters/audit-event.emitter';

describe('AuthService', () => {
  let service: AuthService;

  const accessTokenClaims: UserAccessTokenClaims = {
    id: 6,
    username: 'john',
    roles: [Role.TECNICO],
  };

  const registerInput = {
    username: 'jhon',
    name: 'Jhon doe',
    password: 'any password',
    roles: [Role.TECNICO],
    isAccountDisabled: false,
    email: 'randomUser@random.com',
  };

  const currentDate = new Date().toString();

  const userOutput: UserOutput = {
    name: 'John doe',
    isAccountDisabled: false,
    email: 'randomUser@random.com',
    created_at: currentDate,
    updated_at: currentDate,
    ...accessTokenClaims,
  };

  const authToken: AuthTokenOutput = {
    accessToken: 'random_access_token',
    refreshToken: 'random_refresh_token',
  };

  const mockedUsuarioService = {
    findById: jest.fn(),
    create: jest.fn(),
    findByEmail: jest.fn(),
  };

  const mockedJwtService = {
    sign: jest.fn(),
  };

  const mockedConfigService = { get: jest.fn() };

  const mockedLogger = { setContext: jest.fn(), log: jest.fn() };

  const mockedPermissionService = {
    getUserPermissions: jest.fn(),
  };

  const mockedRefreshTokenService = {
    findToken: jest.fn(),
    revokeToken: jest.fn(),
    createToken: jest.fn(),
  };

  const mockedAuditEmitter = {
    emitSecurityEvent: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsuarioService, useValue: mockedUsuarioService },
        { provide: JwtService, useValue: mockedJwtService },
        { provide: ConfigService, useValue: mockedConfigService },
        { provide: AppLogger, useValue: mockedLogger },
        { provide: PermissionService, useValue: mockedPermissionService },
        { provide: RefreshTokenService, useValue: mockedRefreshTokenService },
        { provide: AuditEventEmitter, useValue: mockedAuditEmitter },
      ],
    }).compile();

    service = moduleRef.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const ctx = new RequestContext();

  describe('validateUser', () => {
    const bcrypt = require('bcrypt');
    jest
      .spyOn(bcrypt, 'compare')
      .mockImplementation(() => Promise.resolve(true));

    it('should success when username/password valid', async () => {
      const mockUsuario = {
        id: '123',
        nome: 'John Doe',
        email: 'jhon@example.com',
        senhaHash: 'hashedpassword',
        status: 'ativo',
        role: Role.TECNICO,
      };

      jest
        .spyOn(mockedUsuarioService, 'findByEmail')
        .mockImplementation(() => Promise.resolve(mockUsuario));

      const result = await service.validateUser(
        ctx,
        'jhon@example.com',
        'somepass',
      );

      expect(result).toHaveProperty('id', '123');
      expect(result).toHaveProperty('username', 'jhon@example.com');
      expect(mockedUsuarioService.findByEmail).toBeCalledWith(
        'jhon@example.com',
      );
    });

    it('should fail when username/password invalid', async () => {
      // Usuário não encontrado
      jest
        .spyOn(mockedUsuarioService, 'findByEmail')
        .mockImplementation(() => Promise.resolve(null));

      await expect(
        service.validateUser(ctx, 'jhon@example.com', 'somepass'),
      ).rejects.toThrowError(UnauthorizedException);

      // Senha incorreta
      jest.spyOn(mockedUsuarioService, 'findByEmail').mockImplementation(() =>
        Promise.resolve({
          id: '123',
          nome: 'John Doe',
          email: 'jhon@example.com',
          senhaHash: 'hashedpassword',
          status: 'ativo',
        }),
      );

      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false));

      await expect(
        service.validateUser(ctx, 'jhon@example.com', 'wrongpass'),
      ).rejects.toThrowError(UnauthorizedException);
    });

    it('should fail when user account is disabled', async () => {
      jest.spyOn(mockedUsuarioService, 'findByEmail').mockImplementation(() =>
        Promise.resolve({
          id: '123',
          nome: 'John Doe',
          email: 'jhon@example.com',
          senhaHash: 'hashedpassword',
          status: 'inativo',
        }),
      );

      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));

      await expect(
        service.validateUser(ctx, 'jhon@example.com', 'somepass'),
      ).rejects.toThrowError(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return auth token for valid user', async () => {
      jest.spyOn(service, 'getAuthToken').mockImplementation(() => authToken);

      const result = service.login(ctx);

      expect(service.getAuthToken).toBeCalledWith(ctx, accessTokenClaims);
      expect(result).toEqual(authToken);
    });
  });

  describe('register', () => {
    it('should register new user', async () => {
      const mockUsuarioCriado = {
        id: '123',
        nome: 'Jhon doe',
        email: 'randomUser@random.com',
        status: 'ativo',
        role: Role.TECNICO,
        created_at: new Date(),
        updated_at: new Date(),
      };

      jest
        .spyOn(mockedUsuarioService, 'create')
        .mockImplementation(() => Promise.resolve(mockUsuarioCriado));

      const result = await service.register(ctx, registerInput);

      expect(mockedUsuarioService.create).toBeCalled();
      expect(result).toHaveProperty('name', 'Jhon doe');
      expect(result).toHaveProperty('email', 'randomUser@random.com');
    });
  });

  describe('refreshToken', () => {
    ctx.user = accessTokenClaims;

    it('should generate auth token', async () => {
      const mockUsuario = {
        id: '123',
        nome: 'John Doe',
        email: 'jhon@example.com',
        status: 'ativo',
        role: { nome: Role.TECNICO },
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockPermissions = [
        { nome: 'read_users' },
        { nome: 'write_users' },
      ];

      jest
        .spyOn(mockedUsuarioService, 'findById')
        .mockImplementation(() => Promise.resolve(mockUsuario));

      jest
        .spyOn(mockedPermissionService, 'getUserPermissions')
        .mockImplementation(() => Promise.resolve(mockPermissions));

      jest.spyOn(service, 'getAuthToken').mockImplementation(() => authToken);

      // Criar um input para o refresh token
      const refreshTokenInput = {
        refreshToken: 'valid-refresh-token',
      };

      // Mock do RefreshTokenService
      const mockRefreshToken = {
        token: 'valid-refresh-token',
        revoked: false,
        expires_at: new Date(Date.now() + 1000 * 60 * 60), // 1 hora no futuro
        usuario: { id: '123' },
      };

      // Configurar mocks do RefreshTokenService
      mockedRefreshTokenService.findToken.mockResolvedValue(mockRefreshToken);
      mockedRefreshTokenService.revokeToken.mockResolvedValue(true);
      mockedRefreshTokenService.createToken.mockResolvedValue({ token: 'new-refresh-token' });

      const result = await service.refreshToken(ctx, refreshTokenInput);

      expect(mockedPermissionService.getUserPermissions).toBeCalledWith('123');
      expect(service.getAuthToken).toBeCalled();
      expect(result).toMatchObject(authToken);
    });

    it('should throw exception when user is not valid', async () => {
      jest
        .spyOn(mockedUsuarioService, 'findById')
        .mockImplementation(() => Promise.resolve(null));

      // Criar um input para o refresh token
      const refreshTokenInput = {
        refreshToken: 'invalid-refresh-token',
      };

      // Mock do RefreshTokenService
      const mockRefreshToken = {
        token: 'invalid-refresh-token',
        revoked: false,
        expires_at: new Date(Date.now() + 1000 * 60 * 60), // 1 hora no futuro
        usuario: { id: '999' }, // ID que não existe
      };

      // Configurar mocks do RefreshTokenService
      mockedRefreshTokenService.findToken.mockResolvedValue(mockRefreshToken);
      mockedRefreshTokenService.revokeToken.mockResolvedValue(true);
      mockedRefreshTokenService.createToken.mockResolvedValue(null);

      await expect(
        service.refreshToken(ctx, refreshTokenInput),
      ).rejects.toThrowError('Usuário não encontrado');
    });

    afterEach(() => {
      jest.resetAllMocks();
    });
  });

  describe('getAuthToken', () => {
    const accessTokenExpiry = 100;
    const refreshTokenExpiry = 200;
    const user = { id: 5, username: 'username', roles: [Role.CIDADAO] };

    const subject = { sub: user.id };
    const payload = {
      username: user.username,
      sub: user.id,
      roles: [Role.CIDADAO],
    };

    beforeEach(() => {
      jest.spyOn(mockedConfigService, 'get').mockImplementation((key) => {
        let value: number | null = null;
        switch (key) {
          case 'jwt.accessTokenExpiresInSec':
            value = accessTokenExpiry;
            break;
          case 'jwt.refreshTokenExpiresInSec':
            value = refreshTokenExpiry;
            break;
        }
        return value;
      });

      jest
        .spyOn(mockedJwtService, 'sign')
        .mockImplementation(() => 'signed-response');
    });

    it('should generate access token with payload', () => {
      const result = service.getAuthToken(ctx, user);

      expect(mockedJwtService.sign).toBeCalledWith(
        { ...payload, ...subject },
        { expiresIn: accessTokenExpiry },
      );

      expect(result).toMatchObject({
        accessToken: 'signed-response',
      });
    });

    it('should generate refresh token with subject', () => {
      const result = service.getAuthToken(ctx, user);

      expect(mockedJwtService.sign).toBeCalledWith(subject, {
        expiresIn: refreshTokenExpiry,
      });

      expect(result).toMatchObject({
        refreshToken: 'signed-response',
      });
    });

    afterEach(() => {
      jest.resetAllMocks();
    });
  });
});
