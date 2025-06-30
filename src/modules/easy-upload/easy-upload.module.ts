import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entidades
import { UploadToken } from './entities/upload-token.entity';
import { UploadSession } from './entities/upload-session.entity';

// Controladores
import { EasyUploadController } from './controllers/easy-upload.controller';

// Serviços
import { EasyUploadService } from './services/easy-upload.service';
import { UploadTokenService } from './services/upload-token.service';
import { UploadSessionService } from './services/upload-session.service';
import { QrCodeService } from './services/qr-code.service';

// Módulos externos necessários
import { DocumentoModule } from '../documento/documento.module';
import { AuthModule } from '../../auth/auth.module';

import { NotificacaoModule } from '../notificacao/notificacao.module';
import { SharedModule } from '../../shared/shared.module';

/**
 * Módulo responsável pela funcionalidade EasyUpload
 * Permite upload de documentos via QR Code de forma simplificada
 * 
 * Funcionalidades principais:
 * - Geração de tokens de upload com QR Code
 * - Validação de tokens
 * - Upload de arquivos via token
 * - Monitoramento de sessões de upload
 * - Notificações em tempo real via SSE
 */
@Module({
  imports: [
    // Entidades TypeORM
    TypeOrmModule.forFeature([
      UploadToken,
      UploadSession,
    ]),
    
    // Módulos necessários
    DocumentoModule,
    forwardRef(() => AuthModule),

    NotificacaoModule,
    SharedModule,
  ],
  controllers: [
    EasyUploadController,
  ],
  providers: [
    EasyUploadService,
    UploadTokenService,
    UploadSessionService,
    QrCodeService,
  ],
  exports: [
    EasyUploadService,
    UploadTokenService,
    UploadSessionService,
    QrCodeService,
  ],
})
export class EasyUploadModule {}