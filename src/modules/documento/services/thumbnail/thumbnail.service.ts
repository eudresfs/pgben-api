import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { LoggingService } from '../../../../shared/logging/logging.service';
import { StorageProviderFactory } from '../../factories/storage-provider.factory';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import {
  ThumbnailConfig,
  DEFAULT_THUMBNAIL_CONFIG,
  mergeConfig,
  validateConfig,
} from './thumbnail.config';
import { OfficeConverterService } from '../office-converter/office-converter.service';

/**
 * Interface para padronizar retornos de geração de thumbnails
 */
interface ThumbnailResult {
  success: boolean;
  thumbnailBuffer?: Buffer;
  thumbnailPath?: string;
  error?: string;
  metadata?: {
    originalSize: number;
    thumbnailSize: number;
    processingTime: number;
    method: string;
  };
}

/**
 * Constantes para limits de recursos e segurança
 */
const RESOURCE_LIMITS = {
  MAX_BUFFER_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_PROCESSING_TIME: 30000, // 30 segundos
  MAX_STREAM_TIMEOUT: 10000, // 10 segundos
  MAX_COMMAND_TIMEOUT: 30000, // 30 segundos para comandos externos
  MAX_TEMP_FILES: 10, // Máximo de arquivos temporários simultâneos
} as const;

/**
 * Padrões de caracteres perigosos para sanitização de paths
 */
