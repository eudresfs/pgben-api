import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { plainToClass } from 'class-transformer';

import { AppLogger } from '../../shared/logger/logger.service';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { UsuarioService } from '../../modules/usuario/services/usuario.service';
import { Role } from '../../modules/auth/enums/role.enum';
import { RegisterInput } from '../dtos/auth-register-input.dto';
import { RegisterOutput } from '../dtos/auth-register-output.dto';
import {
  AuthTokenOutput,
  UserAccessTokenClaims,
} from '../dtos/auth-token-output.dto';
import { UserOutput, UsuarioAdapter } from '../adapters/usuario-adapter';

@Injectable()
export class AuthService {
  constructor(
    private usuarioService: UsuarioService,
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

  login(ctx: RequestContext): AuthTokenOutput {
    this.logger.log(ctx, `${this.login.name} was called`);

    return this.getAuthToken(ctx, ctx.user!);
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
      role: (input.roles?.[0] as unknown as Role) || Role.TECNICO_UNIDADE
    };

    // Criar o usuário
    const registeredUser = await this.usuarioService.create(createUsuarioDto);
    
    // Converter para o formato esperado
    const userOutput = UsuarioAdapter.toUserOutput(registeredUser as any);
    
    return plainToClass(RegisterOutput, userOutput, {
      excludeExtraneousValues: true,
    });
  }

  async refreshToken(ctx: RequestContext): Promise<AuthTokenOutput> {
    this.logger.log(ctx, `${this.refreshToken.name} foi chamado`);

    // Garantir que o ID seja uma string
    const userId = typeof ctx.user!.id === 'number' ? ctx.user!.id.toString() : ctx.user!.id;
    const usuario = await this.usuarioService.findById(userId);
    if (!usuario) {
      throw new UnauthorizedException('ID de usuário inválido');
    }

    // Converter para o formato esperado
    const userOutput = UsuarioAdapter.toUserOutput(usuario as any);
    
    return this.getAuthToken(ctx, userOutput);
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
