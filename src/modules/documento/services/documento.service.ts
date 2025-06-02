import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Documento } from '../../../entities/documento.entity';
import { MimeTypeValidator } from '../validators/mime-type.validator';
import { InputSanitizerValidator } from '../validators/input-sanitizer.validator';
import { StorageProviderFactory } from '../factories/storage-provider.factory';
import { UploadDocumentoDto } from '../dto/upload-documento.dto';
import { TipoDocumento } from '@/enums';
import { createHash } from 'crypto';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { normalizeEnumFields } from '../../../shared/utils/enum-normalizer.util';

@Injectable()
export class DocumentoService {
  constructor(
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
    private readonly mimeTypeValidator: MimeTypeValidator,
    private readonly inputSanitizer: InputSanitizerValidator,
    private readonly storageProviderFactory: StorageProviderFactory,
  ) {}

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
   * Faz upload de um novo documento
   */
  async upload(
    arquivo: any,
    uploadDocumentoDto: UploadDocumentoDto,
    usuarioId: string,
  ) {
    let caminhoArmazenamento: string | null = null;
    const storageProvider = this.storageProviderFactory.getProvider();

    try {
      // Validar entrada - sanitização será feita automaticamente pelos decorators

      // Validar tipo MIME
      const mimeTypeValidationResult = await this.mimeTypeValidator.validateMimeType(
        arquivo.buffer,
        arquivo.mimetype,
        arquivo.originalname,
        arquivo.size,
      );

      if (!mimeTypeValidationResult.isValid) {
        throw new BadRequestException(
          `Arquivo rejeitado: ${mimeTypeValidationResult.message}`,
        );
      }

      // Gerar hash do arquivo
      const hashArquivo = createHash('sha256').update(arquivo.buffer).digest('hex');

      // Verificar se já existe um documento com o mesmo hash (reutilização)
      if (uploadDocumentoDto.reutilizavel) {
        const documentoExistente = await this.documentoRepository
          .createQueryBuilder('documento')
          .leftJoinAndSelect('documento.usuario_upload', 'usuario_upload')
          .where('documento.hash_arquivo = :hashArquivo', { hashArquivo })
          .andWhere('documento.tipo = :tipo', { tipo: uploadDocumentoDto.tipo })
          .andWhere('documento.cidadao_id = :cidadaoId', { cidadaoId: uploadDocumentoDto.cidadao_id })
          .andWhere('documento.removed_at IS NULL')
          .getOne();

        if (documentoExistente) {
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

      // Salvar arquivo no storage
      caminhoArmazenamento = await storageProvider.salvarArquivo(
        arquivo.buffer,
        nomeArquivo,
        arquivo.mimetype,
      );

      if (!caminhoArmazenamento) {
        throw new InternalServerErrorException('Falha ao salvar arquivo no storage');
      }

      // Criar metadados simplificados
      const metadados = {
        upload_info: {
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

      // Salvar documento no banco de dados
      const novoDocumento = new Documento();
      Object.assign(novoDocumento, dadosDocumento);

      const resultado = await this.documentoRepository.save(novoDocumento);
      const documentoId = (resultado as unknown as Documento).id;
      
      // Buscar o documento com as relações
      const documentoComRelacoes = await this.documentoRepository
        .createQueryBuilder('documento')
        .leftJoinAndSelect('documento.usuario_upload', 'usuario_upload')
        .where('documento.id = :id', { id: documentoId })
        .getOne();

      return documentoComRelacoes;
    } catch (error) {
      // Limpar arquivo do storage em caso de erro
      if (caminhoArmazenamento) {
        try {
          await storageProvider.removerArquivo(caminhoArmazenamento);
        } catch (cleanupError) {
          console.error('Erro ao limpar arquivo após falha:', cleanupError);
        }
      }

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      console.error('Erro no upload de documento:', error);
      throw new InternalServerErrorException('Erro interno no upload do documento');
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
