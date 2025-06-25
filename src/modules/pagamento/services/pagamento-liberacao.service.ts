import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Pagamento } from '../../../entities/pagamento.entity';
import { Documento } from '../../../entities/documento.entity';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { TipoDocumentoEnum } from '../../../enums/tipo-documento.enum';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { TipoBeneficio } from '../../../enums/tipo-beneficio.enum';
import { PagamentoService } from './pagamento.service';
import { DocumentoService } from '../../documento/services/documento.service';

/**
 * Interface para resultado da verificação de elegibilidade
 */
export interface ElegibilidadeLiberacao {
  podeLiberar: boolean;
  motivo?: string;
  documentosObrigatorios?: TipoDocumentoEnum[];
  documentosFaltantes?: TipoDocumentoEnum[];
}

/**
 * Interface para resultado da liberação em lote
 */
export interface ResultadoLiberacaoLote {
  liberados: string[];
  falhas: {
    pagamentoId: string;
    motivo: string;
  }[];
  total: number;
}

/**
 * Serviço responsável pela liberação de pagamentos com regras específicas
 * 
 * Este serviço implementa a nova lógica de liberação de pagamentos baseada em:
 * - Data prevista de liberação
 * - Documentos obrigatórios (especialmente para aluguel social)
 * - Status da concessão
 * - Regras específicas por tipo de benefício
 */
@Injectable()
export class PagamentoLiberacaoService {
  private readonly logger = new Logger(PagamentoLiberacaoService.name);

  constructor(
    @InjectRepository(Pagamento)
    private readonly pagamentoRepository: Repository<Pagamento>,
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
    private readonly pagamentoService: PagamentoService,
    private readonly documentoService: DocumentoService,
  ) {}

  /**
   * Verifica se um pagamento pode ser liberado
   * 
   * @param pagamentoId ID do pagamento
   * @returns Resultado da verificação de elegibilidade
   */
  async verificarElegibilidadeLiberacao(pagamentoId: string): Promise<ElegibilidadeLiberacao> {
    const pagamento = await this.pagamentoRepository.findOne({
      where: { id: pagamentoId },
      relations: [
        'solicitacao',
        'solicitacao.tipo_beneficio',
        'solicitacao.beneficiario',        
        'concessao',
      ],
    });

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
    const agora = new Date();
    if (pagamento.dataPrevistaLiberacao && pagamento.dataPrevistaLiberacao > agora) {
      return {
        podeLiberar: false,
        motivo: `Data prevista de liberação ainda não chegou: ${pagamento.dataPrevistaLiberacao.toLocaleDateString()}`,
      };
    }

    // Verificar regras específicas por tipo de benefício
    const tipoBeneficio = pagamento.solicitacao?.tipo_beneficio?.codigo;
    
    if (tipoBeneficio === 'aluguel-social') {
      return await this.verificarElegibilidadeAluguelSocial(pagamento);
    }

    // Para outros benefícios, apenas verificar data
    return {
      podeLiberar: true,
    };
  }

  /**
   * Verifica elegibilidade específica para aluguel social
   * 
   * @param pagamento Pagamento de aluguel social
   * @returns Resultado da verificação
   */
  private async verificarElegibilidadeAluguelSocial(pagamento: Pagamento): Promise<ElegibilidadeLiberacao> {
    // Para a primeira parcela, não é necessário recibo
    if (pagamento.numeroParcela === 1) {
      return {
        podeLiberar: true,
      };
    }

    // Para demais parcelas, verificar se existe recibo do mês anterior
    const documentosObrigatorios = [TipoDocumentoEnum.RECIBO_ALUGUEL];
    
    // Buscar documentos de recibo de aluguel da solicitação
    const recibosAluguel = await this.documentoRepository.find({
      where: {
        solicitacao_id: pagamento.solicitacaoId || undefined,
        tipo: TipoDocumentoEnum.RECIBO_ALUGUEL,
      },
      order: {
        created_at: 'DESC',
      },
    });

    if (recibosAluguel.length === 0) {
      return {
        podeLiberar: false,
        motivo: 'Recibo de aluguel do mês anterior é obrigatório para liberação da parcela',
        documentosObrigatorios,
        documentosFaltantes: documentosObrigatorios,
      };
    }

    // Verificar se o recibo mais recente é do mês anterior
    const reciboMaisRecente = recibosAluguel[0];
    const dataRecibo = reciboMaisRecente.created_at;
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

    return {
      podeLiberar: true,
    };
  }

