import { Injectable, Logger } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  IPdfDados,
  IPdfConteudo,
  IPdfAssinatura,
  IPdfMetadados,
  IPdfConfiguracao
} from '../interfaces';
import {
  PdfTipoConteudo,
  PdfTipoAssinatura,
  PdfOrientacao,
  PdfTamanhoPapel
} from '../enums';
import {
  MENSAGENS_ERRO,
  MENSAGENS_VALIDACAO,
  CONFIGURACAO_PADRAO
} from '../constants';

/**
 * Interface para resultado de validação
 */
export interface IValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Interface para opções de formatação
 */
export interface IFormatOptions {
  locale?: string;
  currency?: string;
  dateFormat?: string;
  numberFormat?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  };
}

/**
 * Interface para opções de sanitização
 */
export interface ISanitizeOptions {
  allowHtml?: boolean;
  maxLength?: number;
  removeSpecialChars?: boolean;
  preserveLineBreaks?: boolean;
}

/**
 * Serviço de utilitários para geração de PDFs
 * Fornece funções auxiliares para validação, formatação e manipulação de dados
 */
@Injectable()
export class PdfUtilsService {
  private readonly logger = new Logger(PdfUtilsService.name);

  /**
   * Valida dados de entrada para geração de PDF
   */
  async validarDadosPdf(dados: IPdfDados): Promise<IValidationResult> {
    try {
      const result: IValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      // Validação básica de estrutura
      if (!dados) {
        result.isValid = false;
        result.errors.push(MENSAGENS_ERRO.DADOS_INVALIDOS);
        return result;
      }

      // Validar conteúdo
      if (!dados.conteudo || dados.conteudo.length === 0) {
        result.isValid = false;
        result.errors.push(MENSAGENS_VALIDACAO.CONTEUDO_OBRIGATORIO);
      } else {
        const conteudoValidation = await this.validarConteudo(dados.conteudo);
        result.errors.push(...conteudoValidation.errors);
        result.warnings.push(...conteudoValidation.warnings);
        if (!conteudoValidation.isValid) {
          result.isValid = false;
        }
      }

      // Validar assinaturas se existirem
      if (dados.assinaturas && dados.assinaturas.length > 0) {
        const assinaturasValidation = await this.validarAssinaturas(dados.assinaturas);
        result.errors.push(...assinaturasValidation.errors);
        result.warnings.push(...assinaturasValidation.warnings);
        if (!assinaturasValidation.isValid) {
          result.isValid = false;
        }
      }

      // Validar metadados se existirem
      if (dados.metadados) {
        const metadadosValidation = await this.validarMetadados(dados.metadados);
        result.errors.push(...metadadosValidation.errors);
        result.warnings.push(...metadadosValidation.warnings);
        if (!metadadosValidation.isValid) {
          result.isValid = false;
        }
      }

      this.logger.debug(`Validação de dados PDF: ${result.isValid ? 'Sucesso' : 'Falha'}`);
      return result;
    } catch (error) {
      this.logger.error('Erro na validação de dados PDF', error);
      return {
        isValid: false,
        errors: [MENSAGENS_ERRO.CONFIGURACAO_INVALIDA],
        warnings: []
      };
    }
  }

  /**
   * Valida configuração de PDF
   */
  async validarConfiguracao(config: IPdfConfiguracao): Promise<IValidationResult> {
    try {
      const result: IValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      // Validar orientação
      if (config.orientacao && !Object.values(PdfOrientacao).includes(config.orientacao)) {
        result.isValid = false;
        result.errors.push(MENSAGENS_VALIDACAO.ORIENTACAO_INVALIDA);
      }

      // Validar tamanho
      if (config.tamanho && !Object.values(PdfTamanhoPapel).includes(config.tamanho)) {
        result.isValid = false;
        result.errors.push(MENSAGENS_VALIDACAO.TAMANHO_PAPEL_INVALIDO);
      }

      // Validar margens
      if (config.margens) {
        const margensValidas = this.validarMargens(config.margens);
        if (!margensValidas) {
          result.isValid = false;
          result.errors.push('Margens inválidas. Deve ser um array com 4 números positivos [esquerda, superior, direita, inferior]');
        }
      }

      return result;
    } catch (error) {
      this.logger.error('Erro na validação de configuração', error);
      return {
        isValid: false,
        errors: [MENSAGENS_ERRO.CONFIGURACAO_INVALIDA],
        warnings: []
      };
    }
  }

  /**
   * Sanitiza texto para uso em PDF
   */
  sanitizarTexto(texto: string, options: ISanitizeOptions = {}): string {
    if (!texto) return '';

    let textoSanitizado = texto;

    // Remover HTML se não permitido
    if (!options.allowHtml) {
      textoSanitizado = textoSanitizado.replace(/<[^>]*>/g, '');
    }

    // Remover caracteres especiais se solicitado
    if (options.removeSpecialChars) {
      textoSanitizado = textoSanitizado.replace(/[^\w\s\-.,!?()]/g, '');
    }

    // Preservar quebras de linha se solicitado
    if (!options.preserveLineBreaks) {
      textoSanitizado = textoSanitizado.replace(/\n/g, ' ');
    }

    // Limitar comprimento se especificado
    if (options.maxLength && textoSanitizado.length > options.maxLength) {
      textoSanitizado = textoSanitizado.substring(0, options.maxLength) + '...';
    }

    return textoSanitizado.trim();
  }

