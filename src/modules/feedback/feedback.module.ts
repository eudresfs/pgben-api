import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

// Módulo compartilhado que exporta MinioService
import { SharedModule } from '../../shared/shared.module';
import { AuthModule } from '../../auth/auth.module';

// Entities
import { Feedback, FeedbackAnexo, Tag } from './entities';

// Controllers
import { FeedbackController, TagController } from './controllers';

// Services
import { FeedbackService, FileUploadService, TagService } from './services';

// Repositories
import { FeedbackRepository, TagRepository } from './repositories';

// Interceptors
import {
  FileUploadInterceptor,
  FeedbackFileUploadInterceptor,
  ImageUploadInterceptor,
  DocumentUploadInterceptor
} from './interceptors';

// Validators
import { FileUploadValidator, defaultFileValidator } from './validators';

@Module({
  imports: [
    // Importar SharedModule para ter acesso ao MinioService
    SharedModule,
    
    // Configuração do TypeORM para as entidades do módulo
    TypeOrmModule.forFeature([
      Feedback,
      FeedbackAnexo,
      Tag
    ]),
    
    // Importar AuthModule
    // AuthModule,

    // Configuração do Multer para upload de arquivos
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Diretório para armazenar uploads temporários
        const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
        
        // Criar diretório se não existir
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        return {
          storage: multer.memoryStorage(), // Usar memória para processamento
          limits: {
            fileSize: 10 * 1024 * 1024, // 10MB por arquivo
            files: 5, // Máximo 5 arquivos
            fieldSize: 1024 * 1024, // 1MB para campos de texto
            fieldNameSize: 100, // Tamanho máximo do nome do campo
            fields: 20 // Máximo 20 campos
          },
          fileFilter: (req, file, cb) => {
            // Validar tipo de arquivo
            const allowedMimeTypes = [
              'image/jpeg', 'image/png', 'image/gif', 'image/webp',
              'application/pdf', 'text/plain',
              'video/mp4', 'video/webm'
            ];
            
            if (allowedMimeTypes.includes(file.mimetype)) {
              cb(null, true);
            } else {
              cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`), false);
            }
          }
        };
      },
      inject: [ConfigService]
    }),

    // Importar ConfigModule se necessário
    ConfigModule
  ],

  controllers: [
    FeedbackController,
    TagController
  ],

  providers: [
    // Services
    FeedbackService,
    FileUploadService,
    TagService,

    // Repositories customizados
    FeedbackRepository,
    TagRepository,

    // Interceptors
    FileUploadInterceptor,
    FeedbackFileUploadInterceptor,
    ImageUploadInterceptor,
    DocumentUploadInterceptor,

    // Validators
    FileUploadValidator,
    {
      provide: 'DEFAULT_FILE_VALIDATOR',
      useValue: defaultFileValidator
    },

    // Configurações específicas
    {
      provide: 'UPLOAD_CONFIG',
      useFactory: (configService: ConfigService) => ({
        uploadDir: configService.get('UPLOAD_DIR', path.join(process.cwd(), 'uploads')),
        maxFileSize: configService.get('MAX_FILE_SIZE', 10 * 1024 * 1024),
        maxFiles: configService.get('MAX_FILES', 5),
        allowedMimeTypes: configService.get('ALLOWED_MIME_TYPES', [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf', 'text/plain',
          'video/mp4', 'video/webm'
        ])
      }),
      inject: [ConfigService]
    }
  ],

  exports: [
    // Exportar services para uso em outros módulos
    FeedbackService,
    FileUploadService,
    TagService,

    // Exportar repositories para uso em outros módulos
    FeedbackRepository,
    TagRepository,

    // Exportar interceptors para uso em outros módulos
    FileUploadInterceptor,
    FeedbackFileUploadInterceptor,
    ImageUploadInterceptor,
    DocumentUploadInterceptor,

    // Exportar validators
    FileUploadValidator,
    'DEFAULT_FILE_VALIDATOR',

    // Exportar TypeORM repositories
    TypeOrmModule
  ]
})
export class FeedbackModule {
  constructor() {
    // Criar diretórios necessários na inicialização
    this.createRequiredDirectories();
  }

  /**
   * Criar diretórios necessários para o funcionamento do módulo
   */
  private createRequiredDirectories(): void {
    const directories = [
      path.join(process.cwd(), 'uploads'),
      path.join(process.cwd(), 'uploads', 'temp'),
      path.join(process.cwd(), 'uploads', 'feedback'),
      path.join(process.cwd(), 'uploads', 'feedback', 'anexos'),
      path.join(process.cwd(), 'uploads', 'feedback', 'anexos', 'images'),
      path.join(process.cwd(), 'uploads', 'feedback', 'anexos', 'documents'),
      path.join(process.cwd(), 'uploads', 'feedback', 'anexos', 'videos'),
      path.join(process.cwd(), 'uploads', 'feedback', 'anexos', 'others')
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`📁 Diretório criado: ${dir}`);
        } catch (error) {
          console.error(`❌ Erro ao criar diretório ${dir}:`, error);
        }
      }
    });
  }

  /**
   * Método estático para configuração do módulo com opções customizadas
   */
  static forRoot(options?: {
    uploadDir?: string;
    maxFileSize?: number;
    maxFiles?: number;
    allowedMimeTypes?: string[];
  }) {
    return {
      module: FeedbackModule,
      providers: [
        {
          provide: 'FEEDBACK_MODULE_OPTIONS',
          useValue: options || {}
        }
      ]
    };
  }

  /**
   * Método estático para configuração assíncrona
   */
  static forRootAsync(options: {
    imports?: any[];
    useFactory?: (...args: any[]) => any;
    inject?: any[];
  }) {
    return {
      module: FeedbackModule,
      imports: options.imports || [],
      providers: [
        {
          provide: 'FEEDBACK_MODULE_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || []
        }
      ]
    };
   }
}