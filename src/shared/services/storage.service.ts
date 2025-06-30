import { Injectable, Logger } from '@nestjs/common';
import { StorageProviderFactory } from '../../modules/documento/factories/storage-provider.factory';

/**
 * Serviço de storage simplificado para compatibilidade
 * Utiliza o StorageProviderFactory do módulo de documento
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly storageProviderFactory: StorageProviderFactory,
  ) {}

  /**
   * Faz upload de um arquivo
   */
  async upload(
    file: Express.Multer.File,
    entityId: string,
  ): Promise<{ url: string; nomeArquivo: string }> {
    const storageProvider = this.storageProviderFactory.getProvider();
    
    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const extension = file.originalname.split('.').pop();
    const nomeArquivo = `comprovante_${entityId}_${timestamp}.${extension}`;
    const caminho = `comprovantes/${entityId}/${nomeArquivo}`;

    // Salvar arquivo
    const caminhoArmazenamento = await storageProvider.salvarArquivo(
      file.buffer,
      caminho,
      file.mimetype,
    );

    return {
      url: caminhoArmazenamento,
      nomeArquivo,
    };
  }

  /**
   * Remove um arquivo
   */
  async remove(caminho: string): Promise<void> {
    const storageProvider = this.storageProviderFactory.getProvider();
    await storageProvider.removerArquivo(caminho);
  }

  /**
   * Obtém o conteúdo de um arquivo
   */
  async getContent(caminho: string): Promise<Buffer> {
    const storageProvider = this.storageProviderFactory.getProvider();
    return await storageProvider.obterArquivo(caminho);
  }
}