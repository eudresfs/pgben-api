import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Solicitacao,
  StatusSolicitacao,
} from '../../../entities/solicitacao.entity';
import { EntityNotFoundException } from '../../../shared/exceptions';
import { ConfigService } from '@nestjs/config';

/**
 * Interface para configuração de prazos
 */
interface ConfiguracaoPrazos {
  analise: number; // em dias
  documentos: number; // em dias
  processamento: number; // em dias
  prioridadeJudicial: number; // fator multiplicador para redução de prazo (0-1)
}

/**
 * Serviço responsável pelo gerenciamento de prazos das solicitações
 *
 * Este serviço implementa funcionalidades para:
 * - Calcular e definir prazos com base no tipo de solicitação e status
 * - Atualizar prazos quando ocorrerem mudanças de status
 * - Identificar solicitações com prazos vencidos ou próximos do vencimento
 * - Aplicar regras especiais para solicitações com determinação judicial
 */
@Injectable()
export class PrazoSolicitacaoService {
  private readonly logger = new Logger(PrazoSolicitacaoService.name);
  private configuracaoPrazos: ConfiguracaoPrazos;

  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    private readonly configService: ConfigService,
  ) {
    // Carregar configuração de prazos padrão
    this.configuracaoPrazos = {
      analise: this.configService.get<number>('PRAZO_ANALISE_DIAS', 7),
      documentos: this.configService.get<number>('PRAZO_DOCUMENTOS_DIAS', 15),
      processamento: this.configService.get<number>(
        'PRAZO_PROCESSAMENTO_DIAS',
        5,
      ),
      prioridadeJudicial: this.configService.get<number>(
        'FATOR_PRIORIDADE_JUDICIAL',
        0.5,
      ),
    };
  }

  /**
   * Calcula e define o prazo de análise para uma solicitação
   * @param solicitacaoId ID da solicitação
   * @returns Data do prazo de análise
   */
  async definirPrazoAnalise(solicitacaoId: string): Promise<Date> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
    });

    if (!solicitacao) {
      throw new EntityNotFoundException('Solicitação', solicitacaoId);
    }

    // Calcular prazo com base na configuração
    let prazoEmDias = this.configuracaoPrazos.analise;

    // Aplicar prioridade se for determinação judicial
    if (solicitacao.determinacao_judicial_flag) {
      prazoEmDias = Math.ceil(
        prazoEmDias * this.configuracaoPrazos.prioridadeJudicial,
      );
      this.logger.log(
        `Prazo reduzido para determinação judicial: ${prazoEmDias} dias`,
      );
    }

    // Calcular data do prazo
    const dataPrazo = new Date();
    dataPrazo.setDate(dataPrazo.getDate() + prazoEmDias);

    // Atualizar a solicitação
    solicitacao.prazo_analise = dataPrazo;
    await this.solicitacaoRepository.save(solicitacao);

    return dataPrazo;
  }

  /**
   * Calcula e define o prazo para envio de documentos
   * @param solicitacaoId ID da solicitação
   * @returns Data do prazo para documentos
   */
  async definirPrazoDocumentos(solicitacaoId: string): Promise<Date> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
    });

    if (!solicitacao) {
      throw new EntityNotFoundException('Solicitação', solicitacaoId);
    }

    // Calcular prazo com base na configuração
    let prazoEmDias = this.configuracaoPrazos.documentos;

    // Aplicar prioridade se for determinação judicial
    if (solicitacao.determinacao_judicial_flag) {
      prazoEmDias = Math.ceil(
        prazoEmDias * this.configuracaoPrazos.prioridadeJudicial,
      );
      this.logger.log(
        `Prazo reduzido para determinação judicial: ${prazoEmDias} dias`,
      );
    }

    // Calcular data do prazo
    const dataPrazo = new Date();
    dataPrazo.setDate(dataPrazo.getDate() + prazoEmDias);

    // Atualizar a solicitação
    solicitacao.prazo_documentos = dataPrazo;
    await this.solicitacaoRepository.save(solicitacao);

    return dataPrazo;
  }

  /**
   * Calcula e define o prazo de processamento
   * @param solicitacaoId ID da solicitação
   * @returns Data do prazo de processamento
   */
  async definirPrazoProcessamento(solicitacaoId: string): Promise<Date> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
    });

    if (!solicitacao) {
      throw new EntityNotFoundException('Solicitação', solicitacaoId);
    }

    // Calcular prazo com base na configuração
    let prazoEmDias = this.configuracaoPrazos.processamento;

    // Aplicar prioridade se for determinação judicial
    if (solicitacao.determinacao_judicial_flag) {
      prazoEmDias = Math.ceil(
        prazoEmDias * this.configuracaoPrazos.prioridadeJudicial,
      );
      this.logger.log(
        `Prazo reduzido para determinação judicial: ${prazoEmDias} dias`,
      );
    }

    // Calcular data do prazo
    const dataPrazo = new Date();
    dataPrazo.setDate(dataPrazo.getDate() + prazoEmDias);

    // Atualizar a solicitação
    solicitacao.prazo_processamento = dataPrazo;
    await this.solicitacaoRepository.save(solicitacao);

    return dataPrazo;
  }

  /**
   * Atualiza os prazos da solicitação com base em sua transição de estado
   * @param solicitacaoId ID da solicitação
   * @param novoStatus Novo status da solicitação
   */
  async atualizarPrazosTransicao(
    solicitacaoId: string,
    novoStatus: StatusSolicitacao,
  ): Promise<void> {
    try {
      // Definir prazos com base no novo status
      switch (novoStatus) {
        case StatusSolicitacao.EM_ANALISE:
          await this.definirPrazoAnalise(solicitacaoId);
          break;

        case StatusSolicitacao.AGUARDANDO_DOCUMENTOS:
          await this.definirPrazoDocumentos(solicitacaoId);
          break;

        case StatusSolicitacao.EM_PROCESSAMENTO:
          await this.definirPrazoProcessamento(solicitacaoId);
          break;

        // Para outros estados, os prazos anteriores são mantidos ou podem ser limpos
        case StatusSolicitacao.APROVADA:
        case StatusSolicitacao.INDEFERIDA:
        case StatusSolicitacao.CANCELADA:
        case StatusSolicitacao.CONCLUIDA:
        case StatusSolicitacao.ARQUIVADA:
          // Limpar prazos ativos pois não são mais relevantes
          await this.limparPrazos(solicitacaoId);
          break;
      }
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar prazos: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Limpa os prazos ativos de uma solicitação
   * @param solicitacaoId ID da solicitação
   */
  private async limparPrazos(solicitacaoId: string): Promise<void> {
    try {
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
      });

      if (solicitacao) {
        solicitacao.prazo_analise = null;
        solicitacao.prazo_documentos = null;
        solicitacao.prazo_processamento = null;
        await this.solicitacaoRepository.save(solicitacao);
      }
    } catch (error) {
      this.logger.error(`Erro ao limpar prazos: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verifica se os prazos da solicitação estão vencidos
   * @param solicitacaoId ID da solicitação
   * @returns Objeto com informações de vencimento de prazos
   */
  async verificarPrazosVencidos(solicitacaoId: string): Promise<{
    analiseVencida: boolean;
    documentosVencidos: boolean;
    processamentoVencido: boolean;
    diasAtraso: number;
  }> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id: solicitacaoId },
    });

    if (!solicitacao) {
      throw new EntityNotFoundException('Solicitação', solicitacaoId);
    }

    const agora = new Date();
    const resultado = {
      analiseVencida: false,
      documentosVencidos: false,
      processamentoVencido: false,
      diasAtraso: 0,
    };

    // Verificar prazo de análise
    if (solicitacao.prazo_analise && agora > solicitacao.prazo_analise) {
      resultado.analiseVencida = true;
      resultado.diasAtraso = Math.floor(
        (agora.getTime() - solicitacao.prazo_analise.getTime()) /
          (1000 * 60 * 60 * 24),
      );
    }

    // Verificar prazo de documentos
    if (solicitacao.prazo_documentos && agora > solicitacao.prazo_documentos) {
      resultado.documentosVencidos = true;
      const diasAtrasoDoc = Math.floor(
        (agora.getTime() - solicitacao.prazo_documentos.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      resultado.diasAtraso = Math.max(resultado.diasAtraso, diasAtrasoDoc);
    }

    // Verificar prazo de processamento
    if (
      solicitacao.prazo_processamento &&
      agora > solicitacao.prazo_processamento
    ) {
      resultado.processamentoVencido = true;
      const diasAtrasoProc = Math.floor(
        (agora.getTime() - solicitacao.prazo_processamento.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      resultado.diasAtraso = Math.max(resultado.diasAtraso, diasAtrasoProc);
    }

    return resultado;
  }

  /**
   * Encontra solicitações com prazos vencidos
   * @param tiposPrazo Tipos de prazo a serem verificados
   * @returns Lista de solicitações com prazos vencidos
   */
  async listarSolicitacoesComPrazosVencidos(
    tiposPrazo: ('analise' | 'documentos' | 'processamento')[] = [
      'analise',
      'documentos',
      'processamento',
    ],
  ): Promise<Solicitacao[]> {
    const agora = new Date();
    const queryBuilder =
      this.solicitacaoRepository.createQueryBuilder('solicitacao');

    // Construir condições para a consulta
    const condicoesArray: string[] = [];

    if (tiposPrazo.includes('analise')) {
      condicoesArray.push(
        'solicitacao.prazo_analise IS NOT NULL AND solicitacao.prazo_analise < :agora',
      );
    }

    if (tiposPrazo.includes('documentos')) {
      condicoesArray.push(
        'solicitacao.prazo_documentos IS NOT NULL AND solicitacao.prazo_documentos < :agora',
      );
    }

    if (tiposPrazo.includes('processamento')) {
      condicoesArray.push(
        'solicitacao.prazo_processamento IS NOT NULL AND solicitacao.prazo_processamento < :agora',
      );
    }

    if (condicoesArray.length === 0) {
      return [];
    }

    // Combinar as condições com OR
    const whereCondition = `(${condicoesArray.join(' OR ')})`;

    // Aplicar a condição WHERE
    queryBuilder.where(whereCondition, { agora });

    // Priorizar determinações judiciais
    queryBuilder.orderBy('solicitacao.determinacao_judicial_flag', 'DESC');

    // Depois ordenar por data de prazo mais antiga
    const leastExpr =
      'LEAST(' +
      'COALESCE(solicitacao.prazo_analise, :dataFutura), ' +
      'COALESCE(solicitacao.prazo_documentos, :dataFutura), ' +
      'COALESCE(solicitacao.prazo_processamento, :dataFutura))';

    queryBuilder.addOrderBy(leastExpr, 'ASC');
    queryBuilder.setParameter('dataFutura', new Date('2099-12-31'));

    return queryBuilder.getMany();
  }
}
