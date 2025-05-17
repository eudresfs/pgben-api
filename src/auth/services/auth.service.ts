import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { plainToClass } from 'class-transformer';
import { Request } from 'express';
import { Role } from '../../shared/enums/role.enum';

import { AppLogger } from '../../shared/logger/logger.service';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { UsuarioService } from '../../modules/usuario/services/usuario.service';
import { RegisterInput } from '../dtos/auth-register-input.dto';
import { RegisterOutput } from '../dtos/auth-register-output.dto';
import {
  AuthTokenOutput,
  UserAccessTokenClaims,
} from '../dtos/auth-token-output.dto';
import { UserOutput, UsuarioAdapter } from '../adapters/usuario-adapter';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshTokenInput } from '../dtos/auth-refresh-token-input.dto';
import { Usuario } from '../../modules/usuario/entities/usuario.entity';

@Injectable()
export class AuthService {
  // Valores padrão no formato semântico
  private readonly DEFAULT_ACCESS_TOKEN_EXPIRES_IN = '1h';
  private readonly DEFAULT_REFRESH_TOKEN_EXPIRES_IN = '7d';

  constructor(
    private usuarioService: UsuarioService,
    private refreshTokenService: RefreshTokenService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(AuthService.name);

    // Log das configurações de token
    const accessTokenExpiresIn = this.getAccessTokenExpiresIn();
    const refreshTokenExpiresIn = this.getRefreshTokenExpiresIn();

    this.logger.log(
      {} as RequestContext,
      `Configuração de tokens - Access Token: ${accessTokenExpiresIn}, ` +
        `Refresh Token: ${refreshTokenExpiresIn} ` +
        `(em segundos: ${this.timeToSeconds(refreshTokenExpiresIn)})`,
    );

    // Debug das variáveis de ambiente
    console.log(
      'JWT_REFRESH_TOKEN_EXPIRES_IN:',
      this.configService.get('JWT_REFRESH_TOKEN_EXPIRES_IN', 'não definido'),
    );
    console.log(
      'JWT_ACCESS_TOKEN_EXPIRES_IN:',
      this.configService.get('JWT_ACCESS_TOKEN_EXPIRES_IN', 'não definido'),
    );
  }

  /**
   * Obtém o tempo de expiração do access token no formato semântico (1h, 7d, etc)
   */
  private getAccessTokenExpiresIn(): string {
    return this.configService.get<string>(
      'JWT_ACCESS_TOKEN_EXPIRES_IN',
      this.DEFAULT_ACCESS_TOKEN_EXPIRES_IN,
    );
  }

  /**
   * Obtém o tempo de expiração do refresh token no formato semântico (1h, 7d, etc)
   */
  private getRefreshTokenExpiresIn(): string {
    return this.configService.get<string>(
      'JWT_REFRESH_TOKEN_EXPIRES_IN',
      this.DEFAULT_REFRESH_TOKEN_EXPIRES_IN,
    );
  }

  /**
   * Converte uma string de tempo no formato semântico (1h, 7d, etc) para segundos
   */
  private timeToSeconds(timeString: string): number {
    // Se for apenas um número, considera como segundos
    if (/^\d+$/.test(timeString)) {
      return parseInt(timeString, 10);
    }

    // Se for no formato número+unidade (ex: 7d, 24h, etc)
    const match = timeString.match(/^(\d+)([smhdw])$/);
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2];

