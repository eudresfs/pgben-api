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
  constructor(
    private usuarioService: UsuarioService,
    private refreshTokenService: RefreshTokenService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(AuthService.name);
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
    const senhaCorreta = await require('bcrypt').compare(pass, usuario.senhaHash);
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
    
    const refreshToken = await this.refreshTokenService.createToken(
      usuario as Usuario,
      Number(this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRES_IN') || '86400'),
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
      role: (input.roles?.[0] as unknown as Role) || Role.CIDADAO
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
    await this.refreshTokenService.revokeToken(
      refreshToken.token,
      ipAddress,
    );

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

    // Criar e salvar o novo refresh token
    const newRefreshToken = await this.refreshTokenService.createToken(
      usuario as Usuario,
      Number(this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRES_IN') || '86400'),
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

    const authToken = {
      refreshToken: this.jwtService.sign(subject, {
        expiresIn: this.configService.get('jwt.refreshTokenExpiresInSec'),
      }),
      accessToken: this.jwtService.sign(
        { ...payload, ...subject },
        { expiresIn: this.configService.get('jwt.accessTokenExpiresInSec') },
      ),
    };
    return plainToClass(AuthTokenOutput, authToken, {
      excludeExtraneousValues: true,
    });
  }
}