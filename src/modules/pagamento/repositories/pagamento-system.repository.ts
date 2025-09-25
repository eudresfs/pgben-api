import { Injectable, Inject } from '@nestjs/common';
import { Pagamento } from '../../../entities/pagamento.entity';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { ScopedRepository } from '../../../common/repositories/scoped-repository';
import { Brackets } from 'typeorm';

/**
 * Repository para operações de sistema relacionadas a Pagamentos
 * 
 * @description
 * Este repository é específico para operações automáticas do sistema,
 * como schedulers e jobs, que não possuem contexto de usuário logado.
 * Utiliza ScopedRepository configurado com allowGlobalScope=true.
 */
@Injectable()
export class PagamentoSystemRepository {
  constructor(
    @Inject('PAGAMENTO_SYSTEM_REPOSITORY')
    private readonly systemRepository: ScopedRepository<Pagamento>,
  ) {}

  /**
   * Busca pagamentos próximos ao vencimento para notificação
   * 
   * @description
   * Operação de sistema que busca pagamentos em todas as unidades
   * para processamento automático de notificações de vencimento.
   * 
   * @param diasAntecedencia Número de dias de antecedência para notificação
   * @returns Lista de pagamentos próximos ao vencimento
   */
  async findPagamentosProximosVencimento(
    diasAntecedencia: number = 5,
  ): Promise<Pagamento[]> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + diasAntecedencia);

    const queryBuilder = this.systemRepository
      .createQueryBuilder('pagamento')
      .leftJoinAndSelect('pagamento.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
      .leftJoinAndSelect('solicitacao.unidade', 'unidade')
      .where('pagamento.status IN (:...status)', {
        status: [
          StatusPagamentoEnum.PENDENTE,
          StatusPagamentoEnum.LIBERADO,
          StatusPagamentoEnum.AGENDADO,
        ],
      })
      .andWhere('pagamento.data_vencimento <= :dataLimite', {
        dataLimite,
      })
      .andWhere('pagamento.data_vencimento >= :hoje', {
        hoje: new Date(),
      })
      .andWhere(
          new Brackets((qb) => {
            qb.where('pagamento.observacoes NOT LIKE :notificacaoEnviada', {
              notificacaoEnviada: '%Notificação de vencimento enviada%',
            }).orWhere('pagamento.observacoes IS NULL');
          }),
        )
      .orderBy('pagamento.data_vencimento', 'ASC');

    return queryBuilder.getMany();
  }

  /**
   * Busca pagamentos vencidos para processamento automático
   * 
   * @description
   * Operação de sistema que busca pagamentos vencidos em todas as unidades
   * para processamento automático de cancelamento ou reprocessamento.
   * 
   * @param diasVencimento Número de dias após vencimento para considerar
   * @returns Lista de pagamentos vencidos
   */
  async findPagamentosVencidos(
    diasVencimento: number = 30,
  ): Promise<Pagamento[]> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasVencimento);

    const queryBuilder = this.systemRepository
      .createQueryBuilder('pagamento')
      .leftJoinAndSelect('pagamento.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
      .leftJoinAndSelect('solicitacao.unidade', 'unidade')
      .where('pagamento.status = :status', {
        status: StatusPagamentoEnum.VENCIDO,
      })
      .orderBy('pagamento.data_vencimento', 'ASC');

    return queryBuilder.getMany();
  }

  /**
   * Busca pagamentos vencidos (pendentes com data de vencimento passada)
   * 
   * @description
   * Operação de sistema que busca pagamentos pendentes com data de vencimento
   * já ultrapassada para marcação automática como vencidos.
   * 
   * @returns Lista de pagamentos que devem ser marcados como vencidos
   */
  async findVencidos(): Promise<Pagamento[]> {
    return this.systemRepository
      .createQueryBuilder('pagamento')
      .leftJoinAndSelect('pagamento.concessao', 'concessao')
      .where('pagamento.status = :status', {
        status: StatusPagamentoEnum.VENCIDO,
      })
      .orderBy('pagamento.data_vencimento', 'ASC')
      .getMany();
  }

   /**
    * Atualiza um pagamento (operação de sistema)
    * 
    * @description
    * Operação de sistema para atualizar pagamentos sem contexto de usuário.
    * Utiliza métodos globais do ScopedRepository.
    * 
    * @param id ID do pagamento
    * @param dadosAtualizacao Dados para atualização
    * @returns Pagamento atualizado
    */
   async update(
     id: string,
     dadosAtualizacao: Partial<Pagamento>,
   ): Promise<Pagamento> {
     const pagamento = await this.systemRepository.findByIdGlobal(id);
     if (!pagamento) {
       throw new Error('Pagamento não encontrado');
     }

     Object.assign(pagamento, dadosAtualizacao);
     return await this.systemRepository.save(pagamento);
   }

   /**
    * Marca notificação de vencimento como enviada
    * 
    * @description
    * Marca um pagamento como tendo recebido notificação de vencimento.
    * Operação de sistema sem escopo de usuário.
    * 
    * @param pagamentoId ID do pagamento
    */
  async marcarNotificacaoVencimentoEnviada(pagamentoId: string): Promise<void> {
    // Como a propriedade notificacao_vencimento_enviada não existe na entidade,
    // vamos adicionar uma observação indicando que a notificação foi enviada
    const pagamento = await this.systemRepository.findByIdGlobal(pagamentoId);
    if (pagamento) {
      const observacaoNotificacao = 'Notificação de vencimento enviada';
      const observacoesAtuais = pagamento.observacoes || '';
      
      if (!observacoesAtuais.includes(observacaoNotificacao)) {
        pagamento.observacoes = observacoesAtuais 
          ? `${observacoesAtuais}; ${observacaoNotificacao}` 
          : observacaoNotificacao;
        pagamento.updated_at = new Date();
        
        await this.systemRepository.save(pagamento);
      }
    }
  }

  /**
   * Atualiza status de pagamentos vencidos
   * 
   * @description
   * Cancela automaticamente pagamentos vencidos há muito tempo.
   * Operação de sistema sem escopo de usuário.
   * 
   * @param pagamentoIds IDs dos pagamentos a serem cancelados
   */
  async cancelarPagamentosVencidos(
    pagamentoIds: string[],
  ): Promise<void> {
    if (pagamentoIds.length === 0) {
      return;
    }

    await this.systemRepository
      .createQueryBuilder()
      .update(Pagamento)
      .set({
        status: StatusPagamentoEnum.VENCIDO,
        observacoes: 'Vencido automaticamente por vencimento',
        updated_at: new Date(),
      })
      .where('id IN (:...ids)', { ids: pagamentoIds })
      .andWhere('status IN (:...status)', {
        status: [
          StatusPagamentoEnum.PENDENTE,
          StatusPagamentoEnum.LIBERADO,
          StatusPagamentoEnum.AGENDADO,
        ],
      })
      .execute();
  }

  /**
   * Busca pagamentos agendados que devem ser liberados na data especificada
   * 
   * @description
   * Operação de sistema que busca pagamentos com status AGENDADO
   * cuja data_liberacao corresponde à data atual para processamento automático.
   * 
   * @param dataLiberacao Data para a qual buscar pagamentos agendados
   * @returns Lista de pagamentos agendados para liberação
   */
  async findAgendadosParaLiberacao(dataLiberacao: Date): Promise<Pagamento[]> {
    // Normalizar a data para comparação (apenas data, sem horário)
    const dataInicio = new Date(dataLiberacao.getFullYear(), dataLiberacao.getMonth(), dataLiberacao.getDate());
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + 1);

    const queryBuilder = this.systemRepository
      .createQueryBuilder('pagamento')
      .leftJoinAndSelect('pagamento.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.beneficiario', 'beneficiario')
      .leftJoinAndSelect('solicitacao.unidade', 'unidade')
      .leftJoinAndSelect('pagamento.concessao', 'concessao')
      .where('pagamento.status = :status', {
        status: StatusPagamentoEnum.AGENDADO,
      })
      .andWhere('pagamento.data_liberacao >= :dataInicio', {
        dataInicio,
      })
      .andWhere('pagamento.data_liberacao < :dataFim', {
        dataFim,
      })
      .orderBy('pagamento.numero_parcela', 'ASC')
      .addOrderBy('pagamento.created_at', 'ASC');

    return queryBuilder.getMany();
  }

  /**
   * Busca estatísticas globais de pagamentos para monitoramento
   * 
   * @description
   * Operação de sistema que coleta métricas globais para dashboards
   * administrativos e monitoramento do sistema.
   * 
   * @returns Estatísticas globais de pagamentos
   */
  async getEstatisticasGlobais(): Promise<{
    total: number;
    pendentes: number;
    liberados: number;
    cancelados: number;
    vencidos: number;
  }> {
    const hoje = new Date();

    const [total, pendentes, liberados, cancelados, vencidos] =
      await Promise.all([
        this.systemRepository.count(),
        this.systemRepository.count({
          where: { status: StatusPagamentoEnum.PENDENTE },
        }),
        this.systemRepository.count({
          where: { status: StatusPagamentoEnum.LIBERADO },
        }),
        this.systemRepository.count({
          where: { status: StatusPagamentoEnum.CANCELADO },
        }),  
        this.systemRepository.count({
          where: { status: StatusPagamentoEnum.VENCIDO },
        }),
      ]);

    return {
      total,
      pendentes,
      liberados,
      cancelados,
      vencidos,
    };
  }
}