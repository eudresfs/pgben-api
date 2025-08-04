import {
  HttpException,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';

/**
 * Exceção lançada quando um documento não é encontrado no storage
 */
export class DocumentoNaoEncontradoException extends NotFoundException {
  constructor(documentoId?: string, caminho?: string) {
    const message = documentoId
      ? `Documento com ID ${documentoId} não foi encontrado`
      : caminho
        ? `Documento não encontrado no caminho: ${caminho}`
        : 'Documento não encontrado';

    super({
      statusCode: HttpStatus.NOT_FOUND,
      message,
      error: 'Documento Não Encontrado',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Exceção lançada quando há problemas de acesso ao documento
 */
export class AcessoNegadoDocumentoException extends ForbiddenException {
  constructor(documentoId?: string) {
    const message = documentoId
      ? `Acesso negado ao documento ${documentoId}`
      : 'Acesso negado ao documento';

    super({
      statusCode: HttpStatus.FORBIDDEN,
      message,
      error: 'Acesso Negado',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Exceção lançada quando há problemas de integridade do documento
 */
export class IntegridadeDocumentoException extends BadRequestException {
  constructor(documentoId?: string, detalhes?: string) {
    const message = documentoId
      ? `Integridade do documento ${documentoId} foi comprometida`
      : 'Integridade do documento foi comprometida';

    super({
      statusCode: HttpStatus.BAD_REQUEST,
      message,
      error: 'Integridade Comprometida',
      details: detalhes,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Exceção lançada quando há problemas de configuração do storage
 */
export class ConfiguracaoStorageException extends ServiceUnavailableException {
  constructor(detalhes?: string) {
    super({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Erro de configuração do sistema de armazenamento',
      error: 'Configuração Inválida',
      details: detalhes,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Exceção lançada quando há falha na descriptografia do documento
 */
export class DescriptografiaDocumentoException extends BadRequestException {
  constructor(documentoId?: string, detalhes?: string) {
    const message = documentoId
      ? `Falha ao descriptografar documento ${documentoId}`
      : 'Falha ao descriptografar documento';

    super({
      statusCode: HttpStatus.BAD_REQUEST,
      message,
      error: 'Falha na Descriptografia',
      details: detalhes,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Exceção lançada quando o storage está temporariamente indisponível
 */
export class StorageIndisponivelException extends ServiceUnavailableException {
  constructor(detalhes?: string) {
    super({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Sistema de armazenamento temporariamente indisponível',
      error: 'Storage Indisponível',
      details: detalhes,
      timestamp: new Date().toISOString(),
    });
  }
}
