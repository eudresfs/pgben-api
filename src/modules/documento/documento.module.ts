import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentoController } from './controllers/documento.controller';
import { DocumentoService } from './services/documento.service';
import { StorageProviderFactory } from './factories/storage-provider.factory';
import { LocalStorageAdapter } from './adapters/local-storage.adapter';
import { S3StorageAdapter } from './adapters/s3-storage.adapter';
import { MimeTypeValidator } from './validators/mime-type.validator';
import { InputSanitizerValidator } from './validators/input-sanitizer.validator';
import { TODOS_MIME_TYPES_PERMITIDOS } from './config/documento.config';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Documento } from '../../entities';
import { SharedModule } from '../../shared/shared.module';
import { AuthModule } from '../../auth/auth.module';

/**
 * Módulo de Documentos
 *
 * Responsável por gerenciar os documentos anexados às solicitações de benefícios,
 * incluindo upload, verificação e remoção.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Documento]),
    ConfigModule,
    SharedModule,
    AuthModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uploadDir = configService.get<string>(
          'UPLOAD_TEMP_DIR',
          './uploads/temp',
        );

        return {
          storage: diskStorage({
            destination: uploadDir,
            filename: (req, file, callback) => {
              // Gerar nome único para o arquivo
              const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
              const extension = extname(file.originalname);
              const filename = `${uniqueSuffix}${extension}`;
              callback(null, filename);
            },
          }),
          fileFilter: (req, file, callback) => {
            // Verificar se o tipo MIME é permitido
            if (TODOS_MIME_TYPES_PERMITIDOS.includes(file.mimetype)) {
              callback(null, true);
            } else {
              callback(
                new Error(
                  `Tipo de arquivo não permitido: ${file.mimetype}`,
                ),
                false,
              );
            }
          },
          limits: {
            fileSize: 10 * 1024 * 1024, // 10MB
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [DocumentoController],
  providers: [
    DocumentoService,
    StorageProviderFactory,
    LocalStorageAdapter,
    S3StorageAdapter,
    MimeTypeValidator,
    InputSanitizerValidator,
  ],
  exports: [DocumentoService, StorageProviderFactory],
})
export class DocumentoModule {}
