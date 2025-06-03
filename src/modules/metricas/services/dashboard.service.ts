import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Solicitacao, StatusSolicitacao } from '../../../entities/solicitacao.entity';
import { Recurso, StatusRecurso } from '../../../entities/recurso.entity';
import { TipoBeneficio } from '../../../entities/tipo-beneficio.entity';
import { Unidade } from '../../../entities/unidade.entity';
import { Usuario } from '../../../entities/usuario.entity';

/**
 * Interface para o resumo do dashboard
 */
export interface ResumoDashboard {
  solicitacoes: {
    total: number;
    pendentes: number;
    emAnalise: number;
    aprovadas: number;
    reprovadas: number;
    liberadas: number;
    canceladas: number;
  };
  recursos: {
    total: number;
    pendentes: number;
    emAnalise: number;
    deferidos: number;
    indeferidos: number;
  };
  beneficios: {
    total: number;
    porTipo: Array<{
      tipo: string;
      quantidade: number;
    }>;
  };
  unidades: {
    total: number;
    maisAtivas: Array<{
      nome: string;
      solicitacoes: number;
    }>;
  };
}

/**
 * Interface para os KPIs do dashboard
 */
export interface KpisDashboard {
  tempoMedioAnalise: number;
  taxaAprovacao: number;
  taxaRecurso: number;
  taxaDeferimento: number;
  solicitacoesPorDia: number;
  beneficiosPorDia: number;
}

/**
 * Interface para os gráficos do dashboard
 */
export interface GraficosDashboard {
  solicitacoesPorPeriodo: Array<{
    data: string;
    quantidade: number;
  }>;
  solicitacoesPorStatus: Array<{
    status: string;
    quantidade: number;
  }>;
  solicitacoesPorUnidade: Array<{
    unidade: string;
    quantidade: number;
  }>;
  solicitacoesPorBeneficio: Array<{
    beneficio: string;
    quantidade: number;
  }>;
}