  /**
   * Formata valores monetários
   */
  formatarMoeda(valor: number, options: IFormatOptions = {}): string {
    const locale = options.locale || 'pt-BR';
    const currency = options.currency || 'BRL';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      ...options.numberFormat
    }).format(valor);
  }

  /**
   * Formata datas
   */
  formatarData(data: Date | string, options: IFormatOptions = {}): string {
    const locale = options.locale || 'pt-BR';
    const dateFormat = options.dateFormat || 'dd/MM/yyyy';
    
    const dataObj = typeof data === 'string' ? new Date(data) : data;
    
    if (isNaN(dataObj.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(dataObj);
  }

  /**
   * Formata números
   */
  formatarNumero(numero: number, options: IFormatOptions = {}): string {
    const locale = options.locale || 'pt-BR';
    
    return new Intl.NumberFormat(locale, {
      ...options.numberFormat
    }).format(numero);
  }

  /**
   * Converte texto para slug (URL-friendly)
   */
  gerarSlug(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .trim();
  }

  /**
   * Gera nome de arquivo único
   */
  gerarNomeArquivo(prefixo: string = 'documento', extensao: string = 'pdf'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefixo}-${timestamp}-${random}.${extensao}`;
  }

  /**
   * Calcula dimensões de página
   */
  calcularDimensoesPagina(tamanho: PdfTamanhoPapel, orientacao: PdfOrientacao): { width: number; height: number } {
    const dimensoes = {
      [PdfTamanhoPapel.A4]: { width: 595.28, height: 841.89 },
      [PdfTamanhoPapel.A3]: { width: 841.89, height: 1190.55 },
      [PdfTamanhoPapel.LETTER]: { width: 612, height: 792 }
    };

    const dim = dimensoes[tamanho] || dimensoes[PdfTamanhoPapel.A4];
    
    return orientacao === PdfOrientacao.PAISAGEM 
      ? { width: dim.height, height: dim.width }
      : dim;
  }

  /**
   * Converte cores hexadecimais para RGB
   */
  hexParaRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Valida conteúdo do PDF
   */
  private async validarConteudo(conteudo: IPdfConteudo[]): Promise<IValidationResult> {
    const result: IValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    for (const item of conteudo) {
      // Validar tipo de conteúdo
      if (!Object.values(PdfTipoConteudo).includes(item.tipo as PdfTipoConteudo)) {
        result.isValid = false;
        result.errors.push(`Tipo de conteúdo inválido: ${item.tipo}`);
      }

      // Validar dados específicos por tipo
      switch (item.tipo) {
        case PdfTipoConteudo.TEXTO:
          if (!item.dados || typeof item.dados !== 'string') {
            result.isValid = false;
            result.errors.push('Dados de texto inválidos');
          }
          break;
        case PdfTipoConteudo.TABELA:
          if (!item.dados || !Array.isArray(item.dados)) {
            result.isValid = false;
            result.errors.push('Dados de tabela inválidos');
          }
          break;
        case PdfTipoConteudo.IMAGEM:
          if (!item.dados || typeof item.dados !== 'string') {
            result.isValid = false;
            result.errors.push('Dados de imagem inválidos');
          }
          break;
      }
    }

    return result;
  }

  /**
   * Valida assinaturas
   */
  private async validarAssinaturas(assinaturas: IPdfAssinatura[]): Promise<IValidationResult> {
    const result: IValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    for (const assinatura of assinaturas) {
      // Validar tipo de assinatura
      const tiposValidos = ['tecnico', 'beneficiario', 'requerente'];
      if (!tiposValidos.includes(assinatura.tipo)) {
        result.isValid = false;
        result.errors.push(`Tipo de assinatura inválido: ${assinatura.tipo}`);
      }

      // Validar campos obrigatórios
      if (!assinatura.nome || assinatura.nome.trim() === '') {
        result.isValid = false;
        result.errors.push('Nome da assinatura é obrigatório');
      }

      if (!assinatura.cargo || assinatura.cargo.trim() === '') {
        result.warnings.push('Cargo da assinatura não informado');
      }
    }

    return result;
  }

  /**
   * Valida metadados
   */
  private async validarMetadados(metadados: IPdfMetadados): Promise<IValidationResult> {
    const result: IValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Validar título
    if (!metadados.titulo || metadados.titulo.trim() === '') {
      result.warnings.push('Título do documento não informado');
    }

    // Validar autor
    if (!metadados.autor || metadados.autor.trim() === '') {
      result.warnings.push('Autor do documento não informado');
    }

    return result;
  }

  /**
   * Valida as margens do documento
   * @param margens - Margens a serem validadas [esquerda, superior, direita, inferior]
   * @returns true se válidas, false caso contrário
   */
  validarMargens(margens: any): boolean {
    if (!Array.isArray(margens) || margens.length !== 4) {
      return false;
    }

    return margens.every(valor => typeof valor === 'number' && valor >= 0);
  }
}