import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { StorageProviderFactory } from '../../documento/factories/storage-provider.factory';
import { DocumentoUrlService } from '../../documento/services/documento-url.service';
import { PagamentoRepository } from '../repositories/pagamento.repository';
import { ComprovanteUploadDto } from '../dtos/comprovante-upload.dto';
import { ComprovanteResponseDto } from '../dtos/comprovante-response.dto';
import { GerarComprovanteDto, ComprovanteGeradoDto } from '../dtos/gerar-comprovante.dto';
import { GerarComprovanteLoteDto, ComprovanteLoteGeradoDto } from '../dtos/gerar-comprovante-lote.dto';
import { Documento } from '../../../entities/documento.entity';
import { TipoDocumentoEnum } from '../../../enums/tipo-documento.enum';
import { Pagamento } from '../../../entities/pagamento.entity';
import { StatusPagamentoEnum } from '../../../enums';
import { ComprovantePdfAdapter } from '../adapters/comprovante-pdf.adapter';
import { ComprovanteDadosMapper } from '../mappers/comprovante-dados.mapper';
import { PDFDocument } from 'pdf-lib';
import { TipoComprovante } from '../dtos/gerar-comprovante.dto';
import { sanitizeFilename, generateUniqueFilename } from '../../../shared/utils/filename-sanitizer.util';

/**
 * Service simplificado para gerenciamento de comprovantes
 * Foca apenas na lógica de negócio essencial
 */
