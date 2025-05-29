// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { PassportModule } from '@nestjs/passport';

// Controllers
import { AuthController } from './controllers/auth.controller';
// PasswordRecoveryController removido - funcionalidades consolidadas no PasswordResetController
import { PasswordResetController } from './controllers/password-reset.controller';
import { JwtBlacklistController } from './controllers/jwt-blacklist.controller';

// Services
import { AuthService } from './services/auth.service';
import { RefreshTokenService } from './services/refresh-token.service';
// PasswordRecoveryService removido - funcionalidades consolidadas no PasswordResetService
import { PasswordResetService } from './services/password-reset.service';
import { JwtBlacklistService } from './services/jwt-blacklist.service';
import { PermissionService } from './services/permission.service';

// Entities
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { JwtBlacklist } from './entities/jwt-blacklist.entity';

// Strategies
import { JwtAuthStrategy } from './strategies/jwt-auth.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { LocalStrategy } from './strategies/local.strategy';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionGuard } from './guards/permission.guard';

// Config
import { createJwtConfig } from '../config/jwt.config';

// Modules
import { UsuarioModule } from '../modules/usuario/usuario.module';
import { forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CommonModule } from '../common/common.module';
import { AppLoggerModule } from '../shared/logger/logger.module';
import { PermissionModule } from './permission.module';

/**
 * Módulo de Autenticação e Autorização
 * 
 * Responsável por:
 * - Autenticação JWT e local
 * - Gerenciamento de tokens de refresh
 * - Recuperação e reset de senhas
 * - Controle de permissões e roles
 * - Blacklist de tokens JWT
 */
@Module({
  imports: [
    // Configuração do Passport
    PassportModule.register({ 
      defaultStrategy: 'jwt',
      property: 'user',
      session: false 
    }),

    // Entidades do TypeORM
    TypeOrmModule.forFeature([
      RefreshToken,
      PasswordResetToken,
      JwtBlacklist,
    ]),

    // Configuração assíncrona do JWT
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createJwtConfig,
      global: true, // Disponibiliza o JwtService globalmente
    }),

    // Configuração do Cache com configurações otimizadas
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        isGlobal: true,
        ttl: configService.get<number>('CACHE_TTL', 5 * 60 * 1000), // 5 minutos padrão
        max: configService.get<number>('CACHE_MAX_ITEMS', 1000), // 1000 itens padrão
        store: 'memory', // Explicitamente definido para clareza
      }),
    }),

    // Módulos da aplicação
    ConfigModule,
    forwardRef(() => UsuarioModule),
    forwardRef(() => AuditModule),
    CommonModule,
    AppLoggerModule,
    PermissionModule,
  ],

  controllers: [
    AuthController,
    PasswordResetController,
    JwtBlacklistController,
  ],

  providers: [
    // Estratégias (o NestJS gerencia automaticamente com @Injectable)
    LocalStrategy,
    JwtAuthStrategy,
    JwtRefreshStrategy,

    // Guards
    JwtAuthGuard,
    RolesGuard,
    PermissionGuard,

    // Serviços principais
    AuthService,
    RefreshTokenService,
    PasswordResetService,
    JwtBlacklistService,
    PermissionService,
  ],

  exports: [
    // Serviços essenciais para outros módulos
    AuthService,
    PermissionService,
    JwtBlacklistService,

    // Guards para uso em outros módulos
    JwtAuthGuard,
    RolesGuard,
    PermissionGuard,

    // Estratégias para extensibilidade
    JwtAuthStrategy,
    JwtRefreshStrategy,
    LocalStrategy,

    // Módulo JWT para uso externo
    JwtModule,

    // Passport para configurações avançadas
    PassportModule,
  ],
})
export class AuthModule {
  /**
   * Configuração opcional para desenvolvimento
   * Remove logs sensíveis em produção
   */
  constructor(private readonly configService: ConfigService) {
    const isDevelopment = this.configService.get('NODE_ENV') !== 'production';
    
    if (isDevelopment) {
      console.log('AuthModule initialized');
      console.log('Available guards: JWT, Roles, Permission');
      console.log('Available strategies: Local, JWT, Refresh');
    }
  }
}