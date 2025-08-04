import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Documento } from '../../../../entities/documento.entity';
import { Usuario } from '../../../../entities/usuario.entity';
import {
  BatchDownloadDto,
  BatchDownloadFiltros,
} from '../../dto/batch-download.dto';
import { TipoDocumentoEnum } from '../../../../enums';
import { env } from '../../../../config/env';

/**
 * Interface para resultado da validação de filtros
 */
export interface IValidacaoFiltros {
  valido: boolean;
  erros: string[];
  avisos: string[];
  estimativa: {
    total_documentos: number;
    tamanho_estimado: number;
  };
}

/**
 * Serviço responsável pela validação e filtragem de documentos
 * para o sistema de download em lote
 */
@Injectable()
export class DocumentFilterService {
  private readonly logger = new Logger(DocumentFilterService.name);

  // Configurações
  private readonly MAX_DOCUMENTOS_POR_JOB =
    env.DOWNLOAD_LOTE_MAX_DOCUMENTOS || 1000;
  private readonly maxFileSize =
    (env.DOWNLOAD_LOTE_MAX_SIZE_MB || 500) * 1024 * 1024;

  constructor(
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
  ) {}

  /**
   * Valida os filtros fornecidos para o download em lote
   */
  async validarFiltros(
    filtros: BatchDownloadDto,
    usuarioId?: string,
  ): Promise<IValidacaoFiltros> {
    const validacao: IValidacaoFiltros = {
      valido: true,
      erros: [],
      avisos: [],
      estimativa: {
        total_documentos: 0,
        tamanho_estimado: 0,
      },
    };

    try {
      // Validar se pelo menos um filtro foi fornecido
      if (!this.hasValidFilters(filtros)) {
        validacao.valido = false;
        validacao.erros.push(
          'Pelo menos um filtro deve ser fornecido (cidadaoIds, solicitacaoIds, tiposDocumento, dataInicio ou dataFim)',
        );
        return validacao;
      }

      // Validar tipos de documento
      if (filtros.tiposDocumento?.length) {
        const tiposValidos = Object.values(TipoDocumentoEnum);
        const tiposInvalidos = filtros.tiposDocumento.filter(
          (tipo) => !tiposValidos.includes(tipo as TipoDocumentoEnum),
        );

        if (tiposInvalidos.length > 0) {
          validacao.valido = false;
          validacao.erros.push(
            `Tipos de documento inválidos: ${tiposInvalidos.join(', ')}`,
          );
        }
      }

      // Validar datas
      if (filtros.dataInicio && filtros.dataFim) {
        const dataInicio = new Date(filtros.dataInicio);
        const dataFim = new Date(filtros.dataFim);

        if (dataInicio > dataFim) {
          validacao.valido = false;
          validacao.erros.push(
            'Data de início não pode ser posterior à data de fim',
          );
        }

        // Verificar se o período não é muito longo (mais de 2 anos)
        const diffTime = Math.abs(dataFim.getTime() - dataInicio.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 730) {
          validacao.avisos.push(
            'Período muito longo (mais de 2 anos). Considere filtrar por períodos menores para melhor performance.',
          );
        }
      }

      // Validar arrays de IDs
      if (filtros.cidadaoIds?.length) {
        if (filtros.cidadaoIds.length > 100) {
          validacao.avisos.push(
            'Muitos cidadãos selecionados (>100). Considere filtrar por outros critérios.',
          );
        }

        // Validar formato UUID
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const idsInvalidos = filtros.cidadaoIds.filter(
          (id) => !uuidRegex.test(id),
        );

        if (idsInvalidos.length > 0) {
          validacao.valido = false;
          validacao.erros.push('IDs de cidadão inválidos encontrados');
        }
      }

      if (filtros.solicitacaoIds?.length) {
        if (filtros.solicitacaoIds.length > 50) {
          validacao.avisos.push(
            'Muitas solicitações selecionadas (>50). Considere filtrar por outros critérios.',
          );
        }

        // Validar formato UUID
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const idsInvalidos = filtros.solicitacaoIds.filter(
          (id) => !uuidRegex.test(id),
        );

        if (idsInvalidos.length > 0) {
          validacao.valido = false;
          validacao.erros.push('IDs de solicitação inválidos encontrados');
        }
      }

      // Se a validação básica passou, fazer estimativa
      if (validacao.valido) {
        const estimativa = await this.estimarResultados(filtros, usuarioId);
        validacao.estimativa = estimativa;

        // Validar limites
        if (estimativa.total_documentos > this.MAX_DOCUMENTOS_POR_JOB) {
          validacao.valido = false;
          validacao.erros.push(
            `Muitos documentos encontrados (${estimativa.total_documentos}). Limite máximo: ${this.MAX_DOCUMENTOS_POR_JOB}`,
          );
        }

        if (estimativa.tamanho_estimado > this.maxFileSize) {
          validacao.valido = false;
          validacao.erros.push(
            `Tamanho estimado (${this.formatFileSize(estimativa.tamanho_estimado)}) excede o limite máximo de ${this.formatFileSize(this.maxFileSize)}`,
          );
        }

        // Avisos para grandes volumes
        if (estimativa.total_documentos > 500) {
          validacao.avisos.push(
            `Grande volume de documentos (${estimativa.total_documentos}). O processamento pode demorar.`,
          );
        }

        if (estimativa.tamanho_estimado > this.maxFileSize * 0.8) {
          validacao.avisos.push(
            `Tamanho estimado (${this.formatFileSize(estimativa.tamanho_estimado)}) próximo ao limite máximo.`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Erro na validação de filtros:', error);
      validacao.valido = false;
      validacao.erros.push('Erro interno na validação dos filtros');
    }

    return validacao;
  }

  /**
   * Aplica filtros e retorna documentos correspondentes com paginação otimizada
   */
  async aplicarFiltros(
    filtros: BatchDownloadFiltros,
    usuario: Usuario,
  ): Promise<Documento[]> {
    const BATCH_SIZE = 100; // Processar em lotes menores para otimizar memória
    const documentos: Documento[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore && documentos.length < this.MAX_DOCUMENTOS_POR_JOB) {
      const queryBuilder = this.documentoRepository
        .createQueryBuilder('documento')
        .leftJoinAndSelect('documento.cidadao', 'cidadao')
        .leftJoinAndSelect('documento.solicitacao', 'solicitacao')
        .where('documento.removed_at IS NULL');

      // Aplicar filtros
      this.aplicarFiltrosQuery(queryBuilder, filtros);

      // Ordenar por data de upload (mais recentes primeiro) com ID para consistência
      queryBuilder
        .orderBy('documento.data_upload', 'DESC')
        .addOrderBy('documento.id', 'DESC');

      // Paginação otimizada
      const remainingLimit = Math.min(
        BATCH_SIZE,
        this.MAX_DOCUMENTOS_POR_JOB - documentos.length,
      );
      queryBuilder.skip(offset).take(remainingLimit);

      const batch = await queryBuilder.getMany();

      if (batch.length === 0) {
        hasMore = false;
      } else {
        documentos.push(...batch);
        offset += batch.length;
        hasMore = batch.length === remainingLimit;
      }
    }

    this.logger.log(
      `Filtros aplicados: ${documentos.length} documentos encontrados em ${Math.ceil(offset / BATCH_SIZE)} lotes`,
    );

    return documentos;
  }

  /**
   * Aplica filtros ao QueryBuilder (método auxiliar para reutilização)
   * Aceita tanto formato camelCase (BatchDownloadDto) quanto snake_case (filtros convertidos)
   */
  private aplicarFiltrosQuery(queryBuilder: any, filtros: any): void {
    // Cidadão IDs - aceita ambos os formatos
    const cidadaoIds = filtros.cidadaoIds || filtros.cidadao_ids;
    if (cidadaoIds?.length) {
      queryBuilder.andWhere('documento.cidadao_id IN (:...cidadaoIds)', {
        cidadaoIds: cidadaoIds,
      });
    }

    // Solicitação IDs - aceita ambos os formatos
    const solicitacaoIds = filtros.solicitacaoIds || filtros.solicitacao_ids;
    if (solicitacaoIds?.length) {
      queryBuilder.andWhere(
        'documento.solicitacao_id IN (:...solicitacaoIds)',
        {
          solicitacaoIds: solicitacaoIds,
        },
      );
    }

    // Tipos de documento - aceita ambos os formatos
    const tiposDocumento = filtros.tiposDocumento || filtros.tipo_documento;
    if (tiposDocumento?.length) {
      queryBuilder.andWhere('documento.tipo IN (:...tipos)', {
        tipos: tiposDocumento,
      });
    }

    // Data início - aceita ambos os formatos
    const dataInicio = filtros.dataInicio || filtros.data_inicio;
    if (dataInicio) {
      queryBuilder.andWhere('documento.data_upload >= :dataInicio', {
        dataInicio: dataInicio,
      });
    }

    // Data fim - aceita ambos os formatos
    const dataFim = filtros.dataFim || filtros.data_fim;
    if (dataFim) {
      queryBuilder.andWhere('documento.data_upload <= :dataFim', {
        dataFim: dataFim,
      });
    }
  }

  /**
   * Verifica se os filtros fornecidos são válidos
   * Aceita tanto formato camelCase (BatchDownloadDto) quanto snake_case (filtros convertidos)
   */
  private hasValidFilters(filtros: any): boolean {
    // Verificar ambos os formatos (camelCase e snake_case)
    const temCidadaoIds = !!(
      filtros.cidadaoIds?.length || filtros.cidadao_ids?.length
    );
    const temSolicitacaoIds = !!(
      filtros.solicitacaoIds?.length || filtros.solicitacao_ids?.length
    );
    const temTiposDocumento = !!(
      filtros.tiposDocumento?.length || filtros.tipo_documento?.length
    );
    const temDataInicio = !!(filtros.dataInicio || filtros.data_inicio);
    const temDataFim = !!(filtros.dataFim || filtros.data_fim);

    const resultado =
      temCidadaoIds ||
      temSolicitacaoIds ||
      temTiposDocumento ||
      temDataInicio ||
      temDataFim;

    return resultado;
  }

  /**
   * Estima o número de documentos e tamanho total com cache otimizado
   */
  private async estimarResultados(
    filtros: BatchDownloadDto,
    usuarioId?: string,
  ): Promise<{ total_documentos: number; tamanho_estimado: number }> {
    // Gerar chave de cache baseada nos filtros
    const cacheKey = this.gerarChaveCache(filtros, usuarioId);

    // Tentar buscar do cache primeiro (implementação futura com Redis)
    // const cached = await this.cacheService.get(cacheKey);
    // if (cached) {
    //   this.logger.debug(`Estimativa obtida do cache: ${cacheKey}`);
    //   return cached;
    // }

    const startTime = Date.now();

    // Query otimizada com índices apropriados
    const queryBuilder = this.documentoRepository
      .createQueryBuilder('documento')
      .select([
        'COUNT(documento.id) as total',
        'COALESCE(SUM(documento.tamanho), 0) as tamanho_total',
      ])
      .where('documento.removed_at IS NULL');

    // Aplicar filtros usando método auxiliar
    this.aplicarFiltrosQuery(queryBuilder, filtros);

    const result = await queryBuilder.getRawOne();

    const estimativa = {
      total_documentos: parseInt(result.total) || 0,
      tamanho_estimado: parseInt(result.tamanho_total) || 0,
    };

    const queryTime = Date.now() - startTime;
    this.logger.debug(
      `Estimativa calculada em ${queryTime}ms: ${estimativa.total_documentos} documentos`,
    );

    // Cachear resultado por 5 minutos (implementação futura)
    // await this.cacheService.set(cacheKey, estimativa, 300);

    return estimativa;
  }

  /**
   * Gera chave de cache baseada nos filtros
   */
  private gerarChaveCache(
    filtros: BatchDownloadDto,
    usuarioId?: string,
  ): string {
    const filtrosOrdenados = {
      cidadaoIds: filtros.cidadaoIds?.sort(),
      solicitacaoIds: filtros.solicitacaoIds?.sort(),
      tiposDocumento: filtros.tiposDocumento?.sort(),
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim,
      usuarioId,
    };

    const hash = Buffer.from(JSON.stringify(filtrosOrdenados)).toString(
      'base64',
    );
    return `doc_estimate:${hash}`;
  }

  /**
   * Formata tamanho de arquivo para exibição
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