@Injectable()
export class ComprovanteService {
  // Configuração de paralelismo para evitar sobrecarga do sistema
  private readonly MAX_CONCURRENT_PROCESSING = 10;
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
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
    private readonly pagamentoRepository: PagamentoRepository,
    private readonly storageProviderFactory: StorageProviderFactory,
    private readonly documentoUrlService: DocumentoUrlService,
    private readonly comprovantePdfAdapter: ComprovantePdfAdapter,
  ) {}

  /**
   * Faz upload de um comprovante
   */
  async upload(
    pagamentoId: string,
    arquivo: Express.Multer.File,
    uploadDto: ComprovanteUploadDto,
    usuarioId: string,
  ): Promise<ComprovanteResponseDto> {
    // Validar arquivo
    this.validateFile(arquivo);

    // Buscar pagamento e suas relações
    const pagamento = await this.pagamentoRepository.findById(pagamentoId);
    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Buscar cidadao_id e solicitacao_id do pagamento
    const cidadaoId = pagamento.solicitacao?.beneficiario_id;
    const solicitacaoId = pagamento.solicitacao_id;

    if (!cidadaoId || !solicitacaoId) {
      throw new BadRequestException('Dados do pagamento incompletos');
    }

    // Fazer upload do arquivo
    const storageProvider = this.storageProviderFactory.getProvider();
    const nomeArquivoSanitizado = generateUniqueFilename(arquivo.originalname);
    const caminhoArquivo = `comprovantes/${pagamentoId}/${nomeArquivoSanitizado}`;

    await storageProvider.salvarArquivo(
      arquivo.buffer,
      caminhoArquivo,
      arquivo.mimetype,
    );

    // Gerar hash do arquivo
    const hashArquivo = crypto
      .createHash('sha256')
      .update(arquivo.buffer)
      .digest('hex');

    // Criar documento
    const documento = new Documento();
    documento.solicitacao_id = solicitacaoId;
    documento.cidadao_id = cidadaoId;
    documento.tipo = TipoDocumentoEnum.COMPROVANTE_PAGAMENTO;
    documento.nome_original = arquivo.originalname;
    documento.nome_arquivo = nomeArquivoSanitizado;
    documento.caminho = caminhoArquivo;
    documento.tamanho = arquivo.size;
    documento.mimetype = arquivo.mimetype;
    documento.data_upload = new Date();
    documento.usuario_upload_id = usuarioId;
    documento.descricao =
      uploadDto.observacoes ||
      `Comprovante de pagamento - ${arquivo.originalname}`;
    documento.hash_arquivo = hashArquivo;
    documento.metadados = {
      deteccao_mime: {
        mime_declarado: arquivo.mimetype,
        mime_detectado: arquivo.mimetype,
        extensao_detectada: arquivo.originalname.split('.').pop() || '',
      },
      upload_info: {
        ip: 'sistema',
        user_agent: 'comprovante-service',
      },
    };

    const documentoSalvo = await this.documentoRepository.save(documento);

    // Gerar URL pública após salvar o documento
    const urlPublica = await this.documentoUrlService.generatePublicUrl(
      documentoSalvo.id,
    );

    // Atualizar documento com URL pública
    documentoSalvo.url_publica = urlPublica;
    await this.documentoRepository.save(documentoSalvo);

    // Atualizar pagamento com referência ao documento
    pagamento.comprovante_id = documentoSalvo.id;
    await this.pagamentoRepository.save(pagamento);

    // Atualizar status do pagamento se necessário
    if (pagamento.status === StatusPagamentoEnum.PAGO) {
      pagamento.status = StatusPagamentoEnum.RECEBIDO;
      await this.pagamentoRepository.save(pagamento);
    }

    return this.mapToResponseDto(documentoSalvo, pagamento);
  }

  /**
   * Busca comprovante por ID
   */
  async findById(id: string): Promise<ComprovanteResponseDto> {
    const documento = await this.documentoRepository
      .createQueryBuilder('documento')
      .where('documento.id = :id', { id })
      .andWhere('documento.tipo = :tipo', {
        tipo: TipoDocumentoEnum.COMPROVANTE_PAGAMENTO,
      })
      .andWhere('documento.removed_at IS NULL')
      .getOne();

    if (!documento) {
      throw new NotFoundException('Comprovante não encontrado');
    }

    // Buscar pagamento relacionado
    const pagamentos = await this.pagamentoRepository.findByComprovanteId(id);
    if (!pagamentos || pagamentos.length === 0) {
      throw new NotFoundException('Pagamento relacionado não encontrado');
    }

    return this.mapToResponseDto(documento, pagamentos[0]);
  }

  /**
   * Lista comprovantes de um pagamento
   */
  async findByPagamento(
    pagamentoId: string,
  ): Promise<ComprovanteResponseDto[]> {
    const pagamento = await this.pagamentoRepository.findById(pagamentoId);
    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    if (!pagamento.comprovante_id) {
      return [];
    }

    const documento = await this.documentoRepository
      .createQueryBuilder('documento')
      .where('documento.id = :id', { id: pagamento.comprovante_id })
      .andWhere('documento.tipo = :tipo', {
        tipo: TipoDocumentoEnum.COMPROVANTE_PAGAMENTO,
      })
      .andWhere('documento.removed_at IS NULL')
      .getOne();

    if (!documento) {
      return [];
    }

    return [this.mapToResponseDto(documento, pagamento)];
  }

  /**
   * Remove um comprovante
   */
  async remove(id: string, usuarioId: string): Promise<void> {
    const documento = await this.documentoRepository
      .createQueryBuilder('documento')
      .where('documento.id = :id', { id })
      .andWhere('documento.tipo = :tipo', {
        tipo: TipoDocumentoEnum.COMPROVANTE_PAGAMENTO,
      })
      .andWhere('documento.removed_at IS NULL')
      .getOne();

    if (!documento) {
      throw new NotFoundException('Comprovante não encontrado');
    }

    // Buscar pagamentos relacionados
    const pagamentos = await this.pagamentoRepository.findByComprovanteId(id);
    if (pagamentos && pagamentos.length > 0) {
      // Remover referência dos pagamentos
      for (const pagamento of pagamentos) {
        pagamento.comprovante_id = null;
        await this.pagamentoRepository.save(pagamento);
      }
    }

    // Remover arquivo do storage
    const storageProvider = this.storageProviderFactory.getProvider();
    try {
      await storageProvider.removerArquivo(documento.caminho);
    } catch (error) {
      // Log do erro mas não falha a operação
      console.error('Erro ao remover arquivo do storage:', error);
    }

    // Soft delete do documento
    documento.removed_at = new Date();
    await this.documentoRepository.save(documento);
  }

  /**
   * Download de comprovante
   */
  async download(
    id: string,
  ): Promise<{ buffer: Buffer; mimetype: string; nomeOriginal: string }> {
    const documento = await this.documentoRepository
      .createQueryBuilder('documento')
      .where('documento.id = :id', { id })
      .andWhere('documento.tipo = :tipo', {
        tipo: TipoDocumentoEnum.COMPROVANTE_PAGAMENTO,
      })
      .andWhere('documento.removed_at IS NULL')
      .getOne();

    if (!documento) {
      throw new NotFoundException('Comprovante não encontrado');
    }

    const storageProvider = this.storageProviderFactory.getProvider();
    const buffer = await storageProvider.obterArquivo(documento.caminho);

    return {
      buffer,
      mimetype: documento.mimetype,
      nomeOriginal: documento.nome_original,
    };
  }

  /**
   * Verifica se pagamento tem comprovantes
   */
  async hasComprovantes(pagamentoId: string): Promise<boolean> {
    const pagamento = await this.pagamentoRepository.findById(pagamentoId);
    return !!(pagamento && pagamento.comprovante_id);
  }

  /**
   * Gera comprovante em PDF pré-preenchido
   */
  async gerarComprovantePdf(
    pagamentoId: string,
    gerarDto: GerarComprovanteDto,
  ): Promise<ComprovanteGeradoDto> {
    this.logger.log(`Iniciando geração de comprovante PDF para pagamento ${pagamentoId}`);

    // Buscar pagamento com todos os relacionamentos necessários
    const pagamento = await this.buscarPagamentoCompleto(pagamentoId);

    // Validar dados obrigatórios
    ComprovanteDadosMapper.validarDadosObrigatorios(pagamento);

    // Mapear dados para o formato do comprovante
    const dadosComprovante = ComprovanteDadosMapper.mapearParaComprovante(pagamento);

    // Gerar PDF usando o adapter
    const pdfBuffer = await this.comprovantePdfAdapter.gerarComprovante(dadosComprovante);
    
    // Gerar nome do arquivo
    const nomeArquivo = this.gerarNomeArquivo(dadosComprovante);
    
    // Converter para base64 se necessário
    const conteudoBase64 = gerarDto.formato === 'base64' ? pdfBuffer.toString('base64') : undefined;

    this.logger.log(`Comprovante PDF gerado com sucesso: ${nomeArquivo}`);

    return {
      nomeArquivo,
      tipoMime: 'application/pdf',
      tamanho: pdfBuffer.length,
      dataGeracao: new Date(),
      tipoComprovante: this.determinarTipoComprovanteEnum(dadosComprovante),
      conteudoBase64,
    };
  }

  /**
   * Gera apenas o buffer do PDF para download direto
   */
  async gerarPdfBuffer(
    pagamentoId: string,
    gerarDto: GerarComprovanteDto,
  ): Promise<Buffer> {
    this.logger.log(`Gerando buffer PDF para pagamento ${pagamentoId}`);

    // Buscar pagamento com todos os relacionamentos necessários
    const pagamento = await this.buscarPagamentoCompleto(pagamentoId);

    // Mapear dados para o formato do comprovante
    const dadosComprovante = ComprovanteDadosMapper.mapearParaComprovante(pagamento);

    // Gerar PDF usando o adapter
    const pdfBuffer = await this.comprovantePdfAdapter.gerarComprovante(dadosComprovante);
    
    this.logger.log(`Buffer PDF gerado com sucesso para pagamento ${pagamentoId}`);
    
    return pdfBuffer;
  }

  /**
    * Gera comprovantes em lote para múltiplos pagamentos
    */
   async gerarComprovantesLote(
     gerarLoteDto: GerarComprovanteLoteDto,
     usuarioId?: string,
   ): Promise<ComprovanteLoteGeradoDto> {
    this.logger.log(`Iniciando geração de comprovantes em lote para ${gerarLoteDto.pagamento_ids.length} pagamentos`);

    const pagamentosProcessados = [];
     const pagamentosFalharam = [];
     const erros = [];
    const pdfsBuffers = [];

    // Gerar comprovantes individuais em lotes paralelos controlados
    const resultados = await this.processarEmLotesParalelos(
      gerarLoteDto.pagamento_ids,
      async (pagamentoId) => {
        try {
          const pdfBuffer = await this.gerarPdfBuffer(pagamentoId, {
            formato: 'pdf',
          });
          
          return {
            sucesso: true,
            pagamentoId,
            pdfBuffer,
          };
        } catch (error) {
          this.logger.error(`Erro ao gerar comprovante para pagamento ${pagamentoId}:`, error);
          return {
            sucesso: false,
            pagamentoId,
            erro: error.message,
          };
        }
      }
    );

    // Processar resultados
    for (const resultado of resultados) {
      if (resultado.status === 'fulfilled') {
        const { sucesso, pagamentoId, pdfBuffer, erro } = resultado.value;
        
        if (sucesso) {
          pagamentosProcessados.push(pagamentoId);
          pdfsBuffers.push(pdfBuffer);
        } else {
          pagamentosFalharam.push(pagamentoId);
          erros.push({
            pagamentoId,
            erro,
          });
        }
      } else {
        // Caso a promise seja rejeitada (erro não capturado)
        this.logger.error('Erro não capturado durante processamento:', resultado.reason);
      }
    }

    // Combinar PDFs
     let pdfCombinado: Buffer | undefined;
     if (pdfsBuffers.length > 0) {
      try {
        pdfCombinado = await this.combinarPdfs(pdfsBuffers);
        this.logger.log(`PDFs combinados com sucesso. Total de páginas: ${pdfsBuffers.length}`);
      } catch (error) {
        this.logger.error('Erro ao combinar PDFs:', error);
        erros.push({
          pagamentoId: 'COMBINACAO',
          erro: `Erro ao combinar PDFs: ${error.message}`,
        });
      }
    }

    const nomeArquivoLote = `comprovantes_lote_${new Date().toISOString().split('T')[0]}.pdf`;

    this.logger.log(
       `Geração de lote concluída. Sucessos: ${pagamentosProcessados.length}, Erros: ${pagamentosFalharam.length}`,
     );

    return {
      nomeArquivo: nomeArquivoLote,
      tipoMime: 'application/pdf',
      dataGeracao: new Date(),
      totalComprovantes: gerarLoteDto.pagamento_ids.length,
        pagamentosProcessados,
        pagamentosFalharam,
        errosDetalhados: erros,
      tamanho: pdfCombinado?.length || 0,
      conteudoBase64: gerarLoteDto.formato === 'base64' && pdfCombinado 
        ? pdfCombinado.toString('base64') 
        : undefined,
    };
  }

  /**
    * Gera apenas o buffer do PDF combinado para download direto
    */
   async gerarLotePdfBuffer(
     gerarLoteDto: GerarComprovanteLoteDto,
     usuarioId?: string,
   ): Promise<Buffer> {
    this.logger.log(`Gerando buffer PDF em lote para ${gerarLoteDto.pagamento_ids.length} pagamentos`);

    const pdfsBuffers = [];

    // Gerar PDFs individuais em lotes paralelos controlados
    const resultadosPdfs = await this.processarEmLotesParalelos(
      gerarLoteDto.pagamento_ids,
      async (pagamentoId) => {
        try {
          const pdfBuffer = await this.gerarPdfBuffer(pagamentoId, {
            formato: 'pdf',
          });
          return pdfBuffer;
        } catch (error) {
          this.logger.error(`Erro ao gerar PDF para pagamento ${pagamentoId}:`, error);
          return null; // Retorna null para PDFs que falharam
        }
      }
    );

    // Filtrar apenas os PDFs gerados com sucesso
    for (const resultado of resultadosPdfs) {
      if (resultado.status === 'fulfilled' && resultado.value !== null) {
        pdfsBuffers.push(resultado.value);
      }
    }

    if (pdfsBuffers.length === 0) {
      throw new BadRequestException('Nenhum comprovante pôde ser gerado');
    }

    // Combinar PDFs
    const pdfCombinado = await this.combinarPdfs(pdfsBuffers);
    
    this.logger.log(`Buffer PDF em lote gerado com sucesso. Total de PDFs: ${pdfsBuffers.length}`);
    
    return pdfCombinado;
  }

  /**
   * Processa itens em lotes paralelos controlados para evitar sobrecarga
   */
  private async processarEmLotesParalelos<T, R>(
    items: T[],
    processFunction: (item: T) => Promise<R>
  ): Promise<PromiseSettledResult<R>[]> {
    const resultados: PromiseSettledResult<R>[] = [];
    
    // Processar em lotes de tamanho MAX_CONCURRENT_PROCESSING
    for (let i = 0; i < items.length; i += this.MAX_CONCURRENT_PROCESSING) {
      const lote = items.slice(i, i + this.MAX_CONCURRENT_PROCESSING);
      
      this.logger.log(
        `Processando lote ${Math.floor(i / this.MAX_CONCURRENT_PROCESSING) + 1}/${Math.ceil(items.length / this.MAX_CONCURRENT_PROCESSING)} ` +
        `(${lote.length} itens)`
      );
      
      const promisesLote = lote.map(item => processFunction(item));
      const resultadosLote = await Promise.allSettled(promisesLote);
      
      resultados.push(...resultadosLote);
    }
    
    return resultados;
  }

  /**
   * Combina múltiplos PDFs em um único documento
   */
  private async combinarPdfs(pdfsBuffers: Buffer[]): Promise<Buffer> {
    if (pdfsBuffers.length === 0) {
      throw new BadRequestException('Nenhum PDF para combinar');
    }

    if (pdfsBuffers.length === 1) {
      return pdfsBuffers[0];
    }

    try {
      // Criar documento PDF principal
      const pdfCombinado = await PDFDocument.create();

      // Adicionar cada PDF ao documento principal
      for (const pdfBuffer of pdfsBuffers) {
        const pdf = await PDFDocument.load(pdfBuffer);
        const paginas = await pdfCombinado.copyPages(pdf, pdf.getPageIndices());
        
        paginas.forEach((pagina) => {
          pdfCombinado.addPage(pagina);
        });
      }

      // Gerar buffer do PDF combinado
      const pdfBytes = await pdfCombinado.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      this.logger.error('Erro ao combinar PDFs:', error);
      throw new BadRequestException(`Erro ao combinar PDFs: ${error.message}`);
    }
  }

  /**
   * Determina o tipo de comprovante baseado no código do tipo de benefício
   */
  private determinarTipoComprovante(codigoTipoBeneficio: string): string {
    const mapeamento = {
      'cesta-basica': 'cesta_basica',
      'aluguel-social': 'aluguel_social',
    };

    const tipoComprovante = mapeamento[codigoTipoBeneficio];
    
    if (!tipoComprovante) {
      throw new BadRequestException(
        `Não há um modelo de recibo disponível para o benefício: ${codigoTipoBeneficio}`,
      );
    }

    return tipoComprovante;
  }

  /**
   * Determina o enum do tipo de comprovante baseado nos dados
   */
  private determinarTipoComprovanteEnum(dadosComprovante: any): TipoComprovante {
    if (dadosComprovante.locador) {
      return TipoComprovante.ALUGUEL_SOCIAL;
    }
    return TipoComprovante.CESTA_BASICA;
  }

  /**
   * Gera nome do arquivo baseado nos dados do comprovante
   */
  private gerarNomeArquivo(dadosComprovante: any): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nomeBeneficiarioOriginal = dadosComprovante.beneficiario?.nome || 'beneficiario';
    const nomeBeneficiario = sanitizeFilename(nomeBeneficiarioOriginal).replace(/\./g, '');
    const tipo = dadosComprovante.locador ? 'aluguel_social' : 'cesta_basica';
    
    return `comprovante_${tipo}_${nomeBeneficiario}_${timestamp}.pdf`;
  }

  /**
   * Busca um pagamento com todos os relacionamentos necessários para gerar o comprovante
   */
  private async buscarPagamentoCompleto(pagamentoId: string): Promise<Pagamento> {
    // Primeiro busca o pagamento com tipo de benefício para verificar se precisa de endereço
    const pagamentoBase = await this.pagamentoRepository
      .createScopedQueryBuilder('pagamento')
      .leftJoinAndSelect('pagamento.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .where('pagamento.id = :id', { id: pagamentoId })
      .getOne();

    if (!pagamentoBase) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Verifica se é aluguel social para incluir endereços
    const isAluguelSocial = pagamentoBase.solicitacao?.tipo_beneficio?.codigo === 'aluguel-social';

    // Busca completa com joins condicionais
    const queryBuilder = this.pagamentoRepository
      .createScopedQueryBuilder('pagamento')
      .leftJoinAndSelect('pagamento.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
      .leftJoinAndSelect('beneficiario.contatos', 'contatos')
      .leftJoinAndSelect('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .leftJoinAndSelect('solicitacao.tecnico', 'tecnico')
      .leftJoinAndSelect('solicitacao.unidade', 'unidade');

    // Adiciona joins específicos para aluguel social
    if (isAluguelSocial) {
      queryBuilder
        .leftJoinAndSelect('beneficiario.enderecos', 'enderecos')
        .leftJoinAndSelect('solicitacao.dados_aluguel_social', 'dados_aluguel_social');
    }

    const pagamento = await queryBuilder
      .where('pagamento.id = :id', { id: pagamentoId })
      .getOne();

    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }
    
    return pagamento;
  }

  // ========== MÉTODOS PRIVADOS ==========

  /**
   * Valida arquivo de comprovante
   */
  private validateFile(arquivo: Express.Multer.File): void {
    if (!arquivo) {
      throw new BadRequestException('Arquivo é obrigatório');
    }

    if (arquivo.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        'Arquivo muito grande. Máximo permitido: 5MB',
      );
    }

    if (!this.ALLOWED_TYPES.includes(arquivo.mimetype)) {
      throw new BadRequestException(
        'Tipo de arquivo não permitido. Use PDF, JPG ou PNG',
      );
    }
  }

  /**
   * Mapeia documento para DTO de resposta
   */
  private mapToResponseDto(
    documento: Documento,
    pagamento: Pagamento,
  ): ComprovanteResponseDto {
    return {
      id: documento.id,
      pagamento_id: pagamento.id,
      nome_original: documento.nome_original,
      tamanho: documento.tamanho,
      mimetype: documento.mimetype,
      data_upload: documento.data_upload,
      usuario_upload_id: documento.usuario_upload_id,
      observacoes: documento.descricao,
      hash_arquivo: documento.hash_arquivo,
      url_publica: documento.url_publica,
      metadados: documento.metadados,
      descricao: documento.descricao,
    };
  }
}
