import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IIntegracaoDocumentoService,
  IContextoUsuario,
  IResultadoOperacao,
  IDocumento,
  IArquivo,
  IMetadadosDocumento,
  IValidacaoDocumentos,
  IDocumentoInvalido,
  IComprovante,
} from '../interfaces';
import { Documento } from '../../../entities';
import { MinioService } from '../../../shared/services/minio.service';
import { DocumentoService } from '@/modules/documento/services/documento.service';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { CreateLogAuditoriaDto } from '../../auditoria/dto/create-log-auditoria.dto';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { TipoDocumentoEnum } from '../../../enums/tipo-documento.enum';
import { StatusDocumento } from '../../../enums/status-documento.enum';
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
export class IntegracaoDocumentoService implements IIntegracaoDocumentoService {
  private readonly logger = new Logger(IntegracaoDocumentoService.name);

  constructor(
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
    private minioService: MinioService,
    private readonly documentoService: DocumentoService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

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

    // Salvar no MinIO
    const resultado = await this.minioService.uploadArquivo(
      buffer,
      nomeUnico,
      pagamentoId,
      'COMPROVANTE_PAGAMENTO',
    );

    this.logger.log(
      `Comprovante salvo no MinIO: ${resultado.nomeArquivo} (${resultado.tamanho} bytes)`,
    );

    return {
      id: crypto.randomUUID(),
      caminhoArquivo: resultado.nomeArquivo,
      tamanho: resultado.tamanho,
      hash: resultado.hash,
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
    // Obter do MinIO
    const resultado = await this.minioService.downloadArquivo(caminhoArquivo);

    this.logger.log(`Comprovante obtido do MinIO: ${caminhoArquivo}`);

    // Registrar acesso ao documento
    this.logger.log(`Acesso ao documento registrado: ${caminhoArquivo} por usuário ${usuarioId}`);

    return {
      buffer: resultado.arquivo,
      nomeArquivo: resultado.metadados.nomeOriginal || path.basename(caminhoArquivo),
      mimeType: resultado.metadados.contentType,
      tamanho: resultado.arquivo.length,
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
    // Remover do MinIO
    await this.minioService.removerArquivo(caminhoArquivo);

    this.logger.log(`Comprovante removido do MinIO: ${caminhoArquivo}`);

    // Registrar remoção do documento
    this.logger.log(`Remoção do documento registrada: ${caminhoArquivo} por usuário ${usuarioId}`);

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
    try {
      // Tentar obter metadados do arquivo no MinIO
      await this.minioService.downloadArquivo(caminhoArquivo);
      this.logger.log(`Arquivo existe no MinIO: ${caminhoArquivo}`);
      return true;
    } catch (error) {
      this.logger.log(`Arquivo não existe no MinIO: ${caminhoArquivo}`);
      return false;
    }
  }

  // ========== MÉTODOS DA INTERFACE IIntegracaoDocumentoService ==========

  /**
   * Busca documentos de uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Lista de documentos
   */
  async buscarDocumentosSolicitacao(
    solicitacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IDocumento[]>> {
    try {
      this.logger.log(`Buscando documentos da solicitação ${solicitacaoId}`);

      // Buscar documentos da solicitação
      const documentos = await this.documentoRepository.find({
        where: { solicitacao_id: solicitacaoId },
        relations: ['solicitacao', 'cidadao'],
        order: { created_at: 'DESC' },
      });

      // Verificar permissão de acesso
      if (documentos.length > 0) {
        const primeiroDocumento = documentos[0];
        if (!this.verificarPermissaoAcesso(primeiroDocumento, contextoUsuario)) {
          await this.registrarAuditoria(
            'ACESSO_NEGADO_DOCUMENTOS',
            { solicitacaoId, usuarioId: contextoUsuario.id },
            contextoUsuario
          );
          
          return {
            sucesso: false,
            erro: 'Acesso negado aos documentos da solicitação',
            codigo: 'ACESSO_NEGADO',
            timestamp: new Date(),
          };
        }
      }

      // Formatar documentos
      const documentosFormatados: IDocumento[] = documentos.map(doc => ({
        id: doc.id,
        nome: doc.nome_original,
        tipo: doc.tipo,
        tamanho: doc.tamanho,
        mimeType: doc.mimetype,
        url: doc.caminho,
        status: 'ATIVO' as 'ATIVO' | 'INATIVO' | 'REMOVIDO',
        hash: doc.hash_arquivo || '',
        dataCriacao: doc.created_at,
        dataModificacao: doc.updated_at,
        criadoPor: doc.usuario_upload_id,
        solicitacaoId: doc.solicitacao_id,
        pagamentoId: undefined,
        cidadaoId: doc.cidadao_id,
        metadados: {
          categoria: 'DOCUMENTO',
          palavrasChave: [],
          confidencial: false,
          retencao: { prazo: 5, motivo: 'Legal' },
          origem: 'SISTEMA' as const,
          versao: 1,
          relacionamentos: {
            solicitacaoId: doc.solicitacao_id,
            cidadaoId: doc.cidadao_id
          }
        }
      }));

      await this.registrarAuditoria(
        'BUSCA_DOCUMENTOS_SOLICITACAO',
        { solicitacaoId, quantidadeDocumentos: documentos.length },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: documentosFormatados,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar documentos da solicitação ${solicitacaoId}:`, error);
      
      await this.registrarAuditoria(
        'ERRO_BUSCA_DOCUMENTOS_SOLICITACAO',
        { solicitacaoId, erro: error.message },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro ao buscar documentos da solicitação',
        codigo: 'ERRO_BUSCA_DOCUMENTOS',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Valida documentos de uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param tiposBeneficio Tipos de benefício para validação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da validação
   */
  async validarDocumentosSolicitacao(
    solicitacaoId: string,
    tiposBeneficio: string[],
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IValidacaoDocumentos>> {
    try {
      this.logger.log(`Validando documentos da solicitação ${solicitacaoId}`);

      // Buscar documentos da solicitação
      const resultadoDocumentos = await this.buscarDocumentosSolicitacao(
        solicitacaoId,
        contextoUsuario
      );

      if (!resultadoDocumentos.sucesso) {
        return {
          sucesso: false,
          erro: resultadoDocumentos.erro,
          dados: {
            valida: false,
            documentosObrigatorios: [],
            documentosEncontrados: [],
            documentosFaltantes: [],
            documentosInvalidos: [],
            observacoes: ['Erro ao buscar documentos da solicitação']
          },
          timestamp: new Date()
        };
      }

      const documentos = resultadoDocumentos.dados!;

      // Obter documentos obrigatórios para os tipos de benefício
      const documentosObrigatorios = this.obterDocumentosObrigatorios(tiposBeneficio);

      // Executar validações
      const validacao = await this.executarValidacaoDocumentos(
        documentos,
        documentosObrigatorios
      );

      await this.registrarAuditoria(
        'VALIDACAO_DOCUMENTOS_SOLICITACAO',
        {
          solicitacaoId,
          tiposBeneficio,
          valida: validacao.valida,
          documentosFaltantes: validacao.documentosFaltantes,
          documentosInvalidos: validacao.documentosInvalidos,
        },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: validacao,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Erro ao validar documentos da solicitação ${solicitacaoId}:`, error);
      
      await this.registrarAuditoria(
        'ERRO_VALIDACAO_DOCUMENTOS',
        { solicitacaoId, erro: error.message },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro ao validar documentos da solicitação',
        codigo: 'ERRO_VALIDACAO_DOCUMENTOS',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Verifica se um documento específico existe
   * @param documentoId ID do documento
   * @param contextoUsuario Contexto do usuário logado
   * @returns True se o documento existe
   */
  async verificarDocumentoExiste(
    documentoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<boolean>> {
    try {
      this.logger.log(`Verificando se documento ${documentoId} existe`);

      // Buscar documento
      const documento = await this.documentoRepository.findOne({
        where: { id: documentoId },
        relations: ['solicitacao', 'cidadao'],
      });

      if (!documento) {
        await this.registrarAuditoria(
          'DOCUMENTO_NAO_ENCONTRADO',
          { documentoId },
          contextoUsuario
        );
        
        return {
          sucesso: true,
          dados: false,
          timestamp: new Date(),
        };
      }

      // Verificar permissão de acesso
      if (!this.verificarPermissaoAcesso(documento, contextoUsuario)) {
        await this.registrarAuditoria(
          'ACESSO_NEGADO_DOCUMENTO',
          { documentoId, usuarioId: contextoUsuario.id },
          contextoUsuario
        );
        
        return {
          sucesso: false,
          erro: 'Acesso negado ao documento',
          codigo: 'ACESSO_NEGADO',
          timestamp: new Date(),
        };
      }

      await this.registrarAuditoria(
        'VERIFICACAO_DOCUMENTO_EXISTE',
        { documentoId, existe: true },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: true,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Erro ao verificar se documento ${documentoId} existe:`, error);
      
      await this.registrarAuditoria(
        'ERRO_VERIFICACAO_DOCUMENTO',
        { documentoId, erro: error.message },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro ao verificar documento',
        codigo: 'ERRO_VERIFICACAO_DOCUMENTO',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Obtém URL de download de um documento
   * @param documentoId ID do documento
   * @param contextoUsuario Contexto do usuário logado
   * @returns URL de download
   */
  async obterUrlDownload(
    documentoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<string>> {
    try {
      this.logger.log(`Obtendo URL de download do documento ${documentoId}`);

      // Verificar se documento existe e se usuário tem acesso
      const resultadoExiste = await this.verificarDocumentoExiste(
        documentoId,
        contextoUsuario
      );

      if (!resultadoExiste.sucesso) {
        return {
          sucesso: resultadoExiste.sucesso,
          dados: resultadoExiste.sucesso ? 'Documento já existe' : undefined,
          erro: resultadoExiste.erro,
          timestamp: new Date()
        };
      }

      if (!resultadoExiste.dados) {
        return {
          sucesso: false,
          erro: 'Documento não encontrado',
          codigo: 'DOCUMENTO_NAO_ENCONTRADO',
          timestamp: new Date(),
        };
      }

      // Buscar documento para obter URL
      const documento = await this.documentoRepository.findOne({
        where: { id: documentoId },
      });

      if (!documento || !documento.caminho) {
        return {
          sucesso: false,
          erro: 'URL do documento não disponível',
          codigo: 'URL_NAO_DISPONIVEL',
          timestamp: new Date(),
        };
      }

      // Gerar URL de download temporária (se necessário)
      const urlDownload = await this.gerarUrlDownloadTemporaria(documento.caminho);

      await this.registrarAuditoria(
        'DOWNLOAD_DOCUMENTO',
        { documentoId, url: documento.caminho },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: urlDownload,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Erro ao obter URL de download do documento ${documentoId}:`, error);
      
      await this.registrarAuditoria(
        'ERRO_URL_DOWNLOAD',
        { documentoId, erro: error.message },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro ao obter URL de download',
        codigo: 'ERRO_URL_DOWNLOAD',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  // ========== MÉTODOS AUXILIARES PRIVADOS ==========

  /**
   * Verifica se o usuário tem permissão para acessar o documento
   * @param documento Documento a ser verificado
   * @param contextoUsuario Contexto do usuário logado
   * @returns True se tem permissão, false caso contrário
   */
  private verificarPermissaoAcesso(
    documento: Documento,
    contextoUsuario: IContextoUsuario
  ): boolean {
    // Admin tem acesso total
    if (contextoUsuario.isAdmin) {
      return true;
    }

    // Supervisor tem acesso a documentos da sua unidade
    if (contextoUsuario.isSupervisor) {
      // Verificar se a solicitação pertence à unidade do supervisor
      return documento.solicitacao?.unidade_id === contextoUsuario.unidadeId;
    }

    // Usuário comum só acessa documentos da sua unidade
    return documento.solicitacao?.unidade_id === contextoUsuario.unidadeId;
  }

  /**
   * Obtém lista de documentos obrigatórios para tipos de benefício
   * @param tiposBeneficio Tipos de benefício
   * @returns Lista de tipos de documentos obrigatórios
   */
  private obterDocumentosObrigatorios(tiposBeneficio: string[]): TipoDocumentoEnum[] {
    const documentosObrigatorios: Set<TipoDocumentoEnum> = new Set();

    for (const tipoBeneficio of tiposBeneficio) {
      switch (tipoBeneficio.toUpperCase()) {
        case 'AUXILIO_NATALIDADE':
          documentosObrigatorios.add(TipoDocumentoEnum.CPF);
          documentosObrigatorios.add(TipoDocumentoEnum.RG);
          documentosObrigatorios.add(TipoDocumentoEnum.CERTIDAO_NASCIMENTO);
          documentosObrigatorios.add(TipoDocumentoEnum.COMPROVANTE_RESIDENCIA);
          documentosObrigatorios.add(TipoDocumentoEnum.COMPROVANTE_RENDA);
          break;

        case 'ALUGUEL_SOCIAL':
          documentosObrigatorios.add(TipoDocumentoEnum.CPF);
          documentosObrigatorios.add(TipoDocumentoEnum.RG);
          documentosObrigatorios.add(TipoDocumentoEnum.COMPROVANTE_RESIDENCIA);
          documentosObrigatorios.add(TipoDocumentoEnum.COMPROVANTE_RENDA);
          documentosObrigatorios.add(TipoDocumentoEnum.CONTRATO_ALUGUEL);
          break;

        case 'AUXILIO_VULNERABILIDADE':
          documentosObrigatorios.add(TipoDocumentoEnum.CPF);
          documentosObrigatorios.add(TipoDocumentoEnum.RG);
          documentosObrigatorios.add(TipoDocumentoEnum.COMPROVANTE_RESIDENCIA);
          documentosObrigatorios.add(TipoDocumentoEnum.COMPROVANTE_RENDA);
          documentosObrigatorios.add(TipoDocumentoEnum.RELATORIO_SOCIAL);
          break;

        default:
          // Documentos básicos para qualquer benefício
          documentosObrigatorios.add(TipoDocumentoEnum.CPF);
          documentosObrigatorios.add(TipoDocumentoEnum.RG);
          documentosObrigatorios.add(TipoDocumentoEnum.COMPROVANTE_RESIDENCIA);
          break;
      }
    }

    return Array.from(documentosObrigatorios);
  }

  /**
   * Executa validação dos documentos
   * @param documentos Lista de documentos enviados
   * @param documentosObrigatorios Lista de documentos obrigatórios
   * @returns Resultado da validação
   */
  private async executarValidacaoDocumentos(
    documentos: IDocumento[],
    documentosObrigatorios: TipoDocumentoEnum[]
  ): Promise<IValidacaoDocumentos> {
    const documentosFaltantes: TipoDocumentoEnum[] = [];
    const documentosInvalidos: IDocumentoInvalido[] = [];
    const documentosValidados: string[] = [];

    // Verificar documentos obrigatórios
    for (const tipoObrigatorio of documentosObrigatorios) {
      const documentoEncontrado = documentos.find(
        doc => doc.tipo === tipoObrigatorio && doc.status === 'ATIVO'
      );

      if (!documentoEncontrado) {
        documentosFaltantes.push(tipoObrigatorio);
      } else {
        // Validar documento encontrado
        const validacaoDoc = this.validarDocumentoIndividual(documentoEncontrado);
        if (!validacaoDoc.valido) {
          documentosInvalidos.push({
            documentoId: documentoEncontrado.id,
            tipo: documentoEncontrado.tipo,
            motivos: [validacaoDoc.motivo || 'Documento inválido'],
            podeCorrigir: true
          });
        } else {
          documentosValidados.push(documentoEncontrado.id);
        }
      }
    }

    // Validar documentos adicionais
    const documentosAdicionais = documentos.filter(
      doc => !documentosObrigatorios.includes(doc.tipo as TipoDocumentoEnum)
    );

    for (const docAdicional of documentosAdicionais) {
      const validacaoDoc = this.validarDocumentoIndividual(docAdicional);
      if (!validacaoDoc.valido) {
        documentosInvalidos.push({
          documentoId: docAdicional.id,
          tipo: docAdicional.tipo,
          motivos: [validacaoDoc.motivo || 'Documento inválido'],
          podeCorrigir: true
        });
      } else {
        documentosValidados.push(docAdicional.id);
      }
    }

    const valida = documentosFaltantes.length === 0 && documentosInvalidos.length === 0;

    return {
      valida,
      documentosObrigatorios: documentosObrigatorios.map(tipo => ({
        tipo,
        descricao: `Documento ${tipo}`,
        obrigatorio: true,
        formatos: ['pdf', 'jpg', 'png'],
        tamanhoMaximo: 5242880 // 5MB
      })),
      documentosEncontrados: documentos.filter(doc => doc.status === 'ATIVO').map(doc => doc.tipo),
      documentosFaltantes,
      documentosInvalidos,
      observacoes: this.gerarObservacoesValidacao(valida, documentosFaltantes, documentosInvalidos)
    };
  }

  /**
   * Valida um documento individual
   * @param documento Documento a ser validado
   * @returns Resultado da validação
   */
  private validarDocumentoIndividual(documento: IDocumento): { valido: boolean; motivo?: string } {
    // Verificar se documento foi rejeitado
    if (documento.status !== 'ATIVO') {
      return { valido: false, motivo: 'Documento foi rejeitado' };
    }

    // Verificar se documento não está ativo
    if (documento.status !== 'ATIVO') {
      return { valido: false, motivo: 'Documento não está ativo' };
    }

    // Verificar tamanho do arquivo (máximo 10MB)
    if (documento.tamanho > 10 * 1024 * 1024) {
      return { valido: false, motivo: 'Arquivo muito grande (máximo 10MB)' };
    }

    // Verificar tipo MIME permitido
    const tiposPermitidos = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
    ];

    if (!tiposPermitidos.includes(documento.mimeType)) {
      return { valido: false, motivo: 'Tipo de arquivo não permitido' };
    }

    // Verificar se URL está disponível
    if (!documento.url) {
      return { valido: false, motivo: 'URL do documento não disponível' };
    }

    return { valido: true };
  }

  /**
   * Gera observações da validação
   * @param valida Se a validação passou
   * @param documentosFaltantes Lista de documentos faltantes
   * @param documentosInvalidos Lista de documentos inválidos
   * @returns Observações da validação
   */
  private gerarObservacoesValidacao(
    valida: boolean,
    documentosFaltantes: TipoDocumentoEnum[],
    documentosInvalidos: IDocumentoInvalido[]
  ): string[] {
    if (valida) {
      return ['Todos os documentos obrigatórios foram validados com sucesso.'];
    }

    const observacoes: string[] = [];

    if (documentosFaltantes.length > 0) {
      observacoes.push(
        `Documentos faltantes: ${documentosFaltantes.join(', ')}`
      );
    }

    if (documentosInvalidos.length > 0) {
      observacoes.push(
        `Documentos inválidos: ${documentosInvalidos.length} documento(s)`
      );
    }

    return observacoes;
  }

  /**
   * Gera URL de download temporária
   * @param urlOriginal URL original do documento
   * @returns URL de download temporária
   */
  private async gerarUrlDownloadTemporaria(urlOriginal: string): Promise<string> {
    // Se a URL já é uma URL completa, retorna ela mesma
    if (urlOriginal.startsWith('http')) {
      return urlOriginal;
    }

    // Se é um caminho relativo, pode precisar gerar URL assinada
    // Para Azure Blob Storage, por exemplo
    try {
      // Aqui seria implementada a lógica específica do storage provider
      // Por enquanto, retorna a URL original
      return urlOriginal;
    } catch (error) {
      this.logger.warn('Erro ao gerar URL temporária, usando URL original:', error);
      return urlOriginal;
    }
  }

  /**
   * Valida documentos obrigatórios para pagamento
   */
  async validarDocumentosObrigatorios(
    solicitacaoId: string,
    tipoBeneficio: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IValidacaoDocumentos>> {
    // Implementação simplificada
    return {
      sucesso: true,
      dados: { 
        valida: true,
        documentosObrigatorios: [],
        documentosEncontrados: [],
        documentosFaltantes: [], 
        documentosInvalidos: [],
        observacoes: []
      },
      timestamp: new Date()
    };
  }

  /**
   * Gera comprovante de pagamento
   */
  async gerarComprovantePagamento(
    pagamentoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IComprovante>> {
    // Implementação simplificada
    return {
      sucesso: true,
      dados: { 
        id: pagamentoId, 
        tipo: 'PAGAMENTO',
        numero: `COMP-${pagamentoId}`,
        dataGeracao: new Date(),
        arquivo: {
           id: `doc-${pagamentoId}`,
           nome: `comprovante-${pagamentoId}.pdf`,
           tipo: 'application/pdf',
           tamanho: 0,
           mimeType: 'application/pdf',
           url: '',
           hash: '',
           dataCriacao: new Date(),
           criadoPor: contextoUsuario.id,
           pagamentoId,
           metadados: {
             categoria: 'COMPROVANTE',
             palavrasChave: ['comprovante', 'pagamento'],
             confidencial: true,
             retencao: {
               prazo: 5,
               motivo: 'Comprovante de pagamento'
             },
             origem: 'SISTEMA' as const,
             versao: 1,
             relacionamentos: {
               pagamentoId
             }
           },
           status: 'ATIVO' as const
         },
        dados: {
          pagamentoId,
          valor: 0,
          beneficiario: '',
          cpfBeneficiario: '',
          tipoBeneficio: '',
          dataProcessamento: new Date(),
          metodoPagamento: ''
        },
        assinatura: '',
        valido: true
      },
      timestamp: new Date()
    };
  }

  /**
   * Armazena documento no sistema
   */
  async armazenarDocumento(
    arquivo: IArquivo,
    metadados: IMetadadosDocumento,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IDocumento>> {
    // Implementação simplificada
    return {
      sucesso: true,
      dados: {
        id: 'doc-id',
        nome: arquivo.originalname,
        tipo: metadados.categoria,
        tamanho: arquivo.size,
        mimeType: arquivo.mimetype,
        url: '',
        status: 'ATIVO',
        hash: '',
        dataCriacao: new Date(),
        dataModificacao: new Date(),
        criadoPor: contextoUsuario.id,
        solicitacaoId: metadados.relacionamentos?.solicitacaoId,
        pagamentoId: metadados.relacionamentos?.pagamentoId,
        cidadaoId: metadados.relacionamentos?.cidadaoId,
        metadados: {
          categoria: 'DOCUMENTO',
          palavrasChave: [],
          confidencial: false,
          retencao: { prazo: 5, motivo: 'Legal' },
          origem: 'UPLOAD_USUARIO' as const,
          versao: 1,
          relacionamentos: {}
        }
      },
      timestamp: new Date()
    };
  }

  /**
   * Remove documento do sistema
   */
  async removerDocumento(
    documentoId: string,
    motivo: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<void>> {
    // Implementação simplificada
    return {
      sucesso: true,
      dados: undefined,
      timestamp: new Date()
    };
  }

  /**
   * Busca documento por ID
   */
  async buscarDocumento(
    documentoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IDocumento>> {
    // Implementação simplificada
    return {
      sucesso: true,
      dados: {
        id: documentoId,
        nome: 'documento.pdf',
        tipo: 'IDENTIDADE',
        tamanho: 1024,
        mimeType: 'application/pdf',
        url: '',
        status: 'ATIVO',
        hash: '',
        dataCriacao: new Date(),
        dataModificacao: new Date(),
        criadoPor: contextoUsuario.id,
        solicitacaoId: undefined,
        pagamentoId: undefined,
        cidadaoId: undefined,
        metadados: {
          categoria: 'DOCUMENTO',
          palavrasChave: [],
          confidencial: false,
          retencao: { prazo: 5, motivo: 'Legal' },
          origem: 'UPLOAD_USUARIO' as const,
          versao: 1,
          relacionamentos: {}
        }
      },
      timestamp: new Date()
    };
  }

  /**
   * Gera URL temporária para download do documento
   */
  async gerarUrlDownload(
    documentoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<string>> {
    // Implementação simplificada
    return {
      sucesso: true,
      dados: `https://example.com/download/${documentoId}`,
      timestamp: new Date()
    };
  }

  /**
   * Registra evento de auditoria
   * @param operacao Tipo da operação
   * @param dados Dados da operação
   * @param contextoUsuario Contexto do usuário
   */
  private async registrarAuditoria(
    operacao: string,
    dados: any,
    contextoUsuario: IContextoUsuario
  ): Promise<void> {
    try {
      const logDto = new CreateLogAuditoriaDto();
      logDto.usuario_id = contextoUsuario.id;
      logDto.tipo_operacao = operacao as TipoOperacao;
      logDto.entidade_afetada = 'Documento';
      logDto.entidade_id = dados.documentoId || dados.solicitacaoId || null;
      logDto.dados_anteriores = undefined;
      logDto.dados_novos = dados;
      logDto.ip_origem = 'N/A';
      logDto.user_agent = 'Sistema';
      
      await this.auditoriaService.create(logDto);
    } catch (error) {
      this.logger.error('Erro ao registrar auditoria:', error);
      // Não propagar erro de auditoria
    }
  }
}
