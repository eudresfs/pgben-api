import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfirmacaoRecebimento } from '../../../entities/confirmacao-recebimento.entity';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { ConfirmacaoRecebimentoDto } from '../dtos/confirmacao-recebimento.dto';
import { ComprovanteService } from './comprovante.service';

/**
 * Serviço para gerenciamento de confirmações de recebimento de pagamentos
 *
 * Implementa a lógica para registrar e consultar confirmações de recebimento
 * por parte dos beneficiários, validando regras de negócio específicas.
 *
 * @author Equipe PGBen
 */
@Injectable()
export class ConfirmacaoService {
  constructor(
    @InjectRepository(ConfirmacaoRecebimento)
    private readonly confirmacaoRepository: Repository<ConfirmacaoRecebimento>,
    private readonly comprovanteService: ComprovanteService,
    // Outros serviços necessários serão injetados aqui
    // private readonly pagamentoService: PagamentoService,
    // private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Registra uma nova confirmação de recebimento para um pagamento
   *
   * @param pagamentoId ID do pagamento
   * @param createDto Dados da confirmação
   * @param usuarioId ID do usuário que está registrando a confirmação
   * @returns Confirmação registrada
   */
  async registrarConfirmacao(
    pagamentoId: string,
    createDto: ConfirmacaoRecebimentoDto,
    usuarioId: string,
  ): Promise<ConfirmacaoRecebimento> {
    // Verificar se o pagamento existe
    // const pagamento = await this.pagamentoService.findOne(pagamentoId);

    // if (!pagamento) {
    //   throw new NotFoundException('Pagamento não encontrado');
    // }

    // Verificar se o pagamento está no status adequado
    // if (pagamento.status !== StatusPagamentoEnum.LIBERADO) {
    //   throw new ConflictException(
    //     'Somente pagamentos liberados podem receber confirmação'
    //   );
    // }

    // Verificar se já existe confirmação para este pagamento
    const existingConfirmacao = await this.findByPagamento(pagamentoId);

    if (existingConfirmacao.length > 0) {
      throw new ConflictException(
        'Este pagamento já possui uma confirmação de recebimento registrada',
      );
    }

    // Verificar se o pagamento tem pelo menos um comprovante
    const hasComprovantes =
      await this.comprovanteService.hasComprovantes(pagamentoId);

    if (!hasComprovantes) {
      throw new ConflictException(
        'É necessário anexar pelo menos um comprovante antes de confirmar o recebimento',
      );
    }

    // Criar nova confirmação
    const confirmacao = this.confirmacaoRepository.create({
      pagamento_id: pagamentoId,
      data_confirmacao: createDto.dataConfirmacao,
      metodo_confirmacao: createDto.metodoConfirmacao,
      confirmado_por: usuarioId,
      destinatario_id: createDto.destinatarioId,
      observacoes: createDto.observacoes,
    });

    // Salvar a confirmação
    const result = await this.confirmacaoRepository.save(confirmacao);

    // Atualizar o status do pagamento para CONFIRMADO
    // await this.pagamentoService.atualizarStatus(
    //   pagamentoId,
    //   StatusPagamentoEnum.CONFIRMADO,
    //   usuarioId
    // );

    // Registrar operação no log de auditoria
    // await this.auditoriaService.registrarOperacao({
    //   tipoOperacao: 'CONFIRMACAO_RECEBIMENTO',
    //   usuarioId,
    //   entidadeId: result.id,
    //   tipoEntidade: 'CONFIRMACAO_RECEBIMENTO',
    //   dadosAnteriores: null,
    //   dadosNovos: result
    // });

    return result;
  }

  /**
   * Busca uma confirmação pelo ID
   *
   * @param id ID da confirmação
   * @returns Confirmação encontrada ou null
   */
  async findOne(id: string): Promise<ConfirmacaoRecebimento | null> {
    return this.confirmacaoRepository.findOneBy({ id });
  }

  /**
   * Busca confirmações de um pagamento específico
   *
   * @param pagamentoId ID do pagamento
   * @returns Lista de confirmações para o pagamento
   */
  async findByPagamento(
    pagamentoId: string,
  ): Promise<ConfirmacaoRecebimento[]> {
    return this.confirmacaoRepository.find({
      where: { pagamento_id: pagamentoId },
      order: { data_confirmacao: 'DESC' },
    });
  }

  /**
   * Busca uma confirmação pelo ID com todos os relacionamentos
   *
   * @param id ID da confirmação
   * @returns Confirmação encontrada com relacionamentos ou null
   */
  async findOneWithRelations(
    id: string,
  ): Promise<ConfirmacaoRecebimento | null> {
    return this.confirmacaoRepository.findOne({
      where: { id },
      relations: ['pagamento'],
    });
  }

  /**
   * Verifica se um pagamento tem confirmação de recebimento
   *
   * @param pagamentoId ID do pagamento
   * @returns true se o pagamento tem confirmação
   */
  async temConfirmacao(pagamentoId: string): Promise<boolean> {
    const count = await this.confirmacaoRepository.count({
      where: { pagamento_id: pagamentoId },
    });

    return count > 0;
  }

  /**
   * Validar destinatário se diferente do beneficiário
   *
   * @param pagamentoId ID do pagamento
   * @param destinatarioId ID do destinatário
   * @returns true se o destinatário é válido
   */
  private async validarDestinatario(
    pagamentoId: string,
    destinatarioId?: string,
  ): Promise<boolean> {
    // Esta é uma implementação de placeholder
    // Será integrada com o CidadaoService para validar a relação entre o beneficiário e o destinatário

    if (!destinatarioId) {
      return true; // Sem destinatário específico, assume-se que é o próprio beneficiário
    }

    // Lógica para validar se o destinatário é válido (ex: familiar cadastrado)
    // const pagamento = await this.pagamentoService.findOne(pagamentoId);
    // const solicitacao = await this.solicitacaoService.findOne(pagamento.solicitacaoId);
    // const beneficiarioId = solicitacao.cidadaoId;

    // return this.cidadaoService.verificarRelacaoFamiliar(beneficiarioId, destinatarioId);

    return true; // Temporariamente retornando true
  }
}
