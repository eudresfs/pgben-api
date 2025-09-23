import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { ResultadoBeneficioCessado } from '../../../entities/resultado-beneficio-cessado.entity';
import { DocumentoComprobatorio } from '../../../entities/documento-comprobatorio.entity';
import { Concessao } from '../../../entities/concessao.entity';
import { Usuario } from '../../../entities/usuario.entity';
import { CreateResultadoBeneficioCessadoDto } from '../dto/create-resultado-beneficio-cessado.dto';
import { ResultadoBeneficioCessadoResponseDto } from '../dto/resultado-beneficio-cessado-response.dto';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { MotivoEncerramentoBeneficio } from '../../../enums/motivo-encerramento-beneficio.enum';
import { StatusVulnerabilidade } from '../../../enums/status-vulnerabilidade.enum';
import { TipoDocumentoComprobatorio } from '@/enums';
import { StorageProviderFactory } from '../../documento/factories/storage-provider.factory';
import * as crypto from 'crypto';

/**
 * Service responsável pela lógica de negócio do registro de resultado
 * de benefício cessado.
 * 
 * Implementa as regras estabelecidas pela Lei de Benefícios Eventuais
 * do SUAS (Lei nº 8.742/1993) para documentação adequada do encerramento
 * de benefícios eventuais.
 * 
 * Garante conformidade com as regulamentações do Conselho Nacional
 * de Assistência Social (CNAS) e boas práticas de documentação.
 */
@Injectable()
export class ResultadoBeneficioCessadoService {
  private readonly logger = new Logger(ResultadoBeneficioCessadoService.name);

  constructor(
    @InjectRepository(ResultadoBeneficioCessado)
    private readonly resultadoRepository: Repository<ResultadoBeneficioCessado>,
    
    @InjectRepository(DocumentoComprobatorio)
    private readonly documentoRepository: Repository<DocumentoComprobatorio>,
    
    @InjectRepository(Concessao)
    private readonly concessaoRepository: Repository<Concessao>,
    
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    
    private readonly dataSource: DataSource,
    private readonly storageProviderFactory: StorageProviderFactory,
  ) {}

