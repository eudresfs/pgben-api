// src/shared/auth/shared-auth.module.ts
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Guards e Strategies que podem ser usados em qualquer lugar
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { JwtAuthStrategy } from '../../auth/strategies/jwt-auth.strategy';

/**
 * Módulo compartilhado de autenticação
 * 
 * Contém apenas os componentes que podem ser utilizados
 * em qualquer módulo sem criar dependências circulares.
 */
@Global()
@Module({
  imports: [
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
  ],
  providers: [
    JwtAuthStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    JwtModule,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class SharedAuthModule {}