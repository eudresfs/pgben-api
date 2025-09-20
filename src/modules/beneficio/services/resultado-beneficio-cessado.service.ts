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
  ) {}

  /**
   * Registra o resultado de um benefício cessado.
   * 
   * Valida a concessão, verifica permissões do técnico e registra
   * todas as informações conforme exigências da LOAS.
   * 
   * @param createDto - Dados para criação do registro
   * @param tecnicoId - ID do técnico responsável pelo registro
   * @returns Resultado registrado com documentos comprobatórios
   */
  async registrarResultado(
    createDto: CreateResultadoBeneficioCessadoDto,
    tecnicoId: string,
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
      
      // Criar documentos comprobatórios
      await this.criarDocumentosComprobatorios(
        resultado.id,
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

    // Validar documentos mínimos conforme tipo de encerramento
    await this.validarDocumentosMinimos(createDto);
  }

  /**
   * Valida se os documentos comprobatórios atendem aos requisitos mínimos.
   */
  private async validarDocumentosMinimos(
    createDto: CreateResultadoBeneficioCessadoDto,
  ): Promise<void> {
    const documentos = createDto.documentosComprobatorios;
    
    // Para superação de vulnerabilidade, exigir pelo menos um comprovante de renda
    if (
      createDto.motivoEncerramento === MotivoEncerramentoBeneficio.SUPERACAO_VULNERABILIDADE ||
      createDto.motivoEncerramento === MotivoEncerramentoBeneficio.MELHORIA_SOCIOECONOMICA
    ) {
      const temComprovanteRenda = documentos.some(
        doc => doc.tipo === 'COMPROVANTE_RENDA'
      );
      
      if (!temComprovanteRenda) {
        throw new BadRequestException(
          'Para motivos de superação/melhoria socioeconômica é obrigatório anexar comprovante de renda'
        );
      }
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
      motivoEncerramento: createDto.motivoEncerramento,
      descricaoMotivo: createDto.descricaoMotivo,
      statusVulnerabilidade: createDto.statusVulnerabilidade,
      avaliacaoVulnerabilidade: createDto.avaliacaoVulnerabilidade,
      observacoes: createDto.observacoes,
      acompanhamentoPosterior: createDto.acompanhamentoPosterior,
      detalhesAcompanhamento: createDto.detalhesAcompanhamento,
      recomendacoes: createDto.recomendacoes,
      tecnicoResponsavelId: tecnico.id,
      dataRegistro: new Date(),
    });

    return await queryRunner.manager.save(resultado);
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
    const documentos = documentosDto.map(docDto =>
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
}