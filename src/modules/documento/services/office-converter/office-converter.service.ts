import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

/**
 * Interface para configuração do OfficeConverter
 */
export interface OfficeConverterConfig {
  enabled: boolean;
  libreOfficePath: string;
  timeout: number;
  tempDir: string;
  maxRetries: number;
  retryDelay: number;
}

/**
 * Resultado da conversão de documento
 */
export interface ConversionResult {
  success: boolean;
  pdfBuffer?: Buffer;
  error?: string;
  originalSize: number;
  convertedSize?: number;
  conversionTime: number;
}

/**
 * Serviço responsável pela conversão de documentos Office para PDF
 * usando LibreOffice headless
 */
@Injectable()
export class OfficeConverterService implements OnModuleInit {
  private readonly logger = new Logger(OfficeConverterService.name);
  private readonly config: OfficeConverterConfig;
  private isLibreOfficeAvailable = false;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      enabled: this.configService.get<boolean>('OFFICE_CONVERTER_ENABLED', true),
      libreOfficePath: this.getLibreOfficePath(),
      timeout: this.configService.get<number>('OFFICE_CONVERTER_TIMEOUT', 30000),
      tempDir: this.configService.get<string>('OFFICE_CONVERTER_TEMP_DIR', os.tmpdir()),
      maxRetries: this.configService.get<number>('OFFICE_CONVERTER_MAX_RETRIES', 2),
      retryDelay: this.configService.get<number>('OFFICE_CONVERTER_RETRY_DELAY', 1000),
    };
  }

  async onModuleInit() {
    if (this.config.enabled) {
      await this.checkLibreOfficeAvailability();
      this.logger.log(
        `OfficeConverter inicializado - LibreOffice disponível: ${this.isLibreOfficeAvailable}`,
      );
    } else {
      this.logger.log('OfficeConverter desabilitado via configuração');
    }
  }

  /**
   * Converte um documento Office para PDF
   * @param buffer Buffer do documento original
   * @param mimeType Tipo MIME do documento
   * @param originalFileName Nome original do arquivo (opcional)
   * @returns Resultado da conversão
   */
  async convertToPdf(
    buffer: Buffer,
    mimeType: string,
    originalFileName?: string,
  ): Promise<ConversionResult> {
    const startTime = Date.now();
    
    // Verificar se a conversão está habilitada e o LibreOffice está disponível
    if (!this.config.enabled || !this.isLibreOfficeAvailable) {
      return {
        success: false,
        error: 'LibreOffice não está disponível ou conversão desabilitada',
        originalSize: buffer.length,
        conversionTime: Date.now() - startTime,
      };
    }

    // Verificar se o tipo MIME é suportado
    if (!this.isSupportedMimeType(mimeType)) {
      return {
        success: false,
        error: `Tipo MIME não suportado: ${mimeType}`,
        originalSize: buffer.length,
        conversionTime: Date.now() - startTime,
      };
    }

    let tempInputPath: string | null = null;
    let tempOutputDir: string | null = null;

    try {
      // Criar arquivo temporário de entrada
      const extension = this.getFileExtensionFromMimeType(mimeType);
      const tempFileName = `${uuidv4()}.${extension}`;
      tempInputPath = path.join(this.config.tempDir, tempFileName);
      
      // Criar diretório temporário para saída
      tempOutputDir = path.join(this.config.tempDir, `output_${uuidv4()}`);
      await fs.promises.mkdir(tempOutputDir, { recursive: true });

      // Escrever buffer no arquivo temporário
      await fs.promises.writeFile(tempInputPath, buffer);

      this.logger.debug(
        `Iniciando conversão: ${tempInputPath} -> ${tempOutputDir}`,
      );

      // Executar conversão com retry
      const pdfBuffer = await this.executeConversionWithRetry(
        tempInputPath,
        tempOutputDir,
      );

      const conversionTime = Date.now() - startTime;

      this.logger.debug(
        `Conversão concluída em ${conversionTime}ms - Tamanho original: ${buffer.length}, PDF: ${pdfBuffer.length}`,
      );

      return {
        success: true,
        pdfBuffer,
        originalSize: buffer.length,
        convertedSize: pdfBuffer.length,
        conversionTime,
      };
    } catch (error) {
      const conversionTime = Date.now() - startTime;
      this.logger.error(
        `Erro na conversão: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        error: error.message,
        originalSize: buffer.length,
        conversionTime,
      };
    } finally {
      // Limpar arquivos temporários
      await this.cleanupTempFiles(tempInputPath, tempOutputDir);
    }
  }

  /**
   * Verifica se o LibreOffice está disponível no sistema
   */
  async checkLibreOfficeAvailability(): Promise<boolean> {
    try {
      const command = `"${this.config.libreOfficePath}" --version`;
      const { stdout } = await execAsync(command, { timeout: 5000 });
      
      this.isLibreOfficeAvailable = stdout.includes('LibreOffice');
      
      if (this.isLibreOfficeAvailable) {
        this.logger.log(`LibreOffice encontrado: ${stdout.trim()}`);
      } else {
        this.logger.warn('LibreOffice não encontrado ou versão inválida');
      }
      
      return this.isLibreOfficeAvailable;
    } catch (error) {
      this.logger.warn(
        `Erro ao verificar LibreOffice: ${error.message}`,
      );
      this.isLibreOfficeAvailable = false;
      return false;
    }
  }

  /**
   * Executa a conversão com retry em caso de falha
   */
  private async executeConversionWithRetry(
    inputPath: string,
    outputDir: string,
  ): Promise<Buffer> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.executeConversion(inputPath, outputDir);
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Tentativa ${attempt}/${this.config.maxRetries} falhou: ${error.message}`,
        );
        
        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Executa a conversão usando LibreOffice
   */
  private async executeConversion(
    inputPath: string,
    outputDir: string,
  ): Promise<Buffer> {
    const command = `"${this.config.libreOfficePath}" --headless --convert-to pdf --outdir "${outputDir}" "${inputPath}"`;
    
    this.logger.debug(`Executando comando: ${command}`);
    
    const { stdout, stderr } = await execAsync(command, {
      timeout: this.config.timeout,
    });
    
    if (stderr && !stderr.includes('Warning')) {
      throw new Error(`Erro do LibreOffice: ${stderr}`);
    }
    
    // Encontrar o arquivo PDF gerado
    const inputFileName = path.basename(inputPath, path.extname(inputPath));
    const pdfPath = path.join(outputDir, `${inputFileName}.pdf`);
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error('Arquivo PDF não foi gerado');
    }
    
    // Ler o PDF gerado
    const pdfBuffer = await fs.promises.readFile(pdfPath);
    
    if (pdfBuffer.length === 0) {
      throw new Error('PDF gerado está vazio');
    }
    
    return pdfBuffer;
  }

  /**
   * Obtém o caminho do LibreOffice baseado no sistema operacional
   */
  private getLibreOfficePath(): string {
    const customPath = this.configService.get<string>('LIBREOFFICE_PATH');
    if (customPath) {
      return customPath;
    }

    const platform = os.platform();
    
    switch (platform) {
      case 'win32':
        return 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
      case 'darwin':
        return '/Applications/LibreOffice.app/Contents/MacOS/soffice';
      case 'linux':
        return '/usr/bin/libreoffice';
      default:
        return 'libreoffice';
    }
  }

  /**
   * Verifica se o tipo MIME é suportado para conversão
   */
  private isSupportedMimeType(mimeType: string): boolean {
    const supportedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/msword', // .doc
      'application/vnd.ms-excel', // .xls
      'application/vnd.ms-powerpoint', // .ppt
      'application/vnd.oasis.opendocument.text', // .odt
      'application/vnd.oasis.opendocument.spreadsheet', // .ods
      'application/vnd.oasis.opendocument.presentation', // .odp
      'text/rtf', // .rtf
    ];
    
    return supportedTypes.includes(mimeType);
  }

  /**
   * Obtém a extensão do arquivo baseada no tipo MIME
   */
  private getFileExtensionFromMimeType(mimeType: string): string {
    const mimeToExtension: Record<string, string> = {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'application/msword': 'doc',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.oasis.opendocument.text': 'odt',
      'application/vnd.oasis.opendocument.spreadsheet': 'ods',
      'application/vnd.oasis.opendocument.presentation': 'odp',
      'text/rtf': 'rtf',
    };
    
    return mimeToExtension[mimeType] || 'tmp';
  }

  /**
   * Limpa arquivos temporários
   */
  private async cleanupTempFiles(
    inputPath: string | null,
    outputDir: string | null,
  ): Promise<void> {
    try {
      if (inputPath && fs.existsSync(inputPath)) {
        await fs.promises.unlink(inputPath);
      }
      
      if (outputDir && fs.existsSync(outputDir)) {
        const files = await fs.promises.readdir(outputDir);
        for (const file of files) {
          await fs.promises.unlink(path.join(outputDir, file));
        }
        await fs.promises.rmdir(outputDir);
      }
    } catch (error) {
      this.logger.warn(
        `Erro ao limpar arquivos temporários: ${error.message}`,
      );
    }
  }

  /**
   * Utilitário para delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Getter para verificar se o LibreOffice está disponível
   */
  get isAvailable(): boolean {
    return this.config.enabled && this.isLibreOfficeAvailable;
  }

  /**
   * Getter para obter estatísticas do serviço
   */
  getStats() {
    return {
      enabled: this.config.enabled,
      libreOfficeAvailable: this.isLibreOfficeAvailable,
      libreOfficePath: this.config.libreOfficePath,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    };
  }
}