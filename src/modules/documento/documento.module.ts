import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { AuthModule } from '@/auth/auth.module'
import { DocumentoController } from './controllers/documento.controller';
import { DocumentoService } from './services/documento.service';
import { MalwareScanService } from './services/malware-scan.service';
import { ThumbnailService } from './services/thumbnail.service';
import { Documento } from './entities/documento.entity';
import { DocumentoEnviado } from './entities/documento-enviado.entity';
import { SolicitacaoModule } from '../solicitacao/solicitacao.module';
import { SharedModule } from '../../shared/shared.module';
import { S3StorageAdapter } from './adapters/s3-storage.adapter';
import { LocalStorageAdapter } from './adapters/local-storage.adapter';
import { StorageProviderFactory } from './factories/storage-provider.factory';
import { MimeTypeValidator } from './validators/mime-type.validator';
import { MetadadosValidator } from './validators/metadados.validator';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

/**
 * Módulo de Documentos
 *
 * Responsável por gerenciar os documentos anexados às solicitações de benefícios,
 * incluindo upload, verificação e remoção.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Documento, DocumentoEnviado]),
    SharedModule,
    SolicitacaoModule,
    ConfigModule,
    AuthModule,
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          // A pasta de destino será definida dinamicamente no serviço
          const tempDir = path.join(process.cwd(), 'uploads', 'temp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          cb(null, tempDir);
        },
        filename: (req, file, cb) => {
          // Gerar nome único para o arquivo
          const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
          const fileExtension = path.extname(file.originalname);
          cb(null, `${uniqueSuffix}${fileExtension}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        // Verificar tipos de arquivo permitidos
        // Agora usamos a constante TODOS_MIME_TYPES_PERMITIDOS do arquivo constants/mime-types.constant.ts
        // Mas mantemos a verificação básica aqui para compatibilidade
        const allowedMimes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/bmp',
          'image/tiff',
          'image/webp',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv',
          'application/vnd.oasis.opendocument.spreadsheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'text/markdown',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error(`Tipo de arquivo não permitido: ${file.mimetype}`),
            false,
          );
        }
      },
    }),
  ],
  controllers: [DocumentoController],
  providers: [
    DocumentoService,
    MalwareScanService,
    ThumbnailService,
    S3StorageAdapter,
    LocalStorageAdapter,
    StorageProviderFactory,
    MimeTypeValidator,
    MetadadosValidator,
    {
      provide: 'STORAGE_PROVIDER',
      useFactory: (factory: StorageProviderFactory) => {
        return factory.createProvider();
      },
      inject: [StorageProviderFactory],
    },
  ],
  exports: [
    DocumentoService,
    MalwareScanService,
    ThumbnailService,
    S3StorageAdapter,
    LocalStorageAdapter,
    StorageProviderFactory,
    MimeTypeValidator,
    MetadadosValidator,
  ],
})
export class DocumentoModule {}
