import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SseGuard } from '../guards/sse.guard';
import { Request } from 'express';

describe('SseGuard', () => {
  let guard: SseGuard;
  let jwtService: JwtService;

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SseGuard,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    guard = module.get<SseGuard>(SseGuard);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (
    request: Partial<Request>,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access with valid token in query parameter', async () => {
      const validToken = 'valid.jwt.token';
      const mockPayload = { id: 'user-123', email: 'test@example.com' };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const mockRequest = {
        query: { token: validToken },
        headers: {},
        cookies: {},
      };

      const context = createMockExecutionContext(mockRequest);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest['user']).toEqual(mockPayload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(validToken);
    });

    it('should allow access with valid token in Authorization header', async () => {
      const validToken = 'valid.jwt.token';
      const mockPayload = { id: 'user-123', email: 'test@example.com' };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const mockRequest = {
        query: {},
        headers: { authorization: `Bearer ${validToken}` },
        cookies: {},
      };

      const context = createMockExecutionContext(mockRequest);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest['user']).toEqual(mockPayload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(validToken);
    });

    it('should allow access with valid token in cookie', async () => {
      const validToken = 'valid.jwt.token';
      const mockPayload = { id: 'user-123', email: 'test@example.com' };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const mockRequest = {
        query: {},
        headers: {},
        cookies: { access_token: validToken },
      };

      const context = createMockExecutionContext(mockRequest);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest['user']).toEqual(mockPayload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(validToken);
    });

    it('should prioritize query parameter over header', async () => {
      const queryToken = 'query.jwt.token';
      const headerToken = 'header.jwt.token';
      const mockPayload = { id: 'user-123', email: 'test@example.com' };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const mockRequest = {
        query: { token: queryToken },
        headers: { authorization: `Bearer ${headerToken}` },
        cookies: {},
      };

      const context = createMockExecutionContext(mockRequest);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(queryToken);
      expect(jwtService.verifyAsync).not.toHaveBeenCalledWith(headerToken);
    });

    it('should prioritize header over cookie', async () => {
      const headerToken = 'header.jwt.token';
      const cookieToken = 'cookie.jwt.token';
      const mockPayload = { id: 'user-123', email: 'test@example.com' };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const mockRequest = {
        query: {},
        headers: { authorization: `Bearer ${headerToken}` },
        cookies: { access_token: cookieToken },
      };

      const context = createMockExecutionContext(mockRequest);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(headerToken);
      expect(jwtService.verifyAsync).not.toHaveBeenCalledWith(cookieToken);
    });

    it('should deny access when no token is provided', async () => {
      const mockRequest = {
        query: {},
        headers: {},
        cookies: {},
      };

      const context = createMockExecutionContext(mockRequest);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should deny access when token is invalid', async () => {
      const invalidToken = 'invalid.jwt.token';

      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      const mockRequest = {
        query: { token: invalidToken },
        headers: {},
        cookies: {},
      };

      const context = createMockExecutionContext(mockRequest);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(invalidToken);
    });

    it('should deny access when token is expired', async () => {
      const expiredToken = 'expired.jwt.token';

      mockJwtService.verifyAsync.mockRejectedValue(new Error('Token expired'));

      const mockRequest = {
        query: { token: expiredToken },
        headers: {},
        cookies: {},
      };

      const context = createMockExecutionContext(mockRequest);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(expiredToken);
    });

    it('should handle malformed Authorization header', async () => {
      const mockRequest = {
        query: {},
        headers: { authorization: 'InvalidFormat' },
        cookies: {},
      };

      const context = createMockExecutionContext(mockRequest);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should handle empty Authorization header', async () => {
      const mockRequest = {
        query: {},
        headers: { authorization: 'Bearer ' },
        cookies: {},
      };

      const context = createMockExecutionContext(mockRequest);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should handle empty token in query parameter', async () => {
      const mockRequest = {
        query: { token: '' },
        headers: {},
        cookies: {},
      };

      const context = createMockExecutionContext(mockRequest);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should handle empty cookie token', async () => {
      const mockRequest = {
        query: {},
        headers: {},
        cookies: { access_token: '' },
      };

      const context = createMockExecutionContext(mockRequest);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should handle JWT service throwing unexpected error', async () => {
      const validToken = 'valid.jwt.token';

      mockJwtService.verifyAsync.mockRejectedValue(
        new Error('Unexpected error'),
      );

      const mockRequest = {
        query: { token: validToken },
        headers: {},
        cookies: {},
      };

      const context = createMockExecutionContext(mockRequest);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(validToken);
    });

    it('should handle missing request object', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => null,
        }),
      } as ExecutionContext;

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should handle request without query, headers, or cookies', async () => {
      const mockRequest = {} as Request;

      const context = createMockExecutionContext(mockRequest);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should extract token correctly from complex Authorization header', async () => {
      const validToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const mockPayload = { id: 'user-123', email: 'test@example.com' };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const mockRequest = {
        query: {},
        headers: { authorization: `Bearer ${validToken}` },
        cookies: {},
      };

      const context = createMockExecutionContext(mockRequest);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(validToken);
    });

    it('should handle case-insensitive Authorization header', async () => {
      const validToken = 'valid.jwt.token';
      const mockPayload = { id: 'user-123', email: 'test@example.com' };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const mockRequest = {
        query: {},
        headers: { Authorization: `Bearer ${validToken}` }, // Capital A
        cookies: {},
      };

      const context = createMockExecutionContext(mockRequest);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(validToken);
    });

    it('should set user in request object when token is valid', async () => {
      const validToken = 'valid.jwt.token';
      const mockPayload = {
        id: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        iat: 1234567890,
        exp: 1234567890 + 3600,
      };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const mockRequest = {
        query: { token: validToken },
        headers: {},
        cookies: {},
      } as any;

      const context = createMockExecutionContext(mockRequest);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockRequest.user.id).toBe('user-123');
      expect(mockRequest.user.email).toBe('test@example.com');
    });

    it('should not set user in request object when token is invalid', async () => {
      const invalidToken = 'invalid.jwt.token';

      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      const mockRequest = {
        query: { token: invalidToken },
        headers: {},
        cookies: {},
      } as any;

      const context = createMockExecutionContext(mockRequest);
      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(mockRequest.user).toBeUndefined();
    });
  });

  describe('extractToken', () => {
    it('should extract token from query parameter first', () => {
      const queryToken = 'query-token';
      const headerToken = 'header-token';
      const cookieToken = 'cookie-token';

      const mockRequest = {
        query: { token: queryToken },
        headers: { authorization: `Bearer ${headerToken}` },
        cookies: { access_token: cookieToken },
      } as any;

      const extractedToken = guard['extractToken'](mockRequest);
      expect(extractedToken).toBe(queryToken);
    });

    it('should extract token from Authorization header when query is empty', () => {
      const headerToken = 'header-token';
      const cookieToken = 'cookie-token';

      const mockRequest = {
        query: {},
        headers: { authorization: `Bearer ${headerToken}` },
        cookies: { access_token: cookieToken },
      } as any;

      const extractedToken = guard['extractToken'](mockRequest);
      expect(extractedToken).toBe(headerToken);
    });

    it('should extract token from cookie when query and header are empty', () => {
      const cookieToken = 'cookie-token';

      const mockRequest = {
        query: {},
        headers: {},
        cookies: { access_token: cookieToken },
      } as any;

      const extractedToken = guard['extractToken'](mockRequest);
      expect(extractedToken).toBe(cookieToken);
    });

    it('should return null when no token is found', () => {
      const mockRequest = {
        query: {},
        headers: {},
        cookies: {},
      } as any;

      const extractedToken = guard['extractToken'](mockRequest);
      expect(extractedToken).toBeNull();
    });
  });
});
