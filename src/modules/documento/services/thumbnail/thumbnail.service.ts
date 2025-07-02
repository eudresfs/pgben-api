import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { LoggingService } from '../../../../shared/logging/logging.service';
import { StorageProviderFactory } from '../../factories/storage-provider.factory';
import * as fs from 'fs';
import * as path from 'path';
import { ThumbnailConfig, DEFAULT_THUMBNAIL_CONFIG, mergeConfig, validateConfig } from './thumbnail.config';

/**
 * Serviço responsável pela geração de thumbnails de documentos
 * Suporta múltiplos formatos: PDF, imagens, documentos Office
 */
@Injectable()
export class ThumbnailService implements OnModuleInit {
  private readonly logger = new Logger(ThumbnailService.name);
  private readonly config: ThumbnailConfig;

  constructor(
    private readonly storageProviderFactory: StorageProviderFactory,
    customConfig?: Partial<ThumbnailConfig>,
  ) {
    // Mesclar configuração personalizada com a padrão
    this.config = mergeConfig(customConfig);
    
    // Validar configuração
    try {
      validateConfig(this.config);
    } catch (error) {
      this.logger.error(`Configuração inválida do ThumbnailService: ${error.message}`);
      throw error;
    }
  }

  /**
   * Inicialização do módulo - verifica dependências
   */
  async onModuleInit() {
    this.logger.log('Inicializando ThumbnailService...');
    
    if (this.config.general.enableDependencyCheck) {
      // Verificar dependências disponíveis
      const dependencies = {
        pdf2pic: this.checkDependency('pdf2pic'),
        sharp: this.checkDependency('sharp'),
        pdfThumbnail: this.checkDependency('pdf-thumbnail')
      };

      if (this.config.general.enableDebugLogs) {
        this.logger.debug(`pdf2pic disponível: ${dependencies.pdf2pic ? 'OK' : 'AUSENTE'}`);
        this.logger.debug(`sharp disponível: ${dependencies.sharp ? 'OK' : 'AUSENTE'}`);
        this.logger.debug(`pdf-thumbnail disponível: ${dependencies.pdfThumbnail ? 'OK' : 'AUSENTE'}`);
      }

      // Avisos críticos
      if (!dependencies.sharp) {
        this.logger.warn('⚠️  Sharp não encontrado - processamento de imagem será limitado');
      }
      
      if (!dependencies.pdf2pic && !dependencies.pdfThumbnail) {
        this.logger.warn('⚠️  Nenhuma biblioteca de PDF encontrada - thumbnails de PDF serão limitados');
      }

      if (this.config.general.enableDebugLogs) {
        this.logger.log(`Thumbnail dependencies status: ${JSON.stringify(dependencies)}`);
      }
    }
    
    this.logger.log('ThumbnailService inicializado com sucesso');
  }

