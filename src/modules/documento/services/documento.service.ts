import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Documento } from '../../../entities/documento.entity';
import { InputSanitizerValidator } from '../validators/input-sanitizer.validator';
import { StorageProviderFactory } from '../factories/storage-provider.factory';
import { UploadDocumentoDto } from '../dto/upload-documento.dto';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { normalizeEnumFields } from '../../../shared/utils/enum-normalizer.util';
import { LoggingService } from '../../../shared/logging/logging.service';
import { ConfigService } from '@nestjs/config';
import {
  MimeValidationService,
  MimeValidationResult,
} from './mime-validation.service';
import {
  DocumentoAuditService,
  DocumentoAuditContext,
} from './documento-audit.service';
import { DocumentoPathService } from './documento-path.service';
import {
  DocumentoUploadValidationService,
  DocumentoFileProcessingService,
  DocumentoReuseService,
  DocumentoStorageService,
  DocumentoMetadataService,
  DocumentoPersistenceService,
  UploadValidationResult,
} from './upload';

// Interfaces para refatoração do método upload

interface FileProcessingResult {
  mimeValidation: MimeValidationResult;
  fileHash: string;
  fileName: string;
  storagePath: string;
}

interface DocumentReusabilityCheck {
  canReuse: boolean;
  existingDocument?: Documento;
}

interface UploadMetadata {
  uploadId: string;
  timestamp: string;
  fileHash: string;
  validationResult: MimeValidationResult;
  storageProvider: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class DocumentoService {
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,

    private readonly inputSanitizer: InputSanitizerValidator,
    private readonly storageProviderFactory: StorageProviderFactory,
    private readonly configService: ConfigService,
    private readonly mimeValidationService: MimeValidationService,
    private readonly logger: LoggingService,
    private readonly auditService: DocumentoAuditService,
    private readonly pathService: DocumentoPathService,

    // Novos serviços especializados para upload
    private readonly uploadValidationService: DocumentoUploadValidationService,
    private readonly fileProcessingService: DocumentoFileProcessingService,
    private readonly reuseService: DocumentoReuseService,
    private readonly storageService: DocumentoStorageService,
    private readonly metadataService: DocumentoMetadataService,
    private readonly persistenceService: DocumentoPersistenceService,
  ) {
    this.maxRetries = this.configService.get<number>(
      'DOCUMENTO_MAX_RETRIES',
      3,
    );
    this.retryDelay = this.configService.get<number>(
      'DOCUMENTO_RETRY_DELAY',
      1000,
    );
  }

  /**
   * Lista documentos por cidadão
   */
  async findByCidadao(
    cidadaoId: string,
    tipo?: string,
    reutilizavel?: boolean,
  ) {
    const queryBuilder = this.documentoRepository
      .createQueryBuilder('documento')
      .leftJoinAndSelect('documento.usuario_upload', 'usuario_upload')
      .leftJoinAndSelect('documento.usuario_verificacao', 'usuario_verificacao')
      .where('documento.cidadao_id = :cidadaoId', { cidadaoId })
      .andWhere('documento.removed_at IS NULL')
      .orderBy('documento.data_upload', 'DESC');

    if (tipo) {
      queryBuilder.andWhere('documento.tipo = :tipo', { tipo });
    }

    if (reutilizavel) {
      queryBuilder.andWhere('documento.reutilizavel = :reutilizavel', {
        reutilizavel,
      });
    }

    return queryBuilder.getMany();
  }

  /**
   * Lista documentos por solicitação
   */
  async findBySolicitacao(solicitacaoId: string, tipo?: string) {
    const queryBuilder = this.documentoRepository
      .createQueryBuilder('documento')
      .leftJoinAndSelect('documento.usuario_upload', 'usuario_upload')
      .leftJoinAndSelect('documento.usuario_verificacao', 'usuario_verificacao')
      .where('documento.solicitacao_id = :solicitacaoId', { solicitacaoId })
      .andWhere('documento.removed_at IS NULL')
      .orderBy('documento.data_upload', 'DESC');

    if (tipo) {
      queryBuilder.andWhere('documento.tipo = :tipo', { tipo });
    }

    return queryBuilder.getMany();
  }

  /**
   * Busca um documento pelo ID
   */
  async findById(id: string) {
    const documento = await this.documentoRepository
      .createQueryBuilder('documento')
      .leftJoinAndSelect('documento.usuario_upload', 'usuario_upload')
      .leftJoinAndSelect('documento.usuario_verificacao', 'usuario_verificacao')
      .where('documento.id = :id', { id })
      .andWhere('documento.removed_at IS NULL')
      .getOne();

    if (!documento) {
      throw new NotFoundException('Documento não encontrado');
    }

    return documento;
  }

