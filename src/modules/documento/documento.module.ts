import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentoController } from './controllers/documento.controller';
import { DocumentoService } from './services/documento.service';
import { Documento } from './entities/documento.entity';
import { DocumentoEnviado } from './entities/documento-enviado.entity';
import { SolicitacaoModule } from '../solicitacao/solicitacao.module';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Módulo de Documentos
 * 
 * Responsável por gerenciar os documentos anexados às solicitações de benefícios,
 * incluindo upload, verificação e remoção.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Documento,
      DocumentoEnviado
    ]),
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          // A pasta de destino será definida dinamicamente no serviço
          cb(null, path.join(process.cwd(), 'uploads', 'temp'));
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
        const allowedMimes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/jpg',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Tipo de arquivo não permitido'), false);
        }
      },
    }),
    SolicitacaoModule,
  ],
  controllers: [DocumentoController],
  providers: [DocumentoService],
  exports: [DocumentoService],
})
export class DocumentoModule {}
