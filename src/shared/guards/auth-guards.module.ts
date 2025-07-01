/**
 * AuthGuardsModule
 * 
 * Módulo separado para guards de autenticação.
 * Criado para evitar dependência circular entre AuthModule e AuditoriaModule.
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { JwtBlacklist } from '../../entities/jwt-blacklist.entity';

// Services
import { JwtBlacklistService } from '../../auth/services/jwt-blacklist.service';

// Guards
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';

// Strategies
import { JwtAuthStrategy } from '../../auth/strategies/jwt-auth.strategy';

// Config
import { createJwtConfig } from '../../config/jwt.config';

@Module({
  imports: [
    // Passport para estratégias de autenticação
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    // JWT Module
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createJwtConfig,
    }),
    
    // TypeORM para JwtBlacklist
    TypeOrmModule.forFeature([JwtBlacklist]),
  ],
  providers: [
    // Services
    JwtBlacklistService,
    
    // Guards
    JwtAuthGuard,
    RolesGuard,
    PermissionGuard,
    
    // Strategies
    JwtAuthStrategy,
  ],
  exports: [
    // Guards para uso em outros módulos
    JwtAuthGuard,
    RolesGuard,
    PermissionGuard,
    
    // Services
    JwtBlacklistService,
    
    // Strategies
    JwtAuthStrategy,
    
    // Modules
    JwtModule,
    PassportModule,
  ],
})
export class AuthGuardsModule {}