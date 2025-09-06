import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { DocumentoController } from './controllers/documento.controller';
import { DocumentoOrganizacionalController } from './controllers/documento-organizacional.controller';
import { DocumentoBatchController } from './controllers/documento-batch.controller';
import { DocumentoPdfController } from './controllers/documento-pdf.controller';
import { DocumentoService } from './services/documento.service';
import { DocumentoPdfService } from './services/documento-pdf.service';
import { DocumentoBatchService } from './services/batch-download/documento-batch.service';
import { DocumentoBatchSchedulerService } from './services/batch-download/documento-batch-scheduler.service';
import { DocumentoUrlService } from './services/documento-url.service';
import { LoggingService } from '../../shared/logging/logging.service';
import { StorageProviderFactory } from './factories/storage-provider.factory';
import { LocalStorageAdapter } from './adapters/local-storage.adapter';
import { S3StorageAdapter } from './adapters/s3-storage.adapter';
import { MimeValidationService } from './services/mime-validation.service';
import { DocumentoAuditService } from './services/documento-audit.service';
import { InputSanitizerValidator } from './validators/input-sanitizer.validator';
import { memoryStorage } from 'multer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Documento, DocumentoBatchJob, Solicitacao, Usuario } from '../../entities';
import { AuthModule } from '../../auth/auth.module';
import { LoggingModule } from '../../shared/logging/logging.module';
import { SharedModule } from '../../shared/shared.module';
import { StorageHealthService } from './services/storage-health.service';
import { AuditoriaSharedModule } from '../../shared/auditoria/auditoria-shared.module';

// Novos componentes de segurança
import { InputValidationInterceptor } from './interceptors/input-validation.interceptor';
import { UrlSanitizerInterceptor } from './interceptors/url-sanitizer.interceptor';
import { DocumentoRateLimitMiddleware } from './middleware/documento-rate-limit.middleware';
import { DocumentoPathService } from './services/documento-path.service';
import { CacheModule } from '../../shared/cache/cache.module';

// Novos serviços especializados de upload
import {
  DocumentoUploadValidationService,
  DocumentoFileProcessingService,
  DocumentoReuseService,
  DocumentoStorageService,
  DocumentoMetadataService,
  DocumentoPersistenceService,
} from './services/upload';

// Serviços de thumbnail
import { ThumbnailService } from './services/thumbnail/thumbnail.service';
import { ThumbnailQueueService } from './services/thumbnail/thumbnail-queue.service';
import { ThumbnailFacadeService } from './services/thumbnail/thumbnail-facade.service';

// Serviços de conversão de documentos Office
import { OfficeConverterService } from './services/office-converter/office-converter.service';

// Serviços de download em lote
import { BatchJobManagerService } from './services/batch-download/batch-job-manager.service';
import { ZipGeneratorService } from './services/batch-download/zip-generator.service';
import { DocumentFilterService } from './services/batch-download/document-filter.service';

/**
 * Módulo de Documentos
 *
 * Responsável por gerenciar os documentos anexados às solicitações de benefícios,
 * incluindo upload, verificação e remoção.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Documento, DocumentoBatchJob, Solicitacao, Usuario]),
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
          fileSize: configService.get<number>(
            'UPLOAD_MAX_FILE_SIZE',
            5 * 1024 * 1024,
          ), // 5MB default
          files: 1,
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    AuthModule,
    LoggingModule,
    SharedModule,
    AuditoriaSharedModule,
    CacheModule,
    // BatchDownloadModule removido para evitar dependência circular
  ],
  controllers: [
    DocumentoController,
    DocumentoOrganizacionalController,
    DocumentoBatchController,
    DocumentoPdfController,
  ],
  providers: [
    DocumentoService,
    DocumentoPdfService,
    DocumentoBatchService,
    DocumentoBatchSchedulerService,
    DocumentoUrlService,
    LoggingService,
    StorageProviderFactory,
    LocalStorageAdapter,
    S3StorageAdapter,
    MimeValidationService,
    DocumentoAuditService,
    DocumentoPathService,
    InputSanitizerValidator,
    StorageHealthService,

    // Novos serviços especializados de upload
    DocumentoUploadValidationService,
    DocumentoFileProcessingService,
    DocumentoReuseService,
    DocumentoStorageService,
    DocumentoMetadataService,
    DocumentoPersistenceService,

    // Serviços de conversão de documentos Office
    OfficeConverterService,

    // Serviços de thumbnail
    {
      provide: ThumbnailService,
      useFactory: (
        storageProviderFactory: StorageProviderFactory,
        officeConverterService: OfficeConverterService,
      ) => {
        return new ThumbnailService(
          storageProviderFactory,
          officeConverterService,
        );
      },
      inject: [StorageProviderFactory, OfficeConverterService],
    },
    ThumbnailQueueService,
    ThumbnailFacadeService,

    // Serviços de download em lote
    BatchJobManagerService,
    ZipGeneratorService,
    DocumentFilterService,

    // Interceptors de segurança
    {
      provide: APP_INTERCEPTOR,
      useClass: InputValidationInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: UrlSanitizerInterceptor,
    },

    // Middleware será registrado via configure()
    DocumentoRateLimitMiddleware,
  ],
  exports: [
    DocumentoService,
    DocumentoPdfService,
    DocumentoBatchService,
    DocumentoUrlService,
    StorageProviderFactory,
    MimeValidationService,
    DocumentoPathService,
    StorageHealthService,
    OfficeConverterService,
    ThumbnailService,
    ThumbnailQueueService,
    ThumbnailFacadeService,
    BatchJobManagerService,
    ZipGeneratorService,
    DocumentFilterService,
  ],
})
export class DocumentoModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Aplicar rate limiting apenas nas rotas de documentos
    consumer.apply(DocumentoRateLimitMiddleware).forRoutes('documento');
  }
}
