# Checklist de Implementação para o Módulo de Documento

## 1. Validação Robusta de Tipos MIME

- [ ] Definir lista de tipos MIME permitidos:
  ```typescript
  // src/modules/documento/constants/mime-types.constant.ts
  export const MIME_TYPES_PERMITIDOS = {
    DOCUMENTOS: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    IMAGENS: [
      'image/jpeg',
      'image/png',
      'image/gif'
    ],
    PLANILHAS: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  };
  ```

- [ ] Implementar validador personalizado:
  ```typescript
  // src/modules/documento/validators/mime-type.validator.ts
  import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
  import { MIME_TYPES_PERMITIDOS } from '../constants/mime-types.constant';
  import * as fileType from 'file-type';

  @ValidatorConstraint({ name: 'mimeTypeValidator', async: true })
  export class MimeTypeValidator implements ValidatorConstraintInterface {
    async validate(file: Express.Multer.File) {
      if (!file) return false;
      
      // Verificar extensão e MIME type declarado
      const mimeTypesPermitidos = Object.values(MIME_TYPES_PERMITIDOS).flat();
      if (!mimeTypesPermitidos.includes(file.mimetype)) return false;
      
      // Verificar conteúdo real do arquivo
      const buffer = file.buffer.slice(0, 4100);
      const fileInfo = await fileType.fromBuffer(buffer);
      
      return fileInfo && mimeTypesPermitidos.includes(fileInfo.mime);
    }
    
    defaultMessage() {
      return 'Tipo de arquivo não permitido';
    }
  }
  ```

## 2. Verificação de Malware

- [ ] Instalar dependências:
  ```bash
  npm install clamscan
  ```

- [ ] Implementar serviço de verificação:
  ```typescript
  // src/modules/documento/services/malware-scan.service.ts
  import { Injectable, Logger } from '@nestjs/common';
  import * as NodeClam from 'clamscan';

  @Injectable()
  export class MalwareScanService {
    private readonly logger = new Logger(MalwareScanService.name);
    private scanner: any;
    
    constructor() {
      this.initScanner();
    }
    
    private async initScanner() {
      try {
        this.scanner = await new NodeClam().init({
          clamdscan: {
            socket: '/var/run/clamav/clamd.ctl',
            host: '127.0.0.1',
            port: 3310
          }
        });
      } catch (error) {
        this.logger.error(`Erro ao inicializar scanner: ${error.message}`);
      }
    }
    
    async scanBuffer(buffer: Buffer, filename: string): Promise<{ isInfected: boolean; viruses: string[] }> {
      if (!this.scanner) {
        await this.initScanner();
      }
      
      try {
        const result = await this.scanner.scanBuffer(buffer);
        return {
          isInfected: result.isInfected,
          viruses: result.viruses || []
        };
      } catch (error) {
        this.logger.error(`Erro ao verificar arquivo: ${error.message}`);
        throw new Error('Erro ao verificar arquivo');
      }
    }
  }
  ```

## 3. Relacionamento com User

- [ ] Atualizar entidade Documento:
  ```typescript
  // src/modules/documento/entities/documento.entity.ts
  @Column()
  @IsNotEmpty({ message: 'Usuário é obrigatório' })
  usuario_id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;
  ```

- [ ] Atualizar DTO:
  ```typescript
  // src/modules/documento/dto/create-documento.dto.ts
  @IsNotEmpty({ message: 'Usuário é obrigatório' })
  @IsUUID(4, { message: 'ID de usuário inválido' })
  usuario_id: string;
  ```

## 4. Validação de Esquema para Metadados

- [ ] Definir interfaces para metadados:
  ```typescript
  // src/modules/documento/interfaces/metadados.interface.ts
  export interface MetadadosDocumento {
    titulo?: string;
    descricao?: string;
    autor?: string;
    data_documento?: string;
    tags?: string[];
    criptografado?: boolean;
    iv?: string;
    authTag?: string;
  }
  ```

- [ ] Implementar validador:
  ```typescript
  // src/modules/documento/validators/metadados.validator.ts
  import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
  import * as Joi from 'joi';

  @ValidatorConstraint({ name: 'metadadosValidator', async: true })
  export class MetadadosValidator implements ValidatorConstraintInterface {
    private schema = Joi.object({
      titulo: Joi.string().max(255),
      descricao: Joi.string().max(1000),
      autor: Joi.string().max(255),
      data_documento: Joi.date().iso(),
      tags: Joi.array().items(Joi.string().max(50)),
      criptografado: Joi.boolean(),
      iv: Joi.string().when('criptografado', {
        is: true,
        then: Joi.required()
      }),
      authTag: Joi.string().when('criptografado', {
        is: true,
        then: Joi.required()
      })
    });
    
    validate(metadados: any) {
      const { error } = this.schema.validate(metadados);
      return !error;
    }
    
    defaultMessage() {
      return 'Metadados inválidos';
    }
  }
  ```

## 5. Criptografia

