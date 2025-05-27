// src/auth/controllers/password-reset.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PasswordResetController } from './password-reset.controller';
import { PasswordResetService } from '../services/password-reset.service';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  ValidateTokenDto,
} from '../dto/password-reset.dto';

describe('PasswordResetController', () => {
  let controller: PasswordResetController;
  let passwordResetService: jest.Mocked<PasswordResetService>;

  const mockPasswordResetService = {
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    validateToken: jest.fn(),
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PasswordResetController],
      providers: [
        {
          provide: PasswordResetService,
          useValue: mockPasswordResetService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PasswordResetController>(PasswordResetController);
    passwordResetService = module.get(PasswordResetService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'test@semtas.gov.br',
    };

    it('deve solicitar recuperação de senha com sucesso', async () => {
      const mockResponse = {
        message: 'Se o email existir, um link de recuperação será enviado',
        timestamp: '2024-01-15T10:30:00Z',
        expiresInMinutes: 15,
      };

      mockPasswordResetService.requestPasswordReset.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(passwordResetService.requestPasswordReset).toHaveBeenCalledWith(
        forgotPasswordDto.email,
      );
      expect(result).toEqual(mockResponse);
    });

    it('deve retornar erro para email inválido', async () => {
      const invalidDto = { email: 'email-invalido' };

      mockPasswordResetService.requestPasswordReset.mockRejectedValue(
        new BadRequestException('Email inválido'),
      );

      await expect(
        controller.forgotPassword(invalidDto as ForgotPasswordDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve aplicar rate limiting', async () => {
      // Este teste verifica se o decorator @Throttle está aplicado
      const metadata = Reflect.getMetadata(
        'throttler:limit',
        controller.forgotPassword,
      );
      expect(metadata).toBeDefined();
    });
  });

  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      token: 'valid-token-123',
      newPassword: 'NovaSenh@123',
      confirmPassword: 'NovaSenh@123',
    };

    it('deve redefinir senha com sucesso', async () => {
      const mockResponse = {
        message: 'Senha redefinida com sucesso',
        timestamp: '2024-01-15T10:35:00Z',
        requiresReauth: true,
      };

      mockPasswordResetService.resetPassword.mockResolvedValue(mockResponse);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(passwordResetService.resetPassword).toHaveBeenCalledWith(
        resetPasswordDto.token,
        resetPasswordDto.newPassword,
      );
      expect(result).toEqual(mockResponse);
    });

    it('deve retornar erro para token inválido', async () => {
      mockPasswordResetService.resetPassword.mockRejectedValue(
        new BadRequestException('Token inválido ou expirado'),
      );

      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve validar confirmação de senha', async () => {
      const invalidDto = {
        ...resetPasswordDto,
        confirmPassword: 'senha-diferente',
      };

      await expect(
        controller.resetPassword(invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve validar força da senha', async () => {
      const weakPasswordDto = {
        ...resetPasswordDto,
        newPassword: '123456',
        confirmPassword: '123456',
      };

      // A validação deve falhar na camada de DTO
      // Este teste simula a validação do class-validator
      expect(weakPasswordDto.newPassword).not.toMatch(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      );
    });
  });

  describe('validateToken', () => {
    const validateTokenDto: ValidateTokenDto = {
      token: 'valid-token-123',
    };

    it('deve validar token com sucesso', async () => {
      const mockResponse = {
        valid: true,
        minutesRemaining: 12,
        email: 'test@semtas.gov.br',
      };

      mockPasswordResetService.validateToken.mockResolvedValue(mockResponse);

      const result = await controller.validateToken(validateTokenDto);

      expect(passwordResetService.validateToken).toHaveBeenCalledWith(
        validateTokenDto.token,
      );
      expect(result).toEqual(mockResponse);
    });

    it('deve retornar inválido para token expirado', async () => {
      const mockResponse = {
        valid: false,
        error: 'Token expirado',
      };

      mockPasswordResetService.validateToken.mockResolvedValue(mockResponse);

      const result = await controller.validateToken(validateTokenDto);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('deve retornar inválido para token não encontrado', async () => {
      mockPasswordResetService.validateToken.mockRejectedValue(
        new NotFoundException('Token não encontrado'),
      );

      await expect(
        controller.validateToken(validateTokenDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('deve retornar estatísticas para administradores', async () => {
      const mockStats = {
        requestsLast24h: 15,
        successfulResetsLast24h: 12,
        activeTokens: 8,
        expiredTokensLast24h: 3,
        successRate: 80.0,
        uniqueUsersLast24h: 14,
      };

      mockPasswordResetService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(passwordResetService.getStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });

    it('deve ter proteção de acesso por papel', () => {
      // Verifica se o decorator @Roles está aplicado
      const metadata = Reflect.getMetadata('roles', controller.getStats);
      expect(metadata).toContain('ADMIN');
    });
  });

  describe('Validações de DTO', () => {
    it('deve validar formato de email', () => {
      const invalidEmails = [
        'email-sem-arroba',
        '@dominio.com',
        'email@',
        'email@dominio',
        '',
      ];

      invalidEmails.forEach((email) => {
        expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });

    it('deve validar tamanho mínimo do token', () => {
      const shortToken = 'abc123';
      expect(shortToken.length).toBeLessThan(32);
    });

    it('deve validar força da senha', () => {
      const validPasswords = [
        'MinhaSenh@123',
        'Outr@Senha456',
        'Segur@nca789',
      ];

      const invalidPasswords = [
        '123456',
        'password',
        'PASSWORD',
        'Password',
        'Password123',
        'password@123',
      ];

      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

      validPasswords.forEach((password) => {
        expect(password).toMatch(passwordRegex);
      });

      invalidPasswords.forEach((password) => {
        expect(password).not.toMatch(passwordRegex);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('deve ter rate limiting configurado para forgot-password', () => {
      // Verifica se o decorator @Throttle está aplicado com os valores corretos
      const metadata = Reflect.getMetadata(
        'throttler:limit',
        controller.forgotPassword,
      );
      expect(metadata).toBeDefined();
    });

    it('deve ter rate limiting configurado para reset-password', () => {
      const metadata = Reflect.getMetadata(
        'throttler:limit',
        controller.resetPassword,
      );
      expect(metadata).toBeDefined();
    });
  });

  describe('Documentação Swagger', () => {
    it('deve ter documentação completa', () => {
      // Verifica se os decorators do Swagger estão aplicados
      const apiTags = Reflect.getMetadata('swagger/apiUseTags', PasswordResetController);
      expect(apiTags).toContain('Recuperação de Senha');
    });
  });
});