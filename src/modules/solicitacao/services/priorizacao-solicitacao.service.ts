import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Solicitacao,
  StatusSolicitacao,
} from '../../../entities/solicitacao.entity';
import { ConfigService } from '@nestjs/config';

/**
 * Níveis de prioridade para solicitações
 */
export enum NivelPrioridade {
  BAIXA = 'baixa',
  NORMAL = 'normal',
  ALTA = 'alta',
  URGENTE = 'urgente',
  CRITICA = 'critica',
}

/**
 * Interface para critérios de priorização
 */
interface CriterioPriorizacao {
  nome: string;
  descricao: string;
  verificador: (solicitacao: Solicitacao) => boolean;
  nivelPrioridade: NivelPrioridade;
  peso: number;
}

/**
 * Serviço responsável pela priorização de solicitações
 *
 * Este serviço implementa funcionalidades para:
 * - Calcular a prioridade de solicitações com base em critérios configuráveis
 * - Priorizar automaticamente solicitações com determinação judicial
 * - Ordenar listas de solicitações de acordo com sua prioridade
 */
@Injectable()
export class PriorizacaoSolicitacaoService {
  private readonly logger = new Logger(PriorizacaoSolicitacaoService.name);
  private criteriosPriorizacao: CriterioPriorizacao[] = [];

  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    private readonly configService: ConfigService,
  ) {
    this.inicializarCriterios();
  }

  /**
   * Inicializa os critérios de priorização padrão
   */
  private inicializarCriterios(): void {
    this.criteriosPriorizacao = [
      {
        nome: 'determinacao_judicial',
        descricao: 'Solicitação com determinação judicial',
        verificador: (solicitacao) =>
          solicitacao.determinacao_judicial_flag === true,
        nivelPrioridade: NivelPrioridade.URGENTE,
        peso: 100,
      },
      {
        nome: 'prazo_expirado',
        descricao: 'Solicitação com prazo expirado',
        verificador: (solicitacao): boolean => {
          const agora = new Date();
          return (
            (solicitacao.prazo_analise && agora > solicitacao.prazo_analise) ||
            (solicitacao.prazo_documentos &&
              agora > solicitacao.prazo_documentos) ||
            (solicitacao.prazo_processamento &&
              agora > solicitacao.prazo_processamento) ||
            false
          );
        },
        nivelPrioridade: NivelPrioridade.ALTA,
        peso: 75,
      },
      {
        nome: 'prazo_proximo',
        descricao: 'Solicitação com prazo próximo de expirar (48h)',
        verificador: (solicitacao): boolean => {
          const agora = new Date();
          const limite = new Date(agora.getTime() + 48 * 60 * 60 * 1000); // 48 horas em milissegundos

          return (
            (solicitacao.prazo_analise &&
              agora <= solicitacao.prazo_analise &&
              solicitacao.prazo_analise <= limite) ||
            (solicitacao.prazo_documentos &&
              agora <= solicitacao.prazo_documentos &&
              solicitacao.prazo_documentos <= limite) ||
            (solicitacao.prazo_processamento &&
              agora <= solicitacao.prazo_processamento &&
              solicitacao.prazo_processamento <= limite) ||
            false
          );
        },
        nivelPrioridade: NivelPrioridade.NORMAL,
        peso: 50,
      },
    ];
  }

  /**
   * Calcula a prioridade de uma solicitação com base nos critérios configurados
   * @param solicitacao Solicitação a ser priorizada
   * @returns Objeto com informações de prioridade
   */
  calcularPrioridade(solicitacao: Solicitacao): {
    nivelPrioridade: NivelPrioridade;
    pontuacao: number;
    criteriosAtendidos: string[];
  } {
    let pontuacaoTotal = 0;
    const criteriosAtendidos: string[] = [];

    // Verificar cada critério
    for (const criterio of this.criteriosPriorizacao) {
      if (criterio.verificador(solicitacao)) {
        pontuacaoTotal += criterio.peso;
        criteriosAtendidos.push(criterio.nome);
      }
    }

    // Determinar nível de prioridade com base na pontuação
    let nivelPrioridade: NivelPrioridade;
    if (pontuacaoTotal >= 100) {
      nivelPrioridade = NivelPrioridade.URGENTE;
    } else if (pontuacaoTotal >= 75) {
      nivelPrioridade = NivelPrioridade.ALTA;
    } else if (pontuacaoTotal >= 50) {
      nivelPrioridade = NivelPrioridade.NORMAL;
    } else if (pontuacaoTotal >= 25) {
      nivelPrioridade = NivelPrioridade.BAIXA;
    } else {
      nivelPrioridade = NivelPrioridade.BAIXA;
    }

    return {
      nivelPrioridade,
      pontuacao: pontuacaoTotal,
      criteriosAtendidos,
    };
  }

  /**
   * Busca solicitações priorizadas de acordo com critérios específicos
   * @param status Status das solicitações a serem buscadas
   * @param limit Limite de resultados
   * @returns Lista de solicitações ordenadas por prioridade
   */
  async buscarSolicitacoesPriorizadas(
    status: StatusSolicitacao[] = [
      StatusSolicitacao.PENDENTE,
      StatusSolicitacao.EM_ANALISE
    ],
    limit = 100,
  ): Promise<Solicitacao[]> {
    // Primeiro critério: determinação judicial (ORDER BY determinacao_judicial_flag DESC)
    // Segundo critério: data de abertura mais antiga (ORDER BY data_abertura ASC)
    const solicitacoes = await this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .where('solicitacao.status IN (:...status)', { status })
      .orderBy('solicitacao.determinacao_judicial_flag', 'DESC')
      .addOrderBy('solicitacao.data_abertura', 'ASC')
      .take(limit)
      .getMany();

    return solicitacoes;
  }

  /**
   * Busca solicitações com determinação judicial em estados ativos
   * @returns Lista de solicitações com determinação judicial
   */
  async buscarSolicitacoesComDeterminacaoJudicial(): Promise<Solicitacao[]> {
    const estadosAtivos = [
      StatusSolicitacao.PENDENTE,
      StatusSolicitacao.EM_ANALISE,
      StatusSolicitacao.APROVADA,
    ];

    return this.solicitacaoRepository.find({
      where: {
        determinacao_judicial_flag: true,
        status: In(estadosAtivos),
      },
      order: {
        data_abertura: 'ASC',
      },
    });
  }

  /**
   * Calcula e retorna a lista de trabalho priorizada para um técnico
   * @param tecnicoId ID do técnico
   * @returns Lista de solicitações priorizadas do técnico
   */
  async calcularListaTrabalhoTecnico(
    tecnicoId: string,
  ): Promise<Solicitacao[]> {
    const estadosAtivos = [
      StatusSolicitacao.PENDENTE,
      StatusSolicitacao.EM_ANALISE
    ];

    const solicitacoes = await this.solicitacaoRepository.find({
      where: {
        tecnico_id: tecnicoId,
        status: In(estadosAtivos),
      },
    });

    // Calcular prioridade para cada solicitação
    const solicitacoesComPrioridade = solicitacoes.map((solicitacao) => ({
      solicitacao,
      prioridade: this.calcularPrioridade(solicitacao),
    }));

    // Ordenar por prioridade (decrescente) e depois por data de abertura (crescente)
    solicitacoesComPrioridade.sort((a, b) => {
      // Primeiro critério: pontuação de prioridade (maior primeiro)
      if (b.prioridade.pontuacao !== a.prioridade.pontuacao) {
        return b.prioridade.pontuacao - a.prioridade.pontuacao;
      }

      // Segundo critério: data de abertura (mais antiga primeiro)
      return (
        a.solicitacao.data_abertura.getTime() -
        b.solicitacao.data_abertura.getTime()
      );
    });

    // Retornar apenas as solicitações, já ordenadas
    return solicitacoesComPrioridade.map((item) => item.solicitacao);
  }
}
