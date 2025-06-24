import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentoController } from './controllers/documento.controller';
import { DocumentoService } from './services/documento.service';
import { LoggingService } from '../../shared/logging/logging.service';
import { StorageProviderFactory } from './factories/storage-provider.factory';
import { LocalStorageAdapter } from './adapters/local-storage.adapter';
import { S3StorageAdapter } from './adapters/s3-storage.adapter';
import { MimeValidationService } from './services/mime-validation.service';
import { InputSanitizerValidator } from './validators/input-sanitizer.validator';
import { TODOS_MIME_TYPES_PERMITIDOS } from './config/documento.config';
import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Documento } from '../../entities';
import { AuthModule } from '../../auth/auth.module';
import { LoggingModule } from '../../shared/logging/logging.module';
import { SharedModule } from '../../shared/shared.module';
import { StorageHealthService } from './services/storage-health.service';

/**
 * Módulo de Documentos
 *
 * Responsável por gerenciar os documentos anexados às solicitações de benefícios,
 * incluindo upload, verificação e remoção.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Documento]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        storage: memoryStorage(),
        fileFilter: (req, file, cb) => {
          const allowedMimes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ];

          if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error('Tipo de arquivo não permitido'), false);
          }
        },
        limits: {
          fileSize:
            configService.get<number>('MAX_FILE_SIZE') || 10 * 1024 * 1024, // 10MB
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    AuthModule,
    LoggingModule,
    SharedModule,
  ],
  controllers: [DocumentoController],
  providers: [
    DocumentoService,
    MimeValidationService,
    StorageProviderFactory,
    LocalStorageAdapter,
    StorageHealthService,
    {
      provide: S3StorageAdapter,
      useFactory: (configService: ConfigService, loggingService: LoggingService) => {
        // Verifica se está usando S3
        const useS3 = configService.get('USE_S3') === 'true';
        if (!useS3) {
          // Retorna null se não estiver usando S3
          return null;
        }
        return new S3StorageAdapter(configService, loggingService);
      },
      inject: [ConfigService, LoggingService],
    },
    InputSanitizerValidator,
  ],
  exports: [
    TypeOrmModule,
    DocumentoService,
    StorageProviderFactory,
    StorageHealthService,
  ],
})
export class DocumentoModule {}
