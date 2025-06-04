import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentoController } from './controllers/documento.controller';
import { DocumentoService } from './services/documento.service';
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
import { UnifiedLoggerModule } from '../../shared/logging/unified-logger.module';
import { UnifiedLoggerService } from '../../shared/logging/unified-logger.service';
import { SharedModule } from '../../shared/shared.module';

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
    UnifiedLoggerModule,
    SharedModule,
  ],
  controllers: [DocumentoController],
  providers: [
    DocumentoService,
    MimeValidationService,
    StorageProviderFactory,
    LocalStorageAdapter,
    {
      provide: S3StorageAdapter,
      useFactory: (
        configService: ConfigService,
        unifiedLoggerService: UnifiedLoggerService,
      ) => {
        // Verifica se todas as configurações AWS estão presentes
        const bucketName = configService.get<string>('AWS_S3_BUCKET');
        const region = configService.get<string>('AWS_REGION');
        const accessKeyId = configService.get<string>('AWS_ACCESS_KEY_ID');
        const secretAccessKey = configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        );

        if (!bucketName || !region || !accessKeyId || !secretAccessKey) {
          // Retorna null quando AWS não está configurado completamente
          // Isso evita erros de injeção de dependência
          return null;
        }
        return new S3StorageAdapter(configService, unifiedLoggerService);
      },
      inject: [ConfigService, UnifiedLoggerService],
    },
    InputSanitizerValidator,
  ],
  exports: [DocumentoService, StorageProviderFactory],
})
export class DocumentoModule {}
