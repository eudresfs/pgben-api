import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { plainToClass } from 'class-transformer';
import { Request } from 'express';
import { RoleType } from '../../shared/constants/roles.constants';

import { LoggingService } from '../../shared/logging/logging.service';
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
import { Usuario } from '../../entities/usuario.entity';
import { PermissionService } from './permission.service';

@Injectable()
export class AuthService {
  // Valores padrão no formato semântico
  private readonly DEFAULT_ACCESS_TOKEN_EXPIRES_IN = '1h';
  private readonly DEFAULT_REFRESH_TOKEN_EXPIRES_IN = '7d';

  /**
   * Gera um JTI (JWT ID) único
   * @returns string - JTI único
   */
  private generateJti(): string {
    // Combinar timestamp, número aleatório e hash para garantir unicidade
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${randomPart}`;
  }

  constructor(
    private usuarioService: UsuarioService,
    private refreshTokenService: RefreshTokenService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly logger: LoggingService,
    private readonly permissionService: PermissionService,
  ) {
    // O contexto agora é passado diretamente nos métodos de log

    // Log das configurações de token
    const accessTokenExpiresIn = this.getAccessTokenExpiresIn();
    const refreshTokenExpiresIn = this.getRefreshTokenExpiresIn();

    this.logger.info(
      `Configuração de tokens - Access Token: ${accessTokenExpiresIn}, ` +
      `Refresh Token: ${refreshTokenExpiresIn} ` +
      `(em segundos: ${this.timeToSeconds(refreshTokenExpiresIn)})`,
      AuthService.name
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
      `Não foi possível interpretar o formato de tempo: ${timeString}, usando 1 dia como padrão`,
      AuthService.name
    );
    return 86400; // 1 dia em segundos
  }

  async validateUser(
    ctx: RequestContext,
    username: string,
    pass: string,
  ): Promise<UserAccessTokenClaims> {
    this.logger.info(`${this.validateUser.name} foi chamado`, AuthService.name);

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

    // Obter as permissões do usuário
    const permissions = await this.permissionService.getUserPermissions(
      usuario.id,
    );

    // Obter os escopos das permissões
    const permissionScopes: Record<string, string> = {};

    // Converter para o formato esperado incluindo permissões
    return UsuarioAdapter.toUserAccessTokenClaims(
      usuario,
      permissions,
      permissionScopes,
    );
  }

  async login(ctx: RequestContext): Promise<AuthTokenOutput> {
    this.logger.info(`${this.login.name} foi chamado`, AuthService.name);

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

    this.logger.info(
      `Criando refresh token com duração de ${refreshTokenExpiresIn} (${refreshTokenSeconds} segundos)`,
      AuthService.name
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

  async refreshToken(
    ctx: RequestContext,
    refreshTokenInput: RefreshTokenInput,
  ): Promise<AuthTokenOutput> {
    this.logger.info(`${this.refreshToken.name} foi chamado`, AuthService.name);

    // Encontrar o token de refresh
    const refreshToken = await this.refreshTokenService.findToken(
      refreshTokenInput.refreshToken,
    );

    // Verificar se o token existe e não foi revogado
    if (!refreshToken || refreshToken.revoked) {
      throw new UnauthorizedException('Token de refresh inválido');
    }

    // Verificar se o token expirou
    if (new Date() > refreshToken.expires_at) {
      throw new UnauthorizedException('Token de refresh expirado');
    }

    // Revogar apenas o token de refresh atual
    // Não adicionamos o access token à blacklist, pois isso causaria problemas
    // com requisições subsequentes
    const ipAddress = (ctx as any).req?.ip || '0.0.0.0';
    await this.refreshTokenService.revokeToken(refreshToken.token, ipAddress);

    // Não revogar tokens descendentes para evitar problemas com a blacklist
    // await this.refreshTokenService.revokeDescendantTokens(
    //   refreshToken,
    //   ipAddress,
    // );

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

    this.logger.info(
      `Criando novo refresh token com duração de ${refreshTokenExpiresIn} (${refreshTokenSeconds} segundos)`,
      AuthService.name
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
    this.logger.info(`${this.getAuthToken.name} was called`, AuthService.name);

    // Gerar um JTI (JWT ID) único para cada token
    const jti = this.generateJti();

    const subject = { sub: user.id };
    const payload = {
      username: user.username,
      sub: user.id,
      roles: user.roles,
    };

    // Adicionar unidade_id ao payload se disponível
    if ('unidade_id' in user && user.unidade_id) {
      payload['unidade_id'] = user.unidade_id;
    }

    // Adicionar permissões ao payload se disponíveis
    if ('permissions' in user && user.permissions) {
      payload['permissions'] = user.permissions;
    }

    // Adicionar escopos de permissões ao payload se disponíveis
    if ('permissionScopes' in user && user.permissionScopes) {
      payload['permissionScopes'] = user.permissionScopes;
    }

    // Garantir que estamos usando o algoritmo RS256 e a chave privada para assinar o token
    const privateKey = Buffer.from(
      this.configService.get<string>('JWT_PRIVATE_KEY_BASE64', ''),
      'base64',
    ).toString('utf8');

    // Obter valores de expiração no formato semântico
    const accessTokenExpiresIn = this.getAccessTokenExpiresIn();
    const refreshTokenExpiresIn = this.getRefreshTokenExpiresIn();

    this.logger.info(
      `Gerando tokens - Access token expira em: ${accessTokenExpiresIn}, Refresh token expira em: ${refreshTokenExpiresIn}`,
      AuthService.name
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
        jwtid: jti,
      },
    );

    // Para o refreshToken, usamos o mesmo JwtService, mas com opções diferentes de expiração
    // Gerar um JTI diferente para o refresh token
    const refreshJti = this.generateJti();

    const refreshTokenJwt = this.jwtService.sign(
      {
        ...subject,
      },
      {
        secret: privateKey,
        algorithm: 'RS256',
        expiresIn: refreshTokenExpiresIn,
        jwtid: refreshJti,
      },
    );

    const authToken = {
      accessToken,
      refreshToken: refreshTokenJwt,
    };

    return plainToClass(AuthTokenOutput, authToken, {
      excludeExtraneousValues: true,
    });
  }
}
