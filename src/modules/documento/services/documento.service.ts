import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Documento } from '../entities/documento.entity';
import { SolicitacaoService } from '../../solicitacao/services/solicitacao.service';
import { UploadDocumentoDto } from '../dto/upload-documento.dto';
import { MimeTypeValidator } from '../validators/mime-type.validator';
import { MetadadosValidator } from '../validators/metadados.validator';
import { CriptografiaService } from '../../../shared/services/criptografia.service';
import { ThumbnailService } from './thumbnail.service';
import { StorageProviderFactory } from '../factories/storage-provider.factory';
import { ALLOWED_MIME_TYPES } from '../constants/mime-types.constant';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DocumentoService {
  constructor(
    @InjectRepository(Documento)
    private documentoRepository: Repository<Documento>,
    private solicitacaoService: SolicitacaoService,
    private mimeTypeValidator: MimeTypeValidator,
    private metadadosValidator: MetadadosValidator,
    private criptografiaService: CriptografiaService,
    private thumbnailService: ThumbnailService,
    private storageProviderFactory: StorageProviderFactory,
  ) {}

  /**
   * Lista todos os documentos de uma solicitação
   */
  async findBySolicitacao(solicitacaoId: string, user: any, tipo?: string) {
    const solicitacao = await this.solicitacaoService.findById(solicitacaoId);
    if (!this.solicitacaoService.canAccessSolicitacao(solicitacao, user)) {
      throw new UnauthorizedException(
        'Você não tem permissão para acessar os documentos desta solicitação',
      );
    }

    const whereClause: any = { solicitacao_id: solicitacaoId };

    // Adicionar filtro por tipo se fornecido
    if (tipo) {
      whereClause.tipo = tipo;
    }

    return this.documentoRepository.find({
      where: whereClause,
      order: { data_upload: 'DESC' },
    });
  }

  /**
   * Busca um documento pelo ID
   */
  async findById(id: string, user: any) {
    const documento = await this.documentoRepository.findOne({ where: { id } });
    if (!documento) {
      throw new NotFoundException(`Documento com ID ${id} não encontrado`);
    }

    // Verificar se o usuário tem permissão para acessar o documento
    const solicitacao = await this.solicitacaoService.findById(
      documento.solicitacao_id,
    );
    if (!this.solicitacaoService.canAccessSolicitacao(solicitacao, user)) {
      throw new UnauthorizedException(
        'Você não tem permissão para acessar este documento',
      );
    }

    return documento;
  }

  /**
   * Faz o download de um documento
   */
  async download(
    id: string,
    user: any,
  ): Promise<{ buffer: Buffer; mimetype: string; nomeOriginal: string }> {
    const documento = await this.findById(id, user);

    // Obter o provedor de armazenamento configurado
    const storageProvider = this.storageProviderFactory.getProvider();

    // Obter o buffer do arquivo do provedor de armazenamento
    let buffer = await storageProvider.obterArquivo(documento.caminho);

    // Verificar se o documento está criptografado e descriptografá-lo se necessário
    if (documento.metadados?.criptografia) {
      const dadosCriptografia = documento.metadados.criptografia;
      buffer = this.criptografiaService.descriptografar(
        buffer,
        dadosCriptografia.iv,
        dadosCriptografia.authTag,
      );
    }

    return {
      buffer,
      mimetype: documento.mimetype,
      nomeOriginal: documento.nome_original,
    };
  }

  /**
   * Obtém a miniatura de um documento de imagem
   */
  async getThumbnail(
    id: string,
    size: 'pequena' | 'media' | 'grande',
    user: any,
  ): Promise<{ buffer: Buffer }> {
    const documento = await this.findById(id, user);

    // Verificar se o documento é uma imagem
    if (!documento.mimetype.startsWith('image/')) {
      throw new BadRequestException('Este documento não é uma imagem');
    }

    // Verificar se já existe uma miniatura armazenada
    if (documento.thumbnail) {
      const storageProvider = this.storageProviderFactory.getProvider();
      try {
        const thumbnailBuffer = await storageProvider.obterArquivo(
          documento.thumbnail,
        );
        return { buffer: thumbnailBuffer };
      } catch (error) {
        console.error('Erro ao obter thumbnail armazenado:', error);
        // Se falhar, continuar e gerar um novo
      }
    }

    // Se não existir thumbnail ou falhar ao obter, gerar um novo
    const arquivoBuffer = await this.download(id, user);
    const thumbnailBuffer = await this.thumbnailService.gerarThumbnail(
      arquivoBuffer.buffer,
      size,
    );

    // Salvar o novo thumbnail para uso futuro
    if (!documento.thumbnail) {
      const storageProvider = this.storageProviderFactory.getProvider();
      const uniqueFilename = `thumb_${documento.nome_arquivo}`;
      const thumbnailPath = await storageProvider.salvarArquivo(
        thumbnailBuffer,
        uniqueFilename,
        'image/jpeg',
      );

      // Atualizar o documento com o caminho do thumbnail
      documento.thumbnail = thumbnailPath === null ? undefined : thumbnailPath;
      await this.documentoRepository.save(documento);
    }

    return { buffer: thumbnailBuffer };
  }

  /**
   * Faz upload de um novo documento para uma solicitação
   */
  async upload(
    arquivo: Express.Multer.File,
    uploadDocumentoDto: UploadDocumentoDto,
    user: any,
  ) {
    // Verificar se a solicitação existe e se o usuário tem permissão
    const solicitacao = await this.solicitacaoService.findById(
      uploadDocumentoDto.solicitacao_id,
    );

    if (!this.solicitacaoService.canAccessSolicitacao(solicitacao, user)) {
      throw new UnauthorizedException(
        'Você não tem permissão para adicionar documentos a esta solicitação',
      );
    }

    // Validar o tipo MIME do arquivo
    const mimeTypeValidationResult = await this.mimeTypeValidator.validateMimeType(
      arquivo.buffer,
      arquivo.mimetype,
    );

    if (!mimeTypeValidationResult.isValid) {
      throw new BadRequestException(
        `Tipo de arquivo inválido: ${mimeTypeValidationResult.message}`,
      );
    }

    // Validar os metadados, se fornecidos
    const metadados = uploadDocumentoDto.metadados || {};
    const metadadosValidationResult =
      this.metadadosValidator.validateMetadados(metadados);

    if (!metadadosValidationResult.isValid) {
      throw new BadRequestException(
        `Metadados inválidos: ${metadadosValidationResult.message}`,
      );
    }

    // Gerar um nome de arquivo único
    const uniqueFilename = `${uuidv4()}${path.extname(arquivo.originalname)}`;
    let thumbnailPath: string | null = null;

    // Obter o provedor de armazenamento configurado
    const storageProvider = this.storageProviderFactory.getProvider();

    // Preparar o buffer para armazenamento
    let bufferToStore = arquivo.buffer;

    // Verificar se o documento deve ser criptografado
    const tiposSensiveis = ['DOCUMENTO_PESSOAL', 'LAUDO_MEDICO', 'COMPROVANTE_RENDA'];
    const isSensivel =
      tiposSensiveis.includes(uploadDocumentoDto.tipo_documento) ||
      (metadados && metadados.sensivel === true);

    // Criptografar o documento se necessário
    let dadosCriptografia: { iv: string; authTag: string; algoritmo: string } | null = null;
    if (isSensivel) {
      const resultado = this.criptografiaService.criptografar(arquivo.buffer);
      bufferToStore = resultado.bufferCriptografado;
      dadosCriptografia = {
        iv: resultado.iv,
        authTag: resultado.authTag,
        algoritmo: 'aes-256-gcm', // Algoritmo padrão usado pelo serviço de criptografia
      };

      // Adicionar informações de criptografia aos metadados
      metadados.criptografado = true;
    }

    // Gerar thumbnail se for uma imagem
    if (mimeTypeValidationResult.detectedMimeType.startsWith('image/')) {
      try {
        const thumbnailBuffer = await this.thumbnailService.gerarThumbnail(
          bufferToStore,
          'media', // Tamanho médio para o thumbnail
        );
        // Armazenar o caminho da miniatura
        thumbnailPath = await storageProvider.salvarArquivo(
          thumbnailBuffer,
          `thumb_${uniqueFilename}`,
          'image/jpeg',
        );
      } catch (error) {
        console.error('Erro ao gerar thumbnail:', error);
        // Continuar mesmo se falhar a geração do thumbnail
      }
    }

    // Salvar o arquivo no provedor de armazenamento
    const caminhoArmazenamento = await storageProvider.salvarArquivo(
      bufferToStore,
      uniqueFilename,
      mimeTypeValidationResult.detectedMimeType,
    );

    // Criar o registro do documento no banco de dados
    const documento = new Documento();
    documento.solicitacao_id = uploadDocumentoDto.solicitacao_id;
    documento.nome_arquivo = uniqueFilename;
    documento.nome_original = arquivo.originalname;
    documento.mimetype = mimeTypeValidationResult.detectedMimeType;
    documento.tamanho = arquivo.size;
    documento.caminho = caminhoArmazenamento;
    documento.thumbnail = thumbnailPath === null ? undefined : thumbnailPath;
    documento.tipo = uploadDocumentoDto.tipo_documento;
    documento.descricao = uploadDocumentoDto.observacoes || '';
    documento.data_upload = new Date();
    documento.usuario_upload = user.id;
    // Construir metadados compatíveis com a estrutura da entidade Documento
    // Filtramos o objeto metadados para garantir que só contenha propriedades esperadas
    const metadadosFiltrados = {};
    
    // Adicionar campos específicos
    const metadadosDocumento = {
      ...metadadosFiltrados,
      criptografado: isSensivel,
      criptografia: dadosCriptografia === null ? undefined : dadosCriptografia,
      deteccao_mime: {
        mime_declarado: arquivo.mimetype,
        mime_detectado: mimeTypeValidationResult.detectedMimeType,
        extensao_detectada: mimeTypeValidationResult.detectedExtension,
      },
      upload_info: {
        data: new Date().toISOString(),
        usuario_id: user.id,
        ip: user.ip || 'não registrado',
        user_agent: user.userAgent || 'não registrado',
      },
    };
    
    documento.metadados = metadadosDocumento;

    return this.documentoRepository.save(documento);
  }

  /**
   * Remove um documento de uma solicitação
   */
  async remove(id: string, user: any) {
    const documento = await this.findById(id, user);

    // Verificar se o usuário tem permissão para remover o documento
    // Aqui podemos adicionar lógicas adicionais de permissão se necessário

    // Obter o provedor de armazenamento configurado
    const storageProvider = this.storageProviderFactory.getProvider();

    // Remover o arquivo do armazenamento
    try {
      await storageProvider.removerArquivo(documento.caminho);

      // Remover o thumbnail se existir
      if (documento.thumbnail) {
        await storageProvider.removerArquivo(documento.thumbnail);
      }
    } catch (error) {
      console.error(`Erro ao remover arquivo: ${error.message}`);
      // Continuar mesmo se falhar a remoção do arquivo
    }

    // Remover o registro do banco de dados
    return this.documentoRepository.remove(documento);
  }

  /**
   * Verifica um documento
   */
  async verificarDocumento(id: string, observacoes: string, user: any) {
    const documento = await this.findById(id, user);

    // Atualizar o status do documento para verificado
    documento.verificado = true;
    documento.data_verificacao = new Date();
    documento.usuario_verificacao = user.id;
    documento.observacoes_verificacao = observacoes;

    // Adicionar informações de verificação aos metadados
    const metadados = documento.metadados || {};
    metadados.verificacao = {
      data: new Date().toISOString(),
      usuario_id: user.id,
      observacoes: observacoes,
    };
    documento.metadados = metadados;

    return this.documentoRepository.save(documento);
  }

  /**
   * Atualiza os metadados de um documento
   */
  async atualizarMetadados(id: string, novoMetadados: any, user: any) {
    const documento = await this.findById(id, user);

    // Validar os novos metadados
    const metadadosValidationResult =
      this.metadadosValidator.validateMetadados(novoMetadados);
    if (!metadadosValidationResult.isValid) {
      throw new BadRequestException(
        `Metadados inválidos: ${metadadosValidationResult.message}`,
      );
    }

    // Mesclar os metadados existentes com os novos
    documento.metadados = {
      ...(documento.metadados || {}),
      ...novoMetadados,
      ultima_atualizacao: {
        data: new Date().toISOString(),
        usuario_id: user.id,
      },
    };

    return this.documentoRepository.save(documento);
  }
}
