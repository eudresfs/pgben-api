import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComprovantePagamento } from '../../../entities/comprovante-pagamento.entity';
import { ComprovanteUploadDto } from '../dtos/comprovante-upload.dto';
import { AuditoriaPagamentoService } from './auditoria-pagamento.service';
import { MinioService } from '../../../shared/services/minio.service';
import { StatusPagamentoEnum } from '@/enums';
import { PagamentoService } from './pagamento.service';

/**
 * Serviço para gerenciamento de comprovantes de pagamento
 *
 * Implementa a lógica para upload, consulta e gerenciamento
 * dos documentos comprobatórios anexados aos pagamentos.
 *
 * @author Equipe PGBen
 */
@Injectable()
export class ComprovanteService {
  // Lista de tipos MIME permitidos para upload
  private readonly allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ];

  // Tamanho máximo permitido (5MB)
  private readonly maxFileSize = 5 * 1024 * 1024;

  constructor(
    @InjectRepository(ComprovantePagamento)
    private comprovanteRepository: Repository<ComprovantePagamento>,
    private readonly pagamentoService: PagamentoService,
    private minioService: MinioService,
    private auditoriaService: AuditoriaPagamentoService,
  ) { }

  /**
   * Processa o upload de um novo comprovante de pagamento
   *
   * @param pagamentoId ID do pagamento relacionado
   * @param file Arquivo enviado
   * @param createDto Dados adicionais do comprovante
   * @param usuarioId ID do usuário que está realizando o upload
   * @returns Comprovante criado
   */
  async uploadComprovante(
    pagamentoId: string,
    file: any,
    createDto: ComprovanteUploadDto,
    usuarioId: string,
  ): Promise<ComprovantePagamento> {
    // Verificar se o pagamento existe
    const pagamento = await this.pagamentoService.findOne(pagamentoId);

    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Verificar se o pagamento tem status que permite anexar comprovantes
    if (pagamento.status === StatusPagamentoEnum.CANCELADO) {
      throw new ConflictException(
        'Não é possível anexar comprovantes a um pagamento cancelado'
      );
    }

    // Validar o arquivo
    this.validateFile(file);

    // Sanitizar o nome do arquivo
    const sanitizedFileName = this.sanitizeFileName(file.originalname);

    // Fazer upload do arquivo para o MinIO
    const uploadResult = await this.minioService.uploadArquivo(
      file.buffer,
      sanitizedFileName,
      pagamentoId,
      createDto.tipoDocumento,
    );

    // Criar registro do comprovante
    const comprovante = this.comprovanteRepository.create({
      pagamento_id: pagamentoId,
      tipo_documento: createDto.tipoDocumento,
      nome_arquivo: uploadResult.nomeArquivo,
      caminho_arquivo: uploadResult.nomeArquivo,
      tamanho: uploadResult.tamanho,
      mime_type: file.mimetype,
      data_upload: new Date(),
      uploaded_por: usuarioId,
    });

    // Salvar o registro
    const savedComprovante = await this.comprovanteRepository.save(comprovante);
    const result = Array.isArray(savedComprovante) ? savedComprovante[0] : savedComprovante;

    // Registrar operação no log de auditoria
    await this.auditoriaService.registrarUploadComprovante(
      result.id,
      pagamentoId,
      usuarioId,
      {
        tipoDocumento: createDto.tipoDocumento,
        nomeArquivo: sanitizedFileName,
        tamanho: file.size,
        mimeType: file.mimetype
      }
    );

    return result;
  }

  /**
   * Busca um comprovante pelo ID
   *
   * @param id ID do comprovante
   * @returns Comprovante encontrado ou null
   */
  async findOne(id: string): Promise<ComprovantePagamento | null> {
    return this.comprovanteRepository.findOneBy({ id });
  }

  /**
   * Lista todos os comprovantes de um pagamento
   *
   * @param pagamentoId ID do pagamento
   * @returns Lista de comprovantes
   */
  async findAllByPagamento(
    pagamentoId: string,
  ): Promise<ComprovantePagamento[]> {
    return this.comprovanteRepository.find({
      where: { pagamento_id: pagamentoId },
      order: { data_upload: 'DESC' },
    });
  }

  /**
   * Obtém o conteúdo de um comprovante (baixa o arquivo)
   *
   * @param id ID do comprovante
   * @returns Buffer com o conteúdo do arquivo e metadados
   */
  async getComprovanteContent(id: string): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
  }> {
    const comprovante = await this.findOne(id);

    if (!comprovante) {
      throw new NotFoundException('Comprovante não encontrado');
    }

    // Obter o arquivo do MinIO
    const file = await this.minioService.downloadArquivo(comprovante.caminho_arquivo);

    return {
      buffer: file.arquivo,
      fileName: comprovante.nome_arquivo,
      mimeType: comprovante.mime_type,
    };
  }

  /**
   * Remove um comprovante
   *
   * @param id ID do comprovante
   * @param usuarioId ID do usuário que está removendo
   * @returns true se removido com sucesso
   */
  async removeComprovante(id: string, usuarioId: string): Promise<boolean> {
    const comprovante = await this.findOne(id);

    if (!comprovante) {
      throw new NotFoundException('Comprovante não encontrado');
    }

    // Verificar se o pagamento permite remoção de comprovantes
    // const pagamento = await this.pagamentoService.findOne(comprovante.pagamentoId);

    // if (pagamento.status === StatusPagamentoEnum.CONFIRMADO) {
    //   throw new ConflictException(
    //     'Não é possível remover comprovantes de um pagamento já confirmado'
    //   );
    // }

    // Salvar dados para auditoria
    const dadosAnteriores = { ...comprovante };

    // Remover o arquivo do MinIO
    await this.minioService.removerArquivo(comprovante.caminho_arquivo);

    // Remover o registro do banco de dados
    await this.comprovanteRepository.remove(comprovante);

    // Registrar operação no log de auditoria
    await this.auditoriaService.registrarRemocaoComprovante(
      id,
      comprovante.pagamento_id,
      usuarioId,
      dadosAnteriores
    );

    return true;
  }

  /**
   * Verifica se um pagamento tem pelo menos um comprovante
   *
   * @param pagamentoId ID do pagamento
   * @returns true se o pagamento tem pelo menos um comprovante
   */
  async hasComprovantes(pagamentoId: string): Promise<boolean> {
    const count = await this.comprovanteRepository.count({
      where: { pagamento_id: pagamentoId },
    });

    return count > 0;
  }

  /**
   * Valida um arquivo enviado
   *
   * @param file Arquivo a ser validado
   * @throws BadRequestException se o arquivo não atender aos requisitos
   */
  private validateFile(file: any): void {
    // Verificar se o arquivo existe
    if (!file) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    // Verificar o tamanho do arquivo
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `Tamanho máximo permitido: ${this.maxFileSize / (1024 * 1024)}MB`,
      );
    }

    // Verificar o tipo MIME
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. Tipos permitidos: ${this.allowedMimeTypes.join(', ')}`,
      );
    }
  }

  /**
   * Sanitiza o nome de um arquivo para evitar riscos de segurança
   *
   * @param fileName Nome original do arquivo
   * @returns Nome sanitizado
   */
  private sanitizeFileName(fileName: string): string {
    // Remover caracteres potencialmente perigosos
    let sanitized = fileName
      .replace(/[/\\?%*:|"<>]/g, '_') // Remover caracteres inválidos em nomes de arquivo
      .replace(/\.\./g, '_'); // Evitar directory traversal

    // Limitar o tamanho do nome
    if (sanitized.length > 100) {
      const extension = sanitized.slice(sanitized.lastIndexOf('.'));
      sanitized = sanitized.slice(0, 100 - extension.length) + extension;
    }

    return sanitized;
  }
}
