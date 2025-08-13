import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Entities
import { HistoricoAprovacao } from '../entities/historico-aprovacao.entity';
import { SolicitacaoAprovacao } from '../entities/solicitacao-aprovacao.entity';

// DTOs
import { CreateHistoricoAprovacaoDto } from '../dtos/create-historico-aprovacao.dto';
import { RespostaPaginadaDto } from '../dtos/resposta-paginada.dto';
import { FiltroHistoricoDto } from '../dtos/filtro-historico.dto';
import { EstatisticasAprovacaoDto } from '../dtos/estatisticas-aprovacao.dto';

// Enums
import { StatusAprovacao, TipoAcaoHistorico, AcaoAprovacao } from '../enums/aprovacao.enums';

/**
 * Serviço para gerenciamento do histórico de aprovações.
 * 
 * Responsabilidades:
 * - Registrar todas as ações no processo de aprovação
 * - Manter auditoria completa das decisões
 * - Fornecer relatórios e estatísticas
 * - Rastrear tempos de resposta e SLA
 * - Gerar logs de auditoria para compliance
 */
@Injectable()
export class HistoricoAprovacaoService {
  private readonly logger = new Logger(HistoricoAprovacaoService.name);

  constructor(
    @InjectRepository(HistoricoAprovacao)
    private readonly historicoRepository: Repository<HistoricoAprovacao>,
    @InjectRepository(SolicitacaoAprovacao)
    private readonly solicitacaoRepository: Repository<SolicitacaoAprovacao>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Registra uma nova entrada no histórico
   * 
   * @param dados - Dados do histórico
   * @returns Promise<HistoricoAprovacao> - Entrada criada
   */
  async registrarHistorico(
    dados: CreateHistoricoAprovacaoDto,
  ): Promise<HistoricoAprovacao> {
    try {
      this.logger.debug(
        `Registrando histórico para solicitação ${dados.solicitacao_aprovacao_id}`,
      );

      // Verificar se a solicitação existe
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: dados.solicitacao_aprovacao_id },
      });

      if (!solicitacao) {
        throw new NotFoundException(
          `Solicitação ${dados.solicitacao_aprovacao_id} não encontrada`,
        );
      }

      // Criar entrada no histórico
      const historico = this.historicoRepository.create({
        solicitacao_aprovacao_id: dados.solicitacao_aprovacao_id,
        acao: dados.tipo_acao as unknown as AcaoAprovacao,
        usuario_id: dados.usuario_id,
        usuario_nome: dados.usuario_nome,
        usuario_email: dados.usuario_email,
        aprovador_id: dados.aprovador_id,
        justificativa: dados.justificativa,
        metadados: dados.metadata,
        ip_usuario: dados.ip_address,
        user_agent: dados.user_agent,
        localizacao: typeof dados.localizacao === 'string' ? dados.localizacao : JSON.stringify(dados.localizacao),
      });

      const historicoSalvo = await this.historicoRepository.save(historico) as HistoricoAprovacao;

      this.logger.log(
        `Histórico ${historicoSalvo.id} registrado para solicitação ${dados.solicitacao_aprovacao_id}`,
      );

      // Emitir evento
      this.eventEmitter.emit('historico-aprovacao.criado', {
        historico: historicoSalvo,
        solicitacao_id: dados.solicitacao_aprovacao_id,
      });

