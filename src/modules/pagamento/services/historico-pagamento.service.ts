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
  pagamento_id: string;
  usuario_id?: string;
  tipo_evento: TipoEventoHistoricoEnum;
  status_anterior?: StatusPagamentoEnum;
  status_atual?: StatusPagamentoEnum;
  observacao?: string;
  dados_contexto?: Record<string, any>;
}

/**
 * Interface para filtros de consulta de histórico
 */
export interface FiltrosHistoricoDto {
  pagamento_id?: string;
  usuario_id?: string;
  tipo_evento?: TipoEventoHistoricoEnum;
  data_inicio?: Date;
  data_fim?: Date;
  page?: number;
  limit?: number;
}

/**
 * Interface para resposta de histórico
 */
export interface HistoricoResponseDto {
  id: string;
  pagamento_id: string;
  data_evento: Date;
  responsavel?: {
    id: string;
    nome: string;
  };
  tipo_evento: TipoEventoHistoricoEnum;
  status_anterior?: StatusPagamentoEnum;
  status_atual?: StatusPagamentoEnum;
  observacao?: string;
  dados_contexto?: Record<string, any>;
  created_at: Date;
}

/**
 * Interface para dados de exportação
 */
export interface DadosExportacaoDto {
  pagamento_id: string;
  formato: 'pdf' | 'excel';
  data_inicio?: Date;
  data_fim?: Date;
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
      `Registrando histórico para pagamento ${dados.pagamento_id} - Evento: ${dados.tipo_evento}`,
    );

    try {
      // Validar dados obrigatórios
      this.validarDadosHistorico(dados);

      // Criar registro de histórico
      const historico = this.historicoRepository.create({
        pagamento_id: dados.pagamento_id,
        usuario_id: dados.usuario_id,
        tipo_evento: dados.tipo_evento,
        status_anterior: dados.status_anterior,
        status_atual: dados.status_atual,
        observacao: dados.observacao,
        dados_contexto: dados.dados_contexto,
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
        `Erro ao registrar histórico para pagamento ${dados.pagamento_id}`,
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
    pagamento_id: string,
    filtros?: Omit<FiltrosHistoricoDto, 'pagamento_id'>,
  ): Promise<{
    data: HistoricoResponseDto[];
    meta: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    this.logger.log(`Buscando histórico do pagamento ${pagamento_id}`);

    try {
      // Configurar opções de consulta
      const page = filtros?.page || 1;
      const limit = filtros?.limit || 50;
      const skip = (page - 1) * limit;

      const queryBuilder = this.historicoRepository
        .createQueryBuilder('historico')
        .leftJoinAndSelect('historico.usuario', 'usuario')
        .where('historico.pagamento_id = :pagamento_id', { pagamento_id })
        .orderBy('historico.data_evento', 'ASC');

      // Aplicar filtros adicionais
      if (filtros?.usuario_id) {
        queryBuilder.andWhere('historico.usuario_id = :usuario_id', {
          usuario_id: filtros.usuario_id,
        });
      }

      if (filtros?.tipo_evento) {
        queryBuilder.andWhere('historico.tipo_evento = :tipo_evento', {
          tipo_evento: filtros.tipo_evento,
        });
      }

      if (filtros?.data_inicio) {
        queryBuilder.andWhere('historico.data_evento >= :data_inicio', {
          data_inicio: filtros.data_inicio,
        });
      }

      if (filtros?.data_fim) {
        queryBuilder.andWhere('historico.data_evento <= :data_fim', {
          data_fim: filtros.data_fim,
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
        `Erro ao buscar histórico do pagamento ${pagamento_id}`,
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
    pagamento_id: string,
    filtros?: Omit<FiltrosHistoricoDto, 'pagamento_id'>,
  ): Promise<{
    data: any[];
    meta: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }> {
    this.logger.log(`Buscando histórico do pagamento ${pagamento_id}`);

    try {
      // Configurar opções de consulta
      const page = filtros?.page || 1;
      const limit = filtros?.limit || 50;
      const skip = (page - 1) * limit;

      const queryBuilder = this.historicoRepository
        .createQueryBuilder('historico')
        .leftJoinAndSelect('historico.usuario', 'usuario')
        .where('historico.pagamento_id = :pagamento_id', { pagamento_id })
        .orderBy('historico.data_evento', 'ASC');

      // Aplicar filtros adicionais
      if (filtros?.usuario_id) {
        queryBuilder.andWhere('historico.usuario_id = :usuario_id', {
          usuario_id: filtros.usuario_id,
        });
      }

      if (filtros?.tipo_evento) {
        queryBuilder.andWhere('historico.tipo_evento = :tipo_evento', {
          tipo_evento: filtros.tipo_evento,
        });
      }

      if (filtros?.data_inicio) {
        queryBuilder.andWhere('historico.data_evento >= :data_inicio', {
          data_inicio: filtros.data_inicio,
        });
      }

      if (filtros?.data_fim) {
        queryBuilder.andWhere('historico.data_evento <= :data_fim', {
          data_fim: filtros.data_fim,
        });
      }

      // Executar consulta com paginação
      const [historicos, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      // Mapear para DTO de resposta com serialização correta das datas
      const data = historicos.map((historico) => {
        const mapped = this.mapearParaResponseDto(historico);
        return {
          ...mapped,
          data_evento: mapped.data_evento ? mapped.data_evento.toISOString() : null,
          created_at: mapped.created_at ? mapped.created_at.toISOString() : null,
        };
      });

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
        `Erro ao buscar histórico do pagamento ${pagamento_id}`,
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
      if (filtros.pagamento_id) {
        queryBuilder.andWhere('historico.pagamento_id = :pagamento_id', {
          pagamento_id: filtros.pagamento_id,
        });
      }

      if (filtros.usuario_id) {
        queryBuilder.andWhere('historico.usuario_id = :usuario_id', {
          usuario_id: filtros.usuario_id,
        });
      }

      if (filtros.tipo_evento) {
        queryBuilder.andWhere('historico.tipo_evento = :tipo_evento', {
          tipo_evento: filtros.tipo_evento,
        });
      }

      if (filtros.data_inicio) {
        queryBuilder.andWhere('historico.data_evento >= :data_inicio', {
          data_inicio: filtros.data_inicio,
        });
      }

      if (filtros.data_fim) {
        queryBuilder.andWhere('historico.data_evento <= :data_fim', {
          data_fim: filtros.data_fim,
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
      if (filtros.pagamento_id) {
        queryBuilder.andWhere('historico.pagamento_id = :pagamento_id', {
          pagamento_id: filtros.pagamento_id,
        });
      }

      if (filtros.usuario_id) {
        queryBuilder.andWhere('historico.usuario_id = :usuario_id', {
          usuario_id: filtros.usuario_id,
        });
      }

      if (filtros.tipo_evento) {
        queryBuilder.andWhere('historico.tipo_evento = :tipo_evento', {
          tipo_evento: filtros.tipo_evento,
        });
      }

      if (filtros.data_inicio) {
        queryBuilder.andWhere('historico.data_evento >= :data_inicio', {
          data_inicio: filtros.data_inicio,
        });
      }

      if (filtros.data_fim) {
        queryBuilder.andWhere('historico.data_evento <= :data_fim', {
          data_fim: filtros.data_fim,
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
    usuario_id: string,
  ): Promise<{
    url_download: string;
    nome_arquivo: string;
    formato: TipoExportacaoEnum;
    tamanho_arquivo: number;
    data_geracao: string;
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
        pagamento_id: dados.pagamento_id,
        tipo_evento: dados.tipo_evento,
        usuario_id: dados.usuario_id,
        data_inicio: dados.data_inicial ? new Date(dados.data_inicial) : undefined,
        data_fim: dados.data_final ? new Date(dados.data_final) : undefined,
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

      const dataGeracao = new Date();
      
      return {
        url_download: urlDownload,
        nome_arquivo: nomeArquivo,
        formato: dados.formato as TipoExportacaoEnum,
        tamanho_arquivo: arquivo.buffer.length,
        data_geracao: dataGeracao?.toISOString(),
        total_registros: historico.length,
        periodo: dados.data_inicial && dados.data_final ? {
          data_inicial: new Date(dados.data_inicial),
          data_final: new Date(dados.data_final),
        } : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao exportar histórico do pagamento ${dados.pagamento_id}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Valida os dados obrigatórios para registro de histórico
   */
  private validarDadosHistorico(dados: RegistrarHistoricoDto): void {
    if (!dados.pagamento_id) {
      throw new BadRequestException('ID do pagamento é obrigatório');
    }

    if (!dados.tipo_evento) {
      throw new BadRequestException('Tipo de evento é obrigatório');
    }

    // Validar se mudança de status tem os dados necessários
    if (
      dados.tipo_evento === TipoEventoHistoricoEnum.ALTERACAO_STATUS &&
      (!dados.status_anterior || !dados.status_atual)
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
      pagamento_id: historico.pagamento_id,
      data_evento: historico.data_evento,
      responsavel: {
        id: historico.usuario_id,
        nome: historico.usuario?.nome || 'Sistema',
      },
      tipo_evento: historico.tipo_evento,
      status_anterior: historico.status_anterior,
      status_atual: historico.status_atual,
      observacao: historico.observacao,
      dados_contexto: historico.dados_contexto,
      created_at: historico.created_at,
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
      pagamento_id: historico.pagamento_id,
      data_evento: historico.data_evento?.toISOString() || null,
      responsavel: {
        id: historico.responsavel?.id,
        nome: historico.responsavel?.nome,
      },
      tipo_evento: historico.tipo_evento,
      status_anterior: historico.status_anterior,
      status_atual: historico.status_atual,
      observacao: historico.observacao,
      dados_contexto: historico.dados_contexto,
      created_at: historico.created_at?.toISOString() || null,
    };
  }

  /**
   * Gera relatório em PDF do histórico
   * TODO: Implementar geração de PDF usando biblioteca como puppeteer ou pdfkit
   */
  private async gerarRelatorioPDF(
    pagamento_id: string,
    historico: HistoricoResponseDto[],
  ): Promise<{
    buffer: Buffer;
    filename: string;
    contentType: string;
  }> {
    // Implementação simplificada - deve ser substituída por geração real de PDF
    const conteudo = this.gerarConteudoRelatorio(pagamento_id, historico);
    const buffer = Buffer.from(conteudo, 'utf-8');
    const filename = `historico-pagamento-${pagamento_id}-${format(
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
    pagamento_id: string,
    historico: HistoricoResponseDto[],
  ): Promise<{
    buffer: Buffer;
    filename: string;
    contentType: string;
  }> {
    // Implementação simplificada - deve ser substituída por geração real de Excel
    const conteudo = this.gerarConteudoRelatorio(pagamento_id, historico);
    const buffer = Buffer.from(conteudo, 'utf-8');
    const filename = `historico-pagamento-${pagamento_id}-${format(
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
    pagamento_id: string,
    historico: HistoricoResponseDto[],
  ): string {
    let conteudo = `HISTÓRICO DO PAGAMENTO ${pagamento_id}\n`;
    conteudo += `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', {
      locale: ptBR,
    })}\n\n`;

    historico.forEach((evento, index) => {
      conteudo += `${index + 1}. ${format(
        evento.data_evento,
        'dd/MM/yyyy HH:mm',
        { locale: ptBR },
      )}\n`;
      conteudo += `   Evento: ${evento.tipo_evento}\n`;
      conteudo += `   Responsável: ${evento.responsavel?.nome || 'Sistema'}\n`;

      if (evento.status_anterior && evento.status_atual) {
        conteudo += `   Status: ${evento.status_anterior} → ${evento.status_atual}\n`;
      }

      if (evento.observacao) {
        conteudo += `   Observação: ${evento.observacao}\n`;
      }

      conteudo += '\n';
    });

    return conteudo;
  }
}