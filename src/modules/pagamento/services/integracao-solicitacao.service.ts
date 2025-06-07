import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IIntegracaoSolicitacaoService,
  IContextoUsuario,
  IResultadoOperacao,
  IValidacaoElegibilidade,
  IHistoricoPagamento,
  ICalculoValor,
} from '../interfaces';
import { Solicitacao } from '../../../entities';
import { TipoBeneficio } from '../../../enums/tipo-beneficio.enum';
import { TipoDocumentoEnum } from '../../../enums/tipo-documento.enum';
import { SolicitacaoService } from '../../solicitacao/services/solicitacao.service';
import { WorkflowSolicitacaoService } from '../../solicitacao/services/workflow-solicitacao.service';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { CreateLogAuditoriaDto } from '../../auditoria/dto/create-log-auditoria.dto';
import { StatusSolicitacao } from '@/enums';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';

/**
 * Serviço de integração com o módulo de solicitações
 * Responsável por comunicar com os serviços de solicitação para operações relacionadas a pagamentos
 * Implementa a interface IIntegracaoSolicitacaoService
 */
@Injectable()
export class IntegracaoSolicitacaoService implements IIntegracaoSolicitacaoService {
  private readonly logger = new Logger(IntegracaoSolicitacaoService.name);

  constructor(
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
    private readonly solicitacaoService: SolicitacaoService,
    @Inject(forwardRef(() => WorkflowSolicitacaoService))
    private workflowSolicitacaoService: WorkflowSolicitacaoService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Verifica se uma solicitação está aprovada e pronta para pagamento
   *
   * @param solicitacaoId ID da solicitação
   * @returns Dados da solicitação se estiver aprovada
   * @throws NotFoundException se a solicitação não existir
   * @throws ConflictException se a solicitação não estiver aprovada
   */
  async verificarSolicitacaoAprovada(solicitacaoId: string): Promise<any> {
    this.logger.log(
      `Verificando status da solicitação ${solicitacaoId}`,
    );

    const solicitacao = await this.solicitacaoService.findById(solicitacaoId);

    if (!solicitacao) {
      throw new NotFoundException('Solicitação não encontrada');
    }

    if (solicitacao.status !== StatusSolicitacao.APROVADA) {
      throw new ConflictException(
        `Somente solicitações aprovadas podem receber pagamento. Status atual: ${solicitacao.status}`
      );
    }

    return solicitacao;
  }

  /**
   * Atualiza o status da solicitação para PAGAMENTO_CRIADO
   */
  async atualizarStatusParaPagamentoCriado(
    solicitacaoId: string,
    dadosAdicionais?: any,
  ): Promise<void> {
    try {
      await this.workflowSolicitacaoService.atualizarStatus(
        solicitacaoId,
        StatusSolicitacao.EM_PROCESSAMENTO,
        'Pagamento criado no sistema',
        dadosAdicionais,
      );

      this.logger.log(
        `Status da solicitação ${solicitacaoId} atualizado para PAGAMENTO_CRIADO`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar status para PAGAMENTO_CRIADO - solicitação: ${solicitacaoId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Atualiza o status da solicitação para PAGAMENTO_LIBERADO
   */
  async atualizarStatusParaPagamentoLiberado(
    solicitacaoId: string,
    dadosAdicionais?: any,
  ): Promise<void> {
    try {
      await this.workflowSolicitacaoService.atualizarStatus(
        solicitacaoId,
        StatusSolicitacao.LIBERADA,
        'Pagamento liberado para confirmação',
        dadosAdicionais,
      );

      this.logger.log(
        `Status da solicitação ${solicitacaoId} atualizado para PAGAMENTO_LIBERADO`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar status para PAGAMENTO_LIBERADO - solicitação: ${solicitacaoId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Atualiza o status da solicitação para PAGAMENTO_CONFIRMADO
   */
  async atualizarStatusParaPagamentoConfirmado(
    solicitacaoId: string,
    dadosAdicionais?: any,
  ): Promise<void> {
    try {
      await this.workflowSolicitacaoService.atualizarStatus(
        solicitacaoId,
        StatusSolicitacao.CONCLUIDA,
        'Pagamento confirmado com sucesso',
        dadosAdicionais,
      );

      this.logger.log(
        `Status da solicitação ${solicitacaoId} atualizado para PAGAMENTO_CONFIRMADO`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar status para PAGAMENTO_CONFIRMADO - solicitação: ${solicitacaoId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Atualiza o status da solicitação para PAGAMENTO_CANCELADO
   */
  async atualizarStatusParaPagamentoCancelado(
    solicitacaoId: string,
    dadosAdicionais?: any,
  ): Promise<void> {
    try {
      await this.workflowSolicitacaoService.atualizarStatus(
        solicitacaoId,
        StatusSolicitacao.CANCELADA,
        'Pagamento cancelado',
        dadosAdicionais,
      );

      this.logger.log(
        `Status da solicitação ${solicitacaoId} atualizado para PAGAMENTO_CANCELADO`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar status para PAGAMENTO_CANCELADO - solicitação: ${solicitacaoId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Obtém os limites de benefício para uma solicitação
   */
  async obterLimitesBeneficio(solicitacaoId: string): Promise<any> {
    try {
      const solicitacao = await this.solicitacaoService.findById(solicitacaoId);
      
      if (!solicitacao) {
        throw new NotFoundException(
          `Solicitação com ID ${solicitacaoId} não encontrada`,
        );
      }

      const limites = {
        valorMaximo: solicitacao.tipo_beneficio?.criterios_elegibilidade.valor_maximo || 0,
        valorMinimo: solicitacao.tipo_beneficio?.criterios_elegibilidade.valor_minimo || 0,
        quantidadeMaximaParcelas: solicitacao.tipo_beneficio?.criterios_elegibilidade.quantidade_maxima_parcelas || 1,
        tipoBeneficio: solicitacao.tipo_beneficio?.nome,
        codigoBeneficio: solicitacao.tipo_beneficio?.codigo,
      };

      this.logger.log(
        `Limites obtidos para solicitação ${solicitacaoId}: ${JSON.stringify(limites)}`,
      );

      return limites;
    } catch (error) {
      this.logger.error(
        `Erro ao obter limites de benefício - solicitação: ${solicitacaoId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Verifica se já existe um pagamento para a solicitação
   */
  async verificarPagamentoExistente(solicitacaoId: string): Promise<boolean> {
    try {
      const solicitacao = await this.solicitacaoService.findById(solicitacaoId);
      
      if (!solicitacao) {
        throw new NotFoundException(
          `Solicitação com ID ${solicitacaoId} não encontrada`,
        );
      }

      const statusComPagamento = [
        StatusSolicitacao.EM_PROCESSAMENTO,
        StatusSolicitacao.LIBERADA,
        StatusSolicitacao.CONCLUIDA,
      ];

      const temPagamento = statusComPagamento.includes(solicitacao.status);

      this.logger.log(
        `Verificação de pagamento existente para solicitação ${solicitacaoId}: ${temPagamento} (status: ${solicitacao.status})`,
      );

      return temPagamento;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar pagamento existente - solicitação: ${solicitacaoId}`,
        error.stack,
      );
      throw error;
    }
  }

  // ========== IMPLEMENTAÇÃO DA INTERFACE IIntegracaoSolicitacaoService ==========

  /**
   * Busca uma solicitação por ID com controle de acesso
   * @param solicitacaoId ID da solicitação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da operação com dados da solicitação
   */
  async buscarSolicitacao(
    solicitacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<Solicitacao>> {
    try {
      this.logger.log(`Buscando solicitação ${solicitacaoId} para usuário ${contextoUsuario.id}`);

      // Buscar solicitação com relacionamentos necessários
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
        relations: [
          'cidadao',
          'cidadao.infoBancaria',
          'documentos',
          'historico',
          'unidade',
          'beneficio'
        ],
      });

      if (!solicitacao) {
        await this.registrarAuditoria(
          'BUSCA_SOLICITACAO_NAO_ENCONTRADA',
          { solicitacaoId },
          contextoUsuario
        );
        
        return {
          sucesso: false,
          erro: 'Solicitação não encontrada',
          codigo: 'SOLICITACAO_NAO_ENCONTRADA',
          timestamp: new Date(),
        };
      }

      // Verificar permissão de acesso
      if (!this.verificarPermissaoAcesso(solicitacao, contextoUsuario)) {
        await this.registrarAuditoria(
          'ACESSO_NEGADO_SOLICITACAO',
          { solicitacaoId, usuarioId: contextoUsuario.id },
          contextoUsuario
        );
        
        return {
          sucesso: false,
          erro: 'Acesso negado à solicitação',
          codigo: 'ACESSO_NEGADO',
          timestamp: new Date(),
        };
      }

      await this.registrarAuditoria(
        'BUSCA_SOLICITACAO_SUCESSO',
        { solicitacaoId },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: solicitacao,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar solicitação ${solicitacaoId}:`, error);
      
      await this.registrarAuditoria(
        'ERRO_BUSCA_SOLICITACAO',
        { solicitacaoId, erro: error.message },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro interno ao buscar solicitação',
        codigo: 'ERRO_INTERNO',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Valida elegibilidade de uma solicitação para pagamento
   * @param solicitacaoId ID da solicitação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da validação de elegibilidade
   */
  async validarElegibilidadePagamento(
    solicitacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IValidacaoElegibilidade>> {
    try {
      this.logger.log(`Validando elegibilidade da solicitação ${solicitacaoId}`);

      // Buscar solicitação
      const resultadoBusca = await this.buscarSolicitacao(solicitacaoId, contextoUsuario);
      if (!resultadoBusca.sucesso) {
        return resultadoBusca as unknown as IResultadoOperacao<IValidacaoElegibilidade>;
      }

      const solicitacao = resultadoBusca.dados!;
      
      // Executar validação de elegibilidade
      const validacao = await this.executarValidacaoElegibilidade(solicitacao);

      await this.registrarAuditoria(
        'VALIDACAO_ELEGIBILIDADE',
        { 
          solicitacaoId, 
          elegivel: validacao.elegivel,
          motivos: validacao.motivos 
        },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: validacao,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Erro ao validar elegibilidade da solicitação ${solicitacaoId}:`, error);
      
      await this.registrarAuditoria(
        'ERRO_VALIDACAO_ELEGIBILIDADE',
        { solicitacaoId, erro: error.message },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro ao validar elegibilidade',
        codigo: 'ERRO_VALIDACAO',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Atualiza status da solicitação após processamento do pagamento
   * @param solicitacaoId ID da solicitação
   * @param statusPagamento Status do pagamento
   * @param contextoUsuario Contexto do usuário logado
   * @returns Resultado da operação
   */
  async atualizarStatusAposPagamento(
    solicitacaoId: string,
    statusPagamento: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<void>> {
    try {
      this.logger.log(`Atualizando status da solicitação ${solicitacaoId} após pagamento: ${statusPagamento}`);

      // Buscar solicitação
      const resultadoBusca = await this.buscarSolicitacao(solicitacaoId, contextoUsuario);
      if (!resultadoBusca.sucesso) {
        return resultadoBusca as IResultadoOperacao<void>;
      }

      const solicitacao = resultadoBusca.dados!;
      
      // Determinar novo status baseado no status do pagamento
      let novoStatus: StatusSolicitacao;
      switch (statusPagamento) {
        case 'PROCESSADO':
        case 'PAGO':
          novoStatus = StatusSolicitacao.CONCLUIDA;
          break;
        case 'CANCELADO':
        case 'REJEITADO':
          novoStatus = StatusSolicitacao.CANCELADA;
          break;
        default:
          novoStatus = StatusSolicitacao.EM_PROCESSAMENTO;
      }

      // Atualizar status usando o serviço de workflow
      await this.workflowSolicitacaoService.atualizarStatus(
        solicitacaoId,
        novoStatus,
        contextoUsuario.id,
        { 
          observacao: `Status atualizado automaticamente após pagamento: ${statusPagamento}`,
          justificativa: `Pagamento processado com status: ${statusPagamento}`
        }
      );

      await this.registrarAuditoria(
        'ATUALIZACAO_STATUS_POS_PAGAMENTO',
        { 
          solicitacaoId, 
          statusAnterior: solicitacao.status,
          novoStatus,
          statusPagamento 
        },
        contextoUsuario
      );

      return {
        sucesso: true,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Erro ao atualizar status da solicitação ${solicitacaoId}:`, error);
      
      await this.registrarAuditoria(
        'ERRO_ATUALIZACAO_STATUS_POS_PAGAMENTO',
        { solicitacaoId, statusPagamento, erro: error.message },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro ao atualizar status da solicitação',
        codigo: 'ERRO_ATUALIZACAO_STATUS',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Busca histórico de pagamentos de uma solicitação
   * @param solicitacaoId ID da solicitação
   * @param contextoUsuario Contexto do usuário logado
   * @returns Histórico de pagamentos
   */
  async buscarHistoricoPagamentos(
    solicitacaoId: string,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<IHistoricoPagamento[]>> {
    try {
      this.logger.log(`Buscando histórico de pagamentos da solicitação ${solicitacaoId}`);

      // Buscar solicitação para verificar acesso
      const resultadoBusca = await this.buscarSolicitacao(solicitacaoId, contextoUsuario);
      if (!resultadoBusca.sucesso) {
        return resultadoBusca as unknown as IResultadoOperacao<IHistoricoPagamento[]>;
      }

      // Buscar histórico de pagamentos via repository
      const historico = await this.solicitacaoRepository
        .createQueryBuilder('solicitacao')
        .leftJoinAndSelect('solicitacao.pagamentos', 'pagamento')
        .leftJoinAndSelect('pagamento.historico', 'historicoPagamento')
        .where('solicitacao.id = :solicitacaoId', { solicitacaoId })
        .getOne();

      const historicoFormatado: IHistoricoPagamento[] = historico?.pagamentos?.map(pagamento => ({
        id: pagamento.id,
        valor: pagamento.valor,
        status: pagamento.status,
        dataCriacao: pagamento.created_at,
        dataProcessamento: pagamento.dataLiberacao,
        observacoes: pagamento.observacoes,
        responsavel: pagamento.liberadoPor,
      })) || [];

      await this.registrarAuditoria(
        'BUSCA_HISTORICO_PAGAMENTOS',
        { solicitacaoId, quantidadeRegistros: historicoFormatado.length },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: historicoFormatado,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar histórico de pagamentos da solicitação ${solicitacaoId}:`, error);
      
      await this.registrarAuditoria(
        'ERRO_BUSCA_HISTORICO_PAGAMENTOS',
        { solicitacaoId, erro: error.message },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro ao buscar histórico de pagamentos',
        codigo: 'ERRO_BUSCA_HISTORICO',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Calcula valor elegível para pagamento
   * @param solicitacaoId ID da solicitação
   * @param tipoBeneficio Tipo do benefício
   * @param contextoUsuario Contexto do usuário logado
   * @returns Cálculo do valor elegível
   */
  async calcularValorElegivel(
    solicitacaoId: string,
    tipoBeneficio: TipoBeneficio,
    contextoUsuario: IContextoUsuario
  ): Promise<IResultadoOperacao<ICalculoValor>> {
    try {
      this.logger.log(`Calculando valor elegível para solicitação ${solicitacaoId}`);

      // Buscar solicitação para verificar acesso
      const resultadoBusca = await this.buscarSolicitacao(solicitacaoId, contextoUsuario);
      if (!resultadoBusca.sucesso) {
        return resultadoBusca as unknown as IResultadoOperacao<ICalculoValor>;
      }

      const solicitacao = resultadoBusca.dados!;
      
      // Calcular valor base baseado no tipo de benefício
      const valorBase = this.calcularValorMaximo(tipoBeneficio);
      
      // Aplicar regras de negócio específicas
      const descontos: Array<{ tipo: string; valor: number; descricao: string }> = [];
      const acrescimos: Array<{ tipo: string; valor: number; descricao: string }> = [];
      
      // Verificar se já recebeu o benefício (para auxílio natalidade)
      if (tipoBeneficio === TipoBeneficio.AUXILIO_NATALIDADE) {
        // Lógica específica para auxílio natalidade
        // Verificar se já recebeu nos últimos 12 meses
      }
      
      // Calcular valor final
      const totalDescontos = descontos.reduce((sum, desc) => sum + desc.valor, 0);
      const totalAcrescimos = acrescimos.reduce((sum, acr) => sum + acr.valor, 0);
      const valorFinal = valorBase - totalDescontos + totalAcrescimos;

      const calculo: ICalculoValor = {
        valorBase,
        valorCalculado: valorBase,
        descontos,
        acrescimos,
        valorFinal: Math.max(0, valorFinal), // Não pode ser negativo
        fundamentoLegal: this.getFundamentoLegal(tipoBeneficio),
      };

      await this.registrarAuditoria(
        'CALCULO_VALOR_ELEGIVEL',
        { 
          solicitacaoId, 
          tipoBeneficio,
          valorBase,
          valorFinal: calculo.valorFinal 
        },
        contextoUsuario
      );

      return {
        sucesso: true,
        dados: calculo,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Erro ao calcular valor elegível para solicitação ${solicitacaoId}:`, error);
      
      await this.registrarAuditoria(
        'ERRO_CALCULO_VALOR_ELEGIVEL',
        { solicitacaoId, tipoBeneficio, erro: error.message },
        contextoUsuario
      );

      return {
        sucesso: false,
        erro: 'Erro ao calcular valor elegível',
        codigo: 'ERRO_CALCULO_VALOR',
        timestamp: new Date(),
        metadata: { error: error.message },
      };
    }
  }

  // ========== MÉTODOS AUXILIARES PRIVADOS ==========

  /**
   * Verifica se o usuário tem permissão para acessar a solicitação
   * @param solicitacao Solicitação a ser verificada
   * @param contextoUsuario Contexto do usuário logado
   * @returns True se tem permissão, false caso contrário
   */
  private verificarPermissaoAcesso(
    solicitacao: Solicitacao,
    contextoUsuario: IContextoUsuario
  ): boolean {
    // Admin tem acesso total
    if (contextoUsuario.isAdmin) {
      return true;
    }

    // Supervisor tem acesso a solicitações da sua unidade
    if (contextoUsuario.isSupervisor && 
        solicitacao.unidade_id === contextoUsuario.unidadeId) {
      return true;
    }

    // Usuário comum só acessa solicitações da sua unidade
    return solicitacao.unidade_id === contextoUsuario.unidadeId;
  }

  /**
   * Executa validação de elegibilidade da solicitação
   * @param solicitacao Solicitação a ser validada
   * @returns Resultado da validação
   */
  private async executarValidacaoElegibilidade(
    solicitacao: Solicitacao
  ): Promise<IValidacaoElegibilidade> {
    const motivos: string[] = [];
    const restricoes: any[] = [];
    let elegivel = true;

    // Validar status da solicitação
    if (solicitacao.status !== StatusSolicitacao.APROVADA) {
      elegivel = false;
      motivos.push('Solicitação não está aprovada');
      restricoes.push({
        tipo: 'ADMINISTRATIVA',
        descricao: 'Solicitação deve estar aprovada para receber pagamento',
        bloqueante: true,
      });
    }

    // Validar documentos obrigatórios
    const documentosObrigatorios = this.getDocumentosObrigatorios(solicitacao.tipo_beneficio.codigo as TipoBeneficio);
    const documentosPresentes = solicitacao.documentos?.map(d => d.tipo) || [];
    const documentosFaltantes = documentosObrigatorios.filter(
      doc => !documentosPresentes.includes(doc)
    );

    if (documentosFaltantes.length > 0) {
      elegivel = false;
      motivos.push(`Documentos obrigatórios faltantes: ${documentosFaltantes.join(', ')}`);
      restricoes.push({
        tipo: 'DOCUMENTAL',
        descricao: 'Documentos obrigatórios não foram anexados',
        bloqueante: true,
      });
    }

    // Validar prazo limite
    const prazoLimite = this.calcularPrazoLimite(solicitacao);
    if (prazoLimite && new Date() > prazoLimite) {
      elegivel = false;
      motivos.push('Prazo limite para pagamento expirado');
      restricoes.push({
        tipo: 'TEMPORAL',
        descricao: 'Prazo para processamento do pagamento expirou',
        bloqueante: true,
      });
    }

    // Validar dados bancários
    if (!solicitacao.info_bancaria || solicitacao.info_bancaria.length === 0) {
      elegivel = false;
      motivos.push('Dados bancários não informados');
      restricoes.push({
        tipo: 'BANCARIA',
        descricao: 'Dados bancários são obrigatórios para pagamento',
        bloqueante: true,
      });
    }

    return {
      elegivel,
      motivos,
      restricoes,
      valorMaximo: this.calcularValorMaximo(solicitacao.tipo_beneficio.codigo as TipoBeneficio),
      documentosObrigatorios,
      prazoLimite,
    };
  }


  /**
   * Calcula prazo limite para pagamento
   * @param solicitacao Solicitação
   * @returns Data limite ou undefined
   */
  private calcularPrazoLimite(solicitacao: Solicitacao): Date | undefined {
    // Regra: 90 dias após aprovação
    if (solicitacao.data_aprovacao) {
      const prazo = new Date(solicitacao.data_aprovacao);
      prazo.setDate(prazo.getDate() + 90);
      return prazo;
    }
    return undefined;
  }

  /**
   * Calcula valor máximo por tipo de benefício
   * @param tipoBeneficio Tipo do benefício
   * @returns Valor máximo
   */
  private calcularValorMaximo(tipoBeneficio: TipoBeneficio): number {
    // Valores máximos por tipo de benefício
    const valoresPorTipo: Record<TipoBeneficio, number> = {
      [TipoBeneficio.AUXILIO_NATALIDADE]: 500.00,
      [TipoBeneficio.ALUGUEL_SOCIAL]: 800.00,
      [TipoBeneficio.AUXILIO_FUNERAL]: 1000.00,
      [TipoBeneficio.CESTA_BASICA]: 150.00,
      [TipoBeneficio.PASSAGEM]: 50.00,
      [TipoBeneficio.OUTRO]: 300.00
    };

    return valoresPorTipo[tipoBeneficio] || 300.00;
  }

  /**
   * Obtém fundamento legal por tipo de benefício
   * @param tipoBeneficio Tipo do benefício
   * @returns Fundamento legal
   */
  private getFundamentoLegal(tipoBeneficio: TipoBeneficio): string {
    const fundamentosPorTipo: Record<TipoBeneficio, string> = {
      [TipoBeneficio.AUXILIO_NATALIDADE]: 'Lei Municipal 123/2023 - Art. 15',
      [TipoBeneficio.ALUGUEL_SOCIAL]: 'Lei Municipal 456/2023 - Art. 8',
      [TipoBeneficio.AUXILIO_FUNERAL]: 'Lei Municipal 789/2023 - Art. 12',
      [TipoBeneficio.CESTA_BASICA]: 'Lei Municipal 101/2023 - Art. 20',
      [TipoBeneficio.PASSAGEM]: 'Lei Municipal 202/2023 - Art. 5',
      [TipoBeneficio.OUTRO]: 'Lei Municipal 123/2023'
    };

    return fundamentosPorTipo[tipoBeneficio] || 'Lei Municipal 123/2023';
  }

  /**
   * Obtém a lista de documentos obrigatórios por tipo de benefício
   * @param tipoBeneficio Tipo do benefício
   * @returns Array com os tipos de documentos obrigatórios
   */
  private getDocumentosObrigatorios(tipoBeneficio: TipoBeneficio): TipoDocumentoEnum[] {
      const documentosPorTipo: Record<TipoBeneficio, TipoDocumentoEnum[]> = {
        [TipoBeneficio.AUXILIO_NATALIDADE]: [TipoDocumentoEnum.CERTIDAO_NASCIMENTO, TipoDocumentoEnum.COMPROVANTE_RESIDENCIA, TipoDocumentoEnum.RG],
        [TipoBeneficio.ALUGUEL_SOCIAL]: [TipoDocumentoEnum.CONTRATO_ALUGUEL, TipoDocumentoEnum.COMPROVANTE_RESIDENCIA, TipoDocumentoEnum.COMPROVANTE_RENDA],
        [TipoBeneficio.AUXILIO_FUNERAL]: [TipoDocumentoEnum.CERTIDAO_OBITO, TipoDocumentoEnum.COMPROVANTE_RESIDENCIA, TipoDocumentoEnum.RG],
        [TipoBeneficio.CESTA_BASICA]: [TipoDocumentoEnum.COMPROVANTE_RESIDENCIA, TipoDocumentoEnum.COMPROVANTE_RENDA],
        [TipoBeneficio.PASSAGEM]: [TipoDocumentoEnum.COMPROVANTE_VIAGEM, TipoDocumentoEnum.RG],
        [TipoBeneficio.OUTRO]: [TipoDocumentoEnum.RG, TipoDocumentoEnum.COMPROVANTE_RESIDENCIA]
      };
  
      return documentosPorTipo[tipoBeneficio] || [TipoDocumentoEnum.RG];
   }

   /**
     * Registra evento de auditoria
     * @param operacao Tipo da operação
   * @param dados Dados da operação
   * @param contextoUsuario Contexto do usuário
   */
  private async registrarAuditoria(
    operacao: string,
    dados: any,
    contextoUsuario: IContextoUsuario
  ): Promise<void> {
    try {
      const logDto = new CreateLogAuditoriaDto();
      logDto.usuario_id = contextoUsuario.id;
      logDto.tipo_operacao = operacao as TipoOperacao;
      logDto.entidade_afetada = 'Solicitacao';
      logDto.entidade_id = dados.solicitacaoId || null;
      logDto.dados_anteriores = undefined;
      logDto.dados_novos = dados;
      logDto.ip_origem = 'N/A';
      logDto.user_agent = 'Sistema';
      
      await this.auditoriaService.create(logDto);
    } catch (error) {
      this.logger.error('Erro ao registrar auditoria:', error);
      // Não propagar erro de auditoria
    }
  }
}
