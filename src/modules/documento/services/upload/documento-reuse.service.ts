import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadDocumentoDto } from '../../dto/upload-documento.dto';
import { Documento } from '@/entities/documento.entity';
import { LoggingService } from '../../../../shared/logging/logging.service';
import {
  IDocumentoReuseService,
  DocumentReusabilityCheck,
} from './interfaces/documento-reuse.interface';

/**
 * Serviço especializado para verificação de reutilização de documentos
 * Responsável por identificar documentos existentes que podem ser reutilizados
 */
@Injectable()
export class DocumentoReuseService implements IDocumentoReuseService {
  constructor(
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Verifica se um documento pode ser reutilizado
   * @param uploadDocumentoDto DTO com dados do upload
   * @param fileHash Hash do arquivo
   * @param uploadId ID único do upload
   * @returns Resultado da verificação de reutilização
   */
  async checkReusability(
    uploadDocumentoDto: UploadDocumentoDto,
    fileHash: string,
    uploadId: string,
  ): Promise<DocumentReusabilityCheck> {
    this.logger.debug(
      `Verificando reutilização de documento [${uploadId}]`,
      DocumentoReuseService.name,
      {
        uploadId,
        fileHash,
        cidadaoId: uploadDocumentoDto.cidadao_id,
        tipo: uploadDocumentoDto.tipo,
      },
    );

    // Buscar documento existente
    const existingDocument = await this.findExistingDocument(
      fileHash,
      uploadDocumentoDto,
    );

    if (!existingDocument) {
      this.logger.debug(
        `Nenhum documento reutilizável encontrado [${uploadId}]`,
        DocumentoReuseService.name,
        { uploadId, fileHash },
      );

      return {
        canReuse: false,
        reason: 'Nenhum documento existente encontrado com o mesmo hash',
      };
    }

    // Verificar se pode ser reutilizado
    const canReuse = this.canReuseDocument(existingDocument, uploadDocumentoDto);

    const result: DocumentReusabilityCheck = {
      canReuse,
      existingDocument: canReuse ? existingDocument : undefined,
      reason: canReuse
        ? 'Documento existente pode ser reutilizado'
        : 'Documento existente não atende aos critérios de reutilização',
    };

    this.logger.debug(
      `Verificação de reutilização concluída [${uploadId}]`,
      DocumentoReuseService.name,
      {
        uploadId,
        canReuse,
        existingDocumentId: existingDocument.id,
        reason: result.reason,
      },
    );

    return result;
  }

  /**
   * Busca documento existente por hash e critérios
   * @param fileHash Hash do arquivo
   * @param uploadDocumentoDto DTO com dados do upload
   * @returns Documento existente se encontrado
   */
  async findExistingDocument(
    fileHash: string,
    uploadDocumentoDto: UploadDocumentoDto,
  ): Promise<Documento | null> {
    const queryBuilder = this.documentoRepository
      .createQueryBuilder('documento')
      .leftJoinAndSelect('documento.cidadao', 'cidadao')
      .leftJoinAndSelect('documento.tipo', 'tipo')
      .leftJoinAndSelect('documento.usuario', 'usuario')
      .where('documento.hash = :hash', { hash: fileHash })
      .andWhere('documento.cidadao_id = :cidadaoId', {
        cidadaoId: uploadDocumentoDto.cidadao_id,
      });

    // Se tipo foi especificado, filtrar por tipo
    if (uploadDocumentoDto.tipo) {
      queryBuilder.andWhere('documento.tipo = :tipoId', {
        tipoId: uploadDocumentoDto.tipo,
      });
    }

    // Buscar apenas documentos ativos
    queryBuilder.andWhere('documento.ativo = :ativo', { ativo: true });

    return await queryBuilder.getOne();
  }

  /**
   * Verifica se um documento existente pode ser reutilizado
   * @param existingDocument Documento existente
   * @param uploadDocumentoDto DTO com dados do upload
   * @returns True se pode ser reutilizado
   */
  private canReuseDocument(
    existingDocument: Documento,
    uploadDocumentoDto: UploadDocumentoDto,
  ): boolean {
    // Verificar se documento está ativo
    if (!existingDocument.removed_at) {
      return false;
    }

    // Verificar se é do mesmo cidadão
    if (existingDocument.cidadao_id !== uploadDocumentoDto.cidadao_id) {
      return false;
    }

    // Verificar se é do mesmo tipo (se especificado)
    if (
      uploadDocumentoDto.tipo &&
      existingDocument.tipo !== uploadDocumentoDto.tipo
    ) {
      return false;
    }

    // Verificar se não está corrompido ou com problemas
    if (!existingDocument.caminho || !existingDocument.hash_arquivo) {
      return false;
    }

    return true;
  }
}