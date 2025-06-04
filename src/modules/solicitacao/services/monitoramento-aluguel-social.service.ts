import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Solicitacao,
  StatusSolicitacao,
} from '../../../entities/solicitacao.entity';
import { TipoBeneficio } from '../../../enums/tipo-beneficio.enum';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificacaoService } from './notificacao.service';

/**
 * Serviço responsável pelo monitoramento obrigatório de solicitações de Aluguel Social
 *
 * Este serviço garante que as solicitações de Aluguel Social sejam monitoradas regularmente
 * de acordo com as regras de negócio estabelecidas.
 */
@Injectable()
export class MonitoramentoAluguelSocialService {
  private readonly logger = new Logger(MonitoramentoAluguelSocialService.name);

  // Período padrão de monitoramento em dias
  private readonly PERIODO_MONITORAMENTO_DIAS = 90;

  // Dias de antecedência para alerta de monitoramento
  private readonly DIAS_ALERTA_ANTECEDENCIA = 15;

  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    private readonly notificacaoService: NotificacaoService,
  ) {}

  /**
   * Verifica se uma solicitação é do tipo Aluguel Social
   * @param solicitacao Solicitação a ser verificada
   * @returns Verdadeiro se for Aluguel Social, falso caso contrário
   */
  isAluguelSocial(solicitacao: Solicitacao): boolean {
    // Verificar pelo tipo_beneficio direto
    if (
      solicitacao.tipo_beneficio &&
      solicitacao.tipo_beneficio.nome === TipoBeneficio.ALUGUEL_SOCIAL
    ) {
      return true;
    }

    // Verificar pelo tipo_beneficio_id através dos dados complementares
    if (
      solicitacao.dados_complementares &&
      solicitacao.dados_complementares.tipo_beneficio ===
        TipoBeneficio.ALUGUEL_SOCIAL
    ) {
      return true;
    }

    return false;
  }

  /**
   * Verifica se a solicitação está em um estado que requer monitoramento
   * @param solicitacao Solicitação a ser verificada
   * @returns Verdadeiro se estiver em estado que requer monitoramento
   */
  requiresMonitoring(solicitacao: Solicitacao): boolean {
    // Solicitações aprovadas e em concessão requerem monitoramento
    const statusMonitorados = [
      StatusSolicitacao.APROVADA,
      StatusSolicitacao.EM_PROCESSAMENTO,
      StatusSolicitacao.LIBERADA,
    ];

    return statusMonitorados.includes(solicitacao.status);
  }

  /**
   * Calcula a data da próxima visita de monitoramento
   * @param ultimaVisita Data da última visita ou null se não houver
   * @returns Data da próxima visita agendada
   */
  calcularProximaVisita(ultimaVisita?: Date): Date {
    const hoje = new Date();

    if (!ultimaVisita) {
      // Se não houver última visita, a próxima deve ser em 30 dias
      const proximaVisita = new Date(hoje);
      proximaVisita.setDate(proximaVisita.getDate() + 30);
      return proximaVisita;
    }

    // Caso contrário, próxima visita deve ser em PERIODO_MONITORAMENTO_DIAS
    const proximaVisita = new Date(ultimaVisita);
    proximaVisita.setDate(
      proximaVisita.getDate() + this.PERIODO_MONITORAMENTO_DIAS,
    );
    return proximaVisita;
  }

  /**
   * Registra uma nova visita para uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param dataVisita Data da visita
   * @param observacoes Observações da visita
   * @param usuario Usuário que realizou a visita
   */
  async registrarVisita(
    solicitacaoId: string,
    dataVisita: Date,
    observacoes: string,
    usuario: any,
  ): Promise<void> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
    });

    if (!solicitacao) {
      this.logger.error(`Solicitação não encontrada: ${solicitacaoId}`);
      throw new Error('Solicitação não encontrada');
    }

    // Verifica se é aluguel social
    if (!this.isAluguelSocial(solicitacao)) {
      this.logger.error(
        `Tentativa de registrar visita para solicitação que não é de Aluguel Social: ${solicitacaoId}`,
      );
      throw new Error('Solicitação não é de Aluguel Social');
    }

    // Inicializa o histórico de visitas se não existir
    if (!solicitacao.dados_complementares) {
      solicitacao.dados_complementares = {};
    }

    if (!solicitacao.dados_complementares.visitas_monitoramento) {
      solicitacao.dados_complementares.visitas_monitoramento = [];
    }

    // Calcula a data da próxima visita
    const proximaVisita = this.calcularProximaVisita(dataVisita);

    // Adiciona a nova visita ao histórico
    solicitacao.dados_complementares.visitas_monitoramento.push({
      data: dataVisita,
      observacoes,
      usuario_id: usuario.id,
      nome_usuario: usuario.nome || 'Sistema',
      proxima_visita: proximaVisita,
    });

    // Atualiza a data da próxima visita
    solicitacao.dados_complementares.proxima_visita_monitoramento =
      proximaVisita;

    // Salva as alterações
    await this.solicitacaoRepository.save(solicitacao);

    // Envia notificação sobre o registro da visita
    this.notificacaoService.notificarVisitaMonitoramentoRegistrada(
      solicitacao,
      dataVisita,
      proximaVisita,
    );

    this.logger.log(`Visita registrada para solicitação ${solicitacaoId}`);
  }

  /**
   * Obtém as solicitações de Aluguel Social que precisam de monitoramento
   * @returns Lista de solicitações que precisam de monitoramento
   */
  async getSolicitacoesParaMonitoramento(): Promise<Solicitacao[]> {
    const hoje = new Date();

    const queryBuilder = this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .leftJoinAndSelect('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .where('solicitacao.status IN (:...statusMonitorados)', {
        statusMonitorados: [
          StatusSolicitacao.APROVADA,
          StatusSolicitacao.EM_PROCESSAMENTO,
          StatusSolicitacao.LIBERADA,
        ],
      })
      .andWhere(
        "(tipo_beneficio.nome = :tipoBeneficio OR solicitacao.dados_complementares->>'tipo_beneficio' = :tipoBeneficioStr)",
        {
          tipoBeneficio: TipoBeneficio.ALUGUEL_SOCIAL,
          tipoBeneficioStr: TipoBeneficio.ALUGUEL_SOCIAL,
        },
      )
      .andWhere(
        "(solicitacao.dados_complementares->'proxima_visita_monitoramento' IS NULL OR " +
          "CAST(solicitacao.dados_complementares->>'proxima_visita_monitoramento' AS TIMESTAMP) <= :dataLimite)",
        {
          dataLimite: hoje,
        },
      )
      .orderBy('solicitacao.updated_at', 'ASC');

    return queryBuilder.getMany();
  }

  /**
   * Obtém as solicitações que estão próximas da data de monitoramento
   * @returns Lista de solicitações com alerta de monitoramento
   */
  async getSolicitacoesComAlertaMonitoramento(): Promise<Solicitacao[]> {
    const hoje = new Date();
    const dataLimiteAlerta = new Date(hoje);
    dataLimiteAlerta.setDate(hoje.getDate() + this.DIAS_ALERTA_ANTECEDENCIA);

    const queryBuilder = this.solicitacaoRepository
      .createQueryBuilder('solicitacao')
      .leftJoinAndSelect('solicitacao.tipo_beneficio', 'tipo_beneficio')
      .where('solicitacao.status IN (:...statusMonitorados)', {
        statusMonitorados: [
          StatusSolicitacao.APROVADA,
          StatusSolicitacao.EM_PROCESSAMENTO,
          StatusSolicitacao.LIBERADA,
        ],
      })
      .andWhere(
        "(tipo_beneficio.nome = :tipoBeneficio OR solicitacao.dados_complementares->>'tipo_beneficio' = :tipoBeneficioStr)",
        {
          tipoBeneficio: TipoBeneficio.ALUGUEL_SOCIAL,
          tipoBeneficioStr: TipoBeneficio.ALUGUEL_SOCIAL,
        },
      )
      .andWhere(
        "(solicitacao.dados_complementares->'proxima_visita_monitoramento' IS NOT NULL AND " +
          "CAST(solicitacao.dados_complementares->>'proxima_visita_monitoramento' AS TIMESTAMP) > :hoje AND " +
          "CAST(solicitacao.dados_complementares->>'proxima_visita_monitoramento' AS TIMESTAMP) <= :dataLimite)",
        {
          hoje: hoje,
          dataLimite: dataLimiteAlerta,
        },
      )
      .orderBy(
        "solicitacao.dados_complementares->>'proxima_visita_monitoramento'",
        'ASC',
      );

    return queryBuilder.getMany();
  }

  /**
   * Obtém uma solicitação pelo ID
   * @param id ID da solicitação
   * @returns Solicitação encontrada ou null
   */
  async getSolicitacaoById(id: string): Promise<Solicitacao | null> {
    try {
      return await this.solicitacaoRepository.findOne({
        where: { id },
        relations: ['tipo_beneficio'],
      });
    } catch (error) {
      this.logger.error(
        `Erro ao buscar solicitação: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Atualiza uma visita de monitoramento existente
   * @param solicitacaoId ID da solicitação
   * @param indiceVisita Índice da visita no array de visitas
   * @param dadosAtualizacao Dados para atualização parcial da visita
   * @param usuario Usuário que está realizando a atualização
   * @returns A visita atualizada
   */
  async atualizarVisitaMonitoramento(
    solicitacaoId: string,
    indiceVisita: number,
    dadosAtualizacao: {
      data_visita?: Date;
      observacoes?: string;
      dados_adicionais?: Record<string, any>;
    },
    usuario: any,
  ): Promise<any> {
    // Buscar a solicitação
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
    });

    if (!solicitacao) {
      this.logger.error(`Solicitação não encontrada: ${solicitacaoId}`);
      throw new Error('Solicitação não encontrada');
    }

    // Verificar se é aluguel social
    if (!this.isAluguelSocial(solicitacao)) {
      this.logger.error(
        `Tentativa de atualizar visita para solicitação que não é de Aluguel Social: ${solicitacaoId}`,
      );
      throw new Error('Solicitação não é de Aluguel Social');
    }

    // Verificar se existem visitas registradas
    if (
      !solicitacao.dados_complementares?.visitas_monitoramento ||
      !Array.isArray(solicitacao.dados_complementares.visitas_monitoramento) ||
      solicitacao.dados_complementares.visitas_monitoramento.length === 0
    ) {
      throw new Error(
        'Solicitação não possui visitas de monitoramento registradas',
      );
    }

    // Verificar se o índice é válido
    if (
      indiceVisita < 0 ||
      indiceVisita >=
        solicitacao.dados_complementares.visitas_monitoramento.length
    ) {
      throw new Error('Visita não encontrada com o índice fornecido');
    }

    // Obter a visita a ser atualizada
    const visita =
      solicitacao.dados_complementares.visitas_monitoramento[indiceVisita];

    // Registrar dados da atualização
    const dataAtualizacao = new Date();
    const dadosAtualizador = {
      usuario_id: usuario.id,
      nome_usuario: usuario.nome || 'Sistema',
      data_atualizacao: dataAtualizacao,
    };

    // Atualizar dados da visita
    if (dadosAtualizacao.data_visita) {
      visita.data = dadosAtualizacao.data_visita;
    }

    if (dadosAtualizacao.observacoes) {
      visita.observacoes = dadosAtualizacao.observacoes;
    }

    if (dadosAtualizacao.dados_adicionais) {
      visita.dados_adicionais = {
        ...(visita.dados_adicionais || {}),
        ...dadosAtualizacao.dados_adicionais,
      };
    }

    // Adicionar informações sobre a atualização
    if (!visita.historico_atualizacoes) {
      visita.historico_atualizacoes = [];
    }

    visita.historico_atualizacoes.push({
      ...dadosAtualizador,
      dados_anteriores: {
        data: visita.data,
        observacoes: visita.observacoes,
        dados_adicionais: visita.dados_adicionais,
      },
      campos_atualizados: Object.keys(dadosAtualizacao),
    });

    visita.ultima_atualizacao = dadosAtualizador;

    // Recalcular próxima visita apenas se a data for alterada
    if (dadosAtualizacao.data_visita) {
      const proximaVisita = this.calcularProximaVisita(
        dadosAtualizacao.data_visita,
      );
      visita.proxima_visita = proximaVisita;

      // Atualizar a data da próxima visita na solicitação apenas se esta for a última visita
      if (
        indiceVisita ===
        solicitacao.dados_complementares.visitas_monitoramento.length - 1
      ) {
        solicitacao.dados_complementares.proxima_visita_monitoramento =
          proximaVisita;
      }
    }

    // Salvar as alterações
    await this.solicitacaoRepository.save(solicitacao);

    // Notificar sobre a atualização se a data foi alterada
    if (dadosAtualizacao.data_visita) {
      this.notificacaoService.notificarVisitaMonitoramentoRegistrada(
        solicitacao,
        visita.data,
        visita.proxima_visita,
      );
    }

    this.logger.log(
      `Visita de monitoramento atualizada para solicitação ${solicitacaoId}, índice ${indiceVisita}`,
    );

    return visita;
  }

  /**
   * Remove uma visita de monitoramento existente
   * @param solicitacaoId ID da solicitação
   * @param indiceVisita Índice da visita no array de visitas
   * @param usuario Usuário que está realizando a exclusão
   * @returns Informações sobre a operação
   */
  async removerVisitaMonitoramento(
    solicitacaoId: string,
    indiceVisita: number,
    usuario: any,
  ): Promise<{ success: boolean; proximaVisitaAtualizada?: Date }> {
    // Buscar a solicitação
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
    });

    if (!solicitacao) {
      this.logger.error(`Solicitação não encontrada: ${solicitacaoId}`);
      throw new Error('Solicitação não encontrada');
    }

    // Verificar se é aluguel social
    if (!this.isAluguelSocial(solicitacao)) {
      this.logger.error(
        `Tentativa de remover visita para solicitação que não é de Aluguel Social: ${solicitacaoId}`,
      );
      throw new Error('Solicitação não é de Aluguel Social');
    }

    // Verificar se existem visitas registradas
    if (
      !solicitacao.dados_complementares?.visitas_monitoramento ||
      !Array.isArray(solicitacao.dados_complementares.visitas_monitoramento) ||
      solicitacao.dados_complementares.visitas_monitoramento.length === 0
    ) {
      throw new Error(
        'Solicitação não possui visitas de monitoramento registradas',
      );
    }

    // Verificar se o índice é válido
    if (
      indiceVisita < 0 ||
      indiceVisita >=
        solicitacao.dados_complementares.visitas_monitoramento.length
    ) {
      throw new Error('Visita não encontrada com o índice fornecido');
    }

    // Armazenar informações da visita a ser removida para o log
    const visitaRemovida =
      solicitacao.dados_complementares.visitas_monitoramento[indiceVisita];

    // Inicializar o histórico de exclusões se não existir
    if (!solicitacao.dados_complementares.historico_exclusoes_visitas) {
      solicitacao.dados_complementares.historico_exclusoes_visitas = [];
    }

    // Registrar a exclusão no histórico
    solicitacao.dados_complementares.historico_exclusoes_visitas.push({
      visita: visitaRemovida,
      data_exclusao: new Date(),
      usuario_id: usuario.id,
      nome_usuario: usuario.nome || 'Sistema',
      motivo: 'Exclusão manual via API',
    });

    // Remover a visita do array
    solicitacao.dados_complementares.visitas_monitoramento.splice(
      indiceVisita,
      1,
    );

    const resultado: { success: boolean; proximaVisitaAtualizada?: Date } = {
      success: true,
    };

    // Se for a última visita ou se não houver mais visitas, recalcular a próxima visita
    if (solicitacao.dados_complementares.visitas_monitoramento.length === 0) {
      // Se não houver mais visitas, a próxima visita deve ser calculada a partir da data atual
      const proximaVisita = this.calcularProximaVisita();
      solicitacao.dados_complementares.proxima_visita_monitoramento =
        proximaVisita;
      resultado.proximaVisitaAtualizada = proximaVisita;
    } else if (
      indiceVisita ===
      solicitacao.dados_complementares.visitas_monitoramento.length
    ) {
      // Se a visita removida era a última, a próxima visita deve ser baseada na nova última visita
      const ultimaVisita =
        solicitacao.dados_complementares.visitas_monitoramento[
          solicitacao.dados_complementares.visitas_monitoramento.length - 1
        ];
      const proximaVisita = this.calcularProximaVisita(
        new Date(ultimaVisita.data),
      );
      solicitacao.dados_complementares.proxima_visita_monitoramento =
        proximaVisita;
      resultado.proximaVisitaAtualizada = proximaVisita;
    }

    // Salvar as alterações
    await this.solicitacaoRepository.save(solicitacao);

    this.logger.log(
      `Visita de monitoramento removida para solicitação ${solicitacaoId}, índice ${indiceVisita}`,
    );

    return resultado;
  }

  /**
   * Tarefa agendada para executar diariamente e verificar solicitações que precisam de monitoramento
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async verificarMonitoramentoObrigatorio() {
    this.logger.log(
      'Iniciando verificação diária de monitoramento para Aluguel Social',
    );

    try {
      // Obter solicitações que já ultrapassaram a data de monitoramento
      const solicitacoesParaMonitoramento =
        await this.getSolicitacoesParaMonitoramento();

      this.logger.log(
        `Encontradas ${solicitacoesParaMonitoramento.length} solicitações que precisam de monitoramento`,
      );

      // Enviar notificações para solicitações com visitas pendentes
      for (const solicitacao of solicitacoesParaMonitoramento) {
        const dataLimite = new Date();
        this.notificacaoService.notificarMonitoramentoPendente(
          solicitacao,
          dataLimite,
        );
      }

      // Obter solicitações com alertas de monitoramento próximo
      const solicitacoesComAlerta =
        await this.getSolicitacoesComAlertaMonitoramento();

      this.logger.log(
        `Encontradas ${solicitacoesComAlerta.length} solicitações com alerta de monitoramento próximo`,
      );

      // Enviar notificações para solicitações com visitas programadas em breve
      for (const solicitacao of solicitacoesComAlerta) {
        if (solicitacao.dados_complementares?.proxima_visita_monitoramento) {
          const dataProximaVisita = new Date(
            solicitacao.dados_complementares.proxima_visita_monitoramento,
          );
          const hoje = new Date();
          const diasRestantes = Math.ceil(
            (dataProximaVisita.getTime() - hoje.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          this.notificacaoService.notificarMonitoramentoProximo(
            solicitacao,
            dataProximaVisita,
            diasRestantes,
          );
        }
      }

      this.logger.log('Verificação de monitoramento concluída com sucesso');
    } catch (error) {
      this.logger.error(
        'Erro ao verificar monitoramento obrigatório',
        error.stack,
      );
    }
  }
}
