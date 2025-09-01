import { Injectable } from '@nestjs/common';
import { LoggingService } from '../../../shared/logging/logging.service';
import { AuditEventEmitter } from '../../auditoria/events/emitters/audit-event.emitter';
import { AuditContextHolder } from '../../../common/interceptors/audit-context.interceptor';
import { AuditEventType } from '../../auditoria/events/types/audit-event.types';
import { SYSTEM_USER_UUID } from '../../../shared/constants/system.constants';

export interface DocumentoPathInfo {
  cidadaoId: string;
  tipoDocumento: string;
  nomeArquivo: string;
  solicitacaoId?: string;
  isDocumentoGeral: boolean;
  categoria: 'documentos-gerais' | 'solicitacoes';
}

export interface DocumentoPathOptions {
  cidadaoId: string;
  tipoDocumento: string;
  nomeArquivo: string;
  solicitacaoId?: string;
}

/**
 * Serviço responsável por gerenciar a estrutura hierárquica de pastas dos documentos
 *
 * Estrutura implementada:
 * - COM solicitação: cidadao_id/solicitacoes/solicitacao_id/tipo_documento/arquivo
 * - SEM solicitação: cidadao_id/documentos-gerais/tipo_documento/arquivo
 */
@Injectable()
export class DocumentoPathService {
  constructor(
    private readonly logger: LoggingService,
    private readonly auditEventEmitter: AuditEventEmitter,
  ) {}

  /**
   * Gera caminho hierárquico para documento
   *
   * @param options Opções para geração do caminho
   * @returns Caminho completo do documento
   */
  generateDocumentPath(options: DocumentoPathOptions): string {
    const { cidadaoId, tipoDocumento, nomeArquivo, solicitacaoId } = options;
    const auditContext = this.getAuditContext();

    // Sanitizar componentes do caminho
    const sanitizedCidadaoId = this.sanitizePath(cidadaoId);
    const sanitizedTipo = this.sanitizePath(tipoDocumento);
    const sanitizedNomeArquivo = this.sanitizeFileName(nomeArquivo);

    let path: string;
    let categoria: 'documentos-gerais' | 'solicitacoes';

    if (solicitacaoId) {
      const sanitizedSolicitacaoId = this.sanitizePath(solicitacaoId);
      path = `${sanitizedCidadaoId}/solicitacoes/${sanitizedSolicitacaoId}/${sanitizedTipo}/${sanitizedNomeArquivo}`;
      categoria = 'solicitacoes';
    } else {
      path = `${sanitizedCidadaoId}/documentos-gerais/${sanitizedTipo}/${sanitizedNomeArquivo}`;
      categoria = 'documentos-gerais';
    }

    // Log do caminho gerado
    this.logger.debug(`Caminho hierárquico gerado: ${path}`, DocumentoPathService.name, {
      cidadaoId,
      tipoDocumento,
      solicitacaoId,
      categoria,
    });

    this.logger.debug(`Caminho gerado: ${path}`, DocumentoPathService.name, {
      cidadaoId,
      tipoDocumento,
      solicitacaoId,
      nomeArquivo,
    });

    return path;
  }

