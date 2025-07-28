import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PagamentoRepository } from '../repositories/pagamento.repository';
import { Pagamento } from '../../../entities/pagamento.entity';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../../enums/metodo-pagamento.enum';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { PagamentoUpdateStatusDto } from '../dtos/pagamento-update-status.dto';
import { normalizeEnumFields } from '../../../shared/utils/enum-normalizer.util';
import { PagamentoValidationUtil } from '../utils/pagamento-validation.util';
import { PagamentoCalculatorService } from './pagamento-calculator.service';
import { 
  DadosPagamento, 
  ResultadoCalculoPagamento 
} from '../interfaces/pagamento-calculator.interface';
import { format } from 'date-fns';

/**
 * Service simplificado para gerenciamento de pagamentos
 * Foca apenas na lógica de negócio essencial, delegando operações de dados para o repository
 */
@Injectable()
export class PagamentoService {
  private readonly logger = new Logger(PagamentoService.name);

  constructor(
    private readonly pagamentoRepository: PagamentoRepository,
    private readonly pagamentoCalculatorService: PagamentoCalculatorService,
  ) {}

  /**
   * Cria um novo pagamento
   */
  async create(
    createDto: PagamentoCreateDto,
    usuarioId: string,
  ): Promise<Pagamento> {
    this.logger.log(`Criando pagamento`);

    // Validar valor
    PagamentoValidationUtil.validarValor(createDto.valor);

    // Preparar dados
    const dadosNormalizados = normalizeEnumFields({
      ...createDto,
      status: StatusPagamentoEnum.PENDENTE,
      criado_por: usuarioId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Criar pagamento
    const pagamento = await this.pagamentoRepository.create(dadosNormalizados);

    // Pagamento criado com sucesso
    return pagamento;
  }

  /**
   * Busca pagamento por ID
   */
  async findById(id: string): Promise<Pagamento> {
    const pagamento = await this.pagamentoRepository.findById(id);

    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    return pagamento;
  }

  /**
   * Busca um pagamento por ID com todas as relações necessárias para o processamento da fila.
   */
  async findPagamentoCompleto(id: string): Promise<Pagamento> {
    return this.pagamentoRepository.findPagamentoComRelacoes(id);
  }

  /**
   * Lista pagamentos com filtros
   */
  async findAll(filtros: {
    search?: string;
    status?: StatusPagamentoEnum;
    solicitacao_id?: string;
    concessao_id?: string;
    data_inicio?: string;
    data_fim?: string;
    page?: number;
    limit?: number;
  }) {

    const { items, total } =
      await this.pagamentoRepository.findWithFilters(filtros);

    const page = filtros.page || 1;
    const limit = filtros.limit || 10;

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Atualiza status do pagamento
   */
  async updateStatus(
    id: string,
    updateDto: PagamentoUpdateStatusDto,
    usuarioId: string,
  ): Promise<Pagamento> {
    this.logger.log(
      `Atualizando status do pagamento ${id} para ${updateDto.status}`,
    );

    // Buscar pagamento existente
    const pagamento = await this.findById(id);

    // Validar transição de status
    PagamentoValidationUtil.validarTransicaoStatus(
      pagamento.status,
      updateDto.status,
    );

    // Preparar dados de atualização
    const dadosAtualizacao: Partial<Pagamento> = {
      status: updateDto.status,
      observacoes: updateDto.observacoes,
      updated_at: new Date(),
    };

    // Atualizações específicas por status
    switch (updateDto.status) {
      case StatusPagamentoEnum.LIBERADO:
        dadosAtualizacao.data_liberacao = new Date();
        dadosAtualizacao.liberado_por = usuarioId;
        break;
      case StatusPagamentoEnum.PAGO:
        dadosAtualizacao.data_pagamento = new Date();
        break;
      case StatusPagamentoEnum.CONFIRMADO:
        dadosAtualizacao.data_conclusao = new Date();
        if (updateDto.comprovante_id) {
          dadosAtualizacao.comprovante_id = updateDto.comprovante_id;
        }
        break;
      case StatusPagamentoEnum.AGENDADO:
        if (updateDto.data_agendamento) {
          dadosAtualizacao.data_agendamento = new Date(
            updateDto.data_agendamento,
          );
        }
        break;
    }

    // Atualizar pagamento
    const pagamentoAtualizado = await this.pagamentoRepository.update(
      id,
      dadosAtualizacao,
    );

    this.logger.log(
      `Status do pagamento ${id} atualizado para ${updateDto.status}`,
    );
    return pagamentoAtualizado;
  }

  /**
   * Cancela um pagamento
   */
  async cancelar(
    id: string,
    motivo: string,
    usuarioId: string,
  ): Promise<Pagamento> {
    this.logger.log(`Cancelando pagamento ${id}`);

    const pagamento = await this.findById(id);

    // Verificar se pode ser cancelado
    if (pagamento.status === StatusPagamentoEnum.CANCELADO) {
      throw new ConflictException('Pagamento já está cancelado');
    }

    if (pagamento.status === StatusPagamentoEnum.CONFIRMADO) {
      throw new ConflictException(
        'Não é possível cancelar um pagamento confirmado',
      );
    }

    // Atualizar status
    const dadosAtualizacao = {
      status: StatusPagamentoEnum.CANCELADO,
      observacoes: `Cancelado: ${motivo}`,
      updated_at: new Date(),
    };

    const pagamentoCancelado = await this.pagamentoRepository.update(
      id,
      dadosAtualizacao,
    );

    // Pagamento cancelado com sucesso
    return pagamentoCancelado;
  }

  /**
   * Busca pagamentos por solicitação
   */
  async findBySolicitacao(solicitacao_id: string): Promise<Pagamento[]> {
    return await this.pagamentoRepository.findBySolicitacao(solicitacao_id);
  }

  /**
   * Busca pagamentos por concessão
   */
  async findByConcessao(concessao_id: string): Promise<Pagamento[]> {
    return await this.pagamentoRepository.findByConcessao(concessao_id);
  }

  /**
   * Obter estatísticas de pagamentos
   */
  async getEstatisticas() {
    return await this.pagamentoRepository.getEstatisticas();
  }



  /**
   * Gera pagamentos para uma concessão baseado no tipo de benefício
   * 
   * Este método agora segue os princípios SOLID:
   * - Single Responsibility: apenas orquestra a criação de pagamentos
   * - Open/Closed: extensível via estratégias de cálculo
   * - Dependency Inversion: depende de abstrações (PagamentoCalculatorService)
   */
  async gerarPagamentosParaConcessao(
    concessao: any,
    solicitacao: any,
    usuarioId: string,
  ): Promise<Pagamento[]> {
    this.logger.log(`Gerando pagamentos para concessão ${concessao.id}`);

    try {
      // 1. Validar e preparar dados de entrada
      const dadosPagamento = this.prepararDadosPagamento(concessao, solicitacao);
      
      // 2. Calcular dados do pagamento usando o serviço especializado
      const resultadoCalculo = await this.pagamentoCalculatorService.calcularPagamento(dadosPagamento);
      
      // 3. Gerar as entidades de pagamento
      const pagamentosGerados = await this.criarPagamentos(
        concessao,
        solicitacao,
        resultadoCalculo,
        usuarioId
      );

      this.logger.log(
        `${pagamentosGerados.length} pagamentos gerados para concessão ${concessao.id} - ` +
        `Total: R$ ${dadosPagamento.valor.toFixed(2)}`
      );

      return pagamentosGerados;
    } catch (error) {
      this.logger.error(
        `Erro ao gerar pagamentos para concessão ${concessao.id}:`,
        error.message
      );
      throw new BadRequestException(
        `Falha ao gerar pagamentos: ${error.message}`
      );
    }
  }

  /**
   * Prepara e valida os dados necessários para o cálculo do pagamento
   */
  private prepararDadosPagamento(concessao: any, solicitacao: any): DadosPagamento {
    // Validar data de início
    const dataInicio = concessao.data_inicio ? new Date(concessao.data_inicio) : new Date();
    if (isNaN(dataInicio.getTime())) {
      throw new Error(`Data de início da concessão inválida: ${concessao.data_inicio}`);
    }

    // Validar valor do benefício
    const valor = Number(solicitacao.tipo_beneficio?.valor) || 0;
    if (valor < 0) {
      throw new Error(`Valor do benefício inválido: ${solicitacao.tipo_beneficio?.valor}`);
    }

    // Validar tipo de benefício
    const tipoBeneficio = solicitacao.tipo_beneficio?.codigo;
    if (!tipoBeneficio) {
      throw new Error('Tipo de benefício não informado');
    }

    return {
      tipoBeneficio,
      valor,
      dataInicio,
      dadosEspecificos: solicitacao.dados_especificos
    };
  }

  /**
   * Cria as entidades de pagamento baseadas no resultado do cálculo
   */
  private async criarPagamentos(
    concessao: any,
    solicitacao: any,
    resultado: ResultadoCalculoPagamento,
    usuarioId: string
  ): Promise<Pagamento[]> {
    const pagamentosGerados: Pagamento[] = [];
    const { quantidadeParcelas, valorParcela, dataLiberacao, dataVencimento, intervaloParcelas } = resultado;

    this.logger.log(
      `Criando ${quantidadeParcelas} parcelas de R$ ${valorParcela.toFixed(2)} ` +
      `para ${solicitacao.tipo_beneficio?.nome}`
    );

    for (let i = 1; i <= quantidadeParcelas; i++) {
      const dadosPagamento = this.calcularDadosParcela(
        concessao,
        solicitacao,
        resultado,
        i
      );

      const user = usuarioId || solicitacao.liberador_id || solicitacao.tecnico_id;
      const pagamento = await this.create(dadosPagamento, user);
      pagamentosGerados.push(pagamento);
    }

    return pagamentosGerados;
  }

  /**
   * Calcula os dados específicos de uma parcela
   */
  private calcularDadosParcela(
    concessao: any,
    solicitacao: any,
    resultado: ResultadoCalculoPagamento,
    numeroParcela: number
  ): any {
    const { quantidadeParcelas, valorParcela, dataLiberacao, dataVencimento, intervaloParcelas } = resultado;
    
    // Calcular datas da parcela
    const dataLiberacaoParcela = this.calcularDataParcela(dataLiberacao, numeroParcela - 1, intervaloParcelas);
    const dataVencimentoParcela = this.calcularDataParcela(dataVencimento, numeroParcela - 1, intervaloParcelas);
    
    // Ajustar valor da última parcela para compensar arredondamentos
    let valorFinal = valorParcela;
    if (numeroParcela === quantidadeParcelas && quantidadeParcelas > 1) {
      const totalCalculado = valorParcela * (quantidadeParcelas - 1);
      // Usar o valor total correto baseado no cálculo das parcelas
      const valorTotalCalculado = valorParcela * quantidadeParcelas;
      valorFinal = Number((valorTotalCalculado - totalCalculado).toFixed(2));
      
      // Garantir que o valor final seja sempre positivo
      if (valorFinal <= 0) {
        this.logger.warn(
          `Valor da última parcela calculado como ${valorFinal}, usando valor da parcela padrão: ${valorParcela}`
        );
        valorFinal = valorParcela;
      }
    }

    return {
      concessao_id: concessao.id,
      solicitacao_id: solicitacao.id,
      valor: valorFinal,
      data_liberacao: dataLiberacaoParcela,
      data_vencimento: dataVencimentoParcela,
      metodo_pagamento: solicitacao.info_bancaria
        ? MetodoPagamentoEnum.PIX
        : MetodoPagamentoEnum.DEPOSITO,
      info_bancaria_id: solicitacao.info_bancaria?.id || undefined,
      numero_parcela: numeroParcela,
      total_parcelas: quantidadeParcelas,
      observacoes: this.gerarObservacoesParcela(
        numeroParcela,
        quantidadeParcelas,
        solicitacao.tipo_beneficio?.nome,
        dataLiberacaoParcela,
        dataVencimentoParcela
      ),
    };
  }

  /**
   * Calcula a data de uma parcela específica
   */
  private calcularDataParcela(dataBase: Date, indiceParcela: number, intervaloDias: number): Date {
    if (intervaloDias === 0 || indiceParcela === 0) {
      return new Date(dataBase);
    }
    
    const novaData = new Date(dataBase);
    novaData.setDate(novaData.getDate() + (indiceParcela * intervaloDias));
    return novaData;
  }

  /**
   * Gera observações padronizadas para uma parcela
   */
  private gerarObservacoesParcela(
    numeroParcela: number,
    totalParcelas: number,
    nomeBeneficio: string,
    dataLiberacao: Date,
    dataVencimento: Date
  ): string {
    return (
      `Pagamento ${numeroParcela}/${totalParcelas} - ${nomeBeneficio} - ` +
      `Liberação: ${format(dataLiberacao, 'dd/MM/yyyy')} - ` +
      `Vencimento: ${format(dataVencimento, 'dd/MM/yyyy')}`
    );
  }
}
