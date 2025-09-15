import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  GerarDocumentoDto,
  DocumentoGeradoDto,
  ListarDocumentosDto,
} from '../dtos/gerar-documento.dto';
import { PdfCommonService } from '@/common/pdf/services/pdf-common.service';
import { AutorizacaoAtaudeTemplate } from '@/common/pdf/templates/comprovantes/autorizacao-ataude.template';
import { DocumentoAdapter } from '../adapters/documento.adapter';
import { Solicitacao } from '../../../entities/solicitacao.entity';
import { Usuario } from '../../../entities/usuario.entity';
import { Documento } from '../../../entities/documento.entity';
import {
  IDadosDocumento,
  IDocumentoPdfService,
  IDocumentoTemplate,
} from '../interfaces/documento-pdf.interface';
import { TipoDocumentoEnum } from '@/enums';

/**
 * Service para geração de documentos PDF
 * Refatorado para usar o módulo comum de PDF
 */
@Injectable()
export class DocumentoPdfService {
  private readonly logger = new Logger(DocumentoPdfService.name);

  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
    private readonly configService: ConfigService,
    private readonly pdfCommonService: PdfCommonService,
    private readonly autorizacaoAtaudeTemplate: AutorizacaoAtaudeTemplate,
    private readonly documentoAdapter: DocumentoAdapter,
  ) { }

  /**
   * Gera um documento PDF baseado nos parâmetros fornecidos
   */
  async gerarDocumento(
    gerarDocumentoDto: GerarDocumentoDto,
    usuarioId: string,
  ): Promise<DocumentoGeradoDto> {
    try {
      this.logger.log(
        `Iniciando geração de documento ${gerarDocumentoDto.tipoDocumento} para solicitação ${gerarDocumentoDto.solicitacaoId}`,
      );

      // Validar dados de entrada
      await this.validarDadosEntrada(gerarDocumentoDto, usuarioId);

      // Buscar dados da solicitação
      const dadosDocumento = await this.buscarDadosSolicitacao(
        gerarDocumentoDto.solicitacaoId,
      );

      // Obter template apropriado
      const template = this.obterTemplate(gerarDocumentoDto.tipoDocumento);

      // Gerar PDF usando o novo sistema
      const buffer = await this.gerarPdfComNovoSistema(
        dadosDocumento,
        gerarDocumentoDto.tipoDocumento,
      );

      const nomeArquivo = `documento_${gerarDocumentoDto.solicitacaoId}_${Date.now()}.pdf`;

      // Salvar documento no sistema de arquivos
      const bufferNode = Buffer.from(buffer);
      const caminhoArquivo = await this.salvarArquivo(bufferNode, nomeArquivo);

      // Registrar documento no banco de dados
      const documentoSalvo = await this.registrarDocumento({
        solicitacaoId: gerarDocumentoDto.solicitacaoId,
        tipoDocumento: gerarDocumentoDto.tipoDocumento,
        nomeArquivo,
        caminhoArquivo,
        tamanhoArquivo: buffer.length,
        usuarioId,
      });

      this.logger.log(
        `Documento ${gerarDocumentoDto.tipoDocumento} gerado com sucesso: ${documentoSalvo.id}`,
      );

      return {
        id: documentoSalvo.id,
        nomeArquivo,
        tipoDocumento: gerarDocumentoDto.tipoDocumento,
        tamanhoArquivo: buffer.length,
        dataGeracao: documentoSalvo.created_at,
        solicitacaoId: gerarDocumentoDto.solicitacaoId,
        conteudoBase64: gerarDocumentoDto.formato === 'base64'
          ? bufferNode.toString('base64')
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao gerar documento: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro interno ao gerar documento',
      );
    }
  }

  /**
   * Gera PDF usando o novo sistema padronizado
   */
  private async gerarPdfComNovoSistema(
    dadosDocumento: IDadosDocumento,
    tipoDocumento: TipoDocumentoEnum,
  ): Promise<Buffer> {
    try {
      this.logger.log(`Iniciando geração com novo sistema para tipo: ${tipoDocumento}`);
      
      switch (tipoDocumento) {
        case TipoDocumentoEnum.AUTORIZACAO_ATAUDE:
          this.logger.log('Verificando dados de entrada...');
          this.logger.debug(`Dados documento: ${JSON.stringify(dadosDocumento, null, 2)}`);
          
          // Verificar se o adapter está disponível
          if (!this.documentoAdapter) {
            throw new Error('DocumentoAdapter não está disponível');
          }
          
          // Converter dados para o novo formato
          this.logger.log('Convertendo dados para o novo formato...');
          const dadosConvertidos = this.documentoAdapter.converterParaAutorizacaoAtaude(dadosDocumento);
          
          if (!dadosConvertidos) {
            throw new Error('Dados convertidos são undefined');
          }
          
          this.logger.debug(`Dados convertidos: ${JSON.stringify(dadosConvertidos, null, 2)}`);
          
          // Verificar se o template está disponível
          if (!this.autorizacaoAtaudeTemplate) {
            throw new Error('AutorizacaoAtaudeTemplate não está disponível');
          }
          
          // Validar dados antes de gerar
          this.logger.log('Validando dados convertidos...');
          const dadosValidos = this.autorizacaoAtaudeTemplate.validarDados(dadosConvertidos);
          
          if (!dadosValidos) {
            throw new Error('Dados convertidos não passaram na validação do template');
          }
          
          // Gerar PDF usando o template padronizado com header e footer
          this.logger.log('Gerando documento PDF...');
          const buffer = await this.autorizacaoAtaudeTemplate.gerarDocumento(dadosConvertidos);
          
          if (!buffer) {
            throw new Error('Buffer do PDF é undefined');
          }
          
          this.logger.log(`PDF gerado com sucesso. Tamanho: ${buffer.length} bytes`);
          return buffer;

        default:
          throw new BadRequestException(`Tipo de documento não suportado: ${tipoDocumento}`);
      }
    } catch (error) {
      this.logger.error(`Erro ao gerar PDF com novo sistema: ${error.message}`);
      this.logger.error(`Stack trace: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Gera buffer do PDF a partir da definição do documento
   */
  private async gerarBufferPdf(documentDefinition: any): Promise<Buffer> {
    const PdfPrinter = require('pdfmake');

    // Configuração correta das fontes padrão do sistema
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      },
      Courier: {
        normal: 'Courier',
        bold: 'Courier-Bold',
        italics: 'Courier-Oblique',
        bolditalics: 'Courier-BoldOblique'
      },
      Times: {
        normal: 'Times-Roman',
        bold: 'Times-Bold',
        italics: 'Times-Italic',
        bolditalics: 'Times-BoldItalic'
      }
    };

    const printer = new PdfPrinter(fonts);

    // Garantir que o documento usa a fonte segura e remover bold problemático
    const documentDefinitionSeguro = this.prepararDocumentoSeguro(documentDefinition);

    const pdfDoc = printer.createPdfKitDocument(documentDefinitionSeguro);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      pdfDoc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      pdfDoc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      pdfDoc.on('error', (error) => {
        this.logger.error('Erro ao gerar PDF:', error);
        reject(error);
      });

      pdfDoc.end();
    });
  }

  /**
   * Prepara documento removendo estilos problemáticos
   */
  private prepararDocumentoSeguro(documentDefinition: any): any {
    const documento = JSON.parse(JSON.stringify(documentDefinition)); // Deep clone

    // Definir estilo padrão seguro
    documento.defaultStyle = {
      font: 'Helvetica',
      fontSize: 10,
      ...documento.defaultStyle
    };

    // Remover estilos bold/italic de todos os elementos
    this.removerEstilosProblematicos(documento);

    return documento;
  }

  /**
   * Remove estilos problemáticos que podem causar erros de fonte
   * Recursivamente percorre o documento e ajusta estilos
   */
  private removerEstilosProblematicos(obj: any): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    // Se é um array, processar cada item
    if (Array.isArray(obj)) {
      obj.forEach(item => this.removerEstilosProblematicos(item));
      return;
    }

    // Processar propriedades do objeto
    Object.keys(obj).forEach(key => {
      const value = obj[key];

      // Se encontrar propriedade 'bold' com valor true, manter mas garantir que a fonte suporte
      if (key === 'bold' && value === true) {
        // Garantir que a fonte está definida como Helvetica (que suporta bold)
        if (!obj.font) {
          obj.font = 'Helvetica';
        }
      }

      // Se encontrar propriedade 'italics' com valor true, manter mas garantir que a fonte suporte
      if (key === 'italics' && value === true) {
        // Garantir que a fonte está definida como Helvetica (que suporta italics)
        if (!obj.font) {
          obj.font = 'Helvetica';
        }
      }

      // Recursivamente processar objetos aninhados
      if (typeof value === 'object') {
        this.removerEstilosProblematicos(value);
      }
    });
  }

  /**
   * Lista documentos gerados com filtros opcionais
   */
  async listarDocumentos(
    filtros: ListarDocumentosDto,
    usuarioId: string,
  ): Promise<DocumentoGeradoDto[]> {
    try {
      const queryBuilder = this.documentoRepository
        .createQueryBuilder('documento')
        .leftJoinAndSelect('documento.solicitacao', 'solicitacao')
        .leftJoinAndSelect('documento.usuario_upload', 'usuario_upload');

      // Aplicar filtros
      if (filtros.tipoDocumento) {
        queryBuilder.andWhere('documento.tipo_documento = :tipoDocumento', {
          tipoDocumento: filtros.tipoDocumento,
        });
      }

      if (filtros.solicitacaoId) {
        queryBuilder.andWhere('documento.solicitacao_id = :solicitacaoId', {
          solicitacaoId: filtros.solicitacaoId,
        });
      }

      if (filtros.dataInicial && filtros.dataFinal) {
        queryBuilder.andWhere(
          'documento.created_at BETWEEN :dataInicial AND :dataFinal',
          {
            dataInicial: new Date(filtros.dataInicial),
            dataFinal: new Date(filtros.dataFinal + ' 23:59:59'),
          },
        );
      }

      // Verificar permissões do usuário
      const usuario = await this.usuarioRepository.findOne({
        where: { id: usuarioId },
        relations: ['role'],
      });

      if (!usuario) {
        throw new NotFoundException('Usuário não encontrado');
      }

      // Se não for admin, filtrar apenas documentos do próprio usuário
      if (usuario.role?.nome !== 'admin') {
        queryBuilder.andWhere('documento.usuario_upload_id = :usuarioId', {
          usuarioId,
        });
      }

      queryBuilder.orderBy('documento.created_at', 'DESC');

      const documentos = await queryBuilder.getMany();

      return documentos.map((doc) => ({
        id: doc.id,
        nomeArquivo: doc.nome_arquivo,
        tipoDocumento: doc.tipo as any, // Conversão temporária
        tamanhoArquivo: doc.tamanho,
        dataGeracao: doc.created_at,
        solicitacaoId: doc.solicitacao?.id,
      }));
    } catch (error) {
      this.logger.error(
        `Erro ao listar documentos: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Erro interno ao listar documentos');
    }
  }

  /**
   * Busca um documento específico por ID
   */
  async buscarDocumentoPorId(
    id: string,
    usuarioId: string,
  ): Promise<DocumentoGeradoDto> {
    try {
      const documento = await this.documentoRepository.findOne({
        where: { id },
        relations: ['solicitacao', 'cidadao'],
      });

      if (!documento) {
        throw new NotFoundException('Documento não encontrado');
      }

      // Verificar permissões
      await this.verificarPermissaoDocumento(documento, usuarioId);

      return {
        id: documento.id,
        nomeArquivo: documento.nome_arquivo,
        tipoDocumento: documento.tipo as any, // Conversão temporária
        tamanhoArquivo: documento.tamanho,
        dataGeracao: documento.created_at,
        solicitacaoId: documento.solicitacao?.id,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `Erro ao buscar documento: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Erro interno ao buscar documento');
    }
  }

  /**
   * Faz download de um documento PDF
   */
  async downloadDocumento(
    id: string,
    usuarioId: string,
  ): Promise<{ buffer: Buffer; nomeArquivo: string }> {
    try {
      const documento = await this.documentoRepository.findOne({
        where: { id },
        relations: ['solicitacao', 'solicitacao.tecnico'],
      });

      if (!documento) {
        throw new NotFoundException('Documento não encontrado');
      }

      // Verificar permissões
      await this.verificarPermissaoDocumento(documento, usuarioId);

      // Verificar se arquivo existe
      const caminhoCompleto = join(
        this.configService.get<string>('UPLOAD_PATH', './uploads'),
        documento.caminho,
      );

      try {
        await fs.access(caminhoCompleto);
      } catch {
        throw new NotFoundException('Arquivo não encontrado no sistema');
      }

      const buffer = await fs.readFile(caminhoCompleto);

      return {
        buffer,
        nomeArquivo: documento.nome_arquivo,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `Erro ao fazer download do documento: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro interno ao fazer download do documento',
      );
    }
  }

  /**
   * Remove um documento do sistema
   */
  async removerDocumento(id: string, usuarioId: string): Promise<void> {
    try {
      const documento = await this.documentoRepository.findOne({
        where: { id },
        relations: ['usuario'],
      });

      if (!documento) {
        throw new NotFoundException('Documento não encontrado');
      }

      // Verificar permissões (apenas admin e técnico podem remover)
      const usuario = await this.usuarioRepository.findOne({
        where: { id: usuarioId },
        relations: ['role'],
      });

      if (!usuario) {
        throw new NotFoundException('Usuário não encontrado');
      }

      const perfilPermitido = ['admin', 'tecnico'].includes(
        usuario.role?.nome || '',
      );

      if (!perfilPermitido) {
        throw new ForbiddenException(
          'Sem permissão para remover documentos',
        );
      }

      // Remover arquivo físico
      const caminhoCompleto = join(
        this.configService.get<string>('UPLOAD_PATH', './uploads'),
        documento.caminho,
      );

      try {
        await fs.unlink(caminhoCompleto);
      } catch (error) {
        this.logger.warn(
          `Arquivo físico não encontrado para remoção: ${caminhoCompleto}`,
        );
      }

      // Remover registro do banco
      await this.documentoRepository.remove(documento);

      this.logger.log(`Documento removido com sucesso: ${id}`);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Erro ao remover documento: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro interno ao remover documento',
      );
    }
  }

  /**
   * Gera múltiplos documentos em lote
   */
  async gerarDocumentosLote(
    documentos: GerarDocumentoDto[],
    usuarioId: string,
  ): Promise<DocumentoGeradoDto[]> {
    const resultados: DocumentoGeradoDto[] = [];
    const erros: string[] = [];

    for (const documento of documentos) {
      try {
        const resultado = await this.gerarDocumento(documento, usuarioId);
        resultados.push(resultado);
      } catch (error) {
        erros.push(
          `Erro ao gerar documento ${documento.tipoDocumento} para solicitação ${documento.solicitacaoId}: ${error.message}`,
        );
      }
    }

    if (erros.length > 0) {
      this.logger.warn(`Erros na geração em lote: ${erros.join('; ')}`);
    }

    return resultados;
  }

  /**
   * Valida dados antes da geração do documento
   */
  async validarDadosDocumento(
    gerarDocumentoDto: GerarDocumentoDto,
    usuarioId: string,
  ): Promise<{
    valido: boolean;
    erros: string[];
    avisos: string[];
  }> {
    const erros: string[] = [];
    const avisos: string[] = [];

    try {
      // Validar usuário
      const usuario = await this.usuarioRepository.findOne({
        where: { id: usuarioId },
      });
      if (!usuario) {
        erros.push('Usuário não encontrado');
      }

      // Validar solicitação
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: gerarDocumentoDto.solicitacaoId },
        relations: ['beneficiario', 'unidade', 'tecnico'],
      });

      if (!solicitacao) {
        erros.push('Solicitação não encontrada');
      } else {
        // Validações específicas por tipo de documento
        switch (gerarDocumentoDto.tipoDocumento) {
          case TipoDocumentoEnum.AUTORIZACAO_ATAUDE:
            if (!solicitacao.beneficiario) {
              erros.push('Beneficiário não encontrado na solicitação');
            }
            if (!solicitacao.tecnico) {
              avisos.push('Técnico responsável não definido');
            }
            break;

          case TipoDocumentoEnum.COMPROVANTE_BENEFICIO:
            if (!solicitacao.unidade) {
              erros.push('Unidade não encontrada na solicitação');
            }
            break;
        }
      }

      return {
        valido: erros.length === 0,
        erros,
        avisos,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao validar dados: ${error.message}`,
        error.stack,
      );
      return {
        valido: false,
        erros: ['Erro interno na validação'],
        avisos: [],
      };
    }
  }

  /**
   * Métodos privados auxiliares
   */

  private async validarDadosEntrada(
    gerarDocumentoDto: GerarDocumentoDto,
    usuarioId: string,
  ): Promise<void> {
    const validacao = await this.validarDadosDocumento(
      gerarDocumentoDto,
      usuarioId,
    );

    if (!validacao.valido) {
      throw new BadRequestException(
        `Dados inválidos: ${validacao.erros.join(', ')}`,
      );
    }
  }

  private async buscarDadosSolicitacao(
    solicitacaoId: string,
  ): Promise<IDadosDocumento> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
      relations: [
        'beneficiario',
        'unidade',
        'tecnico',
        'solicitante',
        'dados_ataude',
      ],
    });

    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    return {
      solicitacao: {
        id: solicitacao.id,
        protocolo: solicitacao.protocolo,
        dataAbertura: solicitacao.data_abertura,
        status: solicitacao.status,
        observacoes: solicitacao.observacoes,
        tipoBeneficio: {
          nome: solicitacao.tipo_beneficio?.nome || 'Não informado',
          descricao: solicitacao.tipo_beneficio?.descricao,
        },
      },
      beneficiario: solicitacao.beneficiario
        ? {
          nome: solicitacao.beneficiario.nome,
          cpf: solicitacao.beneficiario.cpf,
          rg: solicitacao.beneficiario.rg,
          endereco: solicitacao.beneficiario?.enderecos?.[0],
        }
        : solicitacao.solicitante
          ? {
            nome: solicitacao.solicitante.nome,
            cpf: solicitacao.solicitante.cpf,
            rg: solicitacao.solicitante.rg || '',
            data_nascimento: solicitacao.solicitante.data_nascimento ? new Date(solicitacao.solicitante.data_nascimento) : new Date(),
          }
          : {
            nome: 'BENEFICIÁRIO NÃO INFORMADO',
            cpf: '',
            rg: '',
            data_nascimento: new Date(),
          },
      unidade: solicitacao.unidade
        ? {
          nome: solicitacao.unidade.nome,
          endereco: solicitacao.unidade.endereco,
          telefone: solicitacao.unidade.telefone,
        }
        : undefined,
      tecnico: solicitacao.tecnico
        ? {
          nome: solicitacao.tecnico.nome
        }
        : undefined,
      requerente: solicitacao.solicitante,
      dados_ataude: solicitacao.dados_ataude
        ? {
          tipo_urna: solicitacao.dados_ataude.tipo_urna_necessaria,
          data_autorizacao: new Date(solicitacao.dados_ataude.data_autorizacao).toLocaleDateString('pt-BR'),
          grau_parentesco: solicitacao.dados_ataude.grau_parentesco_requerente,
          observacoes: solicitacao.dados_ataude.observacoes,
          data_obito: solicitacao.dados_ataude.data_obito ? new Date(solicitacao.dados_ataude.data_obito).toLocaleDateString('pt-BR') : undefined,
          declaracao_obito: solicitacao.dados_ataude.declaracao_obito,
          valor_urna: solicitacao.valor || 0,
          valor_autorizado: solicitacao.valor || 0,
          cemiterio: solicitacao.dados_ataude.endereco_cemiterio
            ? {
              nome: `${solicitacao.dados_ataude.endereco_cemiterio.logradouro}, ${solicitacao.dados_ataude.endereco_cemiterio.numero}`,
              endereco: `${solicitacao.dados_ataude.endereco_cemiterio.bairro}, ${solicitacao.dados_ataude.endereco_cemiterio.cidade} - ${solicitacao.dados_ataude.endereco_cemiterio.estado}`,
            }
            : {
              nome: 'Não informado',
              endereco: 'Não informado',
            },
        }
        : undefined,
      data_geracao: new Date().toLocaleDateString('pt-BR'),
    };
  }

  private obterTemplate(tipoDocumento: TipoDocumentoEnum): IDocumentoTemplate {
    switch (tipoDocumento) {
      case TipoDocumentoEnum.AUTORIZACAO_ATAUDE:
        return {
          tipo: TipoDocumentoEnum.AUTORIZACAO_ATAUDE,
          titulo: 'DEPARTAMENTO DE PROTEÇÃO SOCIAL BÁSICA - DPSB',
          subtitulo: 'SETOR DE GESTÃO DE BENEFÍCIOS',
          rodape: 'Gestão de Benefícios Eventuais/ SEMTAS - Av. Nevaldo Rocha, nº 2180 – Dix-Sept Rosado CEP: 59054-000 – Natal/RN',
          camposAssinatura: {
            beneficiario: false,
            requerente: true,
            tecnico: true,
            testemunha: false,
          },
        };
      default:
        throw new BadRequestException(
          `Tipo de documento não suportado: ${tipoDocumento}`,
        );
    }
  }

  private async salvarArquivo(
    buffer: Buffer,
    nomeArquivo: string,
  ): Promise<string> {
    const uploadPath = this.configService.get<string>(
      'UPLOAD_PATH',
      './uploads',
    );
    const documentosPath = join(uploadPath, 'documentos');

    // Criar diretório se não existir
    await fs.mkdir(documentosPath, { recursive: true });

    const caminhoRelativo = join('documentos', nomeArquivo);
    const caminhoCompleto = join(uploadPath, caminhoRelativo);

    await fs.writeFile(caminhoCompleto, buffer);

    return caminhoRelativo;
  }

  private async registrarDocumento(dados: {
    solicitacaoId: string;
    tipoDocumento: TipoDocumentoEnum;
    nomeArquivo: string;
    caminhoArquivo: string;
    tamanhoArquivo: number;
    usuarioId: string;
  }): Promise<Documento> {
    // Buscar cidadão da solicitação para vincular o documento
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: dados.solicitacaoId },
      relations: ['beneficiario'],
    });

    if (!solicitacao?.beneficiario) {
      throw new NotFoundException('Beneficiário da solicitação não encontrado');
    }

    const documento = this.documentoRepository.create({
      id: uuidv4(),
      solicitacao_id: dados.solicitacaoId,
      cidadao_id: solicitacao.beneficiario.id,
      tipo: dados.tipoDocumento as any, // Conversão temporária
      nome_arquivo: dados.nomeArquivo,
      nome_original: dados.nomeArquivo,
      caminho: dados.caminhoArquivo,
      tamanho: dados.tamanhoArquivo,
      mimetype: 'application/pdf',
      data_upload: new Date(),
      usuario_upload_id: dados.usuarioId,
      verificado: false,
      reutilizavel: false,
    });

    return this.documentoRepository.save(documento);
  }

  private async verificarPermissaoDocumento(
    documento: Documento,
    usuarioId: string,
  ): Promise<void> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
      relations: ['role'],
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Admin pode ver todos os documentos
    if (usuario.role?.nome === 'admin') {
      return;
    }

    // Outros usuários só podem ver seus próprios documentos
    if (documento.usuario_upload_id !== usuarioId) {
      throw new ForbiddenException(
        'Sem permissão para acessar este documento',
      );
    }
  }
}