import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { UnauthorizedException } from '@nestjs/common';

// Mock do serviço de autenticação
const mockAuthService = {
  login: jest.fn(),
  refreshToken: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('deve retornar tokens quando o login é bem-sucedido', async () => {
      const loginDto: LoginDto = {
        email: 'usuario@teste.com',
        senha: 'senha123',
      };
      
      const expectedResult = {
        accessToken: 'access_token_mockado',
        refreshToken: 'refresh_token_mockado',
        user: {
          id: '1',
          email: 'usuario@teste.com',
          role: 'tecnico_unidade'
        }
      };
      
      mockAuthService.login.mockResolvedValue(expectedResult);
      
      const result = await controller.login(loginDto);
      
      expect(result).toEqual(expectedResult);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('deve propagar exceções do serviço de autenticação', async () => {
      const loginDto: LoginDto = {
        email: 'usuario@teste.com',
        senha: 'senha_incorreta',
      };
      
      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Credenciais inválidas'));
      
      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('refreshToken', () => {
    it('deve retornar novos tokens quando o refresh token é válido', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'token_valido',
      };
      
      const expectedResult = {
        accessToken: 'novo_access_token',
        refreshToken: 'novo_refresh_token',
      };
      
      mockAuthService.refreshToken.mockResolvedValue(expectedResult);
      
      const result = await controller.refreshToken(refreshTokenDto);
      
      expect(result).toEqual(expectedResult);
      expect(authService.refreshToken).toHaveBeenCalledWith(refreshTokenDto);
    });

    it('deve propagar exceções do serviço de autenticação', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'token_invalido',
      };
      
      mockAuthService.refreshToken.mockRejectedValue(new UnauthorizedException('Token inválido ou expirado'));
      
      await expect(controller.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
      expect(authService.refreshToken).toHaveBeenCalledWith(refreshTokenDto);
    });
  });

  describe('forgotPassword', () => {
    it('deve retornar mensagem de sucesso quando o email é válido', async () => {
      const forgotPasswordDto: ForgotPasswordDto = {
        email: 'usuario@teste.com',
      };
      
      const expectedResult = {
        message: 'Email de recuperação enviado com sucesso',
      };
      
      mockAuthService.forgotPassword.mockResolvedValue(expectedResult);
      
      const result = await controller.forgotPassword(forgotPasswordDto);
      
      expect(result).toEqual(expectedResult);
      expect(authService.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto);
    });
  });

  describe('resetPassword', () => {
    it('deve retornar mensagem de sucesso quando a redefinição é bem-sucedida', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'token_valido',
        senha: 'nova_senha123',
        confirmacaoSenha: 'nova_senha123',
      };
      
      const expectedResult = {
        message: 'Senha redefinida com sucesso',
      };
      
      mockAuthService.resetPassword.mockResolvedValue(expectedResult);
      
      const result = await controller.resetPassword(resetPasswordDto);
      
      expect(result).toEqual(expectedResult);
      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
    });

    it('deve propagar exceções do serviço de autenticação', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'token_invalido',
        senha: 'nova_senha123',
        confirmacaoSenha: 'nova_senha123',
      };
      
      mockAuthService.resetPassword.mockRejectedValue(new UnauthorizedException('Token inválido ou expirado'));
      
      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(UnauthorizedException);
      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
    });
  });
});
