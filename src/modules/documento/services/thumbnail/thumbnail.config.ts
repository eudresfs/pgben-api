/**
 * Configurações do serviço de thumbnail
 * Centraliza todas as configurações relacionadas à geração de thumbnails
 */
export interface ThumbnailConfig {
  /** Configurações para processamento de PDF */
  pdf: {
    /** Densidade para conversão PDF (DPI) */
    density: number;
    /** Formato de saída para thumbnails de PDF */
    format: 'jpeg' | 'png' | 'webp';
    /** Largura do thumbnail de PDF */
    width: number;
    /** Altura do thumbnail de PDF */
    height: number;
    /** Qualidade de compressão (1-100) */
    quality: number;
    /** Timeout para processamento de PDF (ms) */
    timeoutMs: number;
  };

  /** Configurações para processamento de imagens */
  image: {
    /** Largura padrão do thumbnail */
    width: number;
    /** Altura padrão do thumbnail */
    height: number;
    /** Qualidade padrão de compressão (1-100) */
    quality: number;
    /** Timeout para processamento de imagem (ms) */
    timeoutMs: number;
    /** Tamanho máximo do buffer de entrada (bytes) */
    maxBufferSize: number;
    /** Configurações específicas por formato */
    formatSettings: {
      jpeg: {
        quality: number;
        progressive: boolean;
        mozjpeg: boolean;
      };
      png: {
        quality: number;
        compressionLevel: number;
        progressive: boolean;
      };
      webp: {
        quality: number;
        effort: number;
      };
      gif: {
        quality: number;
      };
      tiff: {
        quality: number;
      };
    };
    /** Configurações de otimização baseadas no tamanho */
    sizeOptimization: {
      /** Limite para imagens grandes (pixels) */
      largeImageThreshold: number;
      /** Qualidade para imagens grandes */
      largeImageQuality: number;
      /** Limite para imagens pequenas (pixels) */
      smallImageThreshold: number;
      /** Qualidade para imagens pequenas */
      smallImageQuality: number;
    };
  };

  /** Configurações gerais */
  general: {
    /** Diretório base para thumbnails padrão */
    defaultThumbnailsPath: string;
    /** Mapeamento de tipos para thumbnails padrão */
    defaultThumbnails: Record<string, string>;
    /** Habilitar logs de debug */
    enableDebugLogs: boolean;
    /** Habilitar verificação de dependências na inicialização */
    enableDependencyCheck: boolean;
  };
}

/**
 * Configuração padrão do serviço de thumbnail
 */
export const DEFAULT_THUMBNAIL_CONFIG: ThumbnailConfig = {
  pdf: {
    density: 150,
    format: 'jpeg',
    width: 200,
    height: 200,
    quality: 85,
    timeoutMs: 30000, // 30 segundos
  },

  image: {
    width: 200,
    height: 200,
    quality: 80,
    timeoutMs: 15000, // 15 segundos
    maxBufferSize: 10 * 1024 * 1024, // 10MB
    formatSettings: {
      jpeg: {
        quality: 80,
        progressive: true,
        mozjpeg: true,
      },
      png: {
        quality: 90,
        compressionLevel: 9,
        progressive: true,
      },
      webp: {
        quality: 85,
        effort: 6,
      },
      gif: {
        quality: 70,
      },
      tiff: {
        quality: 90,
      },
    },
    sizeOptimization: {
      largeImageThreshold: 4000000, // 4MP
      largeImageQuality: 70,
      smallImageThreshold: 500000, // 0.5MP
      smallImageQuality: 90,
    },
  },

  general: {
    defaultThumbnailsPath: 'assets/thumbnails',
    defaultThumbnails: {
      pdf: 'pdf-default.jpg',
      docx: 'word-default.jpg',
      doc: 'word-default.jpg',
      xlsx: 'excel-default.jpg',
      xls: 'excel-default.jpg',
      image: 'image-default.jpg',
      default: 'document-default.jpg',
    },
    enableDebugLogs: process.env.NODE_ENV === 'development',
    enableDependencyCheck: true,
  },
};

/**
 * Utilitário para mesclar configurações personalizadas com as padrão
 * @param customConfig Configurações personalizadas
 * @returns Configuração mesclada
 */
export function mergeConfig(customConfig: Partial<ThumbnailConfig> = {}): ThumbnailConfig {
  return {
    pdf: {
      ...DEFAULT_THUMBNAIL_CONFIG.pdf,
      ...customConfig.pdf,
    },
    image: {
      ...DEFAULT_THUMBNAIL_CONFIG.image,
      formatSettings: {
        ...DEFAULT_THUMBNAIL_CONFIG.image.formatSettings,
        ...customConfig.image?.formatSettings,
      },
      sizeOptimization: {
        ...DEFAULT_THUMBNAIL_CONFIG.image.sizeOptimization,
        ...customConfig.image?.sizeOptimization,
      },
      ...customConfig.image,
    },
    general: {
      ...DEFAULT_THUMBNAIL_CONFIG.general,
      defaultThumbnails: {
        ...DEFAULT_THUMBNAIL_CONFIG.general.defaultThumbnails,
        ...customConfig.general?.defaultThumbnails,
      },
      ...customConfig.general,
    },
  };
}

/**
 * Validador de configuração
 * @param config Configuração para validar
 * @throws Error se a configuração for inválida
 */
export function validateConfig(config: ThumbnailConfig): void {
  // Validar configurações de PDF
  if (config.pdf.density <= 0 || config.pdf.density > 600) {
    throw new Error('PDF density deve estar entre 1 e 600 DPI');
  }
  
  if (config.pdf.quality < 1 || config.pdf.quality > 100) {
    throw new Error('PDF quality deve estar entre 1 e 100');
  }
  
  if (config.pdf.timeoutMs < 1000) {
    throw new Error('PDF timeout deve ser pelo menos 1000ms');
  }

  // Validar configurações de imagem
  if (config.image.width <= 0 || config.image.height <= 0) {
    throw new Error('Dimensões da imagem devem ser positivas');
  }
  
  if (config.image.quality < 1 || config.image.quality > 100) {
    throw new Error('Image quality deve estar entre 1 e 100');
  }
  
  if (config.image.timeoutMs < 1000) {
    throw new Error('Image timeout deve ser pelo menos 1000ms');
  }
  
  if (config.image.maxBufferSize < 1024) {
    throw new Error('Max buffer size deve ser pelo menos 1KB');
  }

  // Validar otimizações de tamanho
  const sizeOpt = config.image.sizeOptimization;
  if (sizeOpt.largeImageThreshold <= sizeOpt.smallImageThreshold) {
    throw new Error('Large image threshold deve ser maior que small image threshold');
  }
  
  if (sizeOpt.largeImageQuality < 1 || sizeOpt.largeImageQuality > 100 ||
      sizeOpt.smallImageQuality < 1 || sizeOpt.smallImageQuality > 100) {
    throw new Error('Qualidades de otimização devem estar entre 1 e 100');
  }
}