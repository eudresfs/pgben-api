import { Injectable, Logger } from '@nestjs/common';
import { DeterminacaoJudicialConsolidadoService } from '../../judicial/services/determinacao-judicial-consolidado.service';
import { DeterminacaoJudicial } from '../../../entities/determinacao-judicial.entity';
import { SolicitacaoCreateDeterminacaoJudicialDto } from '../dto/create-determinacao-judicial.dto';
import { SolicitacaoUpdateDeterminacaoJudicialDto } from '../dto/update-determinacao-judicial.dto';

/**
 * Adaptador para o serviço de determinação judicial no contexto de solicitações
 *
 * Este serviço atua como uma camada de adaptação entre o módulo de solicitação
 * e o serviço consolidado de determinação judicial, mantendo a interface
 * específica do contexto de solicitações.
 *
 * Responsabilidades:
 * - Adaptar chamadas do contexto de solicitação para o serviço consolidado
 * - Manter compatibilidade com a interface existente
 * - Fornecer métodos específicos para o contexto de solicitações
 * - Centralizar logs e tratamento de erros específicos do contexto
 */
@Injectable()
export class DeterminacaoJudicialAdapterService {
  private readonly logger = new Logger(DeterminacaoJudicialAdapterService.name);

  constructor(
    private readonly determinacaoConsolidadoService: DeterminacaoJudicialConsolidadoService,
  ) {}

  /**
   * Cria uma nova determinação judicial para uma solicitação
   *
   * @param createDeterminacaoDto Dados da determinação judicial
   * @param usuarioId ID do usuário que está criando a determinação
   * @returns Determinação judicial criada
   */
  async create(
    createDeterminacaoDto: SolicitacaoCreateDeterminacaoJudicialDto,
    usuarioId: string,
  ): Promise<DeterminacaoJudicial> {
    this.logger.log(
      `Criando determinação judicial para solicitação ${createDeterminacaoDto.solicitacao_id}`,
    );

    return this.determinacaoConsolidadoService.createForSolicitacao(
      createDeterminacaoDto,
      usuarioId,
    );
  }

  /**
   * Busca uma determinação judicial pelo ID
   *
   * @param id ID da determinação judicial
   * @returns Determinação judicial encontrada
   */
  async findById(id: string): Promise<DeterminacaoJudicial> {
    return this.determinacaoConsolidadoService.findById(id, ['solicitacao']);
  }

  /**
   * Busca todas as determinações judiciais de uma solicitação
   *
   * @param solicitacaoId ID da solicitação
   * @returns Lista de determinações judiciais
   */
  async findBySolicitacaoId(
    solicitacaoId: string,
  ): Promise<DeterminacaoJudicial[]> {
    this.logger.log(
      `Buscando determinações judiciais para solicitação ${solicitacaoId}`,
    );

    return this.determinacaoConsolidadoService.findBySolicitacaoId(
      solicitacaoId,
    );
  }

  /**
   * Atualiza uma determinação judicial
   *
   * @param id ID da determinação judicial
   * @param updateDeterminacaoDto Dados para atualização
   * @returns Determinação judicial atualizada
   */
  async update(
    id: string,
    updateDeterminacaoDto: SolicitacaoUpdateDeterminacaoJudicialDto,
  ): Promise<DeterminacaoJudicial> {
    this.logger.log(`Atualizando determinação judicial ${id}`);

    return this.determinacaoConsolidadoService.updateForSolicitacao(
      id,
      updateDeterminacaoDto,
    );
  }

  /**
   * Registra o cumprimento de uma determinação judicial
   *
   * @param id ID da determinação judicial
   * @param observacoes Observações sobre o cumprimento
   * @returns Determinação judicial atualizada
   */
  async registrarCumprimento(
    id: string,
    observacoes?: string,
  ): Promise<DeterminacaoJudicial> {
    this.logger.log(`Registrando cumprimento da determinação judicial ${id}`);

    return this.determinacaoConsolidadoService.registrarCumprimento(
      id,
      observacoes,
    );
  }

  /**
   * Remove uma determinação judicial
   *
   * @param id ID da determinação judicial
   * @returns Void
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Removendo determinação judicial ${id}`);

    return this.determinacaoConsolidadoService.removeFromSolicitacao(id);
  }

  // ========================================
  // MÉTODOS DE COMPATIBILIDADE
  // ========================================

  /**
   * Busca determinações por solicitação (alias para findBySolicitacaoId)
   * Mantém compatibilidade com interface existente
   *
   * @param solicitacaoId ID da solicitação
   * @returns Lista de determinações judiciais
   */
  async findBySolicitacao(
    solicitacaoId: string,
  ): Promise<DeterminacaoJudicial[]> {
    return this.findBySolicitacaoId(solicitacaoId);
  }

  /**
   * Marca determinação como cumprida (alias para registrarCumprimento)
   * Mantém compatibilidade com interface existente
   *
   * @param id ID da determinação judicial
   * @param observacoes Observações sobre o cumprimento
   * @returns Determinação judicial atualizada
   */
  async marcarComoCumprida(
    id: string,
    observacoes?: string,
  ): Promise<DeterminacaoJudicial> {
    return this.registrarCumprimento(id, observacoes);
  }
}
