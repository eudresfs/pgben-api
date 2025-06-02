import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { 
  Integrador, 
  IntegradorToken, 
  TokenRevogado 
} from '../../entities';

import { IntegradorService } from './services/integrador.service';
import { IntegradorTokenService } from './services/integrador-token.service';
import { IntegradorAuthService } from './services/integrador-auth.service';

import { IntegradorController } from './controllers/integrador.controller';
import { ApiExemploController } from './controllers/api-exemplo.controller';

import { IntegradorAuthGuard } from './guards/integrador-auth.guard';

/**
 * Módulo principal para gerenciamento de integradores.
 * Configura todas as entidades, serviços e controllers necessários.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Integrador, 
      IntegradorToken, 
      TokenRevogado
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const privateKeyBase64 = configService.get<string>('JWT_PRIVATE_KEY_BASE64');
        const privateKey = Buffer.from(privateKeyBase64 || '', 'base64').toString('utf8');
        
        return {
          privateKey,
          publicKey: Buffer.from(
            configService.get<string>('JWT_PUBLIC_KEY_BASE64', ''),
            'base64'
          ).toString('utf8'),
          signOptions: {
            algorithm: 'RS256'
          },
        };
      },
    })
  ],
  controllers: [
    IntegradorController,
    ApiExemploController
  ],
  providers: [
    IntegradorService,
    IntegradorTokenService,
    IntegradorAuthService,
    IntegradorAuthGuard
  ],
  exports: [
    IntegradorService,
    IntegradorTokenService,
    IntegradorAuthService,
    IntegradorAuthGuard
  ],
})
export class IntegradorModule {}
