import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { SolicitacaoAprovacao } from '../entities/solicitacao-aprovacao.entity';
import { CreateSolicitacaoAprovacaoDto } from '../dto/create-solicitacao-aprovacao.dto';
import { UpdateSolicitacaoAprovacaoDto } from '../dto/update-solicitacao-aprovacao.dto';
import { StatusSolicitacaoAprovacao, AcaoAprovacao } from '../enums/aprovacao.enums';
import { AuditoriaService } from '../../auditoria/services/auditoria.service';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';

/**
 * Serviço para gerenciamento de solicitações de aprovação
 * 
 * Responsável por criar, atualizar e gerenciar o ciclo de vida
 * das solicitações de aprovação no sistema.
 */
@Injectable()
export class SolicitacaoAprovacaoService {
  constructor(
    @InjectRepository(SolicitacaoAprovacao)
    private readonly solicitacaoRepository: Repository<SolicitacaoAprovacao>,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Cria uma nova solicitação de aprovação
   * @param createDto Dados da solicitação
   * @param usuarioId ID do usuário solicitante
   * @returns Solicitação criada
   */
  async create(
    createDto: CreateSolicitacaoAprovacaoDto,
    usuarioId: string,
  ): Promise<SolicitacaoAprovacao> {
    const solicitacao = this.solicitacaoRepository.create({
      ...createDto,
      usuario_solicitante_id: usuarioId,
      status: StatusSolicitacaoAprovacao.PENDENTE,
    });

    const solicitacaoSalva = await this.solicitacaoRepository.save(solicitacao);

    // Registrar auditoria
    await this.auditoriaService.registrar({
      tipo_operacao: TipoOperacao.CREATE,
      entidade_afetada: 'SolicitacaoAprovacao',
      entidade_id: solicitacaoSalva.id,
      usuario_id: usuarioId,
      dados_novos: solicitacaoSalva,
      descricao: 'Solicitação de aprovação criada',
    });

    return solicitacaoSalva;
  }

  /**
   * Busca todas as solicitações com filtros opcionais
   * @param options Opções de busca
   * @returns Lista de solicitações
   */
  async findAll(options?: FindManyOptions<SolicitacaoAprovacao>): Promise<SolicitacaoAprovacao[]> {
    return this.solicitacaoRepository.find({
      relations: ['configuracao_aprovacao', 'acao_critica', 'aprovacoes'],
      order: { created_at: 'DESC' },
      ...options,
    });
  }

  /**
   * Busca uma solicitação pelo ID
   * @param id ID da solicitação
   * @returns Solicitação encontrada
   */
  async findOne(id: string): Promise<SolicitacaoAprovacao> {
    const solicitacao = await this.solicitacaoRepository.findOne({
      where: { id },
      relations: ['configuracao_aprovacao', 'acao_critica', 'aprovacoes'],
    });

    if (!solicitacao) {
      throw new NotFoundException(`Solicitação de aprovação com ID ${id} não encontrada`);
    }

    return solicitacao;
  }

  /**
   * Atualiza uma solicitação de aprovação
   * @param id ID da solicitação
   * @param updateDto Dados para atualização
   * @param usuarioId ID do usuário que está atualizando
   * @returns Solicitação atualizada
   */
  async update(
    id: string,
    updateDto: UpdateSolicitacaoAprovacaoDto,
    usuarioId: string,
  ): Promise<SolicitacaoAprovacao> {
    const solicitacao = await this.findOne(id);
    const dadosAntigos = { ...solicitacao };

    // Verificar se a solicitação pode ser atualizada
    if (solicitacao.status !== StatusSolicitacaoAprovacao.PENDENTE) {
      throw new BadRequestException('Apenas solicitações pendentes podem ser atualizadas');
    }

    Object.assign(solicitacao, updateDto);
    const solicitacaoAtualizada = await this.solicitacaoRepository.save(solicitacao);

    // Registrar auditoria
    await this.auditoriaService.registrar({
      tipo_operacao: TipoOperacao.UPDATE,
      entidade_afetada: 'SolicitacaoAprovacao',
      entidade_id: id,
      usuario_id: usuarioId,
      dados_anteriores: solicitacao,
      dados_novos: solicitacaoAtualizada,
      descricao: 'Solicitação de aprovação atualizada',
    });

    return solicitacaoAtualizada;
  }

  /**
   * Cancela uma solicitação de aprovação
   * @param id ID da solicitação
   * @param usuarioId ID do usuário que está cancelando
   * @param motivo Motivo do cancelamento
   * @returns Solicitação cancelada
   */
  async cancel(
    id: string,
    usuarioId: string,
    motivo?: string,
  ): Promise<SolicitacaoAprovacao> {
    const solicitacao = await this.findOne(id);

    // Verificar se a solicitação pode ser cancelada
    if (![StatusSolicitacaoAprovacao.PENDENTE, StatusSolicitacaoAprovacao.EM_ANALISE].includes(solicitacao.status)) {
      throw new BadRequestException('Apenas solicitações pendentes ou em análise podem ser canceladas');
    }

    const dadosAntigos = { ...solicitacao };
    solicitacao.status = StatusSolicitacaoAprovacao.CANCELADA;
    solicitacao.data_conclusao = new Date();
    if (motivo) {
      solicitacao.observacoes_internas = `Cancelado: ${motivo}`;
    }

    const solicitacaoCancelada = await this.solicitacaoRepository.save(solicitacao);

    // Registrar auditoria
    await this.auditoriaService.registrar({
      tipo_operacao: TipoOperacao.UPDATE,
      entidade_afetada: 'SolicitacaoAprovacao',
      entidade_id: id,
      usuario_id: usuarioId,
      dados_anteriores: dadosAntigos,
      dados_novos: solicitacaoCancelada,
      descricao: `Solicitação cancelada. Motivo: ${motivo || 'Não informado'}`,
    });

    return solicitacaoCancelada;
  }

  /**
   * Busca solicitações por usuário solicitante
   * @param usuarioId ID do usuário
   * @returns Lista de solicitações do usuário
   */
  async findByUsuario(usuarioId: string): Promise<SolicitacaoAprovacao[]> {
    return this.solicitacaoRepository.find({
      where: { usuario_solicitante_id: usuarioId },
      relations: ['configuracao_aprovacao', 'acao_critica'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Busca solicitações por status
   * @param status Status das solicitações
   * @returns Lista de solicitações com o status especificado
   */
  async findByStatus(status: StatusSolicitacaoAprovacao): Promise<SolicitacaoAprovacao[]> {
    return this.solicitacaoRepository.find({
      where: { status },
      relations: ['configuracao_aprovacao', 'acao_critica'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Processa uma ação de aprovação (aprovar/rejeitar)
   * @param id ID da solicitação
   * @param acao Ação a ser executada
   * @param usuarioId ID do usuário aprovador
   * @param observacoes Observações da aprovação
   * @returns Solicitação processada
   */
  async processarAcao(
    id: string,
    acao: AcaoAprovacao,
    usuarioId: string,
    observacoes?: string,
  ): Promise<SolicitacaoAprovacao> {
    const solicitacao = await this.findOne(id);

    // Verificar se a solicitação pode ser processada
    if (![StatusSolicitacaoAprovacao.PENDENTE, StatusSolicitacaoAprovacao.EM_ANALISE].includes(solicitacao.status)) {
      throw new BadRequestException('Solicitação não pode ser processada no status atual');
    }

    const dadosAntigos = { ...solicitacao };

    // Atualizar status baseado na ação
    switch (acao) {
      case AcaoAprovacao.APROVAR:
        solicitacao.status = StatusSolicitacaoAprovacao.APROVADA;
        break;
      case AcaoAprovacao.REJEITAR:
        solicitacao.status = StatusSolicitacaoAprovacao.REJEITADA;
        break;
      default:
        throw new BadRequestException(`Ação ${acao} não suportada`);
    }

    if (observacoes) {
      solicitacao.observacoes_internas = observacoes;
    }

    const solicitacaoProcessada = await this.solicitacaoRepository.save(solicitacao);

    // Registrar auditoria
    await this.auditoriaService.registrar({
      tipo_operacao: TipoOperacao.UPDATE,
      entidade_afetada: 'SolicitacaoAprovacao',
      entidade_id: id,
      usuario_id: usuarioId,
      dados_anteriores: dadosAntigos,
      dados_novos: solicitacaoProcessada,
      descricao: `Ação: ${acao}. ${observacoes || ''}`,
    });

    return solicitacaoProcessada;
  }
}