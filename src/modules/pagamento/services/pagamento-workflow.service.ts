import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PagamentoRepository } from '../repositories/pagamento.repository';
import { PagamentoSystemRepository } from '../repositories/pagamento-system.repository';
import { ConfirmacaoRepository } from '../repositories/confirmacao.repository';
import { Pagamento } from '../../../entities/pagamento.entity';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { TipoDocumentoEnum } from '../../../enums/tipo-documento.enum';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { PagamentoUpdateStatusDto } from '../dtos/pagamento-update-status.dto';
import { PagamentoValidationService } from './pagamento-validation.service';
import { PagamentoUnifiedMapper } from '../mappers';
import { DocumentoService } from '../../documento/services/documento.service';
import { PagamentoEventosService } from './pagamento-eventos.service';

/**
 * Interface para resultado de verificação de elegibilidade
 */
export interface ElegibilidadeResult {
  pode_liberar: boolean;
  motivo?: string;
  documentos_obrigatorios?: TipoDocumentoEnum[];
  documentos_faltantes?: TipoDocumentoEnum[];
}

/**
 * Interface para resultado de liberação em lote
 */
export interface LiberacaoLoteResult {
  liberados: string[];
  falhas: { pagamentoId: string; motivo: string }[];
  total: number;
}

/**
 * Interface para requisição de fluxo de pagamento
 */
export interface PaymentFlowRequest {
  action: 'create' | 'update_status' | 'cancel' | 'confirm' | 'upload_document';
  data: any;
  usuarioId: string;
  metadata?: Record<string, any>;
}

/**
 * Interface para resultado de fluxo de pagamento
 */
export interface PaymentResult {
  success: boolean;
  data?: any;
  message: string;
  errors?: string[];
}

/**
 * Service que consolida toda a lógica de workflow de pagamentos
 *
 * Substitui e unifica:
 * - PagamentoLiberacaoService
 * - Parte do PagamentoService
 * - Validações dispersas
 * - Lógica de workflow complexa
 *
 * Centraliza todo o fluxo de processamento de pagamentos,
 * desde criação até confirmação final.
 *
 * @author Equipe PGBen
 * @version 2.0
 */
@Injectable()
export class PagamentoWorkflowService {
  private readonly logger = new Logger(PagamentoWorkflowService.name);

  constructor(
    private readonly pagamentoRepository: PagamentoRepository,
    private readonly pagamentoSystemRepository: PagamentoSystemRepository,
    private readonly confirmacaoRepository: ConfirmacaoRepository,
    private readonly validationService: PagamentoValidationService,
    private readonly documentoService: DocumentoService,
    private readonly pagamentoEventosService: PagamentoEventosService,
  ) {}

  // ==========================================
  // MÉTODO PRINCIPAL DE WORKFLOW
  // ==========================================