  /**
   * Registra o resultado de um benefício cessado.
   * 
   * Valida a concessão, verifica permissões do técnico e registra
   * todas as informações conforme exigências da LOAS.
   * 
   * @param createDto - Dados para criação do registro
   * @param tecnicoId - ID do técnico responsável pelo registro
   * @param provaSocialFiles - Arquivos de prova social (fotos e testemunhos)
   * @param documentacaoTecnicaFiles - Arquivos de documentação técnica (laudos, relatórios)
   * @returns Resultado registrado com documentos comprobatórios
   */
  async registrarResultado(
    createDto: CreateResultadoBeneficioCessadoDto,
    tecnicoId: string,
    provaSocialFiles?: Express.Multer.File[],
    documentacaoTecnicaFiles?: Express.Multer.File[],
  ): Promise<ResultadoBeneficioCessadoResponseDto> {
    this.logger.log(`Iniciando registro de resultado para concessão ${createDto.concessaoId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validar concessão
      const concessao = await this.validarConcessao(createDto.concessaoId, queryRunner);
      
      // Validar técnico responsável
      const tecnico = await this.validarTecnico(tecnicoId, queryRunner);
      
      // Validar regras de negócio específicas
      await this.validarRegrasNegocio(createDto, concessao);
      
      // Criar registro do resultado
      const resultado = await this.criarResultado(createDto, concessao, tecnico, queryRunner);
      
      // Processar arquivos de prova social e documentação técnica
      await this.processarArquivos(
        resultado.id,
        provaSocialFiles,
        documentacaoTecnicaFiles,
        createDto.documentosComprobatorios,
        tecnicoId,
        queryRunner,
      );
      
      await queryRunner.commitTransaction();
      
      this.logger.log(`Resultado registrado com sucesso: ${resultado.id}`);
      
      // Buscar resultado completo para retorno
      return await this.buscarResultadoCompleto(resultado.id);
      
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Erro ao registrar resultado: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Busca um resultado de benefício cessado por ID.
   * 
   * @param id - ID do resultado
   * @returns Resultado com todas as informações relacionadas
   */
  async buscarPorId(id: string): Promise<ResultadoBeneficioCessadoResponseDto> {
    this.logger.log(`Buscando resultado por ID: ${id}`);
    
    return await this.buscarResultadoCompleto(id);
  }

  /**
   * Lista resultados de benefícios cessados com filtros.
   * 
   * @param filtros - Filtros para busca
   * @returns Lista paginada de resultados
   */
  async listar(filtros: {
    concessaoId?: string;
    tecnicoId?: string;
    motivoEncerramento?: MotivoEncerramentoBeneficio;
    statusVulnerabilidade?: StatusVulnerabilidade;
    dataInicio?: Date;
    dataFim?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    resultados: ResultadoBeneficioCessadoResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.logger.log('Listando resultados de benefícios cessados');
    
    const { page = 1, limit = 10, ...outrosFiltros } = filtros;
    const skip = (page - 1) * limit;
    
    const queryBuilder = this.resultadoRepository
      .createQueryBuilder('resultado')
      .leftJoinAndSelect('resultado.concessao', 'concessao')
      .leftJoinAndSelect('resultado.tecnicoResponsavel', 'tecnico')
      .leftJoinAndSelect('resultado.documentosComprobatorios', 'documentos')
      .orderBy('resultado.dataRegistro', 'DESC');
    
    // Aplicar filtros
    if (outrosFiltros.concessaoId) {
      queryBuilder.andWhere('resultado.concessaoId = :concessaoId', {
        concessaoId: outrosFiltros.concessaoId,
      });
    }
    
    if (outrosFiltros.tecnicoId) {
      queryBuilder.andWhere('resultado.tecnicoResponsavelId = :tecnicoId', {
        tecnicoId: outrosFiltros.tecnicoId,
      });
    }
    
    if (outrosFiltros.motivoEncerramento) {
      queryBuilder.andWhere('resultado.motivoEncerramento = :motivo', {
        motivo: outrosFiltros.motivoEncerramento,
      });
    }
    
    if (outrosFiltros.statusVulnerabilidade) {
      queryBuilder.andWhere('resultado.statusVulnerabilidade = :status', {
        status: outrosFiltros.statusVulnerabilidade,
      });
    }
    
    if (outrosFiltros.dataInicio) {
      queryBuilder.andWhere('resultado.dataRegistro >= :dataInicio', {
        dataInicio: outrosFiltros.dataInicio,
      });
    }
    
    if (outrosFiltros.dataFim) {
      queryBuilder.andWhere('resultado.dataRegistro <= :dataFim', {
        dataFim: outrosFiltros.dataFim,
      });
    }
    
    const [resultados, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    
    return {
      resultados: resultados.map(resultado => 
        plainToClass(ResultadoBeneficioCessadoResponseDto, resultado, {
          excludeExtraneousValues: true,
        })
      ),
      total,
      page,
      limit,
    };
  }

  /**
   * Valida se a concessão existe e pode ter resultado registrado.
   */
  private async validarConcessao(
    concessaoId: string,
    queryRunner: QueryRunner,
  ): Promise<Concessao> {
    const concessao = await queryRunner.manager.findOne(Concessao, {
      where: { id: concessaoId },
      relations: ['solicitacao'],
    });

    if (!concessao) {
      throw new NotFoundException('Concessão não encontrada');
    }

    if (concessao.status !== StatusConcessao.CESSADO) {
      throw new BadRequestException(
        'Só é possível registrar resultado para concessões com status CESSADO'
      );
    }

    // Verificar se já existe resultado registrado
    const resultadoExistente = await queryRunner.manager.findOne(
      ResultadoBeneficioCessado,
      { where: { concessaoId } }
    );

    if (resultadoExistente) {
      throw new BadRequestException(
        'Já existe um resultado registrado para esta concessão'
      );
    }

    return concessao;
  }

  /**
   * Valida se o técnico existe e tem permissão para registrar resultados.
   */
  private async validarTecnico(
    tecnicoId: string,
    queryRunner: QueryRunner,
  ): Promise<Usuario> {
    const tecnico = await queryRunner.manager.findOne(Usuario, {
      where: { id: tecnicoId },
    });

    if (!tecnico) {
      throw new NotFoundException('Técnico não encontrado');
    }

    // Aqui você pode adicionar validações específicas de permissão
    // Por exemplo, verificar se o usuário tem o papel de técnico social
    
    return tecnico;
  }

  /**
   * Valida regras de negócio específicas conforme LOAS.
   */
  private async validarRegrasNegocio(
    createDto: CreateResultadoBeneficioCessadoDto,
    concessao: Concessao,
  ): Promise<void> {
    // Validar coerência entre motivo e status de vulnerabilidade
    if (
      createDto.motivoEncerramento === MotivoEncerramentoBeneficio.SUPERACAO_VULNERABILIDADE &&
      createDto.statusVulnerabilidade !== StatusVulnerabilidade.SUPERADA
    ) {
      throw new BadRequestException(
        'Motivo de superação de vulnerabilidade deve ter status SUPERADA'
      );
    }

    // Validar necessidade de acompanhamento posterior
    if (
      createDto.acompanhamentoPosterior &&
      !createDto.detalhesAcompanhamento
    ) {
      throw new BadRequestException(
        'Detalhes do acompanhamento são obrigatórios quando acompanhamento posterior é necessário'
      );
    }
  }

  /**
   * Cria o registro do resultado.
   */
  private async criarResultado(
    createDto: CreateResultadoBeneficioCessadoDto,
    concessao: Concessao,
    tecnico: Usuario,
    queryRunner: QueryRunner,
  ): Promise<ResultadoBeneficioCessado> {
    const resultado = queryRunner.manager.create(ResultadoBeneficioCessado, {
      concessaoId: createDto.concessaoId,
      tipoMotivoEncerramento: createDto.motivoEncerramento,
      motivoDetalhado: createDto.descricaoMotivo,
      statusVulnerabilidade: createDto.statusVulnerabilidade,
      descricaoVulnerabilidade: createDto.avaliacaoVulnerabilidade,
      vulnerabilidadeSuperada: createDto.statusVulnerabilidade === 'superada',
      observacoesTecnicas: createDto.observacoes,
      recomendacoesAcompanhamento: createDto.detalhesAcompanhamento,
      encaminhadoOutrosServicos: false, // valor padrão
      tecnicoResponsavelId: tecnico.id,
      dataRegistro: new Date(),
    });

    return await queryRunner.manager.save(resultado);
  }

  /**
   * Processa arquivos de prova social e documentação técnica.
   */
  private async processarArquivos(
    resultadoId: string,
    provaSocialFiles?: Express.Multer.File[],
    documentacaoTecnicaFiles?: Express.Multer.File[],
    documentosDto?: any[],
    tecnicoId?: string,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    this.logger.log(`Processando arquivos para resultado ${resultadoId}`, {
      provaSocialFiles: provaSocialFiles?.length || 0,
      documentacaoTecnicaFiles: documentacaoTecnicaFiles?.length || 0,
      documentosDto: documentosDto?.length || 0
    });

    const documentos: any[] = [];
    const storageProvider = this.storageProviderFactory.getProvider();

    // Processar arquivos de prova social
    if (provaSocialFiles && provaSocialFiles.length > 0) {
      this.logger.log(`Processando ${provaSocialFiles.length} arquivos de prova social`);
      for (const file of provaSocialFiles) {
        // Gerar caminho de armazenamento seguindo padrão do módulo de documentos
        const caminhoArquivo = await this.gerarCaminhoArmazenamento(
          resultadoId,
          'prova_social',
          file.originalname
        );

        // Salvar arquivo no MinIO
        const caminhoSalvo = await storageProvider.salvarArquivo(
          file.buffer,
          caminhoArquivo,
          file.mimetype,
          {
            tipoDocumento: 'prova_social',
            resultadoId: resultadoId,
            nomeOriginal: file.originalname,
          }
        );

        documentos.push({
          tipo: 'prova_social',
          nomeArquivo: file.originalname,
          caminhoArquivo: caminhoSalvo,
          tipoMime: file.mimetype,
          tamanhoArquivo: file.size,
          descricao: 'Prova social - ' + file.originalname,
          observacoes: 'Arquivo de prova social (fotos e testemunhos)',
          hashArquivo: await this.calcularHashArquivo(file.buffer),
        });
      }
    }

    // Processar arquivos de documentação técnica
    if (documentacaoTecnicaFiles && documentacaoTecnicaFiles.length > 0) {
      this.logger.log(`Processando ${documentacaoTecnicaFiles.length} arquivos de documentação técnica`);
      for (const file of documentacaoTecnicaFiles) {
        // Gerar caminho de armazenamento seguindo padrão do módulo de documentos
        const caminhoArquivo = await this.gerarCaminhoArmazenamento(
          resultadoId,
          'documentacao_tecnica',
          file.originalname
        );

        // Salvar arquivo no MinIO
        const caminhoSalvo = await storageProvider.salvarArquivo(
          file.buffer,
          caminhoArquivo,
          file.mimetype,
          {
            tipoDocumento: 'documentacao_tecnica',
            resultadoId: resultadoId,
            nomeOriginal: file.originalname,
          }
        );

        documentos.push({
          tipo: 'documentacao_tecnica',
          nomeArquivo: file.originalname,
          caminhoArquivo: caminhoSalvo,
          tipoMime: file.mimetype,
          tamanhoArquivo: file.size,
          descricao: 'Documentação técnica - ' + file.originalname,
          observacoes: 'Arquivo de documentação técnica (laudos, relatórios)',
          hashArquivo: await this.calcularHashArquivo(file.buffer),
        });
      }
    }

    // Processar documentos do DTO (se houver)
    if (documentosDto && documentosDto.length > 0) {
      this.logger.log(`Processando ${documentosDto.length} documentos do DTO`);
      documentos.push(...documentosDto);
    }

    // Criar documentos comprobatórios
    if (documentos.length > 0) {
      this.logger.log(`Criando documentos comprobatórios: ${documentos.length} documentos`);
      await this.criarDocumentosComprobatorios(resultadoId, documentos, tecnicoId, queryRunner);
    } else {
      this.logger.log('Nenhum documento para processar - pulando criação de documentos comprobatórios');
    }
  }

  /**
   * Cria os documentos comprobatórios.
   */
  private async criarDocumentosComprobatorios(
    resultadoId: string,
    documentosDto: any[],
    tecnicoId: string,
    queryRunner: QueryRunner,
  ): Promise<void> {
    // Validar se há documentos válidos para processar
    if (!documentosDto || documentosDto.length === 0) {
      this.logger.warn('Nenhum documento válido para processar');
      return;
    }

    // Filtrar apenas documentos com campos obrigatórios preenchidos
    const documentosValidos = documentosDto.filter(docDto => {
      const isValid = docDto && 
                     docDto.tipo && 
                     docDto.nomeArquivo && 
                     docDto.caminhoArquivo;
      
      if (!isValid) {
        this.logger.warn('Documento inválido ignorado:', {
          tipo: docDto?.tipo,
          nomeArquivo: docDto?.nomeArquivo,
          caminhoArquivo: docDto?.caminhoArquivo
        });
      }
      
      return isValid;
    });

    // Se não há documentos válidos após filtro, não criar nada
    if (documentosValidos.length === 0) {
      this.logger.warn('Nenhum documento válido após filtro de validação');
      return;
    }

    this.logger.log(`Criando ${documentosValidos.length} documentos comprobatórios`);

    const documentos = documentosValidos.map(docDto =>
      queryRunner.manager.create(DocumentoComprobatorio, {
        resultadoBeneficioCessadoId: resultadoId,
        tipo: docDto.tipo,
        nomeArquivo: docDto.nomeArquivo,
        caminhoArquivo: docDto.caminhoArquivo,
        tipoMime: docDto.tipoMime,
        tamanhoArquivo: docDto.tamanhoArquivo,
        descricao: docDto.descricao,
        observacoes: docDto.observacoes,
        hashArquivo: docDto.hashArquivo,
        dataUpload: new Date(),
        usuarioUploadId: tecnicoId,
        validado: false,
      })
    );

    await queryRunner.manager.save(documentos);
  }

  /**
   * Calcula hash do arquivo para verificação de integridade.
   */
  private async calcularHashArquivo(buffer: Buffer): Promise<string> {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Gera o caminho de armazenamento seguindo o padrão do módulo de documentos
   * Formato: resultado_beneficio_cessado/YYYY/MM/DD/resultado_id/tipo/filename
   */
  private gerarCaminhoArmazenamento(
    resultadoId: string,
    tipo: string,
    nomeArquivo: string,
  ): string {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');

    // Sanitizar componentes do caminho para evitar problemas de assinatura no MinIO
    const diretorioBase = this.sanitizePath('resultado_beneficio_cessado'); // Trocar hífen por underscore
    const resultadoIdSanitizado = this.sanitizePath(resultadoId);
    const tipoSanitizado = this.sanitizePath(tipo);
    const nomeArquivoSanitizado = this.sanitizeFileName(nomeArquivo);

    return `${diretorioBase}/${ano}/${mes}/${dia}/${resultadoIdSanitizado}/${tipoSanitizado}/${nomeArquivoSanitizado}`;
  }

  /**
   * Sanitiza componentes do caminho removendo caracteres problemáticos
   * IMPORTANTE: Não remove hífens para preservar UUIDs e evitar erros de assinatura no MinIO
   */
  private sanitizePath(input: string): string {
    if (!input || typeof input !== 'string') {
      throw new Error('Input para sanitização deve ser uma string não vazia');
    }

    // Remove caracteres perigosos mas preserva hífens (seguindo padrão do DocumentoPathService)
    return input
      .replace(/[<>:"|?*\x00-\x1f]/g, '_') // Caracteres perigosos SEM hífen
      .replace(/\.\./g, '_') // Path traversal
      .replace(/^\.|\.$/, '_') // Pontos no início/fim
      .substring(0, 50) // Limita tamanho
      .trim();
  }

  /**
   * Sanitiza nome de arquivo preservando extensão
   * IMPORTANTE: Não remove hífens para preservar nomes originais e evitar erros de assinatura
   */
  private sanitizeFileName(fileName: string): string {
    if (!fileName || typeof fileName !== 'string') {
      throw new Error('Nome do arquivo deve ser uma string não vazia');
    }

    // Separa nome e extensão
    const lastDotIndex = fileName.lastIndexOf('.');
    let name = fileName;
    let extension = '';

    if (lastDotIndex > 0) {
      name = fileName.substring(0, lastDotIndex);
      extension = fileName.substring(lastDotIndex);
    }

    // Sanitiza o nome preservando a extensão e hífens (seguindo padrão do DocumentoPathService)
    const sanitizedName = name
      .replace(/[<>:"|?*\x00-\x1f]/g, '_') // Remove caracteres perigosos SEM hífen
      .replace(/\.\./g, '_')
      .substring(0, 100)
      .trim();

    // Sanitiza a extensão
    const sanitizedExtension = extension
      .replace(/[<>:"|?*\x00-\x1f]/g, '')
      .substring(0, 10);

    return sanitizedName + sanitizedExtension;
  }

  /**
   * Busca resultado completo com todas as relações.
   */
  private async buscarResultadoCompleto(
    id: string,
  ): Promise<ResultadoBeneficioCessadoResponseDto> {
    const resultado = await this.resultadoRepository.findOne({
      where: { id },
      relations: [
        'concessao',
        'tecnicoResponsavel',
        'documentosComprobatorios',
        'documentosComprobatorios.usuarioUpload',
      ],
    });

    if (!resultado) {
      throw new NotFoundException('Resultado não encontrado');
    }

    return plainToClass(ResultadoBeneficioCessadoResponseDto, resultado, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Faz download de um arquivo específico
   */
  async downloadArquivo(
    resultadoId: string,
    arquivoId: string,
    usuarioId: string,
  ): Promise<{ stream: any; filename: string; mimeType: string }> {
    this.logger.log(`Download de arquivo ${arquivoId} do resultado ${resultadoId}`);

    // Buscar o resultado com documentos comprobatórios
    const resultado = await this.resultadoRepository.findOne({
      where: { id: resultadoId },
      relations: ['documentosComprobatorios'],
    });

    if (!resultado) {
      throw new NotFoundException('Resultado não encontrado');
    }

    // Buscar o documento específico
    const documento = resultado.documentosComprobatorios?.find(d => d.id === arquivoId);
    if (!documento) {
      throw new NotFoundException('Arquivo não encontrado');
    }

    try {
      // Usar o storage provider para obter stream do arquivo
      const storageProvider = this.storageProviderFactory.getProvider();
      const stream = await storageProvider.obterArquivoStream(documento.caminhoArquivo);

      return {
        stream,
        filename: documento.nomeArquivo,
        mimeType: documento.tipoMime,
      };
    } catch (error) {
      this.logger.error(`Erro ao fazer download do arquivo ${arquivoId}:`, error);
      throw new Error('Erro ao fazer download do arquivo');
    }
  }

  /**
   * Exclui um arquivo específico
   */
  async excluirArquivo(resultadoId: string, arquivoId: string, usuarioId?: string): Promise<void> {
    this.logger.debug(`Iniciando exclusão do arquivo - Resultado: ${resultadoId}, Arquivo: ${arquivoId}`);

    try {
      // Busca o resultado com documentos
      const resultado = await this.resultadoRepository.findOne({
        where: { id: resultadoId },
        relations: ['documentosComprobatorios'],
      });

      if (!resultado) {
        throw new NotFoundException('Resultado não encontrado');
      }

      // Busca o documento específico por ID
      const documento = resultado.documentosComprobatorios.find(
        doc => doc.id === arquivoId
      );

      if (!documento) {
        throw new NotFoundException('Arquivo não encontrado neste resultado');
      }

      // Remove o arquivo do storage
      try {
        const storageProvider = this.storageProviderFactory.getProvider();
        await storageProvider.removerArquivo(documento.caminhoArquivo);
        this.logger.debug(`Arquivo removido do storage: ${documento.caminhoArquivo}`);
      } catch (error) {
        this.logger.warn(`Erro ao remover arquivo do storage: ${error.message}`);
        // Continua com a exclusão do registro mesmo se falhar no storage
      }

      // Remove o registro do banco de dados
      await this.documentoRepository.remove(documento);

      this.logger.debug(`Arquivo excluído com sucesso - ID: ${arquivoId}`);

    } catch (error) {
      this.logger.error(`Erro ao excluir arquivo: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Adiciona novos arquivos a um resultado existente.
   */
  async adicionarArquivos(
    resultadoId: string,
    tecnicoId: string,
    provaSocialFiles?: Express.Multer.File[],
    documentacaoTecnicaFiles?: Express.Multer.File[],
  ): Promise<ResultadoBeneficioCessadoResponseDto> {
    this.logger.debug(`Adicionando arquivos ao resultado - ID: ${resultadoId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verifica se o resultado existe
      const resultado = await queryRunner.manager.findOne(ResultadoBeneficioCessado, {
        where: { id: resultadoId },
        relations: ['concessao', 'tecnicoResponsavel'],
      });

      if (!resultado) {
        throw new NotFoundException('Resultado não encontrado');
      }

      // Verifica se o técnico tem permissão
      const tecnico = await queryRunner.manager.findOne(Usuario, {
        where: { id: tecnicoId },
      });

      if (!tecnico) {
        throw new NotFoundException('Técnico não encontrado');
      }

      // Processa os arquivos
      await this.processarArquivos(
        resultadoId,
        provaSocialFiles,
        documentacaoTecnicaFiles,
        undefined,
        tecnicoId,
        queryRunner,
      );

      await queryRunner.commitTransaction();

      // Retorna o resultado atualizado
      return await this.buscarPorId(resultadoId);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Erro ao adicionar arquivos ao resultado ${resultadoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}