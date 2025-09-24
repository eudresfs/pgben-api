import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfirmacaoRepository } from '../repositories/confirmacao.repository';
import { PagamentoRepository } from '../repositories/pagamento.repository';
import { ConfirmacaoRecebimento } from '../../../entities/confirmacao-recebimento.entity';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { ConfirmacaoRecebimentoDto } from '../dtos/confirmacao-recebimento.dto';
import { PagamentoUnifiedMapper } from '../mappers';
import { ConfirmacaoMapper } from '../utils/confirmacao-mapper.util';
import { PagamentoValidationUtil } from '../utils/pagamento-validation.util';
import { DocumentoService } from '../../documento/services/documento.service';

/**
 * Service simplificado para gerenciamento de confirmações de recebimento
 * Foca apenas na lógica de negócio essencial, delegando operações de dados para o repository
 */
@Injectable()
export class ConfirmacaoService {
  private readonly logger = new Logger(ConfirmacaoService.name);

  constructor(
    private readonly confirmacaoRepository: ConfirmacaoRepository,
    private readonly pagamentoRepository: PagamentoRepository,
    private readonly documentoService: DocumentoService,
  ) {}

  /**
   * Cria uma nova confirmação de recebimento
   */
  async create(
    pagamentoId: string,
    createDto: ConfirmacaoRecebimentoDto,
    usuarioId: string,
  ): Promise<ConfirmacaoRecebimento> {
    this.logger.log(`Criando confirmação para pagamento ${pagamentoId}`);

    // Validações fora da transação
    const errors = ConfirmacaoMapper.validateConfirmacaoData(createDto);
    if (errors.length > 0) {
      throw new BadRequestException(`Dados inválidos: ${errors.join(', ')}`);
    }

    const pagamento = await this.pagamentoRepository.findById(pagamentoId);
    PagamentoValidationUtil.validarExistencia(pagamento, pagamentoId);

    if (!pagamento) {
      throw new NotFoundException(
        `Pagamento com ID ${pagamentoId} não encontrado`,
      );
    }

    PagamentoValidationUtil.validarParaConfirmacao(pagamento);
    // await this.verificarConfirmacaoExistente(pagamentoId);

    // Validar se o pagamento possui comprovante_id
    if (!pagamento.comprovante_id) {
      throw new BadRequestException(
        `É necessário um comprovante para confirmar o pagamento.` +
        `Faça o upload do comprovante antes de confirmar o recebimento.`,
      );
    }

    // Preparar dados
    const dadosConfirmacao = ConfirmacaoMapper.fromCreateDto(
      createDto,
      pagamentoId,
      usuarioId,
    );

    // Transação mínima - apenas inserção
    const confirmacao =
      await this.confirmacaoRepository.create(dadosConfirmacao);

    // Atualizar status do pagamento para confirmado (reutilizando pagamento já buscado)
    await this.pagamentoRepository.update(pagamento.id, {
      status: StatusPagamentoEnum.CONFIRMADO,
      data_conclusao: new Date(),
    });

    // Marcar o documento comprovante como verificado automaticamente
    try {
      await this.documentoService.verificar(
        pagamento.comprovante_id,
        usuarioId,
        'Documento verificado automaticamente durante confirmação de recebimento do pagamento',
      );
      this.logger.log(
        `Documento ${pagamento.comprovante_id} marcado como verificado automaticamente`,
      );
    } catch (error) {
      // Log do erro mas não falha a confirmação
      this.logger.warn(
        `Erro ao verificar documento ${pagamento.comprovante_id} automaticamente: ${error.message}`,
      );
    }

    this.logger.log(`Confirmação ${confirmacao.id} criada com sucesso`);
    return confirmacao;
  }

  /**
   * Busca confirmação por ID
   */
  async findById(id: string): Promise<ConfirmacaoRecebimento> {
    const confirmacao = await this.confirmacaoRepository.findById(id);

    if (!confirmacao) {
      throw new NotFoundException('Confirmação não encontrada');
    }

    return confirmacao;
  }

  /**
   * Busca confirmação por ID com relacionamentos
   */
  async findByIdWithRelations(id: string): Promise<ConfirmacaoRecebimento> {
    const confirmacao = await this.confirmacaoRepository.findByIdWithRelations(
      id,
      [
        'pagamento',
        'pagamento.solicitacao',
        'pagamento.solicitacao.beneficiario',
        'usuario',
        'destinatario',
      ],
    );

    if (!confirmacao) {
      throw new NotFoundException('Confirmação não encontrada');
    }

    return confirmacao;
  }

  /**
   * Busca confirmações de um pagamento
   */
  async findByPagamento(
    pagamentoId: string,
  ): Promise<ConfirmacaoRecebimento[]> {
    // Validar se pagamento existe
    const pagamento = await this.pagamentoRepository.findById(pagamentoId);
    if (!pagamento) {
      throw new NotFoundException('Pagamento não encontrado');
    }

    return await this.confirmacaoRepository.findByPagamento(pagamentoId);
  }

  /**
   * Verifica se pagamento tem confirmação
   */
  async hasConfirmacao(pagamentoId: string): Promise<boolean> {
    return await this.confirmacaoRepository.hasConfirmacao(pagamentoId);
  }

  /**
   * Obtém status completo de confirmação do pagamento
   */
  async getStatusConfirmacao(pagamentoId: string): Promise<{
    temConfirmacao: boolean;
    status: string;
    quantidadeConfirmacoes: number;
    ultimaConfirmacao?: any;
  }> {
    const confirmacoes = await this.findByPagamento(pagamentoId);
    return ConfirmacaoMapper.createStatusResponse(confirmacoes);
  }

  /**
   * Remove uma confirmação (cancelamento)
   */
  async remove(id: string, motivo: string, usuarioId: string): Promise<void> {
    this.logger.log(`Removendo confirmação ${id}`);

    const confirmacao = await this.findById(id);

    // Verificar se pode ser removida (ex: não pode remover confirmação antiga)
    const diasLimite = 7;
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasLimite);

    if (confirmacao.created_at < dataLimite) {
      throw new BadRequestException(
        `Não é possível remover confirmação criada há mais de ${diasLimite} dias`,
      );
    }

    // Reverter status do pagamento
    await this.pagamentoRepository.update(confirmacao.pagamento_id, {
      status: StatusPagamentoEnum.LIBERADO,
      data_conclusao: undefined,
    });

    // Adicionar observação sobre remoção
    await this.confirmacaoRepository.update(id, {
      observacoes: `${confirmacao.observacoes || ''}\n[REMOVIDA] ${motivo} - Por: ${usuarioId} em ${new Date().toISOString()}`,
    });

    this.logger.log(`Confirmação ${id} removida com sucesso`);
  }

  // ========== MÉTODOS PRIVADOS DE VALIDAÇÃO ==========

  /**
   * Verifica se já existe confirmação para o pagamento
   */
  private async verificarConfirmacaoExistente(
    pagamentoId: string,
  ): Promise<void> {
    const existeConfirmacao =
      await this.confirmacaoRepository.hasConfirmacao(pagamentoId);

    if (existeConfirmacao) {
      throw new ConflictException(
        'Este pagamento já possui confirmação de recebimento',
      );
    }
  }
}