  /**
   * Verifica se o usuário tem acesso ao documento
   * @param documentoId ID do documento
   * @param usuarioId ID do usuário
   * @param userRoles Roles do usuário
   * @param auditContext Contexto para auditoria (opcional)
   * @returns true se o usuário tem acesso, false caso contrário
   */
  async checkUserDocumentAccess(
    documentoId: string,
    usuarioId: string,
    userRoles: string[] = [],
    auditContext?: DocumentoAuditContext,
  ): Promise<boolean> {
    try {
      const documento = await this.documentoRepository
        .createQueryBuilder('documento')
        .leftJoinAndSelect('documento.solicitacao', 'solicitacao')
        .leftJoinAndSelect('documento.cidadao', 'cidadao')
        .where('documento.id = :documentoId', { documentoId })
        .andWhere('documento.removed_at IS NULL')
        .getOne();

      if (!documento) {
        this.logger.warn(
          `Tentativa de acesso a documento inexistente: ${documentoId}`,
          DocumentoService.name,
          { documentoId, usuarioId },
        );
        return false;
      }

      // Administradores têm acesso total
      if (userRoles.includes('admin') || userRoles.includes('super_admin')) {
        this.logger.debug(
          `Acesso administrativo concedido ao documento ${documentoId}`,
          DocumentoService.name,
          { documentoId, usuarioId, roles: userRoles },
        );
        if (auditContext) {
          await this.auditService.auditSecurityOperation(auditContext, {
            documentoId: documento.id,
            operationType: 'access_check',
            operationDetails: { accessGranted: true, reason: 'admin_access' },
            success: true,
          });
        }
        return true;
      }

      // Usuário que fez upload tem acesso
      if (documento.usuario_upload_id === usuarioId) {
        this.logger.debug(
          `Acesso concedido ao uploader do documento ${documentoId}`,
          DocumentoService.name,
          { documentoId, usuarioId },
        );
        if (auditContext) {
          await this.auditService.auditSecurityOperation(auditContext, {
            documentoId: documento.id,
            operationType: 'access_check',
            operationDetails: {
              accessGranted: true,
              reason: 'uploader_access',
            },
            success: true,
          });
        }
        return true;
      }

      // Usuário que verificou o documento tem acesso
      if (documento.usuario_verificacao_id === usuarioId) {
        this.logger.debug(
          `Acesso concedido ao verificador do documento ${documentoId}`,
          DocumentoService.name,
          { documentoId, usuarioId },
        );
        if (auditContext) {
          await this.auditService.auditSecurityOperation(auditContext, {
            documentoId: documento.id,
            operationType: 'access_check',
            operationDetails: {
              accessGranted: true,
              reason: 'verifier_access',
            },
            success: true,
          });
        }
        return true;
      }

      // Verificar se o usuário é o cidadão dono do documento
      if (documento.cidadao_id === usuarioId) {
        this.logger.debug(
          `Acesso concedido ao cidadão proprietário do documento ${documentoId}`,
          DocumentoService.name,
          { documentoId, usuarioId },
        );
        if (auditContext) {
          await this.auditService.auditSecurityOperation(auditContext, {
            documentoId: documento.id,
            operationType: 'access_check',
            operationDetails: { accessGranted: true, reason: 'owner_access' },
            success: true,
          });
        }
        return true;
      }

      // Verificar se o usuário tem acesso através da solicitação
      if (documento.solicitacao) {
        // Aqui você pode implementar lógica adicional para verificar
        // se o usuário tem acesso à solicitação associada
        // Por exemplo, se for um analista responsável pela solicitação
        this.logger.debug(
          `Verificando acesso via solicitação para documento ${documentoId}`,
          DocumentoService.name,
          { documentoId, usuarioId, solicitacaoId: documento.solicitacao_id },
        );
      }

      // Analistas podem ter acesso a documentos verificados
      if (userRoles.includes('analista') && documento.verificado) {
        this.logger.debug(
          `Acesso de analista concedido ao documento verificado ${documentoId}`,
          DocumentoService.name,
          { documentoId, usuarioId },
        );
        if (auditContext) {
          await this.auditService.auditSecurityOperation(auditContext, {
            documentoId: documento.id,
            operationType: 'access_check',
            operationDetails: {
              accessGranted: true,
              reason: 'analyst_verified_access',
            },
            success: true,
          });
        }
        return true;
      }

      this.logger.warn(
        `Acesso negado ao documento ${documentoId}`,
        DocumentoService.name,
        { documentoId, usuarioId, roles: userRoles },
      );

      // Acesso negado - auditar
      if (auditContext) {
        await this.auditService.auditAccessDenied(
          documento.id,
          auditContext,
          'Usuário não possui permissão para acessar este documento',
          'document_access',
        );
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar acesso ao documento ${documentoId}`,
        error,
        DocumentoService.name,
        { documentoId, usuarioId },
      );
      return false;
    }
  }

  /**
   * Busca um documento pelo ID com verificação de acesso
   */
  async findByIdWithAccess(
    id: string,
    usuarioId: string,
    userRoles: string[] = [],
  ) {
    const hasAccess = await this.checkUserDocumentAccess(
      id,
      usuarioId,
      userRoles,
    );

    if (!hasAccess) {
      throw new ForbiddenException('Acesso negado ao documento');
    }

    return this.findById(id);
  }

  /**
   * Faz o download de um documento com verificação de acesso
   */
  async download(
    id: string,
    usuarioId?: string,
    userRoles: string[] = [],
  ): Promise<{ buffer: Buffer; mimetype: string; nomeOriginal: string }> {
    let documento: Documento;

    if (usuarioId) {
      // Usar método com verificação de acesso
      documento = await this.findByIdWithAccess(id, usuarioId, userRoles);
    } else {
      // Manter compatibilidade com código existente (temporário)
      documento = await this.findById(id);
      this.logger.warn(
        `Download sem verificação de acesso para documento ${id}`,
        DocumentoService.name,
        { documentoId: id },
      );
    }

    const storageProvider = this.storageProviderFactory.getProvider();

    try {
      const buffer = await storageProvider.obterArquivo(documento.caminho);

      this.logger.info(
        `Download realizado com sucesso para documento ${id}`,
        DocumentoService.name,
        { documentoId: id, usuarioId, tamanho: buffer.length },
      );

      return {
        buffer,
        mimetype: documento.mimetype,
        nomeOriginal: documento.nome_original,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao fazer download do documento ${id}`,
        error,
        DocumentoService.name,
        { documentoId: id, usuarioId },
      );
      throw new InternalServerErrorException(
        'Erro ao fazer download do documento',
      );
    }
  }