const DANGEROUS_PATH_PATTERNS = [
  /\.\./g, // Path traversal
  /[;&|`$(){}\[\]]/g, // Command injection
  /[\x00-\x1f\x7f-\x9f]/g, // Caracteres de controle
] as const;

/**
 * Serviço responsável pela geração de thumbnails de documentos
 * Suporta múltiplos formatos: PDF, imagens, documentos Office
 */
@Injectable()
export class ThumbnailService implements OnModuleInit {
  private readonly logger = new Logger(ThumbnailService.name);
  private readonly config: ThumbnailConfig;
  private readonly execAsync = promisify(exec);

  constructor(
    private readonly storageProviderFactory: StorageProviderFactory,
    private readonly officeConverterService: OfficeConverterService,
    customConfig?: Partial<ThumbnailConfig>,
  ) {
    // Mesclar configuração personalizada com a padrão
    this.config = mergeConfig(customConfig);

    // Validar configuração
    try {
      validateConfig(this.config);
    } catch (error) {
      this.logger.error(
        `Configuração inválida do ThumbnailService: ${error.message}`,
      );
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
        pdfThumbnail: this.checkDependency('pdf-thumbnail'),
      };

      if (this.config.general.enableDebugLogs) {
        this.logger.debug(
          `pdf2pic disponível: ${dependencies.pdf2pic ? 'OK' : 'AUSENTE'}`,
        );
        this.logger.debug(
          `sharp disponível: ${dependencies.sharp ? 'OK' : 'AUSENTE'}`,
        );
        this.logger.debug(
          `pdf-thumbnail disponível: ${dependencies.pdfThumbnail ? 'OK' : 'AUSENTE'}`,
        );
      }

      // Avisos críticos
      if (!dependencies.sharp) {
        this.logger.warn(
          '⚠️  Sharp não encontrado - processamento de imagem será limitado',
        );
      }

      if (!dependencies.pdf2pic && !dependencies.pdfThumbnail) {
        this.logger.warn(
          '⚠️  Nenhuma biblioteca de PDF encontrada - thumbnails de PDF serão limitados',
        );
      }

      if (this.config.general.enableDebugLogs) {
        this.logger.log(
          `Thumbnail dependencies status: ${JSON.stringify(dependencies)}`,
        );
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
          thumbnailBuffer = await this.generateDocumentThumbnail(
            buffer,
            'docx',
          );
          break;
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          thumbnailBuffer = await this.generateDocumentThumbnail(
            buffer,
            'xlsx',
          );
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
          generatedAt: new Date().toISOString(),
        },
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
    const startTime = Date.now();

    // Validação de tamanho do buffer
    if (pdfBuffer.length > RESOURCE_LIMITS.MAX_BUFFER_SIZE) {
      this.logger.error(
        `PDF buffer muito grande: ${pdfBuffer.length} bytes (máximo: ${RESOURCE_LIMITS.MAX_BUFFER_SIZE} bytes)`,
      );
      return this.getDefaultThumbnail('pdf');
    }

    this.logger.debug(
      `Iniciando geração de thumbnail PDF - Buffer size: ${pdfBuffer.length} bytes`,
    );

    // Validação básica do PDF usando magic bytes
    if (!pdfBuffer || pdfBuffer.length === 0) {
      this.logger.warn('PDF buffer está vazio, usando thumbnail padrão');
      return this.getDefaultThumbnail('pdf');
    }

    // Verificar se é realmente um PDF (magic bytes)
    const pdfMagicBytes = pdfBuffer.slice(0, 4).toString();
    this.logger.debug(`Magic bytes do PDF: ${pdfMagicBytes}`);

    if (!pdfMagicBytes.startsWith('%PDF')) {
      this.logger.warn(
        `Arquivo não é um PDF válido (magic bytes: ${pdfMagicBytes}), usando thumbnail padrão`,
      );
      return this.getDefaultThumbnail('pdf');
    }

    try {
      this.logger.debug('Carregando biblioteca pdf2pic...');
      const { fromBuffer } = require('pdf2pic');

      const options = {
        density: this.config.pdf.density,
        format: this.config.pdf.format,
        width: this.config.pdf.width,
        height: this.config.pdf.height,
        quality: this.config.pdf.quality,
      };

      this.logger.debug('Configurações pdf2pic:', JSON.stringify(options));
      this.logger.debug('Criando conversor pdf2pic...');

      const convert = fromBuffer(pdfBuffer, options);
      this.logger.debug('Iniciando conversão da primeira página...');

      // Implementar timeout para evitar travamentos
      const conversionPromise = convert(1, { responseType: 'buffer' });
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              `Timeout na conversão PDF (${RESOURCE_LIMITS.MAX_PROCESSING_TIME}ms)`,
            ),
          );
        }, RESOURCE_LIMITS.MAX_PROCESSING_TIME);
      });

      const result = await Promise.race([conversionPromise, timeoutPromise]);

      this.logger.debug(`Resultado da conversão:`, {
        hasResult: !!result,
        hasBuffer: !!(result && result.buffer),
        bufferLength: result && result.buffer ? result.buffer.length : 0,
        resultKeys: result ? Object.keys(result) : [],
      });

      if (!result || !result.buffer || result.buffer.length === 0) {
        this.logger.warn(
          'pdf2pic retornou buffer vazio, tentando fallback com pdf-thumbnail',
        );
        return this.generatePdfThumbnailFallback(pdfBuffer);
      }

      const processingTime = Date.now() - startTime;
      this.logger.debug(
        `Thumbnail PDF gerado com sucesso usando pdf2pic - Tamanho: ${result.buffer.length} bytes, Tempo: ${processingTime}ms`,
      );
      return result.buffer;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `Erro ao gerar thumbnail PDF com pdf2pic: ${error.message}`,
        {
          bufferSize: pdfBuffer.length,
          errorName: error.name,
          errorMessage: error.message,
          processingTime,
          stack: error.stack,
        },
      );

      // Fallback para o método anterior como backup
      this.logger.debug(
        'Tentando fallback para método anterior de geração de thumbnail PDF',
      );
      return this.generatePdfThumbnailFallback(pdfBuffer);
    }
  }

  /**
   * Método de fallback para geração de thumbnail PDF usando ImageMagick diretamente
   * @param pdfBuffer Buffer do PDF
   * @returns Buffer do thumbnail
   */
  private async generatePdfThumbnailFallback(
    pdfBuffer: Buffer,
  ): Promise<Buffer> {
    const startTime = Date.now();
    this.logger.debug(
      'Iniciando método de fallback para geração de thumbnail PDF usando ImageMagick',
    );

    // Validação de tamanho do buffer
    if (pdfBuffer.length > RESOURCE_LIMITS.MAX_BUFFER_SIZE) {
      this.logger.error(
        `PDF buffer muito grande para fallback: ${pdfBuffer.length} bytes`,
      );
      return this.getDefaultThumbnail('pdf');
    }

    // Usar ImageMagick diretamente (biblioteca pdf-thumbnail removida devido a problemas de compatibilidade)
    this.logger.debug('Gerando thumbnail usando ImageMagick diretamente...');
    try {
      const thumbnailBuffer =
        await this.generatePdfThumbnailWithImageMagick(pdfBuffer);
      const processingTime = Date.now() - startTime;
      this.logger.debug(
        `Thumbnail PDF fallback gerado com sucesso usando ImageMagick - Tamanho: ${thumbnailBuffer.length} bytes, Tempo: ${processingTime}ms`,
      );
      return thumbnailBuffer;
    } catch (imageMagickError) {
      this.logger.error(
        `ImageMagick falhou na geração de thumbnail: ${imageMagickError.message}`,
        imageMagickError.stack,
      );

      this.logger.warn(
        'Fallback para ImageMagick falhou, usando thumbnail padrão',
      );
      return this.getDefaultThumbnail('pdf');
    }
  }

  // Método generatePdfThumbnailWithPdfThumbnail removido - biblioteca pdf-thumbnail descontinuada
  // devido a problemas de compatibilidade. Usar generatePdfThumbnailWithImageMagick diretamente.

  /**
   * Gera thumbnail de PDF usando ImageMagick diretamente via linha de comando
   * @param pdfBuffer Buffer do PDF
   * @returns Buffer do thumbnail
   */
  private async generatePdfThumbnailWithImageMagick(
    pdfBuffer: Buffer,
  ): Promise<Buffer> {
    const tempDir = os.tmpdir();
    const tempPdfPath = path.resolve(
      tempDir,
      `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`,
    );
    const tempJpgPath = path.resolve(
      tempDir,
      `thumbnail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
    );

    // Sanitizar caminhos para prevenir command injection
    this.sanitizePath(tempPdfPath);
    this.sanitizePath(tempJpgPath);

    try {
      this.logger.debug('Gerando thumbnail com ImageMagick diretamente...');

      // Salvar PDF temporariamente
      await fs.promises.writeFile(tempPdfPath, pdfBuffer);
      this.logger.debug(`PDF salvo temporariamente: ${tempPdfPath}`);

      // Comando ImageMagick para converter PDF para thumbnail (usando caminhos sanitizados)
      // Usando 'magick' em vez de 'convert' para evitar warnings de depreciação no IMv7
      const command = `magick "${tempPdfPath}[0]" -thumbnail 200x200 -quality 75 -background white -alpha remove "${tempJpgPath}"`;

      this.logger.debug(`Executando comando: ${command}`);

      // Executar comando com timeout
      const { stdout, stderr } = await this.execAsync(command, {
        timeout: RESOURCE_LIMITS.MAX_COMMAND_TIMEOUT,
        maxBuffer: 1024 * 1024 * 10, // 10MB
      });

      if (stderr && !stderr.includes('Warning')) {
        this.logger.warn(`ImageMagick stderr: ${stderr}`);
      }

      if (stdout) {
        this.logger.debug(`ImageMagick stdout: ${stdout}`);
      }

      // Verificar se o arquivo de saída foi criado
      if (!fs.existsSync(tempJpgPath)) {
        throw new Error('ImageMagick não gerou o arquivo de thumbnail');
      }

      // Ler o thumbnail gerado
      const thumbnailBuffer = await fs.promises.readFile(tempJpgPath);

      if (!thumbnailBuffer || thumbnailBuffer.length === 0) {
        throw new Error('Thumbnail gerado está vazio');
      }

      this.logger.debug(
        `Thumbnail gerado com ImageMagick - Tamanho: ${thumbnailBuffer.length} bytes`,
      );
      return thumbnailBuffer;
    } catch (error) {
      this.logger.error('Erro na geração com ImageMagick:', {
        errorMessage: error.message,
        errorName: error.name,
        command: error.cmd || 'N/A',
        stderr: error.stderr || 'N/A',
      });
      throw error;
    } finally {
      // Limpar arquivos temporários
      try {
        if (fs.existsSync(tempPdfPath)) {
          await fs.promises.unlink(tempPdfPath);
          this.logger.debug(`Arquivo temporário removido: ${tempPdfPath}`);
        }
        if (fs.existsSync(tempJpgPath)) {
          await fs.promises.unlink(tempJpgPath);
          this.logger.debug(`Arquivo temporário removido: ${tempJpgPath}`);
        }
      } catch (cleanupError) {
        this.logger.warn(
          `Erro ao limpar arquivos temporários: ${cleanupError.message}`,
        );
      }
    }
  }

  // Método generatePdfThumbnailWithConfig removido - biblioteca pdf-thumbnail descontinuada
  // devido a problemas de compatibilidade. Usar generatePdfThumbnailWithImageMagick diretamente.

  /**
   * Gera thumbnail para imagens com configurações otimizadas
   * @param imageBuffer Buffer da imagem
   * @returns Buffer do thumbnail
   */
  private async generateImageThumbnail(imageBuffer: Buffer): Promise<Buffer> {
    const startTime = Date.now();

    try {
      // Validação de input
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Buffer de imagem vazio ou inválido');
      }

      // Verificar tamanho máximo do buffer
      if (imageBuffer.length > RESOURCE_LIMITS.MAX_BUFFER_SIZE) {
        this.logger.error(
          `Buffer de imagem muito grande: ${imageBuffer.length} bytes (máximo: ${RESOURCE_LIMITS.MAX_BUFFER_SIZE} bytes)`,
        );
        throw new Error(
          `Buffer de imagem muito grande: ${imageBuffer.length} bytes (máximo: ${RESOURCE_LIMITS.MAX_BUFFER_SIZE} bytes)`,
        );
      }

      // Validar tipo MIME através de magic bytes
      if (!this.isValidImageBuffer(imageBuffer)) {
        throw new Error('Tipo de arquivo não suportado ou buffer corrompido');
      }

      this.logger.debug(
        `Processando thumbnail de imagem - Tamanho original: ${imageBuffer.length} bytes`,
      );

      const sharp = require('sharp');

      // Timeout para evitar travamentos
      const timeoutPromise = new Promise<Buffer>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                `Timeout na geração de thumbnail de imagem (${RESOURCE_LIMITS.MAX_PROCESSING_TIME}ms)`,
              ),
            ),
          RESOURCE_LIMITS.MAX_PROCESSING_TIME,
        );
      });

      const processPromise = this.processImageWithOptimizedSettings(
        imageBuffer,
        sharp,
      );

      const result = (await Promise.race([
        processPromise,
        timeoutPromise,
      ])) as Buffer;

      this.logger.debug(
        `Thumbnail de imagem gerado com sucesso - Tamanho final: ${result.length} bytes`,
      );
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
  private async processImageWithOptimizedSettings(
    imageBuffer: Buffer,
    sharp: any,
  ): Promise<Buffer> {
    // Obter metadados da imagem para otimização
    const metadata = await sharp(imageBuffer).metadata();

    this.logger.debug(`Metadados da imagem:`, {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      channels: metadata.channels,
      density: metadata.density,
    });

    // Configurações otimizadas baseadas no formato
    const config = this.getOptimizedImageConfig(metadata);

    let pipeline = sharp(imageBuffer).resize(config.width, config.height, {
      fit: config.fit,
      position: config.position,
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3, // Melhor qualidade de redimensionamento
    });

    // Aplicar configurações específicas do formato usando config
    switch (config.outputFormat) {
      case 'jpeg':
        pipeline = pipeline.jpeg({
          quality: config.quality,
          progressive: this.config.image.formatSettings.jpeg.progressive,
          mozjpeg: this.config.image.formatSettings.jpeg.mozjpeg,
        });
        break;
      case 'png':
        pipeline = pipeline.png({
          quality: config.quality,
          compressionLevel:
            this.config.image.formatSettings.png.compressionLevel,
          progressive: this.config.image.formatSettings.png.progressive,
        });
        break;
      case 'webp':
        pipeline = pipeline.webp({
          quality: config.quality,
          effort: this.config.image.formatSettings.webp.effort,
        });
        break;
      default:
        // Fallback para JPEG usando config
        pipeline = pipeline.jpeg({
          quality: config.quality,
          progressive: this.config.image.formatSettings.jpeg.progressive,
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
      outputFormat: 'jpeg',
    };

    // Otimizações baseadas no formato original
    switch (metadata.format) {
      case 'png':
        // PNG com transparência - manter como PNG ou usar WebP
        if (metadata.channels === 4) {
          return {
            ...baseConfig,
            outputFormat: 'png',
            quality: this.config.image.formatSettings.png.quality,
          };
        }
        break;

      case 'gif':
        // GIF - converter para JPEG com qualidade menor
        return {
          ...baseConfig,
          quality: this.config.image.formatSettings.gif.quality,
        };

      case 'webp':
        // WebP - manter formato com qualidade otimizada
        return {
          ...baseConfig,
          outputFormat: 'webp',
          quality: this.config.image.formatSettings.webp.quality,
        };

      case 'tiff':
      case 'tif':
        // TIFF - converter para JPEG com alta qualidade
        return {
          ...baseConfig,
          quality: this.config.image.formatSettings.tiff.quality,
        };
    }

    // Otimizações baseadas no tamanho usando config
    if (metadata.width && metadata.height) {
      const totalPixels = metadata.width * metadata.height;

      // Imagens muito grandes - reduzir qualidade
      if (
        totalPixels > this.config.image.sizeOptimization.largeImageThreshold
      ) {
        return {
          ...baseConfig,
          quality: this.config.image.sizeOptimization.largeImageQuality,
        };
      }

      // Imagens pequenas - manter qualidade alta
      if (
        totalPixels < this.config.image.sizeOptimization.smallImageThreshold
      ) {
        return {
          ...baseConfig,
          quality: this.config.image.sizeOptimization.smallImageQuality,
        };
      }
    }

    return baseConfig;
  }

  /**
   * Gera thumbnail para documentos Office
   * @param buffer Buffer do documento
   * @param type Tipo do documento (docx, xlsx, etc.)
   * @returns Buffer do thumbnail
   */
  private async generateDocumentThumbnail(
    buffer: Buffer,
    type: string,
  ): Promise<Buffer> {
    const startTime = Date.now();

    try {
      this.logger.debug(
        `Iniciando geração de thumbnail para documento ${type} - Tamanho: ${buffer.length} bytes`,
      );

      // Validação de entrada
      if (!buffer || buffer.length === 0) {
        throw new Error('Buffer do documento está vazio');
      }

      if (buffer.length > RESOURCE_LIMITS.MAX_BUFFER_SIZE) {
        this.logger.warn(
          `Documento ${type} muito grande (${buffer.length} bytes), usando thumbnail padrão`,
        );
        return this.getDefaultThumbnail(type);
      }

      // Determinar tipo MIME baseado na extensão
      const mimeType = this.getMimeTypeFromExtension(type);

      if (!mimeType) {
        throw new Error(`Tipo de arquivo não suportado: ${type}`);
      }

      // Tentar conversão para PDF usando OfficeConverterService
      const conversionResult = await this.officeConverterService.convertToPdf(
        buffer,
        mimeType,
      );

      if (conversionResult.success && conversionResult.pdfBuffer) {
        // Se a conversão foi bem-sucedida, gerar thumbnail do PDF
        const pdfThumbnail = await this.generatePdfThumbnail(
          conversionResult.pdfBuffer,
        );

        const processingTime = Date.now() - startTime;
        this.logger.debug(
          `Thumbnail de documento ${type} gerado via PDF - Original: ${buffer.length} bytes, PDF: ${conversionResult.convertedSize} bytes, Thumbnail: ${pdfThumbnail.length} bytes, Tempo: ${processingTime}ms`,
        );

        return pdfThumbnail;
      } else {
        throw new Error(conversionResult.error || 'Conversão para PDF falhou');
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.warn(
        `Falha na conversão de documento ${type}, usando thumbnail padrão: ${error.message} (Tempo: ${processingTime}ms)`,
      );

      // Fallback para thumbnail padrão
      return this.getDefaultThumbnail(type);
    }
  }

  /**
   * Retorna thumbnail padrão baseado no tipo de arquivo
   * @param type Tipo do arquivo
   * @returns Buffer do thumbnail padrão
   */
  private async getDefaultThumbnail(type: string): Promise<Buffer> {
    const thumbnailFileName =
      this.config.general.defaultThumbnails[type] ||
      this.config.general.defaultThumbnails.default;
    const thumbnailPath = path.join(
      this.config.general.defaultThumbnailsPath,
      thumbnailFileName,
    );
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

      return await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
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
            background: { r: 240, g: 240, b: 240 },
          },
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
   * Converte um stream para buffer com timeout
   * @param stream Stream para converter
   * @returns Buffer resultante
   */
  private async streamToBuffer(stream: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let streamEnded = false;
      let dataReceived = false;
      let timeoutId: NodeJS.Timeout | null = null;
      let isResolved = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (stream && typeof stream.destroy === 'function') {
          stream.destroy();
        }
      };

      const safeResolve = (value: Buffer) => {
        if (!isResolved) {
          isResolved = true;
          streamEnded = true;
          cleanup();
          resolve(value);
        }
      };

      const safeReject = (error: Error) => {
        if (!isResolved) {
          isResolved = true;
          streamEnded = true;
          cleanup();
          reject(error);
        }
      };

      timeoutId = setTimeout(() => {
        if (!streamEnded) {
          this.logger.warn('Timeout na conversão de stream para buffer');
          safeReject(new Error('Timeout na conversão de stream para buffer'));
        }
      }, RESOURCE_LIMITS.MAX_STREAM_TIMEOUT);

      this.logger.debug('Iniciando conversão de stream para buffer...', {
        readable: stream.readable,
        readableEnded: stream.readableEnded,
        readableLength: stream.readableLength,
        destroyed: stream.destroyed,
        flowing: stream.flowing,
      });

      // Verificar se o stream já está vazio ou finalizado
      if (stream.readableEnded || stream.destroyed) {
        this.logger.warn('Stream já está finalizado ou destruído');
        safeResolve(Buffer.concat(chunks));
        return;
      }

      // Se o stream não é readable, rejeitar imediatamente
      if (stream.readable === false) {
        this.logger.warn('Stream não é readable');
        safeReject(new Error('Stream não é readable'));
        return;
      }

      stream.on('data', (chunk: Buffer) => {
        dataReceived = true;
        chunks.push(chunk);
        this.logger.debug(
          `Chunk recebido: ${chunk.length} bytes (total chunks: ${chunks.length})`,
        );
      });

      stream.on('end', () => {
        const totalBuffer = Buffer.concat(chunks);
        this.logger.debug(
          `Stream finalizado - Total de dados: ${totalBuffer.length} bytes, Chunks: ${chunks.length}`,
        );

        if (!dataReceived || totalBuffer.length === 0) {
          this.logger.warn('Stream finalizado mas nenhum dado foi recebido');
          safeReject(new Error('Stream finalizado sem dados'));
          return;
        }

        safeResolve(totalBuffer);
      });

      stream.on('error', (error) => {
        this.logger.error('Erro no stream:', error.message);
        safeReject(error);
      });

      // Tentar ler dados se o stream estiver em modo paused
      if (stream.readable && !stream.flowing) {
        this.logger.debug('Stream em modo paused, tentando resume...');
        stream.resume();
      }

      // Verificar se há dados imediatamente disponíveis
      if (stream.readableLength > 0) {
        this.logger.debug(
          `Stream tem ${stream.readableLength} bytes disponíveis`,
        );
      }
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
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return true;
    }

    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return true;
    }

    // GIF magic bytes: GIF87a ou GIF89a
    const gifSignature = buffer.slice(0, 6).toString('ascii');
    if (gifSignature === 'GIF87a' || gifSignature === 'GIF89a') {
      return true;
    }

    // WebP magic bytes: RIFF....WEBP
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return true;
    }

    // BMP magic bytes: BM
    if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
      return true;
    }

    // TIFF magic bytes: II*\0 ou MM\0*
    if (
      (buffer[0] === 0x49 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x2a &&
        buffer[3] === 0x00) ||
      (buffer[0] === 0x4d &&
        buffer[1] === 0x4d &&
        buffer[2] === 0x00 &&
        buffer[3] === 0x2a)
    ) {
      return true;
    }

    // ICO magic bytes: \0\0\1\0
    if (
      buffer[0] === 0x00 &&
      buffer[1] === 0x00 &&
      buffer[2] === 0x01 &&
      buffer[3] === 0x00
    ) {
      return true;
    }

    return false;
  }

  /**
   * Obtém o tipo MIME baseado na extensão do arquivo
   * @param extension Extensão do arquivo
   * @returns Tipo MIME correspondente ou null se não suportado
   */
  private getMimeTypeFromExtension(extension: string): string | null {
    const extensionToMime: Record<string, string> = {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      doc: 'application/msword',
      xls: 'application/vnd.ms-excel',
      ppt: 'application/vnd.ms-powerpoint',
      odt: 'application/vnd.oasis.opendocument.text',
      ods: 'application/vnd.oasis.opendocument.spreadsheet',
      odp: 'application/vnd.oasis.opendocument.presentation',
      rtf: 'text/rtf',
    };

    const normalizedExtension = extension.toLowerCase().replace('.', '');
    return extensionToMime[normalizedExtension] || null;
  }

  /**
   * Sanitiza caminhos para prevenir command injection
   * @param filePath Caminho do arquivo para sanitizar
   * @throws Error se o caminho contém caracteres perigosos
   */
  private sanitizePath(filePath: string): void {
    for (const pattern of DANGEROUS_PATH_PATTERNS) {
      if (pattern.test(filePath)) {
        throw new Error(`Caminho contém caracteres perigosos: ${filePath}`);
      }
    }
  }
}