  /**
   * Analisa um caminho de documento e extrai suas informações
   *
   * @param path Caminho do documento
   * @returns Informações extraídas do caminho
   */
  parseDocumentPath(path: string): DocumentoPathInfo {
    const auditContext = this.getAuditContext();

    try {
      if (!path || typeof path !== 'string') {
        throw new Error(
          'Caminho do documento é obrigatório e deve ser uma string',
        );
      }

      const parts = path.split('/').filter((part) => part.length > 0);

      if (parts.length < 3) {
        throw new Error(
          `Caminho inválido: ${path}. Formato esperado: cidadao/categoria/tipo/arquivo`,
        );
      }

      const cidadaoId = parts[0];
      const categoria = parts[1];
      let pathInfo: DocumentoPathInfo;

      if (categoria === 'documentos-gerais') {
        if (parts.length < 3) {
          throw new Error(`Caminho inválido para documento geral: ${path}`);
        }

        pathInfo = {
          cidadaoId,
          tipoDocumento: parts[2],
          nomeArquivo: parts.slice(3).join('/'), // Suporta arquivos com / no nome
          isDocumentoGeral: true,
          categoria: 'documentos-gerais',
        };
      } else if (categoria === 'solicitacoes') {
        if (parts.length < 4) {
          throw new Error(
            `Caminho inválido para documento de solicitação: ${path}`,
          );
        }

        pathInfo = {
          cidadaoId,
          solicitacaoId: parts[2],
          tipoDocumento: parts[3],
          nomeArquivo: parts.slice(4).join('/'), // Suporta arquivos com / no nome
          isDocumentoGeral: false,
          categoria: 'solicitacoes',
        };
      } else {
        throw new Error(`Categoria de documento não reconhecida: ${categoria}`);
      }

      return pathInfo;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Gera caminho para migração de documento existente
   *
   * @param documentoAtual Informações do documento atual
   * @param novaCategoria Nova categoria do documento
   * @param novaSolicitacaoId Nova solicitação (se aplicável)
   * @returns Novo caminho do documento
   */
  generateMigrationPath(
    documentoAtual: DocumentoPathInfo,
    novaCategoria: 'documentos-gerais' | 'solicitacoes',
    novaSolicitacaoId?: string,
  ): string {
    const options: DocumentoPathOptions = {
      cidadaoId: documentoAtual.cidadaoId,
      tipoDocumento: documentoAtual.tipoDocumento,
      nomeArquivo: documentoAtual.nomeArquivo,
    };

    if (novaCategoria === 'solicitacoes') {
      if (!novaSolicitacaoId) {
        throw new Error(
          'ID da solicitação é obrigatório para categoria "solicitacoes"',
        );
      }
      options.solicitacaoId = novaSolicitacaoId;
    }

    return this.generateDocumentPath(options);
  }

  /**
   * Verifica se um caminho segue o padrão hierárquico
   *
   * @param path Caminho a ser verificado
   * @returns true se o caminho é válido
   */
  isValidHierarchicalPath(path: string): boolean {
    try {
      this.parseDocumentPath(path);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gera caminho de diretório (sem o nome do arquivo)
   *
   * @param options Opções para geração do caminho
   * @returns Caminho do diretório
   */
  generateDirectoryPath(
    options: Omit<DocumentoPathOptions, 'nomeArquivo'>,
  ): string {
    const { cidadaoId, tipoDocumento, solicitacaoId } = options;

    const sanitizedCidadaoId = this.sanitizePath(cidadaoId);
    const sanitizedTipo = this.sanitizePath(tipoDocumento);

    if (solicitacaoId) {
      const sanitizedSolicitacaoId = this.sanitizePath(solicitacaoId);
      return `${sanitizedCidadaoId}/solicitacoes/${sanitizedSolicitacaoId}/${sanitizedTipo}`;
    } else {
      return `${sanitizedCidadaoId}/documentos-gerais/${sanitizedTipo}`;
    }
  }

  /**
   * Lista todos os tipos de documento de um cidadão
   *
   * @param cidadaoId ID do cidadão
   * @param categoria Categoria dos documentos
   * @param solicitacaoId ID da solicitação (se categoria for 'solicitacoes')
   * @returns Padrão de busca para listar documentos
   */
  generateSearchPattern(
    cidadaoId: string,
    categoria?: 'documentos-gerais' | 'solicitacoes',
    solicitacaoId?: string,
  ): string {
    const sanitizedCidadaoId = this.sanitizePath(cidadaoId);

    if (!categoria) {
      return `${sanitizedCidadaoId}/`;
    }

    if (categoria === 'solicitacoes' && solicitacaoId) {
      const sanitizedSolicitacaoId = this.sanitizePath(solicitacaoId);
      return `${sanitizedCidadaoId}/solicitacoes/${sanitizedSolicitacaoId}/`;
    }

    if (categoria === 'documentos-gerais') {
      return `${sanitizedCidadaoId}/documentos-gerais/`;
    }

    return `${sanitizedCidadaoId}/${categoria}/`;
  }

  /**
   * Sanitiza componente do caminho removendo caracteres perigosos
   *
   * @param input String a ser sanitizada
   * @returns String sanitizada
   */
  private sanitizePath(input: string): string {
    if (!input || typeof input !== 'string') {
      throw new Error('Input para sanitização deve ser uma string não vazia');
    }

    // Remove caracteres perigosos e limita tamanho
    return input
      .replace(/[<>:"|?*\x00-\x1f]/g, '_') // Caracteres perigosos
      .replace(/\.\./g, '_') // Path traversal
      .replace(/^\.|\.$/, '_') // Pontos no início/fim
      .substring(0, 50) // Limita tamanho
      .trim();
  }

  /**
   * Sanitiza nome de arquivo preservando extensão
   *
   * @param fileName Nome do arquivo
   * @returns Nome sanitizado
   */
  private sanitizeFileName(fileName: string): string {
    if (!fileName || typeof fileName !== 'string') {
      throw new Error('Nome do arquivo deve ser uma string não vazia');
    }

    // Separa nome e extensão
    const lastDotIndex = fileName.lastIndexOf('.');
    let name = fileName;
    let extension = '';

    if (lastDotIndex > 0) {
      name = fileName.substring(0, lastDotIndex);
      extension = fileName.substring(lastDotIndex);
    }

    // Sanitiza o nome preservando a extensão
    const sanitizedName = name
      .replace(/[<>:"|?*\x00-\x1f]/g, '_')
      .replace(/\.\.+/g, '_')
      .substring(0, 100)
      .trim();

    // Sanitiza a extensão
    const sanitizedExtension = extension
      .replace(/[<>:"|?*\x00-\x1f]/g, '')
      .substring(0, 10);

    return sanitizedName + sanitizedExtension;
  }

  /**
   * Obtém o contexto de auditoria atual
   * @returns Contexto de auditoria com informações do usuário e requisição
   */
  private getAuditContext() {
    const context = AuditContextHolder.get();
    return {
      userAgent: context?.userAgent || 'unknown',
      ipAddress: context?.ip || 'unknown',
      userId: context?.userId || SYSTEM_USER_UUID,
    };
  }
}