  /**
   * Método auxiliar para retry com backoff exponencial
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = this.maxRetries,
  ): Promise<T> {
    let lastError: Error = new Error(
      'Operação falhou após todas as tentativas',
    );

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.debug(
          `Tentativa ${attempt}/${maxRetries} para ${operationName}`,
          DocumentoService.name,
        );
        return await operation();
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Falha na tentativa ${attempt}/${maxRetries} para ${operationName}: ${error.message}`,
          DocumentoService.name,
          { error: error.message, attempt, maxRetries },
        );

        if (attempt < maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // Backoff exponencial
          this.logger.debug(
            `Aguardando ${delay}ms antes da próxima tentativa`,
            DocumentoService.name,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  // Métodos privados removidos - funcionalidades movidas para serviços especializados:
  // - validateUploadConfiguration -> DocumentoUploadValidationService
  // - validateUploadInput -> DocumentoUploadValidationService
  // - processFileValidation -> DocumentoFileProcessingService
  // - checkDocumentReuse -> DocumentoReuseService
  // - saveToStorage -> DocumentoStorageService
  // - saveToDatabase -> DocumentoPersistenceService
  // - handleUploadCleanup -> DocumentoStorageService

  /**
   * Método principal de upload refatorado - atua como orquestrador
   * Utiliza os novos serviços especializados para cada responsabilidade
   */
  async upload(
    arquivo: any,
    uploadDocumentoDto: UploadDocumentoDto,
    usuarioId: string,
  ) {
    let caminhoArmazenamento: string | null = null;
    const startTime = Date.now();

    try {
      // 1. Validação de configuração e entrada
      this.uploadValidationService.validateConfiguration();
      const validation = this.uploadValidationService.validateInput(
        arquivo,
        uploadDocumentoDto,
        usuarioId,
      );

      if (!validation.isValid) {
        throw new BadRequestException(
          `Dados inválidos: ${validation.errors.join(', ')}`,
        );
      }

      this.logger.debug(
        `Upload iniciado - ID: ${validation.uploadId}`,
        DocumentoService.name,
      );

      // 2. Processamento do arquivo (validação MIME, hash, nome único)
      const fileProcessingResult = await this.fileProcessingService.processFile(
        arquivo,
        uploadDocumentoDto,
        validation.uploadId,
      );

      this.logger.debug(
        `Arquivo processado - Hash: ${fileProcessingResult.fileHash}`,
        DocumentoService.name,
      );

      // 3. Verificação de reutilização
      const reuseCheck = await this.reuseService.checkReusability(
        uploadDocumentoDto,
        fileProcessingResult.fileHash,
        validation.uploadId,
      );

      if (reuseCheck.canReuse && reuseCheck.existingDocument) {
        this.logger.info(
          `Documento reutilizado: ${reuseCheck.existingDocument.id}`,
          DocumentoService.name,
        );

        // Auditar reutilização
        await this.auditService.auditAccess(
          {
            userId: usuarioId,
            userRoles: [], // TODO: Implementar roles
            ip: 'unknown', // TODO: Capturar IP
            userAgent: 'unknown', // TODO: Capturar User Agent
          },
          {
            documentoId: reuseCheck.existingDocument.id,
            filename: reuseCheck.existingDocument.nome_original,
            mimetype: reuseCheck.existingDocument.mimetype,
            fileSize: reuseCheck.existingDocument.tamanho,
            cidadaoId: reuseCheck.existingDocument.cidadao_id,
            solicitacaoId: reuseCheck.existingDocument.solicitacao_id,
            accessType: 'upload',
            success: true,
          },
        );

        return reuseCheck.existingDocument;
      }

      // 4. Geração do caminho de armazenamento
      const storagePath = this.storageService.generateStoragePath(
        uploadDocumentoDto,
        fileProcessingResult.fileName,
      );

      this.logger.debug(
        `Caminho de storage gerado: ${storagePath}`,
        DocumentoService.name,
      );

      // 5. Salvamento no storage
      caminhoArmazenamento = await this.storageService.saveFile(
        arquivo,
        storagePath,
        uploadDocumentoDto,
        validation.uploadId,
      );

      this.logger.debug(
        `Arquivo salvo no storage: ${caminhoArmazenamento}`,
        DocumentoService.name,
      );

      // 6. Criação dos metadados
      const metadata = this.metadataService.createMetadata(
        validation.uploadId,
        fileProcessingResult,
        uploadDocumentoDto,
      );

      const enrichedMetadata = this.metadataService.enrichMetadata(metadata, {
        storagePath: caminhoArmazenamento,
      });

      // 7. Persistência no banco de dados
      const savedDocument = await this.persistenceService.saveDocument(
        arquivo,
        uploadDocumentoDto,
        usuarioId,
        fileProcessingResult,
        caminhoArmazenamento,
        enrichedMetadata,
        validation.uploadId,
      );

      this.logger.info(
        `Documento salvo com sucesso: ${savedDocument.id}`,
        DocumentoService.name,
      );

      // 8. Auditoria do upload
      await this.auditService.auditUpload(
        {
          userId: usuarioId,
          userRoles: [], // TODO: Implementar roles
          ip: 'unknown', // TODO: Capturar IP
          userAgent: 'unknown', // TODO: Capturar User Agent
        },
        {
          documentoId: savedDocument.id,
          operationType: 'upload',
          operationDetails: {
            fileName: arquivo.originalname,
            fileSize: arquivo.size,
            mimetype: arquivo.mimetype,
            uploadId: validation.uploadId || 'unknown',
          },
          success: true,
        },
      );

      const duration = Date.now() - startTime;
      this.logger.info(
        `Upload concluído em ${duration}ms - Documento: ${savedDocument.id}`,
        DocumentoService.name,
      );

      return savedDocument;
    } catch (error) {
      // Cleanup em caso de erro usando o serviço especializado
      if (caminhoArmazenamento) {
        try {
          await this.storageService.cleanupFile(
            caminhoArmazenamento,
            'unknown',
          );
          this.logger.debug(
            `Arquivo removido do storage após erro: ${caminhoArmazenamento}`,
            DocumentoService.name,
          );
        } catch (cleanupError) {
          this.logger.error(
            `Erro ao limpar arquivo do storage: ${cleanupError.message}`,
            cleanupError.stack,
            DocumentoService.name,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.logger.error(
        `Erro no upload após ${duration}ms: ${error.message}`,
        error.stack,
        DocumentoService.name,
      );

      throw error;
    }
  }

  /**
   * Marca um documento como verificado
   */
  async verificar(id: string, usuarioId: string, observacoes?: string) {
    const documento = await this.findById(id);

    if (documento.verificado) {
      throw new BadRequestException('Documento já foi verificado');
    }

    documento.verificado = true;
    documento.data_verificacao = new Date();
    documento.usuario_verificacao_id = usuarioId;
    documento.observacoes_verificacao = observacoes;

    const documentoAtualizado = await this.documentoRepository.save(documento);

    return this.documentoRepository
      .createQueryBuilder('documento')
      .leftJoinAndSelect('documento.usuario_upload', 'usuario_upload')
      .leftJoinAndSelect('documento.usuario_verificacao', 'usuario_verificacao')
      .where('documento.id = :id', { id: documentoAtualizado.id })
      .getOne();
  }

  /**
   * Remove um documento (soft delete)
   */
  async remover(id: string, usuarioId: string) {
    const documento = await this.findById(id);

    documento.removed_at = new Date();
    // Nota: removed_by não está definido na entidade, seria necessário adicionar se precisar

    return this.documentoRepository.save(documento);
  }

  /**
   * Busca documentos reutilizáveis por tipo e cidadão
   */
  async findReutilizaveis(cidadaoId?: string, tipo?: string) {
    const queryBuilder = this.documentoRepository
      .createQueryBuilder('documento')
      .leftJoinAndSelect('documento.usuario_upload', 'usuario_upload')
      .leftJoinAndSelect('documento.usuario_verificacao', 'usuario_verificacao')
      .where('documento.reutilizavel = :reutilizavel', { reutilizavel: true })
      .andWhere('documento.verificado = :verificado', { verificado: true })
      .andWhere('documento.removed_at IS NULL')
      .andWhere(
        '(documento.data_validade IS NULL OR documento.data_validade >= :now)',
        { now: new Date() },
      )
      .orderBy('documento.data_upload', 'DESC');

    if (cidadaoId) {
      queryBuilder.andWhere('documento.cidadao_id = :cidadaoId', { cidadaoId });
    }

    if (tipo) {
      queryBuilder.andWhere('documento.tipo = :tipo', { tipo });
    }

    return queryBuilder.getMany();
  }

  /**
   * Busca documentos com base em um campo específico nos metadados
   * @param chave Nome da chave no objeto metadados
   * @param valor Valor a ser buscado
   * @returns Lista de documentos que correspondem ao critério
   */
  async findByMetadata(chave: string, valor: any) {
    const queryBuilder = this.documentoRepository
      .createQueryBuilder('documento')
      .leftJoinAndSelect('documento.usuario_upload', 'usuario_upload')
      .leftJoinAndSelect('documento.usuario_verificacao', 'usuario_verificacao')
      .where(`documento.metadados->>'${chave}' = :valor`, { valor })
      .andWhere('documento.removed_at IS NULL')
      .orderBy('documento.data_upload', 'DESC');

    return queryBuilder.getMany();
  }

  /**
   * Busca documentos por IDs de sessão de upload
   * @param sessionIds Lista de IDs de sessões de upload
   * @returns Lista de documentos associados às sessões de upload especificadas
   */
  async findByUploadSessionIds(sessionIds: string[]): Promise<Documento[]> {
    if (!sessionIds || sessionIds.length === 0) {
      return [];
    }

    return this.documentoRepository
      .createQueryBuilder('documento')
      .leftJoinAndSelect('documento.usuario_upload', 'usuario_upload')
      .leftJoinAndSelect('documento.usuario_verificacao', 'usuario_verificacao')
      .where('documento.upload_session_id IN (:...sessionIds)', { sessionIds })
      .andWhere('documento.removed_at IS NULL')
      .orderBy('documento.data_upload', 'DESC')
      .getMany();
  }

  /**
   * Obtém estatísticas de documentos
   */
  async getEstatisticas(cidadaoId?: string) {
    const baseQuery = this.documentoRepository
      .createQueryBuilder('documento')
      .where('documento.removed_at IS NULL');

    if (cidadaoId) {
      baseQuery.andWhere('documento.cidadao_id = :cidadaoId', { cidadaoId });
    }

    const [total, verificados, pendentes, reutilizaveis] = await Promise.all([
      baseQuery.getCount(),
      baseQuery
        .clone()
        .andWhere('documento.verificado = :verificado', { verificado: true })
        .getCount(),
      baseQuery
        .clone()
        .andWhere('documento.verificado = :verificado', { verificado: false })
        .getCount(),
      baseQuery
        .clone()
        .andWhere('documento.reutilizavel = :reutilizavel', {
          reutilizavel: true,
        })
        .getCount(),
    ]);

    return {
      total,
      verificados,
      pendentes,
      reutilizaveis,
    };
  }
}
