import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { QRCodeToDataURLOptions, QRCodeToBufferOptions } from 'qrcode';

/**
 * Serviço responsável pela geração e manipulação de códigos QR
 * para a funcionalidade EasyUpload
 */
@Injectable()
export class QrCodeService {
  private readonly logger = new Logger(QrCodeService.name);
  private readonly defaultQrSize: number;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.defaultQrSize = this.configService.get<number>('EASY_UPLOAD_QR_CODE_SIZE', 300);
    this.baseUrl = this.configService.get<string>('EASY_UPLOAD_BASE_URL', 'https://pgben.gov.br/upload');
    this.logger.log('QrCodeService inicializado');
  }

  /**
   * Gera um código QR como Base64 DataURL a partir de um token
   * @param token Token de upload
   * @param size Tamanho do QR Code em pixels (opcional)
   * @returns Promise com a string DataURL do QR Code
   */
  async generateQrCodeBase64(token: string, size?: number): Promise<string> {
    try {
      const uploadUrl = `${this.baseUrl}/${token}`;
      const qrSize = size || this.defaultQrSize;
      
      const qrOptions: QRCodeToDataURLOptions = {
        type: 'image/png',
        width: qrSize,
        margin: 1,
        errorCorrectionLevel: 'H', // Alto nível de correção de erros
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      };

      // Gerar o QR Code como DataURL
      const qrCodeDataUrl = await QRCode.toDataURL(uploadUrl, qrOptions);
      this.logger.debug(`QR Code gerado com sucesso para o token: ${token.substring(0, 8)}...`);
      
      return qrCodeDataUrl;
    } catch (error) {
      this.logger.error(`Erro ao gerar QR Code: ${error.message}`, error.stack);
      throw new Error(`Falha ao gerar QR Code: ${error.message}`);
    }
  }

  /**
   * Gera um código QR como buffer de imagem PNG
   * @param token Token de upload
   * @param size Tamanho do QR Code em pixels (opcional)
   * @returns Promise com o buffer da imagem
   */
  async generateQrCodeBuffer(token: string, size?: number): Promise<Buffer> {
    try {
      const uploadUrl = `${this.baseUrl}/${token}`;
      const qrSize = size || this.defaultQrSize;
      
      const qrOptions: QRCodeToBufferOptions = {
        type: 'png',
        width: qrSize,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      };

      // Gerar o QR Code como buffer
      const qrCodeBuffer = await QRCode.toBuffer(uploadUrl, qrOptions);
      this.logger.debug(`QR Code buffer gerado com sucesso para o token: ${token.substring(0, 8)}...`);
      
      return qrCodeBuffer;
    } catch (error) {
      this.logger.error(`Erro ao gerar buffer do QR Code: ${error.message}`, error.stack);
      throw new Error(`Falha ao gerar buffer do QR Code: ${error.message}`);
    }
  }

  /**
   * Gera a URL para upload baseada no token
   * @param token Token de upload
   * @returns URL completa para acesso ao upload
   */
  getUploadUrl(token: string): string {
    return `${this.baseUrl}/${token}`;
  }
}