      switch (unit) {
        case 's':
          return value; // segundos
        case 'm':
          return value * 60; // minutos
        case 'h':
          return value * 60 * 60; // horas
        case 'd':
          return value * 24 * 60 * 60; // dias
        case 'w':
          return value * 7 * 24 * 60 * 60; // semanas
        default:
          return 86400; // padrão: 1 dia
      }
    }

    // Fallback para valores que não conseguimos interpretar
    this.logger.warn(
      {} as RequestContext,
      `Não foi possível interpretar o formato de tempo: ${timeString}, usando 1 dia como padrão`,
    );
    return 86400; // 1 dia em segundos
  }

  async validateUser(
    ctx: RequestContext,
    username: string,
    pass: string,
  ): Promise<UserAccessTokenClaims> {
    this.logger.log(ctx, `${this.validateUser.name} foi chamado`);

    // Buscar usuário pelo email (username)
    const usuario = await this.usuarioService.findByEmail(username);
    if (!usuario) {
      throw new UnauthorizedException('Nome de usuário ou senha inválidos');
    }

    // Verificar se a senha está correta
    const senhaCorreta = await require('bcrypt').compare(
      pass,
      usuario.senhaHash,
    );
    if (!senhaCorreta) {
      throw new UnauthorizedException('Nome de usuário ou senha inválidos');
    }

    // Verificar se o usuário está ativo
    if (usuario.status === 'inativo') {
      throw new UnauthorizedException('Esta conta de usuário foi desativada');
    }

    // Converter para o formato esperado
    return UsuarioAdapter.toUserAccessTokenClaims(usuario);
  }

  async login(ctx: RequestContext): Promise<AuthTokenOutput> {
    this.logger.log(ctx, `${this.login.name} foi chamado`);

    // Obter o token de autenticação
    const tokens = this.getAuthToken(ctx, ctx.user!);

    // Criar e salvar o refresh token
    const usuario = await this.usuarioService.findById(ctx.user!.id as string);
    if (!usuario) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // Obter o tempo de expiração
    const refreshTokenExpiresIn = this.getRefreshTokenExpiresIn();
    const refreshTokenSeconds = this.timeToSeconds(refreshTokenExpiresIn);

    this.logger.log(
      ctx,
      `Criando refresh token com duração de ${refreshTokenExpiresIn} (${refreshTokenSeconds} segundos)`,
    );

    const refreshToken = await this.refreshTokenService.createToken(
      usuario as Usuario,
      refreshTokenSeconds, // Converte para segundos para o RefreshTokenService
    );

    return {
      ...tokens,
      refreshToken: refreshToken.token,
    };
  }

  async register(
    ctx: RequestContext,
    input: RegisterInput,
  ): Promise<RegisterOutput> {
    this.logger.log(ctx, `${this.register.name} foi chamado`);

    // Adaptar o input para o formato esperado pelo UsuarioService
    const createUsuarioDto = {
      nome: input.name,
      email: input.username,
      senha: input.password,
      role: (input.roles?.[0] as unknown as Role) || Role.CIDADAO,
    };

    // Criar o usuário
    const registeredUser = await this.usuarioService.create(createUsuarioDto);

    // Converter para o formato esperado
    const userOutput = UsuarioAdapter.toUserOutput(registeredUser as any);

    return plainToClass(RegisterOutput, userOutput, {
      excludeExtraneousValues: true,
    });
  }

  async refreshToken(
    ctx: RequestContext,
    refreshTokenInput: RefreshTokenInput,
  ): Promise<AuthTokenOutput> {
    this.logger.log(ctx, `${this.refreshToken.name} foi chamado`);

    // Encontrar o token de refresh
    const refreshToken = await this.refreshTokenService.findToken(
      refreshTokenInput.refreshToken,
    );

    // Verificar se o token existe e não foi revogado
    if (!refreshToken || refreshToken.revoked) {
      throw new UnauthorizedException('Token de refresh inválido');
    }

    // Verificar se o token expirou
    if (new Date() > refreshToken.expiresAt) {
      throw new UnauthorizedException('Token de refresh expirado');
    }

    // Revogar o token atual
    const ipAddress = (ctx as any).req?.ip || '0.0.0.0';
    await this.refreshTokenService.revokeToken(refreshToken.token, ipAddress);

    // Revogar tokens descendentes
    await this.refreshTokenService.revokeDescendantTokens(
      refreshToken,
      ipAddress,
    );

    // Obter o usuário
    const usuario = await this.usuarioService.findById(refreshToken.usuario.id);
    if (!usuario) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // Gerar novos tokens
    const userOutput = UsuarioAdapter.toUserOutput(usuario as any);
    const tokens = this.getAuthToken(ctx, userOutput);

    // Obter o tempo de expiração
    const refreshTokenExpiresIn = this.getRefreshTokenExpiresIn();
    const refreshTokenSeconds = this.timeToSeconds(refreshTokenExpiresIn);

    this.logger.log(
      ctx,
      `Criando novo refresh token com duração de ${refreshTokenExpiresIn} (${refreshTokenSeconds} segundos)`,
    );

    const newRefreshToken = await this.refreshTokenService.createToken(
      usuario as Usuario,
      refreshTokenSeconds, // Converte para segundos para o RefreshTokenService
    );

    return {
      ...tokens,
      refreshToken: newRefreshToken.token,
    };
  }

  getAuthToken(
    ctx: RequestContext,
    user: UserAccessTokenClaims | UserOutput,
  ): AuthTokenOutput {
    this.logger.log(ctx, `${this.getAuthToken.name} was called`);

    const subject = { sub: user.id };
    const payload = {
      username: user.username,
      sub: user.id,
      roles: user.roles,
    };

    // Garantir que estamos usando o algoritmo RS256 e a chave privada para assinar o token
    const privateKey = Buffer.from(
      this.configService.get<string>('JWT_PRIVATE_KEY_BASE64', ''),
      'base64',
    ).toString('utf8');

    // Obter valores de expiração no formato semântico
    const accessTokenExpiresIn = this.getAccessTokenExpiresIn();
    const refreshTokenExpiresIn = this.getRefreshTokenExpiresIn();

    this.logger.log(
      ctx,
      `Gerando tokens - Access token expira em: ${accessTokenExpiresIn}, Refresh token expira em: ${refreshTokenExpiresIn}`,
    );

    const accessToken = this.jwtService.sign(
      {
        ...payload,
        ...subject,
      },
      {
        secret: privateKey,
        algorithm: 'RS256',
        expiresIn: accessTokenExpiresIn,
      },
    );

    // Para o refreshToken, usamos o mesmo JwtService, mas com opções diferentes de expiração
    const refreshTokenJwt = this.jwtService.sign(subject, {
      secret: privateKey,
      algorithm: 'RS256',
      expiresIn: refreshTokenExpiresIn,
    });

    const authToken = {
      accessToken,
      refreshToken: refreshTokenJwt,
    };

    return plainToClass(AuthTokenOutput, authToken, {
      excludeExtraneousValues: true,
    });
  }
}
