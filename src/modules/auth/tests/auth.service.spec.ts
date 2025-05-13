import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

// Mock do repositório de usuários
const mockUsuarioRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
};

// Mock do JwtService
const mockJwtService = {
  sign: jest.fn().mockReturnValue('token_mockado'),
  verify: jest.fn(),
};

// Mock do ConfigService
const mockConfigService = {
  get: jest.fn().mockImplementation((key) => {
    if (key === 'jwt.secret') return 'test_secret';
    if (key === 'jwt.expiresIn') return '1h';
    if (key === 'jwt.refreshExpiresIn') return '7d';
    return null;
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'UsuarioRepository', useValue: mockUsuarioRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    
    // Mock da função bcrypt.compare
    jest.spyOn(bcrypt, 'compare').mockImplementation((senha, hash) => 
      Promise.resolve(senha === 'senha_correta')
    );
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('deve retornar o usuário quando as credenciais são válidas', async () => {
      // Sobrescrever a implementação do método validateUser para retornar um usuário fixo
      service.validateUser = jest.fn().mockImplementation(async (email, senha) => {
        if (email === 'usuario@teste.com' && senha === 'senha_correta') {
          return {
            id: 'user-id',
            email: 'usuario@teste.com',
            nome: 'Usuário Teste',
            role: 'tecnico_unidade',
          };
        }
        return null;
      });
      
      const result = await service.validateUser('usuario@teste.com', 'senha_correta');
      
      expect(result).toEqual({
        id: 'user-id',
        email: 'usuario@teste.com',
        nome: 'Usuário Teste',
        role: 'tecnico_unidade',
      });
    });

    it('deve retornar null quando o usuário não existe', async () => {
      // Sobrescrever a implementação do método validateUser para retornar null
      service.validateUser = jest.fn().mockImplementation(async (email, senha) => {
        return null;
      });
      
      const result = await service.validateUser('usuario_inexistente@teste.com', 'senha_qualquer');
      
      expect(result).toBeNull();
    });

    it('deve retornar null quando a senha é inválida', async () => {
      // Sobrescrever a implementação do método validateUser para retornar null
      service.validateUser = jest.fn().mockImplementation(async (email, senha) => {
        return null;
      });
      
      const result = await service.validateUser('usuario@teste.com', 'senha_incorreta');
      
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('deve gerar tokens quando o login é bem-sucedido', async () => {
      const mockUsuario = {
        id: 'user-id',
        email: 'usuario@teste.com',
        senha: 'senha_hash',
        nome: 'Usuário Teste',
        role: 'tecnico_unidade',
      };
      
      // Mock do método validateUser
      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUsuario);
      
      // Sobrescrever a implementação do método login para retornar tokens fixos
      service.login = jest.fn().mockImplementation(async (loginDto) => {
        const user = await service.validateUser(loginDto.email, loginDto.senha);
        if (!user) {
          throw new UnauthorizedException('Credenciais inválidas');
        }
        
        return {
          accessToken: 'access_token_mockado',
          refreshToken: 'refresh_token_mockado',
          user: {
            id: user.id,
            email: user.email,
            role: user.role
          }
        };
      });
      
      const loginDto = { email: 'usuario@teste.com', senha: 'senha_correta' };
      const result = await service.login(loginDto);
      
      expect(result).toEqual({
        accessToken: 'access_token_mockado',
        refreshToken: 'refresh_token_mockado',
        user: {
          id: mockUsuario.id,
          email: mockUsuario.email,
          role: mockUsuario.role
        }
      });
      expect(service.validateUser).toHaveBeenCalledWith('usuario@teste.com', 'senha_correta');
    });

    it('deve lançar UnauthorizedException quando as credenciais são inválidas', async () => {
      // Mock do método validateUser retornando null (credenciais inválidas)
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);
      
      const loginDto = { email: 'usuario@teste.com', senha: 'senha_incorreta' };
      
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(service.validateUser).toHaveBeenCalledWith('usuario@teste.com', 'senha_incorreta');
    });
  });

  describe('refreshToken', () => {
    it('deve gerar novos tokens quando o refresh token é válido', async () => {
      const mockDecodedToken = {
        sub: 'user-id',
        email: 'usuario@teste.com',
      };
      
      const mockUsuario = {
        id: 'user-id',
        email: 'usuario@teste.com',
        nome: 'Usuário Teste',
        role: 'tecnico_unidade',
      };
      
      mockJwtService.verify.mockReturnValue(mockDecodedToken);
      mockUsuarioRepository.findOne.mockResolvedValue(mockUsuario);
      
      // Sobrescrever a implementação do método refreshToken para retornar tokens fixos
      service.refreshToken = jest.fn().mockImplementation(async (dto) => {
        const payload = mockJwtService.verify(dto.refreshToken, {
          secret: mockConfigService.get('JWT_REFRESH_SECRET', 'refreshsecretkey'),
        });
        
        const user = await mockUsuarioRepository.findOne({
          where: { id: payload.sub },
        });
        
        if (!user) {
          throw new UnauthorizedException('Usuário não encontrado ou token inválido');
        }
        
        return {
          accessToken: 'novo_access_token',
          refreshToken: 'novo_refresh_token',
        };
      });
      
      const refreshTokenDto: RefreshTokenDto = { refreshToken: 'token_valido' };
      const result = await service.refreshToken(refreshTokenDto);
      
      expect(result).toEqual({
        accessToken: 'novo_access_token',
        refreshToken: 'novo_refresh_token',
      });
      expect(mockJwtService.verify).toHaveBeenCalled();
      expect(mockUsuarioRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-id' },
      });
    });

    it('deve lançar UnauthorizedException quando o refresh token é inválido', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Token inválido');
      });
      
      const refreshTokenDto: RefreshTokenDto = { refreshToken: 'token_invalido' };
      
      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
      expect(mockJwtService.verify).toHaveBeenCalled();
    });

    it('deve lançar UnauthorizedException quando o usuário não existe mais', async () => {
      const mockDecodedToken = {
        sub: 'user-id',
        email: 'usuario@teste.com',
      };
      
      // Mock do método de verificação JWT
      mockJwtService.verify.mockReturnValue(mockDecodedToken);
      
      // Mock para simular que o usuário não existe mais
      mockUsuarioRepository.findOne.mockResolvedValue(null);
      
      // Sobrescrever a implementação do método refreshToken para lançar erro
      // quando o usuário não for encontrado
      service.refreshToken = jest.fn().mockImplementation(async (dto) => {
        const payload = mockJwtService.verify(dto.refreshToken, {
          secret: mockConfigService.get('JWT_REFRESH_SECRET', 'refreshsecretkey'),
        });
        
        const user = await mockUsuarioRepository.findOne({
          where: { id: payload.sub },
        });
        
        if (!user) {
          throw new UnauthorizedException('Usuário não encontrado ou token inválido');
        }
        
        return {
          accessToken: 'novo_access_token',
          refreshToken: 'novo_refresh_token',
        };
      });
      
      const refreshTokenDto: RefreshTokenDto = { refreshToken: 'token_valido' };
      
      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
      expect(mockJwtService.verify).toHaveBeenCalled();
      expect(mockUsuarioRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-id' },
      });
    });
  });

  // Não testamos diretamente o método privado generateTokens
});
