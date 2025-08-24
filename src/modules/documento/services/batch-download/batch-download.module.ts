import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchJobManagerService } from './batch-job-manager.service';
import { ZipGeneratorService } from './zip-generator.service';
import { DocumentoBatchJob } from '../../../../entities/documento-batch-job.entity';
import { Documento } from '../../../../entities/documento.entity';
import { StorageProviderFactory } from '../../factories/storage-provider.factory';
import { LocalStorageAdapter } from '../../adapters/local-storage.adapter';
import { S3StorageAdapter } from '../../adapters/s3-storage.adapter';
import { SharedModule } from '../../../../shared/shared.module';

/**
 * Módulo responsável pelos serviços de download em lote
 * Implementa streaming otimizado, rate limiting e gestão de jobs
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentoBatchJob, Documento]),
    SharedModule, // Para MinioService e ConfigService
  ],
  providers: [
    BatchJobManagerService,
    ZipGeneratorService,
    StorageProviderFactory,
    LocalStorageAdapter,
    S3StorageAdapter,
  ],
  exports: [BatchJobManagerService, ZipGeneratorService],
})
export class BatchDownloadModule {}