  /**
   * Verifica se uma dependência está disponível
   */
  private checkDependency(packageName: string): boolean {
    try {
      require(packageName);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gera thumbnail baseado no tipo MIME
   * @param buffer Buffer do arquivo original
   * @param mimeType Tipo MIME do arquivo
   * @param documentoId ID do documento
   * @returns Thumbnail gerado ou null se não suportado
   */
  async generateThumbnail(
    buffer: Buffer,
    mimeType: string,
    documentoId: string,
  ): Promise<{ thumbnailBuffer: Buffer; thumbnailPath: string } | null> {
    try {
      let thumbnailBuffer: Buffer;

      switch (mimeType) {
        case 'application/pdf':
          thumbnailBuffer = await this.generatePdfThumbnail(buffer);
          break;
        case 'image/jpeg':
        case 'image/png':
        case 'image/gif':
        case 'image/webp':
          thumbnailBuffer = await this.generateImageThumbnail(buffer);
          break;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          thumbnailBuffer = await this.generateDocumentThumbnail(buffer, 'docx');
          break;
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          thumbnailBuffer = await this.generateDocumentThumbnail(buffer, 'xlsx');
          break;
        case 'application/msword':
          thumbnailBuffer = await this.generateDocumentThumbnail(buffer, 'doc');
          break;
        case 'application/vnd.ms-excel':
          thumbnailBuffer = await this.generateDocumentThumbnail(buffer, 'xls');
          break;
        default:
          this.logger.debug(
            `Tipo MIME não suportado para thumbnail: ${mimeType}`,
            ThumbnailService.name,
          );
          return null;
      }

      // Verificar se o thumbnail gerado não está vazio antes de salvar
      if (!thumbnailBuffer || thumbnailBuffer.length === 0) {
        this.logger.error(
          `Thumbnail gerado está vazio para documento ${documentoId}`,
          ThumbnailService.name,
        );
        throw new Error('Arquivo não pode estar vazio');
      }

      const thumbnailPath = `thumbnails/${documentoId}.jpg`;
      const storageProvider = this.storageProviderFactory.getProvider();
      
      await storageProvider.salvarArquivo(
        thumbnailBuffer,
        thumbnailPath,
        'image/jpeg',
        { 
          type: 'thumbnail', 
          originalDocument: documentoId,
          generatedAt: new Date().toISOString()
        }
      );

      this.logger.log(
        `Thumbnail gerado com sucesso para documento ${documentoId}`,
        ThumbnailService.name,
      );

      return { thumbnailBuffer, thumbnailPath };
      
    } catch (error) {
      this.logger.error(
        `Erro ao gerar thumbnail para documento ${documentoId}: ${error.message}`,
        error.stack,
        ThumbnailService.name,
      );
      return null;
    }
  }

  /**
   * Gera thumbnail para documentos PDF usando pdf2pic
   * @param pdfBuffer Buffer do arquivo PDF
   * @returns Buffer do thumbnail gerado
   */
  private async generatePdfThumbnail(pdfBuffer: Buffer): Promise<Buffer> {
    this.logger.debug(`Iniciando geração de thumbnail PDF - Buffer size: ${pdfBuffer.length} bytes`);
    
    // Validação básica do PDF usando magic bytes
    if (!pdfBuffer || pdfBuffer.length === 0) {
      this.logger.warn('PDF buffer está vazio, usando thumbnail padrão');
      return this.getDefaultThumbnail('pdf');
    }

    // Verificar se é realmente um PDF (magic bytes)
    const pdfMagicBytes = pdfBuffer.slice(0, 4).toString();
    if (!pdfMagicBytes.startsWith('%PDF')) {
      this.logger.warn(`Arquivo não é um PDF válido (magic bytes: ${pdfMagicBytes}), usando thumbnail padrão`);
      return this.getDefaultThumbnail('pdf');
    }

    try {
      const { fromBuffer } = require('pdf2pic');
      
      const options = {
        density: this.config.pdf.density,
        format: this.config.pdf.format,
        width: this.config.pdf.width,
        height: this.config.pdf.height,
        quality: this.config.pdf.quality
      };

      if (this.config.general.enableDebugLogs) {
        this.logger.debug('Configurações pdf2pic:', JSON.stringify(options));
      }
      
      const convert = fromBuffer(pdfBuffer, options);
      const result = await convert(1, { responseType: "buffer" });
      
      if (!result || !result.buffer || result.buffer.length === 0) {
        this.logger.warn('pdf2pic retornou buffer vazio, usando thumbnail padrão');
        return this.getDefaultThumbnail('pdf');
      }
      
      this.logger.debug(`Thumbnail PDF gerado com sucesso usando pdf2pic - Tamanho: ${result.buffer.length} bytes`);
      return result.buffer;
      
    } catch (error) {
      this.logger.error(`Erro ao gerar thumbnail PDF com pdf2pic: ${error.message}`, JSON.stringify({
        bufferSize: pdfBuffer.length,
        errorStack: error.stack
      }));
      
      // Fallback para o método anterior como backup
      this.logger.log('Tentando fallback para método anterior de geração de thumbnail PDF');
      return this.generatePdfThumbnailFallback(pdfBuffer);
    }
  }

  /**
   * Método de fallback para geração de thumbnail PDF usando pdf-thumbnail
   * @param pdfBuffer Buffer do PDF
   * @returns Buffer do thumbnail
   */
  private async generatePdfThumbnailFallback(pdfBuffer: Buffer): Promise<Buffer> {
    // Tentar diferentes configurações de geração de thumbnail
    const configs = [
      { compress: { type: 'JPEG', quality: 80 }, resize: { width: 200, height: 200, fit: 'cover' } },
      { compress: { type: 'JPEG', quality: 60 }, resize: { width: 150, height: 150, fit: 'contain' } },
      { compress: { type: 'JPEG', quality: 40 }, resize: { width: 100, height: 100, fit: 'inside' } }
    ];

    for (let i = 0; i < configs.length; i++) {
      try {
        this.logger.debug(`Tentativa ${i + 1} de geração de thumbnail PDF fallback com config:`, JSON.stringify(configs[i]));
        
        const thumbnailBuffer = await this.generatePdfThumbnailWithConfig(pdfBuffer, configs[i]);
        
        if (thumbnailBuffer && thumbnailBuffer.length > 0) {
          this.logger.debug(`Thumbnail PDF fallback gerado com sucesso na tentativa ${i + 1}, tamanho: ${thumbnailBuffer.length} bytes`);
          return thumbnailBuffer;
        } else {
          this.logger.warn(`Tentativa ${i + 1} de fallback resultou em thumbnail vazio`);
        }
      } catch (error) {
        this.logger.warn(`Tentativa ${i + 1} de geração de thumbnail PDF fallback falhou: ${error.message}`);
        if (i === configs.length - 1) {
          this.logger.error('Todas as tentativas de geração de thumbnail PDF fallback falharam');
        }
      }
    }

    this.logger.warn('Fallback falhou, usando thumbnail padrão');
    return this.getDefaultThumbnail('pdf');
  }

  /**
   * Gera thumbnail do PDF com configuração específica e timeout
   */
  private async generatePdfThumbnailWithConfig(pdfBuffer: Buffer, config: any): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout na geração de thumbnail (30s)'));
      }, 30000);

