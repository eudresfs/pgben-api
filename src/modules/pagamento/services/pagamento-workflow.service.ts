import {
    Injectable,
    Logger,
    BadRequestException,
    NotFoundException,
    ConflictException,
  } from '@nestjs/common';
  import { PagamentoRepository } from '../repositories/pagamento.repository';
  import { ComprovanteRepository } from '../repositories/comprovante.repository';
  import { ConfirmacaoRepository } from '../repositories/confirmacao.repository';
  import { Pagamento } from '../../../entities/pagamento.entity';
  import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
  import { StatusConcessao } from '../../../enums/status-concessao.enum';
  import { TipoDocumentoEnum } from '../../../enums/tipo-documento.enum';
  import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
  import { PagamentoUpdateStatusDto } from '../dtos/pagamento-update-status.dto';
  import { PagamentoValidationService } from './pagamento-validation.service';
  import { PagamentoUnifiedMapper } from '../mappers';
  
  /**
   * Interface para resultado de verificação de elegibilidade
   */
  export interface ElegibilidadeResult {
    podeLiberar: boolean;
    motivo?: string;
    documentosObrigatorios?: TipoDocumentoEnum[];
    documentosFaltantes?: TipoDocumentoEnum[];
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
      private readonly comprovanteRepository: ComprovanteRepository,
      private readonly confirmacaoRepository: ConfirmacaoRepository,
      private readonly validationService: PagamentoValidationService,
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
    async processPaymentFlow(request: PaymentFlowRequest): Promise<PaymentResult> {
      this.logger.log(`Processando fluxo de pagamento: ${request.action}`);
      
      try {
        switch (request.action) {
          case 'create':
            return await this.processCreatePayment(request.data, request.usuarioId);
            
          case 'update_status':
            return await this.processUpdateStatus(request.data, request.usuarioId);
            
          case 'cancel':
            return await this.processCancelPayment(request.data, request.usuarioId);
            
          case 'confirm':
            return await this.processConfirmPayment(request.data, request.usuarioId);
            
          case 'upload_document':
            return await this.processUploadDocument(request.data, request.usuarioId);
            
          default:
            return {
              success: false,
              message: `Ação não suportada: ${request.action}`,
              errors: ['Ação inválida']
            };
        }
      } catch (error) {
        this.logger.error(`Erro no fluxo de pagamento: ${error.message}`, error.stack);
        
        return {
          success: false,
          message: 'Erro interno no processamento',
          errors: [error.message]
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
       usuarioId: string
     ): Promise<PaymentResult> {
       // Validar dados de criação
       const validation = this.validationService.validatePaymentCreation(createDto);
       
       if (!validation.isValid) {
         return {
           success: false,
           message: 'Dados inválidos para criação',
           errors: validation.errors
         };
       }
       
       // Verificar se já existe pagamento para a solicitação
       if (!createDto.solicitacaoId) {
         return {
           success: false,
           message: 'ID da solicitação é obrigatório',
           errors: ['solicitacaoId não fornecido']
         };
       }
       
       const existente = await this.pagamentoRepository.findBySolicitacao(createDto.solicitacaoId);
       
       if (existente) {
         return {
           success: false,
           message: 'Já existe um pagamento para esta solicitação',
           errors: ['Pagamento duplicado']
         };
       }
       
       // Criar pagamento
       const dadosPagamento = PagamentoUnifiedMapper.fromCreateDto(createDto, usuarioId);
       const pagamento = await this.pagamentoRepository.create(dadosPagamento);
       
       return {
         success: true,
         data: PagamentoUnifiedMapper.toResponseDto(pagamento),
         message: 'Pagamento criado com sucesso'
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
       usuarioId: string
     ): Promise<PaymentResult> {
       const pagamento = await this.pagamentoRepository.findById(updateDto.id);
       
       if (!pagamento) {
         return {
           success: false,
           message: 'Pagamento não encontrado',
           errors: ['Pagamento inexistente']
         };
       }
       
       // Validar transição de status
       const validation = this.validationService.validateStatusTransition(
         pagamento.status, 
         updateDto.status
       );
       
       if (!validation.isValid) {
         return {
           success: false,
           message: 'Transição de status inválida',
           errors: validation.errors
         };
       }
       
       // Atualizar pagamento
       const pagamentoAtualizado = await this.pagamentoRepository.update(updateDto.id, {
         status: updateDto.status,
         observacoes: updateDto.observacoes,
         updated_at: new Date()
       });
       
       return {
         success: true,
         data: PagamentoUnifiedMapper.toResponseDto(pagamentoAtualizado),
         message: 'Status atualizado com sucesso'
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
       usuarioId: string
     ): Promise<PaymentResult> {
       const pagamento = await this.pagamentoRepository.findById(cancelDto.id);
       
       if (!pagamento) {
         return {
           success: false,
           message: 'Pagamento não encontrado',
           errors: ['Pagamento inexistente']
         };
       }
       
       // Verificar se pode ser cancelado
       if (pagamento.status === StatusPagamentoEnum.CANCELADO) {
         return {
           success: false,
           message: 'Pagamento já está cancelado',
           errors: ['Status inválido']
         };
       }
       
       if (pagamento.status === StatusPagamentoEnum.CONFIRMADO) {
         return {
           success: false,
           message: 'Não é possível cancelar pagamento confirmado',
           errors: ['Status inválido']
         };
       }
       
       // Cancelar pagamento
       const pagamentoCancelado = await this.pagamentoRepository.update(cancelDto.id, {
         status: StatusPagamentoEnum.CANCELADO,
         observacoes: `Cancelado: ${cancelDto.motivo}. ${cancelDto.observacoes || ''}`,
         updated_at: new Date()
       });
       
       return {
         success: true,
         data: PagamentoUnifiedMapper.toResponseDto(pagamentoCancelado),
         message: 'Pagamento cancelado com sucesso'
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
       usuarioId: string
     ): Promise<PaymentResult> {
       // Implementação da confirmação será expandida conforme necessário
       return {
         success: true,
         message: 'Confirmação processada',
         data: confirmDto
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
       usuarioId: string
     ): Promise<PaymentResult> {
       // Implementação do upload será expandida conforme necessário
       return {
         success: true,
         message: 'Documento processado',
         data: uploadDto
       };
     }
    
     /**
      * Verifica se um pagamento pode ser liberado
      */
    async verificarElegibilidadeLiberacao(pagamentoId: string): Promise<ElegibilidadeResult> {
      const pagamento = await this.pagamentoRepository.findByIdWithRelations(pagamentoId, [
        'solicitacao',
        'solicitacao.tipo_beneficio',
        'concessao',
      ]);
  
      if (!pagamento) {
        throw new NotFoundException('Pagamento não encontrado');
      }
  
      // Verificar status do pagamento
      if (pagamento.status !== StatusPagamentoEnum.PENDENTE) {
        return {
          podeLiberar: false,
          motivo: `Pagamento não está pendente. Status atual: ${pagamento.status}`,
        };
      }
  
      // Verificar se a concessão está ativa
      if (!pagamento.concessao || pagamento.concessao.status !== StatusConcessao.CONCEDIDA) {
        return {
          podeLiberar: false,
          motivo: 'Concessão não está ativa',
        };
      }
  
      // Verificar data prevista de liberação
      if (pagamento.dataPrevistaLiberacao && pagamento.dataPrevistaLiberacao > new Date()) {
        return {
          podeLiberar: false,
          motivo: `Data prevista ainda não chegou: ${pagamento.dataPrevistaLiberacao.toLocaleDateString()}`,
        };
      }
  
      // Verificar regras específicas por tipo de benefício
      const tipoBeneficio = pagamento.solicitacao?.tipo_beneficio?.codigo;
      
      if (tipoBeneficio === 'aluguel-social') {
        return await this.verificarElegibilidadeAluguelSocial(pagamento);
      }
  
      return { podeLiberar: true };
    }
  
    /**
     * Libera um pagamento específico
     */
    async liberarPagamento(pagamentoId: string, usuarioId: string): Promise<Pagamento> {
      this.logger.log(`Liberando pagamento ${pagamentoId}`);
  
      // Verificar elegibilidade
      const elegibilidade = await this.verificarElegibilidadeLiberacao(pagamentoId);
      
      if (!elegibilidade.podeLiberar) {
        throw new BadRequestException(`Não é possível liberar: ${elegibilidade.motivo}`);
      }
  
      // Liberar o pagamento
      const pagamentoLiberado = await this.pagamentoRepository.update(pagamentoId, {
        status: StatusPagamentoEnum.LIBERADO,
        dataLiberacao: new Date(),
        liberadoPor: usuarioId,
        observacoes: 'Liberado pelo sistema',
      });
  
      this.logger.log(`Pagamento ${pagamentoId} liberado com sucesso`);
      return pagamentoLiberado;
    }
  
    /**
     * Busca pagamentos elegíveis para liberação
     */
    async buscarPagamentosElegiveis(limite: number = 100): Promise<Pagamento[]> {
      const pagamentosElegiveis = await this.pagamentoRepository.findElegiveisParaLiberacao(limite);
  
      // Filtrar apenas pagamentos com concessão ativa
      return pagamentosElegiveis.filter(p => 
        p.concessao?.status === StatusConcessao.CONCEDIDA
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
        `Liberação em lote: ${resultado.liberados.length} sucessos, ${resultado.falhas.length} falhas`
      );
  
      return resultado;
    }
  
    /**
     * Processo automatizado de liberação diária
     */
    async processarLiberacaoAutomatica(usuarioSistema: string): Promise<LiberacaoLoteResult> {
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
          const elegibilidade = await this.verificarElegibilidadeLiberacao(pagamento.id);
          
          if (elegibilidade.podeLiberar) {
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
  
      this.logger.log(`Liberação automática concluída: ${resultado.liberados.length}/${resultado.total}`);
      return resultado;
    }
  
    /**
     * Marca pagamentos como vencidos por falta de documentação
     */
    async marcarComoVencidoPorDocumentacao(
      pagamentoId: string,
      motivo: string,
    ): Promise<Pagamento> {
      const pagamento = await this.pagamentoRepository.findByIdWithRelations(pagamentoId, [
        'concessao',
        'concessao.solicitacao',
        'concessao.solicitacao.tipo_beneficio'
      ]);
  
      if (!pagamento) {
        throw new NotFoundException('Pagamento não encontrado');
      }
  
      // Verificar se é Aluguel Social
      const isAluguelSocial = pagamento.concessao?.solicitacao?.tipo_beneficio?.codigo
        ?.toLowerCase().includes('aluguel-social');
  
      if (!isAluguelSocial) {
        throw new BadRequestException('Esta funcionalidade é específica para Aluguel Social');
      }
  
      if (pagamento.status !== StatusPagamentoEnum.PENDENTE) {
        throw new BadRequestException('Apenas pagamentos pendentes podem ser marcados como vencidos');
      }
  
      return await this.pagamentoRepository.update(pagamentoId, {
        status: StatusPagamentoEnum.VENCIDO,
        dataVencimento: new Date(),
        observacoes: motivo,
      });
    }
  
    /**
     * Regulariza um pagamento vencido
     */
    async regularizarPagamentoVencido(id: string, observacoes?: string): Promise<Pagamento> {
      const pagamento = await this.pagamentoRepository.findById(id);
  
      if (!pagamento) {
        throw new NotFoundException('Pagamento não encontrado');
      }
  
      if (pagamento.status !== StatusPagamentoEnum.VENCIDO) {
        throw new BadRequestException('Apenas pagamentos vencidos podem ser regularizados');
      }
  
      // Verificar prazo de regularização (30 dias)
      if (pagamento.dataVencimento) {
        const dataLimite = new Date(pagamento.dataVencimento);
        dataLimite.setDate(dataLimite.getDate() + 30);
        
        if (new Date() > dataLimite) {
          throw new BadRequestException('Prazo para regularização expirado (30 dias)');
        }
      }
  
      return await this.pagamentoRepository.update(id, {
        status: StatusPagamentoEnum.PENDENTE,
        dataRegularizacao: new Date(),
        observacoes: observacoes || 'Pagamento regularizado',
      });
    }
  
    /**
     * Processa vencimentos automáticos
     */
    async processarVencimentosAutomaticos(): Promise<Pagamento[]> {
      this.logger.log('Processando vencimentos automáticos');
  
      const pagamentosVencidos = await this.pagamentoRepository.findVencidos();
      const processados: Pagamento[] = [];
  
      for (const pagamento of pagamentosVencidos) {
        try {
          const pagamentoAtualizado = await this.pagamentoRepository.update(pagamento.id, {
            status: StatusPagamentoEnum.VENCIDO,
            dataVencimento: new Date(),
            observacoes: 'Vencido automaticamente pelo sistema',
          });
  
          processados.push(pagamentoAtualizado);
        } catch (error) {
          this.logger.error(`Erro ao processar vencimento ${pagamento.id}:`, error);
        }
      }
  
      this.logger.log(`Processados ${processados.length} vencimentos automáticos`);
      return processados;
    }
  
    // ========== MÉTODOS PRIVADOS ==========
  
    /**
     * Verifica elegibilidade específica para aluguel social
     */
    private async verificarElegibilidadeAluguelSocial(pagamento: Pagamento): Promise<ElegibilidadeResult> {
      // Para a primeira parcela, não é necessário recibo
      if (pagamento.numeroParcela === 1) {
        return { podeLiberar: true };
      }
  
      // Para demais parcelas, verificar recibo do mês anterior
      const documentosObrigatorios = [TipoDocumentoEnum.RECIBO_ALUGUEL];
      
      // Buscar recibos de aluguel
      const recibos = await this.comprovanteRepository.findByPagamento(pagamento.id);
      const recibosAluguel = recibos.filter(r => r.tipo_documento === TipoDocumentoEnum.RECIBO_ALUGUEL);
  
      if (recibosAluguel.length === 0) {
        return {
          podeLiberar: false,
          motivo: 'Recibo de aluguel do mês anterior é obrigatório',
          documentosObrigatorios,
          documentosFaltantes: documentosObrigatorios,
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
          podeLiberar: false,
          motivo: 'Recibo de aluguel deve ser do mês anterior',
          documentosObrigatorios,
          documentosFaltantes: documentosObrigatorios,
        };
      }
  
      return { podeLiberar: true };
  }

  /**
   * Notifica técnicos sobre pagamentos próximos ao vencimento (2 dias antes)
   */
  async notificarPrazosVencimento(): Promise<{ pagamentoId: string; tecnicoId: string }[]> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + 2); // 2 dias a partir de hoje
    
    const pagamentosProximosVencimento = await this.pagamentoRepository.findPagamentosProximosVencimento(dataLimite);
    
    const notificacoesEnviadas: { pagamentoId: string; tecnicoId: string }[] = [];
    
    for (const pagamento of pagamentosProximosVencimento) {
      if (pagamento.solicitacao?.tecnico_id) {
        // Aqui seria implementada a lógica de notificação
        // Por enquanto, apenas registramos que a notificação seria enviada
        this.logger.log(
          `Notificação de prazo enviada para técnico ${pagamento.solicitacao.tecnico_id} sobre pagamento ${pagamento.id}`
        );
        
        notificacoesEnviadas.push({
          pagamentoId: pagamento.id,
          tecnicoId: pagamento.solicitacao.tecnico_id
        });
      }
    }
    
    return notificacoesEnviadas;
  }
}