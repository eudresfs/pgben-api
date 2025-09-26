import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { HistoricoPagamento } from '../../../entities/historico-pagamento.entity';
import { TipoEventoHistoricoEnum } from '../../../enums/tipo-evento-historico.enum';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { TipoExportacaoEnum } from '../dtos/historico-pagamento-exportacao.dto';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Interface para dados de registro de histórico
 */
export interface RegistrarHistoricoDto {
  pagamentoId: string;
  usuarioId?: string;
  tipoEvento: TipoEventoHistoricoEnum;
  statusAnterior?: StatusPagamentoEnum;
  statusAtual?: StatusPagamentoEnum;
  observacao?: string;
  dadosContexto?: Record<string, any>;
}

/**
 * Interface para filtros de consulta de histórico
 */
export interface FiltrosHistoricoDto {
  pagamentoId?: string;
  usuarioId?: string;
  tipoEvento?: TipoEventoHistoricoEnum;
  dataInicio?: Date;
  dataFim?: Date;
  page?: number;
  limit?: number;
}

/**
 * Interface para resposta de histórico
 */
export interface HistoricoResponseDto {
  id: string;
  pagamentoId: string;
  dataEvento: Date;
  usuarioId?: string;
  nomeUsuario?: string;
  tipoEvento: TipoEventoHistoricoEnum;
  statusAnterior?: StatusPagamentoEnum;
  statusAtual?: StatusPagamentoEnum;
  observacao?: string;
  dadosContexto?: Record<string, any>;
  createdAt: Date;
}

/**
 * Interface para dados de exportação
 */
export interface DadosExportacaoDto {
  pagamentoId: string;
  formato: 'PDF' | 'EXCEL';
  dataInicio?: Date;
  dataFim?: Date;
}

/**
 * Service para gerenciamento do histórico de pagamentos
 * Responsável por registrar, consultar e exportar o histórico de eventos dos pagamentos
 */
@Injectable()
export class HistoricoPagamentoService {
  private readonly logger = new Logger(HistoricoPagamentoService.name);

  constructor(
    @InjectRepository(HistoricoPagamento)
    private readonly historicoRepository: Repository<HistoricoPagamento>,
  ) {}

  /**
   * Registra um novo evento no histórico do pagamento
   * Este método é chamado automaticamente pelos event listeners
   */
  async registrarHistorico(
    dados: RegistrarHistoricoDto,
  ): Promise<HistoricoPagamento> {
    this.logger.log(
      `Registrando histórico para pagamento ${dados.pagamentoId} - Evento: ${dados.tipoEvento}`,
    );

    try {
      // Validar dados obrigatórios
      this.validarDadosHistorico(dados);

      // Criar registro de histórico
      const historico = this.historicoRepository.create({
        pagamento_id: dados.pagamentoId,
        usuario_id: dados.usuarioId,
        tipo_evento: dados.tipoEvento,
        status_anterior: dados.statusAnterior,
        status_atual: dados.statusAtual,
        observacao: dados.observacao,
        dados_contexto: dados.dadosContexto,
        data_evento: new Date(),
        created_at: new Date(),
      });

      // Salvar no banco de dados
      const historicoSalvo = await this.historicoRepository.save(historico);
      
      // Garantir que retornamos um único objeto, não um array
      const resultado = Array.isArray(historicoSalvo) ? historicoSalvo[0] : historicoSalvo;

      this.logger.log(
        `Histórico registrado com sucesso - ID: ${resultado.id}`,
      );

      return resultado;
    } catch (error) {
      this.logger.error(
        `Erro ao registrar histórico para pagamento ${dados.pagamentoId}`,
        error.stack,
      );
      throw new BadRequestException(
        'Erro ao registrar histórico do pagamento',
      );
    }
  }

