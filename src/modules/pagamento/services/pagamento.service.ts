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

/**
 * Service simplificado para gerenciamento de pagamentos
 * Foca apenas na lógica de negócio essencial, delegando operações de dados para o repository
 */
@Injectable()
export class PagamentoService {
  private readonly logger = new Logger(PagamentoService.name);

  constructor(private readonly pagamentoRepository: PagamentoRepository) {}

  /**
   * Cria um novo pagamento
   */
  async create(
    createDto: PagamentoCreateDto,
    usuarioId: string,
  ): Promise<Pagamento> {
    this.logger.log(`Criando pagamento`);

    // Verificar se já existe pagamento para a solicitação
    // const pagamentoExistente = await this.pagamentoRepository.existsBySolicitacao(
    //   createDto.solicitacaoId
    // );

    // if (pagamentoExistente) {
    //   throw new ConflictException('Já existe um pagamento para esta solicitação');
    // }

    // Validar valor
    PagamentoValidationUtil.validarValor(createDto.valor);

    // Preparar dados
    const dadosNormalizados = normalizeEnumFields({
      ...createDto,
      status: StatusPagamentoEnum.PENDENTE,
      criadoPor: usuarioId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Criar pagamento
    const pagamento = await this.pagamentoRepository.create(dadosNormalizados);

    this.logger.log(`Pagamento ${pagamento.id} criado com sucesso`);
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
   * Lista pagamentos com filtros
   */
  async findAll(filtros: {
    status?: StatusPagamentoEnum;
    solicitacaoId?: string;
    concessaoId?: string;
    dataInicio?: string;
    dataFim?: string;
    page?: number;
    limit?: number;
  }) {
    // Converter strings de data para Date objects
    const filtrosProcessados = {
      ...filtros,
      dataInicio: filtros.dataInicio ? new Date(filtros.dataInicio) : undefined,
      dataFim: filtros.dataFim ? new Date(filtros.dataFim) : undefined,
    };

    const { items, total } =
      await this.pagamentoRepository.findWithFilters(filtrosProcessados);

    const page = filtros.page || 1;
    const limit = filtros.limit || 10;

    return {
      data: items,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
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
        dadosAtualizacao.dataLiberacao = new Date();
        dadosAtualizacao.liberadoPor = usuarioId;
        break;
      case StatusPagamentoEnum.PAGO:
        dadosAtualizacao.dataPagamento = new Date();
        break;
      case StatusPagamentoEnum.CONFIRMADO:
        dadosAtualizacao.dataConclusao = new Date();
        if (updateDto.comprovanteId) {
          dadosAtualizacao.comprovanteId = updateDto.comprovanteId;
        }
        break;
      case StatusPagamentoEnum.AGENDADO:
        if (updateDto.dataAgendamento) {
          dadosAtualizacao.dataAgendamento = new Date(
            updateDto.dataAgendamento,
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
      dataCancelamento: new Date(),
      canceladoPor: usuarioId,
      updated_at: new Date(),
    };

    const pagamentoCancelado = await this.pagamentoRepository.update(
      id,
      dadosAtualizacao,
    );

    this.logger.log(`Pagamento ${id} cancelado com sucesso`);
    return pagamentoCancelado;
  }

  /**
   * Busca pagamentos por solicitação
   */
  async findBySolicitacao(solicitacaoId: string): Promise<Pagamento[]> {
    return await this.pagamentoRepository.findBySolicitacao(solicitacaoId);
  }

  /**
   * Busca pagamentos por concessão
   */
  async findByConcessao(concessaoId: string): Promise<Pagamento[]> {
    return await this.pagamentoRepository.findByConcessao(concessaoId);
  }

  /**
   * Obter estatísticas de pagamentos
   */
  async getEstatisticas() {
    return await this.pagamentoRepository.getEstatisticas();
  }

  /**
   * Gera pagamentos para uma concessão baseado no tipo de benefício
   */
  async gerarPagamentosParaConcessao(
    concessao: any,
    solicitacao: any,
    usuarioId: string,
  ): Promise<Pagamento[]> {
    this.logger.log(`Gerando pagamentos para concessão ${concessao.id}`);

    const tipoBeneficio = solicitacao.tipo_beneficio;
    const pagamentosGerados: Pagamento[] = [];

    // Determinar quantidade de parcelas
    let quantidadeParcelas = 1;
    let valorParcela = solicitacao.valor_solicitado || 0;

    if (tipoBeneficio?.especificacoes?.permite_parcelamento) {
      // Para benefícios que permitem parcelamento
      if (
        solicitacao.quantidade_parcelas &&
        solicitacao.quantidade_parcelas > 1
      ) {
        quantidadeParcelas = Math.min(
          solicitacao.quantidade_parcelas,
          tipoBeneficio.especificacoes.quantidade_maxima_parcelas || 12,
        );
      } else if (tipoBeneficio.especificacoes.duracao_maxima_meses) {
        // Para benefícios como Aluguel Social (duração em meses)
        quantidadeParcelas = tipoBeneficio.especificacoes.duracao_maxima_meses;
      }
    }

    // Para Cesta Básica, usar quantidade específica
    if (
      tipoBeneficio?.codigo === 'cesta-basica' &&
      solicitacao.dados_especificos?.quantidade_cestas_solicitadas
    ) {
      quantidadeParcelas =
        solicitacao.dados_especificos.quantidade_cestas_solicitadas;
    }

    // Calcular valor por parcela
    if (quantidadeParcelas > 1) {
      valorParcela = Number(
        (solicitacao.valor_solicitado / quantidadeParcelas).toFixed(2),
      );
    }

    // Gerar pagamentos
    for (let i = 1; i <= quantidadeParcelas; i++) {
      const dataLiberacao = new Date(concessao.dataInicio);

      // Para benefícios mensais, adicionar meses
      if (
        quantidadeParcelas > 1 &&
        tipoBeneficio?.especificacoes?.duracao_maxima_meses
      ) {
        dataLiberacao.setMonth(dataLiberacao.getMonth() + (i - 1));
      }

      // Ajustar valor da última parcela para compensar arredondamentos
      let valorFinal = valorParcela;
      if (i === quantidadeParcelas && quantidadeParcelas > 1) {
        const totalCalculado = valorParcela * (quantidadeParcelas - 1);
        valorFinal = Number(
          (solicitacao.valor_solicitado - totalCalculado).toFixed(2),
        );
      }

      const dadosPagamento = {
        concessaoId: concessao.id,
        solicitacaoId: solicitacao.id,
        valor: valorFinal,
        dataLiberacao: dataLiberacao,
        metodoPagamento: solicitacao.info_bancaria
          ? MetodoPagamentoEnum.PIX
          : MetodoPagamentoEnum.PRESENCIAL,
        infoBancariaId: solicitacao.info_bancaria?.id || undefined,
        numeroParcela: i,
        totalParcelas: quantidadeParcelas,
        observacoes: `Pagamento ${i}/${quantidadeParcelas} - ${tipoBeneficio.nome}`,
      };

      const pagamento = await this.create(dadosPagamento, usuarioId);
      pagamentosGerados.push(pagamento);
    }

    this.logger.log(
      `${quantidadeParcelas} pagamentos gerados para concessão ${concessao.id} - Total: R$ ${solicitacao.valor_solicitado}`,
    );

    return pagamentosGerados;
  }
}