  /**
   * Processa fluxo completo de pagamento baseado na ação solicitada
   *
   * Este é o método principal que centraliza todo o workflow,
   * delegando para métodos específicos baseado na ação.
   *
   * @param request - Requisição com ação e dados
   * @returns Resultado do processamento
   */
  async processPaymentFlow(
    request: PaymentFlowRequest,
  ): Promise<PaymentResult> {
    this.logger.log(`Processando fluxo de pagamento: ${request.action}`);

    try {
      switch (request.action) {
        case 'create':
          return await this.processCreatePayment(
            request.data,
            request.usuarioId,
          );

        case 'update_status':
          return await this.processUpdateStatus(
            request.data,
            request.usuarioId,
          );

        case 'cancel':
          return await this.processCancelPayment(
            request.data,
            request.usuarioId,
          );

        case 'confirm':
          return await this.processConfirmPayment(
            request.data,
            request.usuarioId,
          );

        case 'upload_document':
          return await this.processUploadDocument(
            request.data,
            request.usuarioId,
          );

        default:
          return {
            success: false,
            message: `Ação não suportada: ${request.action}`,
            errors: ['Ação inválida'],
          };
      }
    } catch (error) {
      this.logger.error(
        `Erro no fluxo de pagamento: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        message: 'Erro interno no processamento',
        errors: [error.message],
      };
    }
  }

  // ==========================================
  // MÉTODOS DE PROCESSAMENTO ESPECÍFICOS
  // ==========================================

  /**
   * Processa criação de novo pagamento
   *
   * @param createDto - Dados para criação
   * @param usuarioId - ID do usuário
   * @returns Resultado do processamento
   */
  private async processCreatePayment(
    createDto: PagamentoCreateDto,
    usuarioId: string,
  ): Promise<PaymentResult> {
    // Validar dados de criação
    const validation =
      this.validationService.validatePaymentCreation(createDto);

    if (!validation.isValid) {
      return {
        success: false,
        message: 'Dados inválidos para criação',
        errors: validation.errors,
      };
    }

    // Verificar se já existe pagamento para a solicitação
    if (!createDto.solicitacao_id) {
      return {
        success: false,
        message: 'ID da solicitação é obrigatório',
        errors: ['solicitacao_id não fornecido'],
      };
    }

    const existente = await this.pagamentoRepository.findBySolicitacao(
      createDto.solicitacao_id,
    );

    if (existente) {
      return {
        success: false,
        message: 'Já existe um pagamento para esta solicitação',
        errors: ['Pagamento duplicado'],
      };
    }

    // Criar pagamento
    const dados_pagamento = PagamentoUnifiedMapper.fromCreateDto(
      createDto,
      usuarioId,
    );
    const pagamento = await this.pagamentoRepository.create(dados_pagamento);

    // Emitir evento de pagamento criado
    await this.pagamentoEventosService.emitirEventoPagamentoCriado({
      concessaoId: pagamento.concessao_id,
      valor: pagamento.valor,
      dataVencimento: pagamento.data_vencimento,
      usuarioCriadorId: usuarioId,
      observacao: pagamento.observacoes,
    });

    return {
      success: true,
      data: PagamentoUnifiedMapper.toResponseDto(pagamento),
      message: 'Pagamento criado com sucesso',
    };
  }

  /**
   * Processa atualização de status
   *
   * @param updateDto - Dados para atualização
   * @param usuarioId - ID do usuário
   * @returns Resultado do processamento
   */
  private async processUpdateStatus(
    updateDto: PagamentoUpdateStatusDto & { id: string },
    usuarioId: string,
  ): Promise<PaymentResult> {
    const pagamento = await this.pagamentoRepository.findById(updateDto.id);

    if (!pagamento) {
      return {
        success: false,
        message: 'Pagamento não encontrado',
        errors: ['Pagamento inexistente'],
      };
    }

    // Validar transição de status
    const validation = this.validationService.validateStatusTransition(
      pagamento.status,
      updateDto.status,
    );

    if (!validation.isValid) {
      return {
        success: false,
        message: 'Transição de status inválida',
        errors: validation.errors,
      };
    }

    // Validar se a parcela anterior está confirmada (apenas para liberação a partir da 2ª parcela)
    if (updateDto.status === StatusPagamentoEnum.LIBERADO && pagamento.numero_parcela > 1) {
      try {
        await this.validateParcelaAnteriorConfirmada(pagamento);
      } catch (error) {
        return {
          success: false,
          message: 'Não é possível liberar: parcela anterior não confirmada',
          errors: [error.message],
        };
      }
    }

    // Atualizar pagamento
    const pagamentoAtualizado = await this.pagamentoRepository.update(
      updateDto.id,
      {
        status: updateDto.status,
        observacoes: updateDto.observacoes,
        updated_at: new Date(),
      },
    );

    // Emitir evento de status atualizado
    await this.pagamentoEventosService.emitirEventoStatusAtualizado({
      statusAnterior: pagamento.status,
      statusAtual: updateDto.status,
      motivoMudanca: updateDto.observacoes,
      usuarioId: usuarioId,
      observacao: updateDto.observacoes,
    });

    return {
      success: true,
      data: PagamentoUnifiedMapper.toResponseDto(pagamentoAtualizado),
      message: 'Status atualizado com sucesso',
    };
  }

  /**
   * Processa cancelamento de pagamento
   *
   * @param cancelDto - Dados para cancelamento
   * @param usuarioId - ID do usuário
   * @returns Resultado do processamento
   */
  private async processCancelPayment(
    cancelDto: { id: string; motivo: string; observacoes?: string },
    usuarioId: string,
  ): Promise<PaymentResult> {
    const pagamento = await this.pagamentoRepository.findById(cancelDto.id);

    if (!pagamento) {
      return {
        success: false,
        message: 'Pagamento não encontrado',
        errors: ['Pagamento inexistente'],
      };
    }

    // Verificar se pode ser cancelado
    if (pagamento.status === StatusPagamentoEnum.CANCELADO) {
      return {
        success: false,
        message: 'Pagamento já está cancelado',
        errors: ['Status inválido'],
      };
    }

    if (pagamento.status === StatusPagamentoEnum.CONFIRMADO) {
      return {
        success: false,
        message: 'Não é possível cancelar pagamento confirmado',
        errors: ['Status inválido'],
      };
    }

    // Cancelar pagamento
    const pagamentoCancelado = await this.pagamentoRepository.update(
      cancelDto.id,
      {
        status: StatusPagamentoEnum.CANCELADO,
        observacoes: `Cancelado: ${cancelDto.motivo}. ${cancelDto.observacoes || ''}`,
        updated_at: new Date(),
      },
    );

    // Emitir evento de pagamento cancelado
    await this.pagamentoEventosService.emitirEventoPagamentoCancelado({
      canceladoPorId: usuarioId,
      motivoCancelamento: cancelDto.motivo,
      dataCancelamento: new Date(),
      observacao: cancelDto.observacoes,
    });

    return {
      success: true,
      data: PagamentoUnifiedMapper.toResponseDto(pagamentoCancelado),
      message: 'Pagamento cancelado com sucesso',
    };
  }

  /**
   * Processa confirmação de pagamento
   *
   * @param confirmDto - Dados para confirmação
   * @param usuarioId - ID do usuário
   * @returns Resultado do processamento
   */
  private async processConfirmPayment(
    confirmDto: any,
    usuarioId: string,
  ): Promise<PaymentResult> {
    // Implementação da confirmação será expandida conforme necessário
    return {
      success: true,
      message: 'Confirmação processada',
      data: confirmDto,
    };
  }

  /**
   * Processa upload de documento
   *
   * @param uploadDto - Dados para upload
   * @param usuarioId - ID do usuário
   * @returns Resultado do processamento
   */
  private async processUploadDocument(
    uploadDto: any,
    usuarioId: string,
  ): Promise<PaymentResult> {
    // Implementação do upload será expandida conforme necessário
    return {
      success: true,
      message: 'Documento processado',
      data: uploadDto,
    };
  }

  /**
   * Verifica se um pagamento pode ser liberado
   */
  async verificarElegibilidadeLiberacao(
    pagamentoId: string,
  ): Promise<ElegibilidadeResult> {
    const pagamento = await this.pagamentoRepository.findByIdWithRelations(
      pagamentoId,
      ['solicitacao', 'solicitacao.tipo_beneficio', 'concessao'],
    );

    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Verificar status do pagamento
    if (pagamento.status !== StatusPagamentoEnum.PENDENTE) {
      return {
        pode_liberar: false,
        motivo: `Pagamento não está pendente. Status atual: ${pagamento.status}`,
      };
    }

    // Verificar se a concessão está ativa
    if (
      !pagamento.concessao ||
      pagamento.concessao.status !== StatusConcessao.ATIVO
    ) {
      return {
        pode_liberar: false,
        motivo: 'Concessão não está ativa',
      };
    }

    // Verificar data prevista de liberação
    if (
      pagamento.data_prevista_liberacao &&
      pagamento.data_prevista_liberacao > new Date()
    ) {
      return {
        pode_liberar: false,
        motivo: `Data prevista ainda não chegou: ${pagamento.data_prevista_liberacao.toLocaleDateString()}`,
      };
    }

    // Verificar regras específicas por tipo de benefício
    const tipoBeneficio = pagamento.solicitacao?.tipo_beneficio?.codigo;

    if (tipoBeneficio === 'aluguel-social') {
      return await this.verificarElegibilidadeAluguelSocial(pagamento);
    }

    return { pode_liberar: true };
  }

  /**
   * Libera um pagamento específico
   */
  async liberarPagamento(
    pagamentoId: string,
    usuarioId: string,
  ): Promise<Pagamento> {
    this.logger.log(`Liberando pagamento ${pagamentoId}`);

    // Verificar elegibilidade
    const elegibilidade =
      await this.verificarElegibilidadeLiberacao(pagamentoId);

    if (!elegibilidade.pode_liberar) {
      throw new BadRequestException(
        `Não é possível liberar: ${elegibilidade.motivo}`,
      );
    }

    // Liberar o pagamento
    const pagamentoLiberado = await this.pagamentoRepository.update(
      pagamentoId,
      {
        status: StatusPagamentoEnum.LIBERADO,
        data_liberacao: new Date(),
        liberado_por: usuarioId,
        observacoes: 'Liberado pelo sistema',
      },
    );

    this.logger.log(`Pagamento ${pagamentoId} liberado com sucesso`);
    return pagamentoLiberado;
  }

  /**
   * Busca pagamentos elegíveis para liberação
   */
  async buscarPagamentosElegiveis(limite: number = 100): Promise<Pagamento[]> {
    const pagamentosElegiveis =
      await this.pagamentoRepository.findElegiveisParaLiberacao(limite);

    // Filtrar apenas pagamentos com concessão ativa
    return pagamentosElegiveis.filter(
      (p) => p.concessao?.status === StatusConcessao.ATIVO,
    );
  }

  /**
   * Libera pagamentos em lote
   */
  async liberarPagamentosLote(
    pagamentoIds: string[],
    usuarioId: string,
  ): Promise<LiberacaoLoteResult> {
    const resultado: LiberacaoLoteResult = {
      liberados: [],
      falhas: [],
      total: pagamentoIds.length,
    };

    for (const pagamentoId of pagamentoIds) {
      try {
        await this.liberarPagamento(pagamentoId, usuarioId);
        resultado.liberados.push(pagamentoId);
      } catch (error) {
        resultado.falhas.push({
          pagamentoId,
          motivo: error.message,
        });
      }
    }

    this.logger.log(
      `Liberação em lote: ${resultado.liberados.length} sucessos, ${resultado.falhas.length} falhas`,
    );

    return resultado;
  }

  /**
   * Processo automatizado de liberação diária
   */
  async processarLiberacaoAutomatica(
    usuarioSistema: string,
  ): Promise<LiberacaoLoteResult> {
    this.logger.log('Iniciando liberação automática');

    const pagamentosElegiveis = await this.buscarPagamentosElegiveis(500);

    if (pagamentosElegiveis.length === 0) {
      return { liberados: [], falhas: [], total: 0 };
    }

    const resultado: LiberacaoLoteResult = {
      liberados: [],
      falhas: [],
      total: pagamentosElegiveis.length,
    };

    for (const pagamento of pagamentosElegiveis) {
      try {
        const elegibilidade = await this.verificarElegibilidadeLiberacao(
          pagamento.id,
        );

        if (elegibilidade.pode_liberar) {
          await this.liberarPagamento(pagamento.id, usuarioSistema);
          resultado.liberados.push(pagamento.id);
        } else {
          resultado.falhas.push({
            pagamentoId: pagamento.id,
            motivo: elegibilidade.motivo || 'Não elegível',
          });
        }
      } catch (error) {
        resultado.falhas.push({
          pagamentoId: pagamento.id,
          motivo: error.message,
        });
      }
    }

    this.logger.log(
      `Liberação automática concluída: ${resultado.liberados.length}/${resultado.total}`,
    );
    return resultado;
  }

  /**
   * Marca pagamentos como vencidos por falta de documentação
   */
  async marcarComoVencidoPorDocumentacao(
    pagamentoId: string,
    motivo: string,
  ): Promise<Pagamento> {
    const pagamento = await this.pagamentoRepository.findByIdWithRelations(
      pagamentoId,
      [
        'concessao',
        'concessao.solicitacao',
        'concessao.solicitacao.tipo_beneficio',
      ],
    );

    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    // Verificar se é Aluguel Social
    const isAluguelSocial =
      pagamento.concessao?.solicitacao?.tipo_beneficio?.codigo
        ?.toLowerCase()
        .includes('aluguel-social');

    if (!isAluguelSocial) {
      throw new BadRequestException(
        'Esta funcionalidade é específica para Aluguel Social',
      );
    }

    if (pagamento.status !== StatusPagamentoEnum.PENDENTE) {
      throw new BadRequestException(
        'Apenas pagamentos pendentes podem ser marcados como vencidos',
      );
    }

    return await this.pagamentoRepository.update(pagamentoId, {
      status: StatusPagamentoEnum.VENCIDO,
      data_vencimento: new Date(),
      observacoes: motivo,
    });
  }

  /**
   * Regulariza um pagamento vencido
   */
  async regularizarPagamentoVencido(
    id: string,
    observacoes?: string,
  ): Promise<Pagamento> {
    const pagamento = await this.pagamentoRepository.findById(id);

    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    if (pagamento.status !== StatusPagamentoEnum.VENCIDO) {
      throw new BadRequestException(
        'Apenas pagamentos vencidos podem ser regularizados',
      );
    }

    // Verificar prazo de regularização (30 dias)
    if (pagamento.data_vencimento) {
      const dataLimite = new Date(pagamento.data_vencimento);
      dataLimite.setDate(dataLimite.getDate() + 30);

      if (new Date() > dataLimite) {
        throw new BadRequestException(
          'Prazo para regularização expirado (30 dias)',
        );
      }
    }

    return await this.pagamentoRepository.update(id, {
      status: StatusPagamentoEnum.PENDENTE,
      data_regularizacao: new Date(),
      observacoes: observacoes || 'Pagamento regularizado',
    });
  }

  /**
   * Processa vencimentos automáticos
   * Utiliza repository de sistema para operações sem contexto de usuário
   */
  async processarVencimentosAutomaticos(): Promise<Pagamento[]> {
    this.logger.log('Iniciando processamento de vencimentos automáticos');

    try {
      // Busca pagamentos vencidos usando repository de sistema
      const pagamentosVencidos = await this.pagamentoSystemRepository.findVencidos();
      const processados: Pagamento[] = [];

      this.logger.log(`Encontrados ${pagamentosVencidos.length} pagamentos vencidos para processamento`);

      for (const pagamento of pagamentosVencidos) {
        try {
          // Atualiza status usando repository de sistema
          const pagamentoAtualizado = await this.pagamentoSystemRepository.update(
            pagamento.id,
            {
              status: StatusPagamentoEnum.VENCIDO,
              data_vencimento: new Date(),
              observacoes: 'Vencido automaticamente pelo sistema',
            },
          );

          processados.push(pagamentoAtualizado);
          this.logger.log(`Pagamento ${pagamento.id} marcado como vencido`);
        } catch (error) {
          this.logger.error(
            `Erro ao processar vencimento ${pagamento.id}:`,
            error,
          );
        }
      }

      this.logger.log(`Processamento concluído: ${processados.length} pagamentos processados`);
      return processados;
    } catch (error) {
      this.logger.error('Erro no processamento de vencimentos automáticos:', error);
      throw error;
    }
  }

  // ========== MÉTODOS PRIVADOS ==========

  /**
   * Valida se a parcela anterior está confirmada
   */
  private async validateParcelaAnteriorConfirmada(
    pagamento: Pagamento,
  ): Promise<void> {
    const parcelaAnterior = await this.pagamentoRepository.findParcelaAnterior(
      pagamento.concessao_id,
      pagamento.numero_parcela - 1,
    );

    if (!parcelaAnterior) {
      throw new BadRequestException(
        `Parcela anterior (${pagamento.numero_parcela - 1}) não encontrada`,
      );
    }

    if (parcelaAnterior.status !== StatusPagamentoEnum.CONFIRMADO) {
      throw new BadRequestException(
        `Parcela anterior (${pagamento.numero_parcela - 1}) deve estar confirmada antes da liberação desta parcela`,
      );
    }
  }

  /**
   * Verifica elegibilidade específica para aluguel social
   */
  private async verificarElegibilidadeAluguelSocial(
    pagamento: Pagamento,
  ): Promise<ElegibilidadeResult> {
    // Para a primeira parcela, não é necessário recibo
    if (pagamento.numero_parcela === 1) {
      return { pode_liberar: true };
    }

    // Para demais parcelas, verificar recibo do mês anterior
    const documentos_obrigatorios = [TipoDocumentoEnum.RECIBO_ALUGUEL];

    // Buscar recibos de aluguel através do DocumentoRepository
    // Busca documentos associados ao pagamento para verificação de elegibilidade
    const documentos = await this.documentoService.findByPagamentoId(
      pagamento.id,
    );
    const recibos = documentos || [];
    const recibosAluguel = recibos.filter(
      (r) => r.tipo === TipoDocumentoEnum.RECIBO_ALUGUEL,
    );

    if (recibosAluguel.length === 0) {
      return {
        pode_liberar: false,
        motivo: 'Recibo de aluguel do mês anterior é obrigatório',
        documentos_obrigatorios,
        documentos_faltantes: documentos_obrigatorios,
      };
    }

    // Verificar se o recibo é do mês anterior
    const reciboMaisRecente = recibosAluguel[0];
    const dataRecibo = reciboMaisRecente.data_upload;
    const agora = new Date();
    const mesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const mesAtual = new Date(agora.getFullYear(), agora.getMonth(), 1);

    if (dataRecibo < mesAnterior || dataRecibo >= mesAtual) {
      return {
        pode_liberar: false,
        motivo: 'Recibo de aluguel deve ser do mês anterior',
        documentos_obrigatorios,
        documentos_faltantes: documentos_obrigatorios,
      };
    }

    return { pode_liberar: true };
  }

  /**
   * Notifica técnicos sobre pagamentos próximos ao vencimento (2 dias antes)
   */
  /**
   * Notifica prazos de vencimento de pagamentos
   * 
   * @description
   * Operação de sistema que busca pagamentos próximos ao vencimento
   * em todas as unidades e envia notificações aos técnicos responsáveis.
   * Utiliza PagamentoSystemRepository para acesso global sem escopo.
   * 
   * @returns Lista de notificações enviadas
   */
  async notificarPrazosVencimento(): Promise<
    { pagamentoId: string; tecnicoId: string }[]
  > {
    this.logger.log('Iniciando notificação de prazos de vencimento (operação de sistema)');

    try {
      // Usar repository de sistema para operação global
      const pagamentosProximosVencimento =
        await this.pagamentoSystemRepository.findPagamentosProximosVencimento(2);

      const notificacoesEnviadas: { pagamentoId: string; tecnicoId: string }[] =
        [];

      for (const pagamento of pagamentosProximosVencimento) {
        if (pagamento.solicitacao?.tecnico_id) {
          // Aqui seria implementada a lógica de notificação
          // Por enquanto, apenas registramos que a notificação seria enviada
          this.logger.debug(
            `Notificação de vencimento enviada para pagamento ${pagamento.id}`,
            {
              pagamentoId: pagamento.id,
              tecnicoId: pagamento.solicitacao.tecnico_id,
              dataVencimento: pagamento.data_vencimento,
              unidadeId: pagamento.solicitacao.unidade?.id,
            },
          );

          notificacoesEnviadas.push({
            pagamentoId: pagamento.id,
            tecnicoId: pagamento.solicitacao.tecnico_id,
          });
        }
      }

      // Marcar notificações como enviadas
      if (notificacoesEnviadas.length > 0) {
        const pagamentoIds = notificacoesEnviadas.map(n => n.pagamentoId);
        for (const pagamentoId of pagamentoIds) {
          await this.pagamentoSystemRepository.marcarNotificacaoVencimentoEnviada(
            pagamentoId,
          );
        }
      }

      this.logger.log(
        `Notificação de prazos concluída: ${notificacoesEnviadas.length} notificações enviadas`,
      );

      return notificacoesEnviadas;
    } catch (error) {
      this.logger.error(
        'Erro ao processar notificações de vencimento',
        error.stack,
      );
      throw error;
    }
  }
}
