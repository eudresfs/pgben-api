// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtAuthStrategy } from './strategies/jwt-auth.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsuarioModule } from '../modules/usuario/usuario.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AppLoggerModule } from '../shared/logger/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Decodificar as chaves do formato base64
        const privateKeyBase64 = configService.get<string>('JWT_PRIVATE_KEY_BASE64');
        const publicKeyBase64 = configService.get<string>('JWT_PUBLIC_KEY_BASE64');
        
        // Verificar se as chaves existem
        if (!privateKeyBase64 || !publicKeyBase64) {
          throw new Error('Chaves JWT não configuradas corretamente. Verifique as variáveis JWT_PRIVATE_KEY_BASE64 e JWT_PUBLIC_KEY_BASE64');
        }
        
        try {
          // Converter de base64 para o formato de texto PEM
          const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf8');
          const publicKey = Buffer.from(publicKeyBase64, 'base64').toString('utf8');
          
          console.log('Chave pública carregada (início):', publicKey.substring(0, 50) + '...');
          
          // Verificar se as chaves parecem estar no formato PEM correto
          if (!privateKey.includes('-----BEGIN') || !publicKey.includes('-----BEGIN')) {
            console.warn('Chaves JWT não estão no formato PEM esperado. Tentando continuar mesmo assim...');
          }
          
          return {
            privateKey: privateKey.trim(),
            publicKey: publicKey.trim(),
            signOptions: {
              expiresIn: configService.get('JWT_ACCESS_TOKEN_EXPIRES_IN', '1h'),
              algorithm: 'RS256' as const, 
            },
          };
        } catch (error) {
          console.error('Erro ao configurar as chaves JWT:', error);
          throw new Error(`Falha ao configurar JWT: ${error.message}`);
        }
      },
    }),
    UsuarioModule,
    AppLoggerModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshTokenService,
    JwtAuthStrategy,
    JwtRefreshStrategy,
    LocalStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}