- [ ] Implementar serviço de criptografia:
  ```typescript
  // src/modules/documento/services/criptografia.service.ts
  import { Injectable } from '@nestjs/common';
  import * as crypto from 'crypto';
  import { ConfigService } from '@nestjs/config';

  @Injectable()
  export class CriptografiaService {
    private readonly algorithm = 'aes-256-gcm';
    private readonly key: Buffer;
    
    constructor(private configService: ConfigService) {
      const keyString = this.configService.get<string>('ENCRYPTION_KEY');
      this.key = Buffer.from(keyString, 'hex');
    }
    
    async criptografar(buffer: Buffer): Promise<{ 
      buffer: Buffer; 
      iv: string; 
      authTag: string; 
    }> {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(buffer),
        cipher.final()
      ]);
      
      const authTag = cipher.getAuthTag();
      
      return {
        buffer: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    }
    
    async descriptografar(
      encryptedBuffer: Buffer, 
      iv: string, 
      authTag: string
    ): Promise<Buffer> {
      const decipher = crypto.createDecipheriv(
        this.algorithm, 
        this.key, 
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      return Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final()
      ]);
    }
  }
  ```

## 6. Integração com Armazenamento em Nuvem

- [ ] Criar interface para provedores:
  ```typescript
  // src/modules/documento/interfaces/storage-provider.interface.ts
  export interface StorageProvider {
    upload(buffer: Buffer, key: string, mimetype: string): Promise<string>;
    download(key: string): Promise<Buffer>;
    delete(key: string): Promise<void>;
    getUrl(key: string): string;
  }
  ```

- [ ] Implementar adaptador para S3:
  ```typescript
  // src/modules/documento/adapters/s3-storage.adapter.ts
  import { Injectable } from '@nestjs/common';
  import { ConfigService } from '@nestjs/config';
  import { S3 } from 'aws-sdk';
  import { StorageProvider } from '../interfaces/storage-provider.interface';

  @Injectable()
  export class S3StorageAdapter implements StorageProvider {
    private s3: S3;
    private bucket: string;
    
    constructor(private configService: ConfigService) {
      this.s3 = new S3({
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
        region: this.configService.get<string>('AWS_REGION')
      });
      
      this.bucket = this.configService.get<string>('AWS_S3_BUCKET');
    }
    
    async upload(buffer: Buffer, key: string, mimetype: string): Promise<string> {
      await this.s3.upload({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype
      }).promise();
      
      return key;
    }
    
    async download(key: string): Promise<Buffer> {
      const result = await this.s3.getObject({
        Bucket: this.bucket,
        Key: key
      }).promise();
      
      return result.Body as Buffer;
    }
    
    async delete(key: string): Promise<void> {
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: key
      }).promise();
    }
    
    getUrl(key: string): string {
      return `https://${this.bucket}.s3.amazonaws.com/${key}`;
    }
  }
  ```

## 7. Geração de Miniaturas

- [ ] Instalar dependências:
  ```bash
  npm install sharp
  ```

- [ ] Implementar serviço:
  ```typescript
  // src/modules/documento/services/thumbnail.service.ts
  import { Injectable } from '@nestjs/common';
  import * as sharp from 'sharp';

  @Injectable()
  export class ThumbnailService {
    async generateThumbnail(buffer: Buffer, format: 'jpeg' | 'png' = 'jpeg'): Promise<Buffer> {
      return sharp(buffer)
        .resize(200, 200, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toFormat(format)
        .toBuffer();
    }
    
    canGenerateThumbnail(mimetype: string): boolean {
      return mimetype.startsWith('image/');
    }
  }
  ```

## 8. Adição de Índices

- [ ] Atualizar entidade com índices:
  ```typescript
  // src/modules/documento/entities/documento.entity.ts
  @Entity('documento')
  @Index('idx_documento_solicitacao', ['solicitacao_id'])
  @Index('idx_documento_cidadao', ['cidadao_id'])
  @Index('idx_documento_usuario', ['usuario_id'])
  @Index('idx_documento_tipo', ['tipo_documento'])
  export class Documento {
    // Propriedades existentes...
  }
  ```

- [ ] Criar migration:
  ```typescript
  // src/migrations/1621234567890-AddDocumentoIndices.ts
  import { MigrationInterface, QueryRunner } from 'typeorm';

  export class AddDocumentoIndices1621234567890 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_documento_solicitacao ON documento (solicitacao_id);
        CREATE INDEX IF NOT EXISTS idx_documento_cidadao ON documento (cidadao_id);
        CREATE INDEX IF NOT EXISTS idx_documento_usuario ON documento (usuario_id);
        CREATE INDEX IF NOT EXISTS idx_documento_tipo ON documento (tipo_documento);
      `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        DROP INDEX IF EXISTS idx_documento_solicitacao;
        DROP INDEX IF EXISTS idx_documento_cidadao;
        DROP INDEX IF EXISTS idx_documento_usuario;
        DROP INDEX IF EXISTS idx_documento_tipo;
      `);
    }
  }
  ```

## 9. Documentação Swagger

- [ ] Adicionar decoradores Swagger:
  ```typescript
  // src/modules/documento/controllers/documento.controller.ts
  @ApiTags('Documentos')
  @Controller('documentos')
  export class DocumentoController {
    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Fazer upload de documento' })
    @ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
          },
          solicitacao_id: {
            type: 'string',
            format: 'uuid',
          },
          tipo_documento: {
            type: 'string',
          },
          metadados: {
            type: 'object',
          },
        },
      },
    })
    @ApiResponse({ status: 201, description: 'Documento enviado com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async upload(
      @UploadedFile() file: Express.Multer.File,
      @Body() createDocumentoDto: CreateDocumentoDto,
      @Request() req
    ) {
      // Implementação...
    }
    
    // Outros endpoints...
  }
  ```
