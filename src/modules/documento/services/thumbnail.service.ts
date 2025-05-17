import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

/**
 * Serviço de geração de miniaturas para imagens
 *
 * Responsável por gerar miniaturas de diferentes tamanhos para
 * imagens enviadas ao sistema, facilitando a visualização rápida
 */
@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);

  /**
   * Tamanhos padrão para miniaturas
   */
  private readonly tamanhos = {
    pequena: { width: 150, height: 150 },
    media: { width: 300, height: 300 },
    grande: { width: 600, height: 600 },
  };

  /**
   * Tipos MIME de imagens suportados para geração de miniaturas
   */
  private readonly tiposSuportados = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/tiff',
    'image/gif',
    'image/bmp',
  ];

  /**
   * Verifica se o tipo MIME é suportado para geração de miniaturas
   * @param mimeType Tipo MIME a ser verificado
   * @returns true se o tipo é suportado, false caso contrário
   */
  canGenerateThumbnail(mimeType: string): boolean {
    return this.tiposSuportados.includes(mimeType);
  }

  /**
   * Gera uma miniatura de tamanho específico para uma imagem
   * @param buffer Buffer da imagem original
   * @param tamanho Tamanho da miniatura ('pequena', 'media' ou 'grande')
   * @returns Buffer da miniatura gerada
   */
  async gerarThumbnail(
    buffer: Buffer,
    tamanho: 'pequena' | 'media' | 'grande' = 'media',
  ): Promise<Buffer> {
    try {
      // Detectar o tipo MIME da imagem usando sharp
      const sharpInstance = sharp(buffer);
      const metadata = await sharpInstance.metadata();
      const mimeType = `image/${metadata.format}`;

      if (!this.canGenerateThumbnail(mimeType)) {
        throw new Error(
          `Tipo de arquivo não suportado para geração de miniaturas: ${mimeType}`,
        );
      }

      // Determinar o formato de saída
      const formato = this.getOutputFormat(mimeType);

      // Gerar a miniatura no tamanho solicitado
      return this.generateSingleThumbnail(
        buffer,
        this.tamanhos[tamanho],
        formato,
      );
    } catch (error) {
      this.logger.error(`Erro ao gerar miniatura: ${error.message}`);
      throw new Error(`Erro ao gerar miniatura: ${error.message}`);
    }
  }

  /**
   * Gera miniaturas de diferentes tamanhos para uma imagem
   * @param buffer Buffer da imagem original
   * @param mimeType Tipo MIME da imagem
   * @returns Objeto com os buffers das miniaturas geradas
   */
  async generateThumbnails(
    buffer: Buffer,
    mimeType: string,
  ): Promise<{
    pequena: Buffer;
    media: Buffer;
    grande: Buffer;
    formato: string;
  }> {
    if (!this.canGenerateThumbnail(mimeType)) {
      throw new Error(
        `Tipo de arquivo não suportado para geração de miniaturas: ${mimeType}`,
      );
    }

    try {
      // Determinar o formato de saída com base no tipo MIME
      const formato = this.getOutputFormat(mimeType);

      // Processar a imagem para obter informações
      const sharpInstance = sharp(buffer);
      const metadata = await sharpInstance.metadata();
      this.logger.debug(
        `Gerando miniaturas para imagem ${metadata.width}x${metadata.height} (${mimeType})`,
      );

      // Gerar miniaturas em paralelo
      const [pequena, media, grande] = await Promise.all([
        this.generateSingleThumbnail(buffer, this.tamanhos.pequena, formato),
        this.generateSingleThumbnail(buffer, this.tamanhos.media, formato),
        this.generateSingleThumbnail(buffer, this.tamanhos.grande, formato),
      ]);

      return {
        pequena,
        media,
        grande,
        formato,
      };
    } catch (error) {
      this.logger.error(`Erro ao gerar miniaturas: ${error.message}`);
      throw new Error(`Erro ao gerar miniaturas: ${error.message}`);
    }
  }

  /**
   * Gera uma única miniatura com o tamanho especificado
   * @param buffer Buffer da imagem original
   * @param size Tamanho da miniatura (largura e altura)
   * @param formato Formato de saída (jpeg, png, webp)
   * @returns Buffer da miniatura gerada
   */
  private async generateSingleThumbnail(
    buffer: Buffer,
    size: { width: number; height: number },
    formato: string,
  ): Promise<Buffer> {
    const sharpInstance = sharp(buffer);
    return sharpInstance
      .resize(size.width, size.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toFormat(formato as keyof sharp.FormatEnum, {
        quality: 80,
        progressive: true,
      })
      .toBuffer();
  }

  /**
   * Determina o formato de saída com base no tipo MIME
   * @param mimeType Tipo MIME da imagem original
   * @returns Formato de saída (jpeg, png, webp)
   */
  private getOutputFormat(mimeType: string): string {
    // Para GIFs, manter o formato original para preservar animações
    if (mimeType === 'image/gif') {
      return 'gif';
    }

    // Para PNGs com transparência, manter o formato PNG
    if (mimeType === 'image/png') {
      return 'png';
    }

    // Para outros tipos, usar JPEG para melhor compressão
    return 'jpeg';
  }
}
