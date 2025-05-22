// src/auth/auth.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PermissionModule } from './permission.module'; // Restaurado após correção

import { AuthController } from './controllers/auth.controller';
import { PermissionManagementController } from './controllers/permission-management.controller';
import { AuthService } from './services/auth.service';
import { AuthorizationService } from './services/authorization.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtAuthStrategy } from './strategies/jwt-auth.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsuarioModule } from '../modules/usuario/usuario.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AppLoggerModule } from '../shared/logger/logger.module';
import { AuditoriaModule } from '../modules/auditoria/auditoria.module';

@Module({
  imports: [
    // Importa o módulo compartilhado de autenticação
    PermissionModule, // Restaurado após correção
    
    // Configuração do TypeORM para entidades específicas do AuthModule
    TypeOrmModule.forFeature([RefreshToken]),
    
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_TOKEN_EXPIRES_IN'),
        },
      }),
    }),
    
    // ← SOLUÇÃO: forwardRef nos dois módulos que se referenciam
    forwardRef(() => UsuarioModule),
    AppLoggerModule,
    forwardRef(() => AuditoriaModule),
  ],
  controllers: [
    AuthController,
    PermissionManagementController,
  ],
  providers: [
    AuthService,
    RefreshTokenService,
    AuthorizationService,
    JwtAuthStrategy,
    JwtRefreshStrategy,
    LocalStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    PermissionModule, // Restaurado após correção
  ],
})
export class AuthModule {}