      return historicoSalvo;
    } catch (error) {
      this.logger.error(
        `Erro ao registrar histórico: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca o histórico de uma solicitação específica
   * 
   * @param solicitacaoId - ID da solicitação
   * @param pagina - Número da página
   * @param limite - Limite de itens por página
   * @returns Promise<RespostaPaginadaDto<HistoricoAprovacao>> - Histórico paginado
   */
  async buscarHistoricoPorSolicitacao(
    solicitacaoId: string,
    pagina: number = 1,
    limite: number = 50,
  ): Promise<RespostaPaginadaDto<HistoricoAprovacao>> {
    try {
      const queryBuilder = this.historicoRepository
        .createQueryBuilder('h')
        .where('h.solicitacao_aprovacao_id = :solicitacaoId', { solicitacaoId })
        .orderBy('h.created_at', 'DESC');

      const offset = (pagina - 1) * limite;
      queryBuilder.skip(offset).take(limite);

      const [historicos, total] = await queryBuilder.getManyAndCount();

      return new RespostaPaginadaDto(
        historicos,
        total,
        pagina,
        limite,
        {},
      );
    } catch (error) {
      this.logger.error(
        `Erro ao buscar histórico da solicitação ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca histórico com filtros avançados
   * 
   * @param filtros - Filtros para busca
   * @param pagina - Número da página
   * @param limite - Limite de itens por página
   * @returns Promise<RespostaPaginadaDto<HistoricoAprovacao>> - Histórico filtrado
   */
  async buscarHistoricoComFiltros(
    filtros: FiltroHistoricoDto,
    pagina: number = 1,
    limite: number = 50,
  ): Promise<RespostaPaginadaDto<HistoricoAprovacao>> {
    try {
      const queryBuilder = this.historicoRepository
        .createQueryBuilder('h')
        .leftJoinAndSelect('h.solicitacao_aprovacao', 's')
        .orderBy('h.created_at', 'DESC');

      // Aplicar filtros
      if (filtros.usuario_id) {
        queryBuilder.andWhere('h.usuario_id = :usuarioId', {
          usuarioId: filtros.usuario_id,
        });
      }

      if (filtros.tipo_acao) {
        queryBuilder.andWhere('h.acao = :tipoAcao', {
          tipoAcao: filtros.tipo_acao,
        });
      }

      if (filtros.status_novo) {
        queryBuilder.andWhere('h.acao = :acao', {
          acao: filtros.status_novo,
        });
      }

      if (filtros.data_inicio && filtros.data_fim) {
        queryBuilder.andWhere('h.created_at BETWEEN :dataInicio AND :dataFim', {
          dataInicio: filtros.data_inicio,
          dataFim: filtros.data_fim,
        });
      }

      if (filtros.acao_critica_codigo) {
        queryBuilder.andWhere('s.acao_critica_codigo = :acaoCriticaCodigo', {
          acaoCriticaCodigo: filtros.acao_critica_codigo,
        });
      }

      if (filtros.unidade_solicitante) {
        queryBuilder.andWhere('s.unidade_solicitante = :unidadeSolicitante', {
          unidadeSolicitante: filtros.unidade_solicitante,
        });
      }

      const offset = (pagina - 1) * limite;
      queryBuilder.skip(offset).take(limite);

      const [historicos, total] = await queryBuilder.getManyAndCount();

      return new RespostaPaginadaDto(
        historicos,
        total,
        pagina,
        limite,
        {},
      );
    } catch (error) {
      this.logger.error(
        `Erro ao buscar histórico com filtros: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Gera estatísticas de aprovação para um período
   * 
   * @param dataInicio - Data de início
   * @param dataFim - Data de fim
   * @param unidade - Filtro por unidade (opcional)
   * @returns Promise<EstatisticasAprovacaoDto> - Estatísticas
   */
  async gerarEstatisticas(
    dataInicio: Date,
    dataFim: Date,
    unidade?: string,
  ): Promise<EstatisticasAprovacaoDto> {
    try {
      this.logger.debug(
        `Gerando estatísticas de ${dataInicio.toISOString()} até ${dataFim.toISOString()}`,
      );

      const queryBuilder = this.historicoRepository
        .createQueryBuilder('h')
        .leftJoin('h.solicitacao_aprovacao', 's')
        .where('h.created_at BETWEEN :dataInicio AND :dataFim', {
          dataInicio,
          dataFim,
        });

      if (unidade) {
        queryBuilder.andWhere('s.unidade_solicitante = :unidade', { unidade });
      }

      // Total de solicitações
      const totalSolicitacoes = await queryBuilder
        .andWhere('h.acao = :tipoAcao', {
          tipoAcao: TipoAcaoHistorico.SOLICITACAO_CRIADA,
        })
        .getCount();

      // Aprovações
      const totalAprovacoes = await queryBuilder
        .andWhere('h.acao = :acao', {
          acao: AcaoAprovacao.APROVAR,
        })
        .getCount();

      // Rejeições
      const totalRejeicoes = await queryBuilder
        .andWhere('h.acao = :acao', {
          acao: AcaoAprovacao.REJEITAR,
        })
        .getCount();

      // Cancelamentos
      const totalCancelamentos = await queryBuilder
        .andWhere('h.acao = :acao', {
          acao: TipoAcaoHistorico.CANCELAMENTO,
        })
        .getCount();

      // Expirados
      const totalExpirados = await queryBuilder
        .andWhere('h.acao = :acao', {
          acao: TipoAcaoHistorico.EXPIRACAO,
        })
        .getCount();

      // Pendentes (buscar solicitações ainda em aberto)
      const totalPendentes = await this.solicitacaoRepository
        .createQueryBuilder('s')
        .where('s.status = :status', { status: StatusAprovacao.PENDENTE })
        .andWhere('s.created_at BETWEEN :dataInicio AND :dataFim', {
          dataInicio,
          dataFim,
        })
        .getCount();

      // Calcular tempos médios
      const tempoMedioAprovacao = await this.calcularTempoMedioAprovacao(
        dataInicio,
        dataFim,
        unidade,
      );

      // Estatísticas por tipo de ação
      const estatisticasPorTipo = await this.gerarEstatisticasPorTipo(
        dataInicio,
        dataFim,
        unidade,
      );

      // Estatísticas por aprovador
      const estatisticasPorAprovador = await this.gerarEstatisticasPorAprovador(
        dataInicio,
        dataFim,
        unidade,
      );

      const estatisticas: EstatisticasAprovacaoDto = {
        periodo: {
          data_inicio: dataInicio,
          data_fim: dataFim,
        },
        unidade_filtro: unidade,
        totais: {
          solicitacoes: totalSolicitacoes,
          aprovacoes: totalAprovacoes,
          rejeicoes: totalRejeicoes,
          cancelamentos: totalCancelamentos,
          expirados: totalExpirados,
          pendentes: totalPendentes,
        },
        percentuais: {
          taxa_aprovacao: totalSolicitacoes > 0 ? (totalAprovacoes / totalSolicitacoes) * 100 : 0,
          taxa_rejeicao: totalSolicitacoes > 0 ? (totalRejeicoes / totalSolicitacoes) * 100 : 0,
          taxa_cancelamento: totalSolicitacoes > 0 ? (totalCancelamentos / totalSolicitacoes) * 100 : 0,
          taxa_expiracao: totalSolicitacoes > 0 ? (totalExpirados / totalSolicitacoes) * 100 : 0,
        },
        tempos: {
          tempo_medio_aprovacao_horas: tempoMedioAprovacao,
        },
        por_tipo_acao: estatisticasPorTipo,
        por_aprovador: estatisticasPorAprovador,
        gerado_em: new Date(),
      };

      return estatisticas;
    } catch (error) {
      this.logger.error(
        `Erro ao gerar estatísticas: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca o último histórico de uma solicitação
   * 
   * @param solicitacaoId - ID da solicitação
   * @returns Promise<HistoricoAprovacao | null> - Último histórico
   */
  async buscarUltimoHistorico(
    solicitacaoId: string,
  ): Promise<HistoricoAprovacao | null> {
    return this.historicoRepository.findOne({
      where: { solicitacao_aprovacao_id: solicitacaoId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Busca histórico por ID
   * 
   * @param id - ID do histórico
   * @returns Promise<HistoricoAprovacao> - Histórico encontrado
   */
  async buscarHistoricoPorId(id: string): Promise<HistoricoAprovacao> {
    const historico = await this.historicoRepository.findOne({
      where: { id },
      relations: ['solicitacao_aprovacao'],
    });

    if (!historico) {
      throw new NotFoundException(`Histórico ${id} não encontrado`);
    }

    return historico;
  }

  /**
   * Gera relatório de auditoria para compliance
   * 
   * @param dataInicio - Data de início
   * @param dataFim - Data de fim
   * @param formato - Formato do relatório
   * @returns Promise<any> - Dados do relatório
   */
  async gerarRelatorioAuditoria(
    dataInicio: Date,
    dataFim: Date,
    formato: 'json' | 'csv' = 'json',
  ): Promise<any> {
    try {
      const historicos = await this.historicoRepository
        .createQueryBuilder('h')
        .leftJoinAndSelect('h.solicitacao_aprovacao', 's')
        .where('h.created_at BETWEEN :dataInicio AND :dataFim', {
          dataInicio,
          dataFim,
        })
        .orderBy('h.created_at', 'ASC')
        .getMany();

      const dadosRelatorio = historicos.map(h => ({
        id: h.id,
        solicitacao_id: h.solicitacao_aprovacao_id,
        tipo_acao: h.acao,
        status_anterior: null,
        status_novo: null,
        usuario_id: h.usuario_id,
        usuario_nome: h.usuario_nome,
        usuario_email: h.usuario_email,
        aprovador_id: h.aprovador_id,
        comentario: h.justificativa,
        justificativa: h.justificativa,
        ip_address: h.ip_usuario,
        user_agent: h.user_agent,
        localizacao: h.localizacao,
        data_acao: h.created_at,
        acao_critica_codigo: h.solicitacao_aprovacao?.acao_critica_id,
        unidade_solicitante: h.solicitacao_aprovacao?.unidade_solicitante,
      }));

      if (formato === 'csv') {
        // Converter para CSV (implementação simplificada)
        const headers = Object.keys(dadosRelatorio[0] || {});
        const csvContent = [
          headers.join(','),
          ...dadosRelatorio.map(row => 
            headers.map(header => JSON.stringify(row[header] || '')).join(',')
          ),
        ].join('\n');

        return {
          formato: 'csv',
          conteudo: csvContent,
          total_registros: dadosRelatorio.length,
        };
      }

      return {
        formato: 'json',
        dados: dadosRelatorio,
        total_registros: dadosRelatorio.length,
        periodo: {
          data_inicio: dataInicio,
          data_fim: dataFim,
        },
        gerado_em: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Erro ao gerar relatório de auditoria: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Métodos auxiliares privados

  /**
   * Calcula o tempo médio de aprovação em horas
   */
  private async calcularTempoMedioAprovacao(
    dataInicio: Date,
    dataFim: Date,
    unidade?: string,
  ): Promise<number> {
    try {
      const query = `
        SELECT AVG(
          EXTRACT(EPOCH FROM (h_final.created_at - h_inicial.created_at)) / 3600
        ) as tempo_medio_horas
        FROM historico_aprovacao h_inicial
        JOIN historico_aprovacao h_final ON h_inicial.solicitacao_aprovacao_id = h_final.solicitacao_aprovacao_id
        JOIN solicitacao_aprovacao s ON h_inicial.solicitacao_aprovacao_id = s.id
        WHERE h_inicial.acao = 'SOLICITACAO_CRIADA'
        AND h_final.acao IN ('APROVAR', 'REJEITAR')
        AND h_inicial.created_at BETWEEN $1 AND $2
        ${unidade ? 'AND s.unidade_solicitante = $3' : ''}
      `;

      const params: any[] = [dataInicio, dataFim];
      if (unidade) {
        params.push(unidade);
      }

      const resultado = await this.historicoRepository.query(query, params);
      return parseFloat(resultado[0]?.tempo_medio_horas || '0');
    } catch (error) {
      this.logger.warn(
        `Erro ao calcular tempo médio de aprovação: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * Gera estatísticas por tipo de ação crítica
   */
  private async gerarEstatisticasPorTipo(
    dataInicio: Date,
    dataFim: Date,
    unidade?: string,
  ): Promise<Record<string, any>> {
    try {
      const queryBuilder = this.historicoRepository
        .createQueryBuilder('h')
        .leftJoin('h.solicitacao_aprovacao', 's')
        .select('s.acao_critica_codigo', 'tipo')
        .addSelect('COUNT(*)', 'total')
        .addSelect('h.acao', 'acao')
        .where('h.created_at BETWEEN :dataInicio AND :dataFim', {
          dataInicio,
          dataFim,
        })
        .andWhere('h.acao IN (:...acoes)', {
          acoes: [AcaoAprovacao.APROVAR, AcaoAprovacao.REJEITAR],
        })
        .groupBy('s.acao_critica_codigo')
        .addGroupBy('h.acao');

      if (unidade) {
        queryBuilder.andWhere('s.unidade_solicitante = :unidade', { unidade });
      }

      const resultados = await queryBuilder.getRawMany();

      const estatisticas = {};
      resultados.forEach(r => {
        if (!estatisticas[r.tipo]) {
          estatisticas[r.tipo] = { aprovado: 0, rejeitado: 0 };
        }
        const acao = r.acao.toLowerCase();
        if (acao === 'aprovar') {
          estatisticas[r.tipo].aprovado = parseInt(r.total);
        } else if (acao === 'rejeitar') {
          estatisticas[r.tipo].rejeitado = parseInt(r.total);
        }
      });

      return estatisticas;
    } catch (error) {
      this.logger.warn(
        `Erro ao gerar estatísticas por tipo: ${error.message}`,
      );
      return {};
    }
  }

  /**
   * Gera estatísticas por aprovador
   */
  private async gerarEstatisticasPorAprovador(
    dataInicio: Date,
    dataFim: Date,
    unidade?: string,
  ): Promise<Record<string, any>> {
    try {
      const queryBuilder = this.historicoRepository
        .createQueryBuilder('h')
        .leftJoin('h.solicitacao_aprovacao', 's')
        .select('h.usuario_nome', 'aprovador')
        .addSelect('COUNT(*)', 'total')
        .addSelect('h.acao', 'acao')
        .where('h.created_at BETWEEN :dataInicio AND :dataFim', {
          dataInicio,
          dataFim,
        })
        .andWhere('h.acao IN (:...acoes)', {
          acoes: [AcaoAprovacao.APROVAR, AcaoAprovacao.REJEITAR],
        })
        .andWhere('h.aprovador_id IS NOT NULL')
        .groupBy('h.usuario_nome')
        .addGroupBy('h.acao');

      if (unidade) {
        queryBuilder.andWhere('s.unidade_solicitante = :unidade', { unidade });
      }

      const resultados = await queryBuilder.getRawMany();

      const estatisticas = {};
      resultados.forEach(r => {
        if (!estatisticas[r.aprovador]) {
          estatisticas[r.aprovador] = { aprovado: 0, rejeitado: 0 };
        }
        const acao = r.acao.toLowerCase();
        if (acao === 'aprovar') {
          estatisticas[r.aprovador].aprovado = parseInt(r.total);
        } else if (acao === 'rejeitar') {
          estatisticas[r.aprovador].rejeitado = parseInt(r.total);
        }
      });

      return estatisticas;
    } catch (error) {
      this.logger.warn(
        `Erro ao gerar estatísticas por aprovador: ${error.message}`,
      );
      return {};
    }
  }
}