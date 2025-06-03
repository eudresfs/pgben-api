import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Documento } from '../../../entities/documento.entity';

import { InputSanitizerValidator } from '../validators/input-sanitizer.validator';
import { StorageProviderFactory } from '../factories/storage-provider.factory';
import { UploadDocumentoDto } from '../dto/upload-documento.dto';
import { TipoDocumentoEnum } from '@/enums';
import { createHash } from 'crypto';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { normalizeEnumFields } from '../../../shared/utils/enum-normalizer.util';
import { UnifiedLoggerService } from '../../../shared/logging/unified-logger.service';
import { ConfigService } from '@nestjs/config';
import { MimeValidationService, MimeValidationResult } from './mime-validation.service';

@Injectable()
export class DocumentoService {
  private readonly logger = new UnifiedLoggerService();
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,

    private readonly inputSanitizer: InputSanitizerValidator,
    private readonly storageProviderFactory: StorageProviderFactory,
    private readonly configService: ConfigService,
    private readonly mimeValidationService: MimeValidationService,
  ) {
    this.logger.setContext(DocumentoService.name);
    this.maxRetries = this.configService.get<number>('DOCUMENTO_MAX_RETRIES', 3);
    this.retryDelay = this.configService.get<number>('DOCUMENTO_RETRY_DELAY', 1000);
  }

  /**
   * Lista documentos por cidadão
   */
  async findByCidadao(cidadaoId: string, tipo?: string, reutilizavel?: boolean) {
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
   * Faz o download de um documento
   */
  async download(id: string): Promise<{ buffer: Buffer; mimetype: string; nomeOriginal: string }> {
    const documento = await this.findById(id);
    const storageProvider = this.storageProviderFactory.getProvider();

    try {
      const buffer = await storageProvider.obterArquivo(documento.caminho);
      
      return {
        buffer,
        mimetype: documento.mimetype,
        nomeOriginal: documento.nome_original,
      };
    } catch (error) {
      throw new InternalServerErrorException('Erro ao fazer download do documento');
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
    let lastError: Error = new Error('Operação falhou após todas as tentativas');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.debug(`Tentativa ${attempt}/${maxRetries} para ${operationName}`);
        return await operation();
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Falha na tentativa ${attempt}/${maxRetries} para ${operationName}: ${error.message}`,
          { error: error.message, attempt, maxRetries }
        );
        
        if (attempt < maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // Backoff exponencial
          this.logger.debug(`Aguardando ${delay}ms antes da próxima tentativa`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Valida as configurações necessárias para o upload
   */
  private validateUploadConfiguration(): void {
    const storageProvider = this.storageProviderFactory.getProvider();
    if (!storageProvider) {
      throw new InternalServerErrorException('Provedor de storage não configurado');
    }
    
    this.logger.debug(`Usando provedor de storage: ${storageProvider.nome}`);
  }

  /**
   * Faz upload de um novo documento com logging detalhado e retry automático
   */
  async upload(
    arquivo: any,
    uploadDocumentoDto: UploadDocumentoDto,
    usuarioId: string,
  ) {
    const uploadId = uuidv4();
    let caminhoArmazenamento: string | null = null;
    const startTime = Date.now();
    
    this.logger.info(
      `Iniciando upload de documento [${uploadId}]`,
      {
        uploadId,
        arquivo: {
          nome: arquivo.originalname,
          tamanho: arquivo.size,
          mimetype: arquivo.mimetype
        },
        tipo: uploadDocumentoDto.tipo,
        cidadaoId: uploadDocumentoDto.cidadao_id,
        solicitacaoId: uploadDocumentoDto.solicitacao_id,
        usuarioId,
        reutilizavel: uploadDocumentoDto.reutilizavel
      }
    );

    try {
      // Validar configurações
      this.validateUploadConfiguration();
      const storageProvider = this.storageProviderFactory.getProvider();

      // Validar entrada básica
      if (!arquivo || !arquivo.buffer || arquivo.buffer.length === 0) {
        throw new BadRequestException('Arquivo não fornecido ou vazio');
      }

      if (!uploadDocumentoDto.cidadao_id) {
        throw new BadRequestException('ID do cidadão é obrigatório');
      }

      this.logger.debug(`Validando arquivo com validação MIME avançada [${uploadId}]`, {
        uploadId,
        mimetype: arquivo.mimetype,
        tamanho: arquivo.size,
        tipoBeneficio: uploadDocumentoDto.tipo
      });

      // Validar arquivo com validação MIME avançada
      const mimeValidationResult = await this.retryOperation(
        () => this.mimeValidationService.validateFile(
          arquivo,
          uploadDocumentoDto.tipo,
          uploadId
        ),
        `validação MIME avançada [${uploadId}]`,
        2 // Menos tentativas para validação
      );
      
      if (!mimeValidationResult.isValid) {
        this.logger.warn(`Arquivo rejeitado na validação [${uploadId}]`, {
          uploadId,
          errors: mimeValidationResult.validationErrors,
          warnings: mimeValidationResult.securityWarnings
        });
        
        throw new BadRequestException(
          `Arquivo inválido: ${mimeValidationResult.validationErrors.join(', ')}`
        );
      }
      
      if (mimeValidationResult.securityWarnings.length > 0) {
        this.logger.warn(`Avisos de segurança detectados [${uploadId}]`, {
          uploadId,
          warnings: mimeValidationResult.securityWarnings
        });
      }

      // Usar hash da validação MIME avançada
      const hashArquivo = mimeValidationResult.fileHash;
      
      this.logger.debug(`Hash do arquivo obtido da validação [${uploadId}]: ${hashArquivo.substring(0, 16)}...`);

      // Verificar se já existe um documento com o mesmo hash (reutilização)
      if (uploadDocumentoDto.reutilizavel) {
        this.logger.debug(`Verificando reutilização de documento [${uploadId}]`, {
          uploadId,
          hashArquivo,
          tipo: uploadDocumentoDto.tipo,
          cidadaoId: uploadDocumentoDto.cidadao_id
        });
        
        const documentoExistente = await this.documentoRepository
          .createQueryBuilder('documento')
          .leftJoinAndSelect('documento.usuario_upload', 'usuario_upload')
          .where('documento.hash_arquivo = :hashArquivo', { hashArquivo })
          .andWhere('documento.tipo = :tipo', { tipo: uploadDocumentoDto.tipo })
          .andWhere('documento.cidadao_id = :cidadaoId', { cidadaoId: uploadDocumentoDto.cidadao_id })
          .andWhere('documento.removed_at IS NULL')
          .getOne();

        if (documentoExistente) {
          this.logger.info(
            `Documento reutilizado [${uploadId}]`,
            {
              uploadId,
              documentoExistenteId: documentoExistente.id,
              hashArquivo,
              tempoProcessamento: Date.now() - startTime
            }
          );
          
          // Retornar documento existente se for reutilizável
          if (uploadDocumentoDto.solicitacao_id) {
            // Atualizar para associar à nova solicitação se necessário
            documentoExistente.solicitacao_id = uploadDocumentoDto.solicitacao_id;
            return this.documentoRepository.save(documentoExistente);
          }
          return documentoExistente;
        }
      }

      // Gerar nome único para o arquivo
      const extensao = extname(arquivo.originalname);
      const nomeArquivo = `${uuidv4()}${extensao}`;
      
      this.logger.debug(`Nome único gerado [${uploadId}]: ${nomeArquivo}`);

      // Salvar arquivo no storage com retry
      this.logger.debug(`Salvando arquivo no storage [${uploadId}]`, {
        uploadId,
        nomeArquivo,
        provedor: storageProvider.nome
      });
      
      caminhoArmazenamento = await this.retryOperation(
        () => storageProvider.salvarArquivo(
          arquivo.buffer,
          nomeArquivo,
          arquivo.mimetype,
        ),
        `upload para storage [${uploadId}]`
      );

      if (!caminhoArmazenamento) {
        throw new InternalServerErrorException('Falha ao salvar arquivo no storage - caminho vazio');
      }
      
      this.logger.debug(`Arquivo salvo no storage [${uploadId}]: ${caminhoArmazenamento}`);

      // Criar metadados enriquecidos
      const metadados = {
        upload_info: {
          upload_id: uploadId,
          timestamp: new Date().toISOString(),
          file_hash: hashArquivo,
          validation_result: mimeValidationResult,
          storage_provider: storageProvider.nome,
          ip: 'unknown', // Pode ser obtido do request se necessário
          user_agent: 'unknown', // Pode ser obtido do request se necessário
        },
      };

      // Normalizar campos de enum antes de salvar
      const dadosDocumento = normalizeEnumFields({
        cidadao_id: uploadDocumentoDto.cidadao_id,
        solicitacao_id: uploadDocumentoDto.solicitacao_id,
        tipo: uploadDocumentoDto.tipo,
        nome_arquivo: nomeArquivo,
        nome_original: arquivo.originalname,
        caminho: caminhoArmazenamento,
        tamanho: arquivo.size,
        mimetype: arquivo.mimetype,
        hash_arquivo: hashArquivo,
        reutilizavel: uploadDocumentoDto.reutilizavel || false,
        descricao: uploadDocumentoDto.descricao,
        usuario_upload_id: usuarioId,
        data_upload: new Date(),
        metadados: metadados
      });

      this.logger.debug(`Salvando metadados no banco [${uploadId}]`);
      
      // Salvar documento no banco de dados
      const novoDocumento = new Documento();
      Object.assign(novoDocumento, dadosDocumento);

      // Salvar documento no banco com retry
      const resultado = await this.retryOperation(
        () => this.documentoRepository.save(novoDocumento),
        `salvamento no banco [${uploadId}]`,
        2 // Menos tentativas para operações de banco
      );
      
      const documentoId = (resultado as unknown as Documento).id;
      
      this.logger.debug(`Documento salvo no banco [${uploadId}]: ${documentoId}`);
      
      // Buscar o documento com as relações
      const documentoComRelacoes = await this.documentoRepository
        .createQueryBuilder('documento')
        .leftJoinAndSelect('documento.usuario_upload', 'usuario_upload')
        .where('documento.id = :id', { id: documentoId })
        .getOne();

      const tempoTotal = Date.now() - startTime;
      
      this.logger.info(
        `Upload de documento concluído com sucesso [${uploadId}]`,
        {
          uploadId,
          documentoId,
          hashArquivo,
          caminhoArmazenamento,
          tempoProcessamento: tempoTotal,
          tamanhoArquivo: arquivo.size,
          tipo: uploadDocumentoDto.tipo
        }
      );

      return documentoComRelacoes;
    } catch (error) {
      const tempoTotal = Date.now() - startTime;
      const storageProvider = this.storageProviderFactory.getProvider();
      
      this.logger.error(
        `Falha no upload de documento [${uploadId}]`,
        {
          uploadId,
          erro: error.message,
          stack: error.stack,
          tempoProcessamento: tempoTotal,
          arquivo: {
            nome: arquivo?.originalname,
            tamanho: arquivo?.size,
            mimetype: arquivo?.mimetype
          },
          caminhoArmazenamento,
          tipo: uploadDocumentoDto.tipo,
          cidadaoId: uploadDocumentoDto.cidadao_id
        }
      );
      
      // Limpar arquivo do storage em caso de erro
      if (caminhoArmazenamento && storageProvider) {
        try {
          this.logger.debug(`Limpando arquivo do storage após erro [${uploadId}]: ${caminhoArmazenamento}`);
          await storageProvider.removerArquivo(caminhoArmazenamento);
          this.logger.debug(`Arquivo removido do storage [${uploadId}]`);
        } catch (cleanupError) {
          this.logger.error(
            `Erro ao limpar arquivo do storage após falha [${uploadId}]`,
            {
              uploadId,
              caminhoArmazenamento,
              cleanupError: cleanupError.message,
              originalError: error.message
            }
          );
        }
      }

      // Re-lançar exceções conhecidas
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      // Tratar erros específicos do storage
      if (error.message?.includes('S3') || error.message?.includes('storage')) {
        throw new InternalServerErrorException(
          'Erro no sistema de armazenamento. Tente novamente em alguns minutos.'
        );
      }
      
      // Tratar erros de banco de dados
      if (error.message?.includes('database') || error.message?.includes('connection')) {
        throw new InternalServerErrorException(
          'Erro de conexão com banco de dados. Tente novamente.'
        );
      }
      
      // Erro genérico
      throw new InternalServerErrorException(
        'Erro interno no upload do documento. Contate o suporte se o problema persistir.'
      );
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
        { now: new Date() }
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
      baseQuery.clone().andWhere('documento.verificado = :verificado', { verificado: true }).getCount(),
      baseQuery.clone().andWhere('documento.verificado = :verificado', { verificado: false }).getCount(),
      baseQuery.clone().andWhere('documento.reutilizavel = :reutilizavel', { reutilizavel: true }).getCount(),
    ]);

    return {
      total,
      verificados,
      pendentes,
      reutilizaveis,
    };
  }
}
