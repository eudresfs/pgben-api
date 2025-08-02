import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ComprovanteRepository } from '../repositories/comprovante.repository';
import { PagamentoRepository } from '../repositories/pagamento.repository';
import { ComprovantePagamento } from '../../../entities/comprovante-pagamento.entity';
import { StorageService } from '../../../shared/services/storage.service';
import { PagamentoValidationUtil } from '../utils/pagamento-validation.util';
import { StatusPagamentoEnum } from '@/enums';

/**
 * Service simplificado para gerenciamento de comprovantes
 * Foca apenas na lógica de negócio essencial
 */
@Injectable()
export class ComprovanteService {
  private readonly logger = new Logger(ComprovanteService.name);

  // Configurações de validação
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
  ];

  constructor(
    private readonly comprovanteRepository: ComprovanteRepository,
    private readonly pagamentoRepository: PagamentoRepository,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Faz upload de um comprovante
   */
  async upload(
    file: Express.Multer.File,
    pagamentoId: string,
    tipoDocumento: string,
    usuarioId: string,
  ): Promise<ComprovantePagamento> {
    this.logger.log(
      `Fazendo upload de comprovante para pagamento ${pagamentoId}`,
    );

    // Validações fora da transação
    PagamentoValidationUtil.validarArquivo(
      file,
      this.MAX_FILE_SIZE,
      this.ALLOWED_TYPES,
    );

    const pagamento = await this.pagamentoRepository.findById(pagamentoId);
    PagamentoValidationUtil.validarExistencia(pagamento, pagamentoId);

    if (!pagamento) {
      throw new NotFoundException(
        `Pagamento com ID ${pagamentoId} não encontrado`,
      );
    }

    // PagamentoValidationUtil.validarParaComprovante(pagamento);

    // Upload do arquivo (reutilizando pagamento já buscado)
    const { url, nomeArquivo } = await this.storageService.upload(
      file,
      pagamento.id,
    );

    // Transação mínima - apenas inserção (reutilizando pagamento já buscado)
    const comprovante = await this.comprovanteRepository.create({
      pagamento_id: pagamento.id,
      tipo_documento: tipoDocumento,
      nome_arquivo: nomeArquivo,
      caminho_arquivo: url,
      tamanho: file.size,
      mime_type: file.mimetype,
      uploaded_por: usuarioId,
      data_upload: new Date(),
    });

    // Update payment with proof of payment details
    await this.pagamentoRepository.update(pagamento.id, {
      comprovante_id: comprovante.id,
      data_pagamento: new Date(),
      data_conclusao: new Date(),
      status: StatusPagamentoEnum.CONFIRMADO,
    });

    this.logger.log(`Comprovante ${comprovante.id} criado com sucesso`);
    return comprovante;
  }

  /**
   * Busca comprovante por ID
   */
  async findById(id: string): Promise<ComprovantePagamento> {
    const comprovante = await this.comprovanteRepository.findById(id);

    if (!comprovante) {
      throw new NotFoundException('Comprovante não encontrado');
    }

    return comprovante;
  }

  /**
   * Lista comprovantes de um pagamento
   */
  async findByPagamento(pagamentoId: string): Promise<ComprovantePagamento[]> {
    return await this.comprovanteRepository.findByPagamento(pagamentoId);
  }

  /**
   * Remove um comprovante
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Removendo comprovante ${id}`);

    // Buscar comprovante
    const comprovante = await this.findById(id);

    // Remover arquivo do storage
    await this.storageService.remove(comprovante.caminho_arquivo);

    // Remover registro do banco
    await this.comprovanteRepository.remove(id);

    this.logger.log(`Comprovante ${id} removido com sucesso`);
  }

  /**
   * Obtém conteúdo do comprovante para download
   */
  async getContent(id: string): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
  }> {
    const comprovante = await this.findById(id);

    const buffer = await this.storageService.getContent(
      comprovante.caminho_arquivo,
    );

    return {
      buffer,
      fileName: comprovante.nome_arquivo,
      mimeType: comprovante.mime_type,
    };
  }

  /**
   * Verifica se pagamento tem comprovantes
   */
  async hasComprovantes(pagamentoId: string): Promise<boolean> {
    return await this.comprovanteRepository.hasComprovantes(pagamentoId);
  }

  // ========== MÉTODOS PRIVADOS DE VALIDAÇÃO ==========
  // Validações movidas para PagamentoValidationUtil
}
