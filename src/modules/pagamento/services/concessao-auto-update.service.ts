import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Pagamento } from '../../../entities/pagamento.entity';
import { Concessao } from '../../../entities/concessao.entity';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { NotificacaoService } from '../../notificacao/services/notificacao.service';
import { ConcessaoService } from '../../beneficio/services/concessao.service';

/**
 * Serviço responsável pela atualização automática do status da concessão
 * quando todas as parcelas são confirmadas
 */
@Injectable()
export class ConcessaoAutoUpdateService {
  private readonly logger = new Logger(ConcessaoAutoUpdateService.name);

  constructor(
    @InjectRepository(Pagamento)
    private readonly pagamentoRepository: Repository<Pagamento>,
    @InjectRepository(Concessao)
    private readonly concessaoRepository: Repository<Concessao>,
    @Inject(forwardRef(() => NotificacaoService))
    private readonly notificacaoService: NotificacaoService,
    @Inject(forwardRef(() => ConcessaoService))
    private readonly concessaoService: ConcessaoService,
  ) {}

  /**
   * Verifica se todas as parcelas de uma concessão foram confirmadas
   * e atualiza o status da concessão para CESSADO se necessário
   * 
   * @param pagamento Pagamento que foi confirmado
   */
  async verificarEAtualizarConcessao(pagamento: Pagamento): Promise<void> {
    if (!pagamento.concessao_id) {
      this.logger.warn(`Pagamento ${pagamento.id} não possui concessão associada`);
      return;
    }

    try {
      this.logger.log(
        `Verificando se concessão ${pagamento.concessao_id} deve ser cessada após confirmação do pagamento ${pagamento.id}`,
      );

      // Buscar todos os pagamentos da concessão
      const pagamentosConcessao = await this.pagamentoRepository.find({
        where: { concessao_id: pagamento.concessao_id },
        relations: ['concessao', 'concessao.solicitacao'],
        order: { numero_parcela: 'ASC' },
      });

      if (pagamentosConcessao.length === 0) {
        this.logger.warn(`Nenhum pagamento encontrado para concessão ${pagamento.concessao_id}`);
        return;
      }

      // Verificar se o pagamento atual é a última parcela
      const ultimaParcela = Math.max(...pagamentosConcessao.map(p => p.numero_parcela));
      const isUltimaParcela = pagamento.numero_parcela === ultimaParcela;

      this.logger.log(
        `Pagamento ${pagamento.id}: parcela ${pagamento.numero_parcela} de ${ultimaParcela}. É última parcela: ${isUltimaParcela}`,
      );

      // Se não é a última parcela, verificar se todas as parcelas estão confirmadas
      const parcelasConfirmadas = pagamentosConcessao.filter(
        (pag) => pag.status === StatusPagamentoEnum.CONFIRMADO,
      ).length;

      const totalParcelas = pagamentosConcessao.length;

      this.logger.log(
        `Concessão ${pagamento.concessao_id}: ${parcelasConfirmadas} de ${totalParcelas} parcelas confirmadas`,
      );

      // Se todas as parcelas estão confirmadas, cessar a concessão
      if (parcelasConfirmadas === totalParcelas) {
        await this.cessarConcessao(pagamento.concessao_id, totalParcelas, pagamentosConcessao[0]);
      } else {
        this.logger.log(
          `Concessão ${pagamento.concessao_id} ainda não pode ser cessada. Aguardando confirmação de ${totalParcelas - parcelasConfirmadas} parcelas restantes.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao verificar atualização da concessão ${pagamento.concessao_id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Cessa a concessão e envia notificações
   * 
   * @param concessaoId ID da concessão
   * @param totalParcelas Total de parcelas confirmadas
   * @param pagamentoReferencia Pagamento de referência para obter dados da concessão
   */
  private async cessarConcessao(
    concessaoId: string,
    totalParcelas: number,
    pagamentoReferencia: Pagamento,
  ): Promise<void> {
    try {
      const dataEncerramento = new Date();
      const motivoEncerramento = 'Concessão cessada devido à confirmação do recebimento de todas as parcelas';

      // Atualizar status da concessão
      await this.concessaoRepository.update(
        { id: concessaoId },
        {
          status: StatusConcessao.CESSADO,
          dataEncerramento: dataEncerramento,
          motivoEncerramento: motivoEncerramento,
        },
      );

      this.logger.log(
        `Concessão ${concessaoId} cessada automaticamente - todas as ${totalParcelas} parcelas confirmadas`,
      );

      // Enviar notificação se houver dados da solicitação
      if (pagamentoReferencia.concessao?.solicitacao?.tecnico_id) {
        await this.enviarNotificacaoConcessaoCessada(
          concessaoId,
          totalParcelas,
          pagamentoReferencia.concessao.solicitacao.tecnico_id,
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao cessar concessão ${concessaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Envia notificação sobre a cessação da concessão
   * 
   * @param concessaoId ID da concessão
   * @param totalParcelas Total de parcelas
   * @param tecnicoId ID do técnico responsável
   */
  private async enviarNotificacaoConcessaoCessada(
    concessaoId: string,
    totalParcelas: number,
    tecnicoId: string,
  ): Promise<void> {
    try {
      await this.notificacaoService.criarNotificacaoSistema({
        destinatario_id: tecnicoId,
        titulo: 'Concessão Cessada',
        conteudo: `Sua concessão foi cessada automaticamente devido à confirmação do recebimento de todas as ${totalParcelas} parcelas.`,
        link: `/concessoes/detalhes/${concessaoId}`,
        dados_contexto: {
          destinatario_id: tecnicoId,
          titulo: 'Concessão Cessada',
          conteudo: `Sua concessão foi cessada automaticamente devido à confirmação do recebimento de todas as ${totalParcelas} parcelas.`,
          link: `/concessoes/detalhes/${concessaoId}`,
          concessao_id: concessaoId,
          total_parcelas: totalParcelas,
          motivo_cessacao: 'Confirmação de todas as parcelas',
        },
      });

      this.logger.log(
        `Notificação de cessação enviada para técnico ${tecnicoId} sobre concessão ${concessaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação de cessação da concessão ${concessaoId}: ${error.message}`,
        error.stack,
      );
      // Não falha a operação principal se houver erro na notificação
    }
  }

  /**
   * Verifica se uma concessão pode ser cessada
   * 
   * @param concessaoId ID da concessão
   * @returns True se pode ser cessada, false caso contrário
   */
  async podeSerCessada(concessaoId: string): Promise<boolean> {
    try {
      const pagamentosConcessao = await this.pagamentoRepository.find({
        where: { concessao_id: concessaoId },
      });

      if (pagamentosConcessao.length === 0) {
        return false;
      }

      // Verificar se todas as parcelas estão confirmadas
      const todasConfirmadas = pagamentosConcessao.every(
        (pag) => pag.status === StatusPagamentoEnum.CONFIRMADO,
      );

      return todasConfirmadas;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar se concessão ${concessaoId} pode ser cessada: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Obtém estatísticas sobre o status das parcelas de uma concessão
   * 
   * @param concessaoId ID da concessão
   * @returns Estatísticas das parcelas
   */
  async obterEstatisticasParcelas(concessaoId: string): Promise<{
    total: number;
    confirmadas: number;
    pendentes: number;
    percentualConcluido: number;
  }> {
    try {
      const pagamentosConcessao = await this.pagamentoRepository.find({
        where: { concessao_id: concessaoId },
      });

      const total = pagamentosConcessao.length;
      const confirmadas = pagamentosConcessao.filter(
        (pag) => pag.status === StatusPagamentoEnum.CONFIRMADO,
      ).length;
      const pendentes = total - confirmadas;
      const percentualConcluido = total > 0 ? Math.round((confirmadas / total) * 100) : 0;

      return {
        total,
        confirmadas,
        pendentes,
        percentualConcluido,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao obter estatísticas das parcelas da concessão ${concessaoId}: ${error.message}`,
      );
      return {
        total: 0,
        confirmadas: 0,
        pendentes: 0,
        percentualConcluido: 0,
      };
    }
  }

  /**
   * Processa a atualização da concessão baseada no status do pagamento
   * 
   * @param pagamento Pagamento atualizado
   * @param novoStatus Novo status do pagamento
   * @param usuarioId ID do usuário que fez a atualização
   * @param pagamentoId ID do pagamento
   */
  async processarAtualizacaoConcessao(
    pagamento: Pagamento,
    novoStatus: StatusPagamentoEnum,
    usuarioId: string,
    pagamentoId: string,
  ): Promise<void> {
    try {
      // Se o número da parcela for 1 e status for CONFIRMADO, atualizar status da concessão para ATIVO
      if (pagamento.numero_parcela === 1 && pagamento.concessao_id && novoStatus === StatusPagamentoEnum.CONFIRMADO) {
        await this.concessaoService.atualizarStatus(
          pagamento.concessao_id,
          StatusConcessao.ATIVO,
          usuarioId,
          `Ativação automática - Primeira parcela do pagamento ${pagamentoId} atualizada para ${novoStatus}`,
        );

        this.logger.log(
          `Status da concessão ${pagamento.concessao_id} atualizado para ATIVO devido à atualização da primeira parcela`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Erro ao processar atualização da concessão ${pagamento.concessao_id}: ${error.message}`,
      );
      // Não falha a operação principal se houver erro na atualização da concessão
    }
  }

  /**
   * Verifica se a concessão deve ser finalizada após confirmação de pagamento
   * 
   * @param pagamento Pagamento confirmado
   * @param usuarioId ID do usuário
   * @param pagamentoId ID do pagamento
   */
  async verificarFinalizacaoConcessao(
    pagamento: Pagamento,
    usuarioId: string,
    pagamentoId: string,
  ): Promise<void> {
    try {
      // Buscar todas as parcelas da concessão
      const todasParcelas = await this.pagamentoRepository.find({
        where: { concessao_id: pagamento.concessao_id },
      });
      
      // Verificar se esta é a última parcela
      const ultimaParcela = Math.max(...todasParcelas.map(p => p.numero_parcela));
      
      if (pagamento.numero_parcela === ultimaParcela) {
        // Verificar se todas as outras parcelas já foram confirmadas
        const parcelasNaoConfirmadas = todasParcelas.filter(
          p => p.id !== pagamento.id && p.status !== StatusPagamentoEnum.CONFIRMADO
        );
        
        if (parcelasNaoConfirmadas.length === 0) {
           // Todas as parcelas foram confirmadas, cessar a concessão
           await this.concessaoService.atualizarStatus(
             pagamento.concessao_id,
             StatusConcessao.CESSADO,
             usuarioId,
             `Cessação automática - Última parcela do pagamento ${pagamentoId} confirmada`,
           );
           
           this.logger.log(
             `Status da concessão ${pagamento.concessao_id} atualizado para CESSADO devido à confirmação da última parcela`,
           );
        }
      }
    } catch (error) {
      this.logger.warn(
        `Erro ao verificar finalização da concessão ${pagamento.concessao_id}: ${error.message}`,
      );
      // Não falha a operação principal se houver erro na verificação da concessão
    }
  }
}