/**
 * Serviço responsável por fornecer dados para o dashboard
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Solicitacao)
    private solicitacaoRepository: Repository<Solicitacao>,
    
    @InjectRepository(Recurso)
    private recursoRepository: Repository<Recurso>,
    
    @InjectRepository(TipoBeneficio)
    private tipoBeneficioRepository: Repository<TipoBeneficio>,
    
    @InjectRepository(Unidade)
    private unidadeRepository: Repository<Unidade>,
  ) {
    this.logger.log('Serviço de Dashboard inicializado');
  }

  /**
   * Obtém o resumo para o dashboard
   * @returns Resumo do dashboard
   */
  async obterResumo(): Promise<ResumoDashboard> {
    // Contagem de solicitações por status
    const solicitacoesTotal = await this.solicitacaoRepository.count();
    const solicitacoesPendentes = await this.solicitacaoRepository.count({
      where: { status: StatusSolicitacao.PENDENTE },
    });
    const solicitacoesEmAnalise = await this.solicitacaoRepository.count({
      where: { status: StatusSolicitacao.EM_ANALISE },
    });
    const solicitacoesAprovadas = await this.solicitacaoRepository.count({
      where: { status: StatusSolicitacao.APROVADA },
    });
    const solicitacoesReprovadas = await this.solicitacaoRepository.count({
      where: { status: StatusSolicitacao.INDEFERIDA },
    });
    const solicitacoesLiberadas = await this.solicitacaoRepository.count({
      where: { status: StatusSolicitacao.LIBERADA },
    });
    const solicitacoesCanceladas = await this.solicitacaoRepository.count({
      where: { status: StatusSolicitacao.CANCELADA },
    });

    // Contagem de recursos por status
    const recursosTotal = await this.recursoRepository.count();
    const recursosPendentes = await this.recursoRepository.count({
      where: { status: StatusRecurso.PENDENTE },
    });
    const recursosEmAnalise = await this.recursoRepository.count({
      where: { status: StatusRecurso.EM_ANALISE },
    });
    const recursosDeferidos = await this.recursoRepository.count({
      where: { status: StatusRecurso.DEFERIDO },
    });
    const recursosIndeferidos = await this.recursoRepository.count({
      where: { status: StatusRecurso.INDEFERIDO },
    });

    // Contagem de benefícios por tipo
    const beneficiosPorTipo = await this.tipoBeneficioRepository
      .createQueryBuilder('tipo')
      .select('tipo.nome', 'tipo')
      .addSelect('COUNT(solicitacao.id)', 'quantidade')
      .leftJoin('tipo.solicitacoes', 'solicitacao')
      .where('solicitacao.status = :status', { status: StatusSolicitacao.LIBERADA })
      .groupBy('tipo.id')
      .orderBy('quantidade', 'DESC')
      .limit(5)
      .getRawMany();

    // Unidades mais ativas
    const unidadesMaisAtivas = await this.unidadeRepository
      .createQueryBuilder('unidade')
      .select('unidade.nome', 'nome')
      .addSelect('COUNT(solicitacao.id)', 'solicitacoes')
      .leftJoin('unidade.solicitacoes', 'solicitacao')
      .groupBy('unidade.id')
      .orderBy('solicitacoes', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      solicitacoes: {
        total: solicitacoesTotal,
        pendentes: solicitacoesPendentes,
        emAnalise: solicitacoesEmAnalise,
        aprovadas: solicitacoesAprovadas,
        reprovadas: solicitacoesReprovadas,
        liberadas: solicitacoesLiberadas,
        canceladas: solicitacoesCanceladas,
      },
      recursos: {
        total: recursosTotal,
        pendentes: recursosPendentes,
        emAnalise: recursosEmAnalise,
        deferidos: recursosDeferidos,
        indeferidos: recursosIndeferidos,
      },
      beneficios: {
        total: solicitacoesLiberadas,
        porTipo: beneficiosPorTipo,
      },
      unidades: {
        total: await this.unidadeRepository.count(),
        maisAtivas: unidadesMaisAtivas,
      },
    };
  }

  /**
   * Obtém os KPIs para o dashboard
   * @returns KPIs do dashboard
   */
  async obterKPIs(): Promise<KpisDashboard> {
    // Tempo médio de análise (em dias)
    const tempoMedioAnaliseResult = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .select('AVG(EXTRACT(EPOCH FROM (solicitacao.data_aprovacao - solicitacao.data_abertura)) / 86400)', 'media')
      .where('solicitacao.status IN (:...status)', { status: [StatusSolicitacao.APROVADA, StatusSolicitacao.INDEFERIDA] })
      .andWhere('solicitacao.data_aprovacao IS NOT NULL')
      .getRawOne();

    const tempoMedioAnalise = tempoMedioAnaliseResult?.media || 0;

    // Taxa de aprovação
    const totalAnalisadas = await this.solicitacaoRepository.count({
      where: [
        { status: StatusSolicitacao.APROVADA },
        { status: StatusSolicitacao.INDEFERIDA },
      ],
    });

    const totalAprovadas = await this.solicitacaoRepository.count({
      where: { status: StatusSolicitacao.APROVADA },
    });

    const taxaAprovacao = totalAnalisadas > 0 ? (totalAprovadas / totalAnalisadas) * 100 : 0;

    // Taxa de recurso
    const totalReprovadas = await this.solicitacaoRepository.count({
      where: { status: StatusSolicitacao.INDEFERIDA },
    });

    const totalRecursos = await this.recursoRepository.count();
    const taxaRecurso = totalReprovadas > 0 ? (totalRecursos / totalReprovadas) * 100 : 0;

    // Taxa de deferimento
    const totalRecursosAnalisados = await this.recursoRepository.count({
      where: [
        { status: StatusRecurso.DEFERIDO },
        { status: StatusRecurso.INDEFERIDO },
      ],
    });

    const totalDeferidos = await this.recursoRepository.count({
      where: { status: StatusRecurso.DEFERIDO },
    });

    const taxaDeferimento = totalRecursosAnalisados > 0 ? (totalDeferidos / totalRecursosAnalisados) * 100 : 0;

    // Solicitações por dia (últimos 30 dias)
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 30);

    const totalSolicitacoes30Dias = await this.solicitacaoRepository.count({
      where: {
        data_abertura: Between(dataInicio, new Date()),
      },
    });

    const solicitacoesPorDia = totalSolicitacoes30Dias / 30;

    // Benefícios por dia (últimos 30 dias)
    const totalBeneficios30Dias = await this.solicitacaoRepository.count({
      where: {
        status: StatusSolicitacao.LIBERADA,
        data_liberacao: Between(dataInicio, new Date()),
      },
    });

    const beneficiosPorDia = totalBeneficios30Dias / 30;

    return {
      tempoMedioAnalise,
      taxaAprovacao,
      taxaRecurso,
      taxaDeferimento,
      solicitacoesPorDia,
      beneficiosPorDia,
    };
  }

  /**
   * Obtém dados para gráficos do dashboard
   * @param periodo Período para filtrar os dados (em dias)
   * @returns Dados para gráficos
   */
  async obterGraficos(periodo: number = 30): Promise<GraficosDashboard> {
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - periodo);

    // Solicitações por período (agrupadas por dia)
    const solicitacoesPorPeriodo = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .select('TO_CHAR(solicitacao.data_abertura, \'YYYY-MM-DD\')', 'data')
      .addSelect('COUNT(solicitacao.id)', 'quantidade')
      .where('solicitacao.data_abertura >= :dataInicio', { dataInicio })
      .groupBy('data')
      .orderBy('data', 'ASC')
      .getRawMany();

    // Solicitações por status
    const solicitacoesPorStatus = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .select('solicitacao.status', 'status')
      .addSelect('COUNT(solicitacao.id)', 'quantidade')
      .groupBy('solicitacao.status')
      .orderBy('quantidade', 'DESC')
      .getRawMany();

    // Solicitações por unidade
    const solicitacoesPorUnidade = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .select('unidade.nome', 'unidade')
      .addSelect('COUNT(solicitacao.id)', 'quantidade')
      .leftJoin('solicitacao.unidade', 'unidade')
      .groupBy('unidade.id')
      .orderBy('quantidade', 'DESC')
      .limit(10)
      .getRawMany();

    // Solicitações por tipo de benefício
    const solicitacoesPorBeneficio = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .select('tipo.nome', 'beneficio')
      .addSelect('COUNT(solicitacao.id)', 'quantidade')
      .leftJoin('solicitacao.tipo_beneficio', 'tipo')
      .groupBy('tipo.id')
      .orderBy('quantidade', 'DESC')
      .getRawMany();

    return {
      solicitacoesPorPeriodo,
      solicitacoesPorStatus,
      solicitacoesPorUnidade,
      solicitacoesPorBeneficio,
    };
  }
}