  /**
   * Busca o histórico completo de um pagamento específico
   * Retorna todos os eventos em ordem cronológica
   */
  async buscarHistoricoPorPagamento(
    pagamentoId: string,
    filtros?: Omit<FiltrosHistoricoDto, 'pagamentoId'>,
  ): Promise<{
    data: HistoricoResponseDto[];
    meta: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    this.logger.log(`Buscando histórico do pagamento ${pagamentoId}`);

    try {
      // Configurar opções de consulta
      const page = filtros?.page || 1;
      const limit = filtros?.limit || 50;
      const skip = (page - 1) * limit;

      const queryBuilder = this.historicoRepository
        .createQueryBuilder('historico')
        .leftJoinAndSelect('historico.usuario', 'usuario')
        .where('historico.pagamento_id = :pagamentoId', { pagamentoId })
        .orderBy('historico.data_evento', 'ASC');

      // Aplicar filtros adicionais
      if (filtros?.usuarioId) {
        queryBuilder.andWhere('historico.usuario_id = :usuarioId', {
          usuarioId: filtros.usuarioId,
        });
      }

      if (filtros?.tipoEvento) {
        queryBuilder.andWhere('historico.tipo_evento = :tipoEvento', {
          tipoEvento: filtros.tipoEvento,
        });
      }

      if (filtros?.dataInicio) {
        queryBuilder.andWhere('historico.data_evento >= :dataInicio', {
          dataInicio: filtros.dataInicio,
        });
      }

      if (filtros?.dataFim) {
        queryBuilder.andWhere('historico.data_evento <= :dataFim', {
          dataFim: filtros.dataFim,
        });
      }

      // Executar consulta com paginação
      const [historicos, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      // Mapear para DTO de resposta no formato snake_case
       const dataFormatada = historicos
         .map(this.mapearParaResponseDto)
         .map(this.mapearParaHistoricoPagamentoResponseDto);

       return {
         data: dataFormatada,
         meta: {
           total,
           page,
           limit,
           pages: Math.ceil(total / limit),
         },
       };
    } catch (error) {
      this.logger.error(
        `Erro ao buscar histórico do pagamento ${pagamentoId}`,
        error.stack,
      );
      throw new BadRequestException('Erro ao consultar histórico do pagamento');
    }
  }

  /**
   * Busca o histórico completo de um pagamento específico no formato snake_case
   * Retorna todos os eventos em ordem cronológica para compatibilidade com API
   */
  async buscarHistoricoPorPagamentoFormatado(
    pagamentoId: string,
    filtros?: Omit<FiltrosHistoricoDto, 'pagamentoId'>,
  ): Promise<{
    data: any[];
    meta: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    this.logger.log(`Buscando histórico do pagamento ${pagamentoId}`);

    try {
      // Configurar opções de consulta
      const page = filtros?.page || 1;
      const limit = filtros?.limit || 50;
      const skip = (page - 1) * limit;

      const queryBuilder = this.historicoRepository
        .createQueryBuilder('historico')
        .leftJoinAndSelect('historico.usuario', 'usuario')
        .where('historico.pagamento_id = :pagamentoId', { pagamentoId })
        .orderBy('historico.data_evento', 'ASC');

      // Aplicar filtros adicionais
      if (filtros?.usuarioId) {
        queryBuilder.andWhere('historico.usuario_id = :usuarioId', {
          usuarioId: filtros.usuarioId,
        });
      }

      if (filtros?.tipoEvento) {
        queryBuilder.andWhere('historico.tipo_evento = :tipoEvento', {
          tipoEvento: filtros.tipoEvento,
        });
      }

      if (filtros?.dataInicio) {
        queryBuilder.andWhere('historico.data_evento >= :dataInicio', {
          dataInicio: filtros.dataInicio,
        });
      }

      if (filtros?.dataFim) {
        queryBuilder.andWhere('historico.data_evento <= :dataFim', {
          dataFim: filtros.dataFim,
        });
      }

      // Executar consulta com paginação
      const [historicos, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      // Mapear para DTO de resposta
      const data = historicos.map(this.mapearParaResponseDto);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Erro ao buscar histórico do pagamento ${pagamentoId}`,
        error.stack,
      );
      throw new BadRequestException('Erro ao consultar histórico do pagamento');
    }
  }

  /**
   * Busca histórico com filtros avançados
   * Permite consultar histórico de múltiplos pagamentos
   */
  async buscarHistoricoComFiltros(
    filtros: FiltrosHistoricoDto,
  ): Promise<{
    data: HistoricoResponseDto[];
    meta: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    this.logger.log('Buscando histórico com filtros avançados');

    try {
      const page = filtros.page || 1;
      const limit = filtros.limit || 50;
      const skip = (page - 1) * limit;

      const queryBuilder = this.historicoRepository
        .createQueryBuilder('historico')
        .leftJoinAndSelect('historico.usuario', 'usuario')
        .orderBy('historico.data_evento', 'DESC');

      // Aplicar filtros
      if (filtros.pagamentoId) {
        queryBuilder.andWhere('historico.pagamento_id = :pagamentoId', {
          pagamentoId: filtros.pagamentoId,
        });
      }

      if (filtros.usuarioId) {
        queryBuilder.andWhere('historico.usuario_id = :usuarioId', {
          usuarioId: filtros.usuarioId,
        });
      }

      if (filtros.tipoEvento) {
        queryBuilder.andWhere('historico.tipo_evento = :tipoEvento', {
          tipoEvento: filtros.tipoEvento,
        });
      }

      if (filtros.dataInicio) {
        queryBuilder.andWhere('historico.data_evento >= :dataInicio', {
          dataInicio: filtros.dataInicio,
        });
      }

      if (filtros.dataFim) {
        queryBuilder.andWhere('historico.data_evento <= :dataFim', {
          dataFim: filtros.dataFim,
        });
      }

      const [historicos, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      const data = historicos.map(this.mapearParaResponseDto);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Erro ao buscar histórico com filtros', error.stack);
      throw new BadRequestException('Erro ao consultar histórico');
    }
  }

  /**
   * Busca histórico com filtros avançados no formato snake_case
   * Permite consultar histórico de múltiplos pagamentos para compatibilidade com API
   */
  async buscarHistoricoComFiltrosFormatado(
    filtros: FiltrosHistoricoDto,
  ): Promise<{
    data: any[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    this.logger.log('Buscando histórico com filtros avançados');

    try {
      const page = filtros.page || 1;
      const limit = filtros.limit || 50;
      const skip = (page - 1) * limit;

      const queryBuilder = this.historicoRepository
        .createQueryBuilder('historico')
        .leftJoinAndSelect('historico.usuario', 'usuario')
        .orderBy('historico.data_evento', 'DESC');

      // Aplicar filtros
      if (filtros.pagamentoId) {
        queryBuilder.andWhere('historico.pagamento_id = :pagamentoId', {
          pagamentoId: filtros.pagamentoId,
        });
      }

      if (filtros.usuarioId) {
        queryBuilder.andWhere('historico.usuario_id = :usuarioId', {
          usuarioId: filtros.usuarioId,
        });
      }

      if (filtros.tipoEvento) {
        queryBuilder.andWhere('historico.tipo_evento = :tipoEvento', {
          tipoEvento: filtros.tipoEvento,
        });
      }

      if (filtros.dataInicio) {
        queryBuilder.andWhere('historico.data_evento >= :dataInicio', {
          dataInicio: filtros.dataInicio,
        });
      }

      if (filtros.dataFim) {
        queryBuilder.andWhere('historico.data_evento <= :dataFim', {
          dataFim: filtros.dataFim,
        });
      }

      const [historicos, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      // Mapear para DTO de resposta no formato snake_case
      const dataFormatada = historicos
        .map(this.mapearParaResponseDto)
        .map(this.mapearParaHistoricoPagamentoResponseDto);

      return {
        data: dataFormatada,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Erro ao buscar histórico com filtros', error.stack);
      throw new BadRequestException('Erro ao consultar histórico');
    }
  }

  /**
   * Exporta histórico de pagamentos em formato PDF ou Excel
   */
  async exportarHistorico(
    dados: any,
    usuarioId: string,
  ): Promise<{
    url_download: string;
    nome_arquivo: string;
    formato: TipoExportacaoEnum;
    tamanho_arquivo: number;
    data_geracao: Date;
    total_registros: number;
    periodo?: {
      data_inicial: Date;
      data_final: Date;
    };
  }> {
    this.logger.log(
      `Exportando histórico em formato ${dados.formato}`,
    );

    try {
      // Buscar dados do histórico com filtros
      const filtros: FiltrosHistoricoDto = {
        pagamentoId: dados.pagamento_id,
        tipoEvento: dados.tipo_evento,
        usuarioId: dados.usuario_id,
        dataInicio: dados.data_inicial ? new Date(dados.data_inicial) : undefined,
        dataFim: dados.data_final ? new Date(dados.data_final) : undefined,
        limit: 1000, // Limite alto para exportação
      };

      const { data: historico } = await this.buscarHistoricoComFiltros(filtros);

      if (historico.length === 0) {
        throw new NotFoundException(
          'Nenhum registro de histórico encontrado para exportação',
        );
      }

      // Gerar arquivo baseado no formato
      const arquivo = dados.formato === 'PDF' 
        ? await this.gerarRelatorioPDF(dados.pagamento_id || 'todos', historico)
        : await this.gerarRelatorioExcel(dados.pagamento_id || 'todos', historico);

      // Simular salvamento do arquivo e geração de URL
      const nomeArquivo = arquivo.filename;
      const urlDownload = `/api/pagamentos/historico/download/${Date.now()}-${nomeArquivo}`;

      return {
        url_download: urlDownload,
        nome_arquivo: nomeArquivo,
        formato: dados.formato as TipoExportacaoEnum,
        tamanho_arquivo: arquivo.buffer.length,
        data_geracao: new Date(),
        total_registros: historico.length,
        periodo: dados.data_inicial && dados.data_final ? {
          data_inicial: new Date(dados.data_inicial),
          data_final: new Date(dados.data_final),
        } : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao exportar histórico do pagamento ${dados.pagamentoId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Valida os dados obrigatórios para registro de histórico
   */
  private validarDadosHistorico(dados: RegistrarHistoricoDto): void {
    if (!dados.pagamentoId) {
      throw new BadRequestException('ID do pagamento é obrigatório');
    }

    if (!dados.tipoEvento) {
      throw new BadRequestException('Tipo de evento é obrigatório');
    }

    // Validar se mudança de status tem os dados necessários
    if (
      dados.tipoEvento === TipoEventoHistoricoEnum.ALTERACAO_STATUS &&
      (!dados.statusAnterior || !dados.statusAtual)
    ) {
      throw new BadRequestException(
        'Status anterior e atual são obrigatórios para alteração de status',
      );
    }
  }

  /**
   * Mapeia entidade HistoricoPagamento para DTO de resposta
   */
  private mapearParaResponseDto(
    historico: HistoricoPagamento,
  ): HistoricoResponseDto {
    return {
      id: historico.id,
      pagamentoId: historico.pagamento_id,
      dataEvento: historico.data_evento,
      usuarioId: historico.usuario_id,
      nomeUsuario: historico.usuario?.nome || 'Sistema',
      tipoEvento: historico.tipo_evento,
      statusAnterior: historico.status_anterior,
      statusAtual: historico.status_atual,
      observacao: historico.observacao,
      dadosContexto: historico.dados_contexto,
      createdAt: historico.created_at,
    };
  }

  /**
   * Mapeia HistoricoResponseDto para HistoricoPagamentoResponseDto
   * Converte propriedades camelCase para snake_case para compatibilidade com API
   */
  private mapearParaHistoricoPagamentoResponseDto(
    historico: HistoricoResponseDto,
  ): any {
    return {
      id: historico.id,
      pagamento_id: historico.pagamentoId,
      data_evento: historico.dataEvento,
      usuario_id: historico.usuarioId,
      tipo_evento: historico.tipoEvento,
      status_anterior: historico.statusAnterior,
      status_atual: historico.statusAtual,
      observacao: historico.observacao,
      dados_contexto: historico.dadosContexto,
      created_at: historico.createdAt,
    };
  }

  /**
   * Gera relatório em PDF do histórico
   * TODO: Implementar geração de PDF usando biblioteca como puppeteer ou pdfkit
   */
  private async gerarRelatorioPDF(
    pagamentoId: string,
    historico: HistoricoResponseDto[],
  ): Promise<{
    buffer: Buffer;
    filename: string;
    contentType: string;
  }> {
    // Implementação simplificada - deve ser substituída por geração real de PDF
    const conteudo = this.gerarConteudoRelatorio(pagamentoId, historico);
    const buffer = Buffer.from(conteudo, 'utf-8');
    const filename = `historico-pagamento-${pagamentoId}-${format(
      new Date(),
      'yyyy-MM-dd-HHmm',
    )}.txt`;

    return {
      buffer,
      filename,
      contentType: 'text/plain',
    };
  }

  /**
   * Gera relatório em Excel do histórico
   * TODO: Implementar geração de Excel usando biblioteca como exceljs
   */
  private async gerarRelatorioExcel(
    pagamentoId: string,
    historico: HistoricoResponseDto[],
  ): Promise<{
    buffer: Buffer;
    filename: string;
    contentType: string;
  }> {
    // Implementação simplificada - deve ser substituída por geração real de Excel
    const conteudo = this.gerarConteudoRelatorio(pagamentoId, historico);
    const buffer = Buffer.from(conteudo, 'utf-8');
    const filename = `historico-pagamento-${pagamentoId}-${format(
      new Date(),
      'yyyy-MM-dd-HHmm',
    )}.csv`;

    return {
      buffer,
      filename,
      contentType: 'text/csv',
    };
  }

  /**
   * Gera conteúdo textual do relatório
   */
  private gerarConteudoRelatorio(
    pagamentoId: string,
    historico: HistoricoResponseDto[],
  ): string {
    let conteudo = `HISTÓRICO DO PAGAMENTO ${pagamentoId}\n`;
    conteudo += `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', {
      locale: ptBR,
    })}\n\n`;

    historico.forEach((evento, index) => {
      conteudo += `${index + 1}. ${format(
        evento.dataEvento,
        'dd/MM/yyyy HH:mm',
        { locale: ptBR },
      )}\n`;
      conteudo += `   Evento: ${evento.tipoEvento}\n`;
      conteudo += `   Responsável: ${evento.nomeUsuario}\n`;

      if (evento.statusAnterior && evento.statusAtual) {
        conteudo += `   Status: ${evento.statusAnterior} → ${evento.statusAtual}\n`;
      }

      if (evento.observacao) {
        conteudo += `   Observação: ${evento.observacao}\n`;
      }

      conteudo += '\n';
    });

    return conteudo;
  }
}