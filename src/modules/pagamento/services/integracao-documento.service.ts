import { Injectable, BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Serviço de integração com o módulo de Documento
 *
 * Implementa a comunicação entre o módulo de Pagamento e o módulo de Documento,
 * permitindo o armazenamento e recuperação de comprovantes de pagamento.
 *
 * @author Equipe PGBen
 */
@Injectable()
export class IntegracaoDocumentoService {
  // Em uma implementação real, este serviço injetaria o DocumentoService do módulo de documento
  // constructor(private readonly documentoService: DocumentoService) {}

  /**
   * Armazena um comprovante de pagamento
   *
   * @param buffer Buffer com o conteúdo do arquivo
   * @param nomeArquivo Nome original do arquivo
   * @param mimeType Tipo MIME do arquivo
   * @param pagamentoId ID do pagamento relacionado
   * @param tipoDocumento Tipo do documento (comprovante, recibo, etc.)
   * @param usuarioId ID do usuário que está realizando o upload
   * @returns Informações do documento armazenado
   */
  async armazenarComprovante(
    buffer: Buffer,
    nomeArquivo: string,
    mimeType: string,
    pagamentoId: string,
    tipoDocumento: string,
    usuarioId: string,
  ): Promise<{
    id: string;
    caminhoArquivo: string;
    tamanho: number;
    hash: string;
  }> {
    // Validar o arquivo
    this.validarArquivo(buffer, mimeType);

    // Gerar um nome único para o arquivo
    const nomeUnico = this.gerarNomeUnicoArquivo(nomeArquivo, pagamentoId);

    // Calcular hash do arquivo para verificação de integridade
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Em uma implementação real, chamaria o serviço de documento
    // const resultado = await this.documentoService.armazenarDocumento({
    //   conteudo: buffer,
    //   nomeArquivo: nomeUnico,
    //   mimeType,
    //   categoria: 'COMPROVANTE_PAGAMENTO',
    //   entidadeId: pagamentoId,
    //   tipoEntidade: 'PAGAMENTO',
    //   metadados: {
    //     tipoDocumento,
    //     hash,
    //     uploadedPor: usuarioId
    //   }
    // });

    // Implementação de mock para desenvolvimento
    console.log(
      `[INTEGRAÇÃO] Armazenando comprovante para o pagamento ${pagamentoId}`,
    );

    // Simular caminho de armazenamento
    const caminhoArquivo = `pagamentos/${pagamentoId}/comprovantes/${nomeUnico}`;

    return {
      id: crypto.randomUUID(),
      caminhoArquivo,
      tamanho: buffer.length,
      hash,
    };
  }

  /**
   * Recupera o conteúdo de um comprovante de pagamento
   *
   * @param caminhoArquivo Caminho do arquivo no sistema de armazenamento
   * @param usuarioId ID do usuário que está solicitando o arquivo
   * @returns Buffer com o conteúdo do arquivo e metadados
   */
  async recuperarComprovante(
    caminhoArquivo: string,
    usuarioId: string,
  ): Promise<{
    buffer: Buffer;
    nomeArquivo: string;
    mimeType: string;
    tamanho: number;
  }> {
    // Em uma implementação real, chamaria o serviço de documento
    // const documento = await this.documentoService.recuperarDocumento(caminhoArquivo, usuarioId);

    // Registrar acesso ao documento
    // await this.documentoService.registrarAcesso({
    //   caminhoArquivo,
    //   usuarioId,
    //   tipoAcesso: 'DOWNLOAD',
    //   timestamp: new Date()
    // });

    // return {
    //   buffer: documento.conteudo,
    //   nomeArquivo: documento.nomeOriginal,
    //   mimeType: documento.mimeType,
    //   tamanho: documento.tamanho
    // };

    // Implementação de mock para desenvolvimento
    console.log(`[INTEGRAÇÃO] Recuperando comprovante: ${caminhoArquivo}`);

    // Extrair nome do arquivo do caminho
    const nomeArquivo = path.basename(caminhoArquivo);

    // Criar um buffer vazio para simulação
    const buffer = Buffer.from('Conteúdo simulado do arquivo de comprovante');

    // Determinar o MIME type baseado na extensão
    const extensao = path.extname(nomeArquivo).toLowerCase();
    let mimeType = 'application/octet-stream';

    if (extensao === '.pdf') {
      mimeType = 'application/pdf';
    } else if (extensao === '.jpg' || extensao === '.jpeg') {
      mimeType = 'image/jpeg';
    } else if (extensao === '.png') {
      mimeType = 'image/png';
    }

    return {
      buffer,
      nomeArquivo,
      mimeType,
      tamanho: buffer.length,
    };
  }

  /**
   * Remove um comprovante de pagamento
   *
   * @param caminhoArquivo Caminho do arquivo no sistema de armazenamento
   * @param usuarioId ID do usuário que está solicitando a remoção
   * @returns true se removido com sucesso
   */
  async removerComprovante(
    caminhoArquivo: string,
    usuarioId: string,
  ): Promise<boolean> {
    // Em uma implementação real, chamaria o serviço de documento
    // await this.documentoService.removerDocumento(caminhoArquivo, usuarioId);

    // Registrar remoção do documento
    // await this.documentoService.registrarOperacao({
    //   caminhoArquivo,
    //   usuarioId,
    //   tipoOperacao: 'REMOCAO',
    //   timestamp: new Date()
    // });

    // return true;

    // Implementação de mock para desenvolvimento
    console.log(`[INTEGRAÇÃO] Removendo comprovante: ${caminhoArquivo}`);

    return true;
  }

  /**
   * Valida um arquivo antes do armazenamento
   *
   * @param buffer Conteúdo do arquivo
   * @param mimeType Tipo MIME declarado
   * @throws BadRequestException se o arquivo for inválido
   */
  private validarArquivo(buffer: Buffer, mimeType: string): void {
    // Verificar tamanho máximo (5MB)
    const tamanhoMaximo = 5 * 1024 * 1024;
    if (buffer.length > tamanhoMaximo) {
      throw new BadRequestException(
        `Tamanho do arquivo excede o limite máximo de ${tamanhoMaximo / (1024 * 1024)}MB`,
      );
    }

    // Verificar tipos MIME permitidos
    const tiposPermitidos = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];

    if (!tiposPermitidos.includes(mimeType)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. Tipos permitidos: ${tiposPermitidos.join(', ')}`,
      );
    }

    // Verificação básica de assinatura de arquivo (magic bytes)
    // Esta é uma verificação simplificada, em produção seria mais robusta
    if (mimeType === 'application/pdf' && buffer.length >= 4) {
      const signature = buffer.slice(0, 4).toString('hex');
      if (signature !== '25504446') {
        // %PDF em hex
        throw new BadRequestException('Arquivo PDF inválido');
      }
    }

    if (mimeType === 'image/jpeg' && buffer.length >= 3) {
      const signature = buffer.slice(0, 3).toString('hex');
      if (signature !== 'ffd8ff') {
        // JPEG SOI marker
        throw new BadRequestException('Arquivo JPEG inválido');
      }
    }

    if (mimeType === 'image/png' && buffer.length >= 8) {
      const signature = buffer.slice(0, 8).toString('hex');
      if (signature !== '89504e470d0a1a0a') {
        // PNG signature
        throw new BadRequestException('Arquivo PNG inválido');
      }
    }
  }

  /**
   * Gera um nome único para o arquivo
   *
   * @param nomeOriginal Nome original do arquivo
   * @param pagamentoId ID do pagamento relacionado
   * @returns Nome único para armazenamento
   */
  private gerarNomeUnicoArquivo(
    nomeOriginal: string,
    pagamentoId: string,
  ): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extensao = path.extname(nomeOriginal);

    return `${timestamp}-${randomString}${extensao}`;
  }

  /**
   * Verifica se um arquivo existe no sistema de armazenamento
   *
   * @param caminhoArquivo Caminho do arquivo
   * @returns true se o arquivo existir
   */
  async verificarArquivoExiste(caminhoArquivo: string): Promise<boolean> {
    // Em uma implementação real, chamaria o serviço de documento
    // return this.documentoService.verificarExistencia(caminhoArquivo);

    // Implementação de mock para desenvolvimento
    console.log(
      `[INTEGRAÇÃO] Verificando existência do arquivo: ${caminhoArquivo}`,
    );

    // Simular que o arquivo existe
    return true;
  }
}