  /**
   * Libera um pagamento específico
   * 
   * @param pagamentoId ID do pagamento
   * @param usuarioId ID do usuário que está liberando
   * @returns Pagamento liberado
   */
  async liberarPagamento(pagamentoId: string, usuarioId: string): Promise<Pagamento> {
    // Verificar elegibilidade
    const elegibilidade = await this.verificarElegibilidadeLiberacao(pagamentoId);
    
    if (!elegibilidade.podeLiberar) {
      throw new BadRequestException(`Não é possível liberar o pagamento: ${elegibilidade.motivo}`);
    }

    // Liberar o pagamento usando o serviço existente
    const pagamentoLiberado = await this.pagamentoService.updateStatus(
      pagamentoId,
      {
        status: StatusPagamentoEnum.LIBERADO,
        observacoes: 'Liberado automaticamente pelo sistema',
      },
      usuarioId,
    );

    this.logger.log(`Pagamento ${pagamentoId} liberado com sucesso pelo usuário ${usuarioId}`);
    
    return pagamentoLiberado;
  }

  /**
   * Busca pagamentos elegíveis para liberação
   * 
   * @param limite Limite de pagamentos a retornar
   * @returns Lista de pagamentos elegíveis
   */
  async buscarPagamentosElegiveis(limite: number = 100): Promise<Pagamento[]> {
    const agora = new Date();
    
    const pagamentos = await this.pagamentoRepository.find({
      where: {
        status: StatusPagamentoEnum.PENDENTE,
        dataPrevistaLiberacao: In([null, agora]), // null ou data <= agora
      },
      relations: [
        'solicitacao',
        'solicitacao.beneficiario',  
        'solicitacao.tipo_beneficio',
        'concessao',
      ],
      order: {
        dataPrevistaLiberacao: 'ASC',
        created_at: 'ASC',
      },
      take: limite,
    });

    // Filtrar apenas pagamentos com concessão ativa
    return pagamentos.filter(p => p.concessao?.status === StatusConcessao.CONCEDIDA);
  }

  /**
   * Libera pagamentos em lote
   * 
   * @param pagamentoIds Lista de IDs dos pagamentos
   * @param usuarioId ID do usuário que está liberando
   * @returns Resultado da liberação em lote
   */
  async liberarPagamentosLote(
    pagamentoIds: string[],
    usuarioId: string,
  ): Promise<ResultadoLiberacaoLote> {
    const resultado: ResultadoLiberacaoLote = {
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
        this.logger.warn(`Falha ao liberar pagamento ${pagamentoId}: ${error.message}`);
      }
    }

    this.logger.log(
      `Liberação em lote concluída: ${resultado.liberados.length} sucessos, ${resultado.falhas.length} falhas`,
    );

    return resultado;
  }

  /**
   * Processo automatizado de liberação diária
   * 
   * @param usuarioSistema ID do usuário do sistema para auditoria
   * @returns Resultado da liberação automatizada
   */
  async processarLiberacaoAutomatica(usuarioSistema: string): Promise<ResultadoLiberacaoLote> {
    this.logger.log('Iniciando processo de liberação automática de pagamentos');
    
    try {
      // Buscar pagamentos elegíveis
      const pagamentosElegiveis = await this.buscarPagamentosElegiveis(500);
      
      if (pagamentosElegiveis.length === 0) {
        this.logger.log('Nenhum pagamento elegível para liberação automática');
        return {
          liberados: [],
          falhas: [],
          total: 0,
        };
      }

      this.logger.log(`Encontrados ${pagamentosElegiveis.length} pagamentos elegíveis`);
      
      // Processar cada pagamento
      const resultado: ResultadoLiberacaoLote = {
        liberados: [],
        falhas: [],
        total: pagamentosElegiveis.length,
      };

      for (const pagamento of pagamentosElegiveis) {
        try {
          // Verificar elegibilidade detalhada
          const elegibilidade = await this.verificarElegibilidadeLiberacao(pagamento.id);
          
          if (elegibilidade.podeLiberar) {
            await this.liberarPagamento(pagamento.id, usuarioSistema);
            resultado.liberados.push(pagamento.id);
          } else {
            resultado.falhas.push({
              pagamentoId: pagamento.id,
              motivo: elegibilidade.motivo || 'Não elegível para liberação',
            });
          }
        } catch (error) {
          resultado.falhas.push({
            pagamentoId: pagamento.id,
            motivo: error.message,
          });
          this.logger.error(`Erro ao processar pagamento ${pagamento.id}:`, error);
        }
      }

      this.logger.log(
        `Liberação automática concluída: ${resultado.liberados.length} liberados, ${resultado.falhas.length} falhas`,
      );
      
      return resultado;
    } catch (error) {
      this.logger.error('Erro no processo de liberação automática:', error);
      throw error;
    }
  }

  /**
   * Busca documentos obrigatórios para um tipo de benefício
   * 
   * @param tipoBeneficio Código do tipo de benefício
   * @param numeroParcela Número da parcela (para regras específicas)
   * @returns Lista de tipos de documento obrigatórios
   */
  async buscarDocumentosObrigatorios(
    tipoBeneficio: string,
    numeroParcela: number = 1,
  ): Promise<TipoDocumentoEnum[]> {
    if (tipoBeneficio === 'aluguel-social' && numeroParcela > 1) {
      return [TipoDocumentoEnum.RECIBO_ALUGUEL];
    }
    
    return [];
  }
}