      try {
        const pdf = require('pdf-thumbnail');
        const thumbnailStream = await pdf(pdfBuffer, config);
        const thumbnailBuffer = await this.streamToBuffer(thumbnailStream);
        
        clearTimeout(timeout);
        
        // Verificar se o thumbnail gerado não está vazio
        if (!thumbnailBuffer || thumbnailBuffer.length === 0) {
          reject(new Error('Thumbnail gerado está vazio'));
          return;
        }

        resolve(thumbnailBuffer);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Gera thumbnail para imagens com configurações otimizadas
   * @param imageBuffer Buffer da imagem
   * @returns Buffer do thumbnail
   */
  private async generateImageThumbnail(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Validação de input
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Buffer de imagem vazio ou inválido');
      }

      // Verificar tamanho máximo do buffer usando config
      if (imageBuffer.length > this.config.image.maxBufferSize) {
        throw new Error(`Buffer de imagem muito grande: ${imageBuffer.length} bytes (máximo: ${this.config.image.maxBufferSize} bytes)`);
      }

      // Validar tipo MIME através de magic bytes
      if (!this.isValidImageBuffer(imageBuffer)) {
        throw new Error('Tipo de arquivo não suportado ou buffer corrompido');
      }

      this.logger.debug(`Processando thumbnail de imagem - Tamanho original: ${imageBuffer.length} bytes`);

      const sharp = require('sharp');
      
      // Timeout para evitar travamentos usando config
      const timeoutPromise = new Promise<Buffer>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout na geração de thumbnail de imagem (${this.config.image.timeoutMs}ms)`)), this.config.image.timeoutMs);
      });

      const processPromise = this.processImageWithOptimizedSettings(imageBuffer, sharp);

      const result = await Promise.race([processPromise, timeoutPromise]) as Buffer;
      
      this.logger.debug(`Thumbnail de imagem gerado com sucesso - Tamanho final: ${result.length} bytes`);
      return result;
      
    } catch (error) {
      this.logger.warn(
        `Falha ao gerar thumbnail de imagem, usando thumbnail padrão: ${error.message}`,
        ThumbnailService.name,
      );
      return this.getDefaultThumbnail('image');
    }
  }

  /**
   * Processa imagem com configurações otimizadas baseadas no tipo
   * @param imageBuffer Buffer da imagem
   * @param sharp Instância do Sharp
   * @returns Buffer do thumbnail processado
   */
  private async processImageWithOptimizedSettings(imageBuffer: Buffer, sharp: any): Promise<Buffer> {
    // Obter metadados da imagem para otimização
    const metadata = await sharp(imageBuffer).metadata();
    
    this.logger.debug(`Metadados da imagem:`, JSON.stringify({
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      density: metadata.density
    }));

    // Configurações otimizadas baseadas no formato
    const config = this.getOptimizedImageConfig(metadata);
    
    let pipeline = sharp(imageBuffer)
      .resize(config.width, config.height, {
        fit: config.fit,
        position: config.position,
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3 // Melhor qualidade de redimensionamento
      });

    // Aplicar configurações específicas do formato usando config
    switch (config.outputFormat) {
      case 'jpeg':
        pipeline = pipeline.jpeg({
          quality: config.quality,
          progressive: this.config.image.formatSettings.jpeg.progressive,
          mozjpeg: this.config.image.formatSettings.jpeg.mozjpeg
        });
        break;
      case 'png':
        pipeline = pipeline.png({
          quality: config.quality,
          compressionLevel: this.config.image.formatSettings.png.compressionLevel,
          progressive: this.config.image.formatSettings.png.progressive
        });
        break;
      case 'webp':
        pipeline = pipeline.webp({
          quality: config.quality,
          effort: this.config.image.formatSettings.webp.effort
        });
        break;
      default:
        // Fallback para JPEG usando config
        pipeline = pipeline.jpeg({
          quality: config.quality,
          progressive: this.config.image.formatSettings.jpeg.progressive
        });
    }

    return await pipeline.toBuffer();
  }

  /**
   * Retorna configurações otimizadas baseadas nos metadados da imagem
   * @param metadata Metadados da imagem
   * @returns Configurações otimizadas
   */
  private getOptimizedImageConfig(metadata: any) {
    const baseConfig = {
      width: this.config.image.width,
      height: this.config.image.height,
      fit: 'cover' as const,
      position: 'center' as const,
      quality: this.config.image.quality,
      outputFormat: 'jpeg'
    };

    // Otimizações baseadas no formato original
    switch (metadata.format) {
      case 'png':
        // PNG com transparência - manter como PNG ou usar WebP
        if (metadata.channels === 4) {
          return {
            ...baseConfig,
            outputFormat: 'png',
            quality: this.config.image.formatSettings.png.quality
          };
        }
        break;
      
      case 'gif':
        // GIF - converter para JPEG com qualidade menor
        return {
          ...baseConfig,
          quality: this.config.image.formatSettings.gif.quality
        };
      
      case 'webp':
        // WebP - manter formato com qualidade otimizada
        return {
          ...baseConfig,
          outputFormat: 'webp',
          quality: this.config.image.formatSettings.webp.quality
        };
      
      case 'tiff':
      case 'tif':
        // TIFF - converter para JPEG com alta qualidade
        return {
          ...baseConfig,
          quality: this.config.image.formatSettings.tiff.quality
        };
    }

    // Otimizações baseadas no tamanho usando config
    if (metadata.width && metadata.height) {
      const totalPixels = metadata.width * metadata.height;
      
      // Imagens muito grandes - reduzir qualidade
      if (totalPixels > this.config.image.sizeOptimization.largeImageThreshold) {
        return {
          ...baseConfig,
          quality: this.config.image.sizeOptimization.largeImageQuality
        };
      }
      
      // Imagens pequenas - manter qualidade alta
      if (totalPixels < this.config.image.sizeOptimization.smallImageThreshold) {
        return {
          ...baseConfig,
          quality: this.config.image.sizeOptimization.smallImageQuality
        };
      }
    }

    return baseConfig;
  }

  /**
   * Gera thumbnail para documentos Office
   * @param buffer Buffer do documento
   * @param type Tipo do documento (docx, xlsx, etc.)
   * @returns Buffer do thumbnail padrão
   */
  private async generateDocumentThumbnail(buffer: Buffer, type: string): Promise<Buffer> {
    // Para documentos Office, usamos thumbnails padrão por enquanto
    // TODO: Implementar conversão real usando LibreOffice ou similar
    return this.getDefaultThumbnail(type);
  }

  /**
   * Retorna thumbnail padrão baseado no tipo de arquivo
   * @param type Tipo do arquivo
   * @returns Buffer do thumbnail padrão
   */
  private async getDefaultThumbnail(type: string): Promise<Buffer> {
    const thumbnailFileName = this.config.general.defaultThumbnails[type] || this.config.general.defaultThumbnails.default;
    const thumbnailPath = path.join(this.config.general.defaultThumbnailsPath, thumbnailFileName);
    const fullPath = path.join(process.cwd(), thumbnailPath);
    
    try {
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath);
      }
    } catch (error) {
      this.logger.warn(
        `Erro ao carregar thumbnail padrão ${thumbnailPath}: ${error.message}`,
        ThumbnailService.name,
      );
    }

    // Fallback: gerar thumbnail simples programaticamente
    return this.generateFallbackThumbnail(type);
  }

  /**
   * Gera thumbnail de fallback programaticamente
   * @param type Tipo do arquivo
   * @returns Buffer do thumbnail gerado
   */
  private async generateFallbackThumbnail(type: string): Promise<Buffer> {
    try {
      const sharp = require('sharp');
      
      // Criar uma imagem simples com texto indicando o tipo
      const svg = `
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="200" fill="#f0f0f0" stroke="#ccc" stroke-width="2"/>
          <text x="100" y="100" text-anchor="middle" dominant-baseline="middle" 
                font-family="Arial" font-size="16" fill="#666">
            ${type.toUpperCase()}
          </text>
          <text x="100" y="130" text-anchor="middle" dominant-baseline="middle" 
                font-family="Arial" font-size="12" fill="#999">
            Documento
          </text>
        </svg>
      `;

      return await sharp(Buffer.from(svg))
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      this.logger.error(
        `Erro ao gerar thumbnail de fallback: ${error.message}`,
        error.stack,
        ThumbnailService.name,
      );
      
      // Último recurso: criar uma imagem sólida simples
      try {
        const sharp = require('sharp');
        return await sharp({
          create: {
            width: 200,
            height: 200,
            channels: 3,
            background: { r: 240, g: 240, b: 240 }
          }
        })
        .jpeg({ quality: 80 })
        .toBuffer();
      } catch (fallbackError) {
        this.logger.error(
          `Erro crítico ao gerar thumbnail: ${fallbackError.message}`,
          fallbackError.stack,
          ThumbnailService.name,
        );
        throw new Error('Não foi possível gerar thumbnail');
      }
    }
  }

  /**
   * Converte stream para buffer
   * @param stream Stream de dados
   * @returns Buffer dos dados
   */
  private async streamToBuffer(stream: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Verifica se um thumbnail existe para o documento
   * @param documentoId ID do documento
   * @returns True se o thumbnail existe
   */
  async thumbnailExists(documentoId: string): Promise<boolean> {
    try {
      const thumbnailPath = `thumbnails/${documentoId}.jpg`;
      const storageProvider = this.storageProviderFactory.getProvider();
      
      // Tentar obter o arquivo para verificar se existe
      await storageProvider.obterArquivo(thumbnailPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Remove thumbnail de um documento
   * @param documentoId ID do documento
   */
  async removeThumbnail(documentoId: string): Promise<void> {
    try {
      const thumbnailPath = `thumbnails/${documentoId}.jpg`;
      const storageProvider = this.storageProviderFactory.getProvider();
      
      await storageProvider.removerArquivo(thumbnailPath);
      
      this.logger.log(
        `Thumbnail removido com sucesso: ${thumbnailPath}`,
        ThumbnailService.name,
      );
    } catch (error) {
      this.logger.warn(
        `Erro ao remover thumbnail do documento ${documentoId}: ${error.message}`,
        ThumbnailService.name,
      );
    }
  }

  /**
   * Valida se o buffer é um PDF válido através dos magic bytes
   * @param buffer Buffer para validar
   * @returns true se for um PDF válido
   */
  private isValidPdf(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 4) {
      return false;
    }
    
    // PDF magic bytes: %PDF
    const pdfSignature = buffer.slice(0, 4).toString('ascii');
    return pdfSignature === '%PDF';
  }

  /**
   * Valida se o buffer é uma imagem válida através dos magic bytes
   * @param buffer Buffer para validar
   * @returns true se for uma imagem válida
   */
  private isValidImageBuffer(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 8) {
      return false;
    }

    // JPEG magic bytes: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return true;
    }

    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
        buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
      return true;
    }

    // GIF magic bytes: GIF87a ou GIF89a
    const gifSignature = buffer.slice(0, 6).toString('ascii');
    if (gifSignature === 'GIF87a' || gifSignature === 'GIF89a') {
      return true;
    }

    // WebP magic bytes: RIFF....WEBP
    if (buffer.length >= 12 &&
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return true;
    }

    // BMP magic bytes: BM
    if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
      return true;
    }

    // TIFF magic bytes: II*\0 ou MM\0*
    if ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2A && buffer[3] === 0x00) ||
        (buffer[0] === 0x4D && buffer[1] === 0x4D && buffer[2] === 0x00 && buffer[3] === 0x2A)) {
      return true;
    }

    // ICO magic bytes: \0\0\1\0
    if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00) {
      return true;
    }

    return false;
  }
}