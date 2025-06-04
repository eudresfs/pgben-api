import { Injectable, Logger } from '@nestjs/common';
import { WorkflowBeneficioRepository } from '../repositories/workflow-beneficio.repository';
import { WorkflowBeneficio } from '../../../entities/workflow-beneficio.entity';
import { WorkflowUpdateDto } from '../dtos/workflow/workflow-update.dto';
import {
  WorkflowResponseDto,
  WorkflowEtapaResponseDto,
} from '../dtos/workflow/workflow-response.dto';
import { WorkflowEtapaDto } from '../dtos/workflow/workflow-etapa.dto';
import { WorkflowInconsistenteException } from '../exceptions/workflow-inconsistente.exception';
import { WorkflowAcaoEnum } from '../../../enums/workflow-acao.enum';

/**
 * Serviço para gerenciamento de workflows de benefícios
 *
 * Responsável por:
 * - Operações CRUD para workflows
 * - Validação de consistência de workflow
 * - Detecção de ciclos em workflow
 * - Cálculo de SLA por etapa
 */
@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly workflowRepository: WorkflowBeneficioRepository,
  ) {}

  /**
   * Busca todos os workflows, convertendo-os para DTOs de resposta
   * @returns Lista de DTOs de resposta de workflows
   */
  async buscarTodos(): Promise<WorkflowResponseDto[]> {
    const workflows = await this.workflowRepository.findAll();
    return workflows.map((w) => this.mapearParaDto(w));
  }

  /**
   * Busca um workflow pelo ID do tipo de benefício
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns DTO de resposta do workflow
   * @throws Error se o workflow não existir
   */
  async buscarPorTipoBeneficio(
    tipoBeneficioId: string,
  ): Promise<WorkflowResponseDto> {
    const workflow =
      await this.workflowRepository.findByTipoBeneficio(tipoBeneficioId);
    if (!workflow) {
      throw new Error(
        `Workflow para o tipo de benefício '${tipoBeneficioId}' não encontrado`,
      );
    }
    return this.mapearParaDto(workflow);
  }

  /**
   * Cria ou atualiza um workflow para um tipo de benefício
   * @param tipoBeneficioId ID do tipo de benefício
   * @param dto DTO com dados para atualização
   * @returns DTO de resposta do workflow atualizado
   */
  async atualizarOuCriar(
    tipoBeneficioId: string,
    dto: WorkflowUpdateDto,
  ): Promise<WorkflowResponseDto> {
    // Validar consistência do workflow
    this.validarConsistencia(dto.etapas);

    // Verificar se já existe workflow para este tipo de benefício
    let workflow =
      await this.workflowRepository.findByTipoBeneficio(tipoBeneficioId);

    if (!workflow) {
      // Criar novo workflow
      workflow = new WorkflowBeneficio();
      workflow.tipo_beneficio_id = tipoBeneficioId;
      this.logger.log(
        `Criando novo workflow para tipo de benefício '${tipoBeneficioId}'`,
        WorkflowService.name,
      );
    } else {
      this.logger.log(
        `Atualizando workflow existente para tipo de benefício '${tipoBeneficioId}'`,
        WorkflowService.name,
      );
    }

    // Atualizar dados do workflow
    workflow.etapas = dto.etapas;
    workflow.version = (workflow.version || 0) + 1;
    workflow.ativo = dto.ativo !== undefined ? dto.ativo : true;
    workflow.sla_total = this.calcularSLATotal(dto.etapas);

    const salvo = await this.workflowRepository.save(workflow);
    return this.mapearParaDto(salvo);
  }

  /**
   * Remove um workflow
   * @param tipoBeneficioId ID do tipo de benefício
   * @throws Error se o workflow não existir
   */
  async remover(tipoBeneficioId: string): Promise<void> {
    const workflow =
      await this.workflowRepository.findByTipoBeneficio(tipoBeneficioId);
    if (!workflow) {
      throw new Error(
        `Workflow para o tipo de benefício '${tipoBeneficioId}' não encontrado`,
      );
    }

    await this.workflowRepository.remove(workflow.id as unknown as number);
    this.logger.log(
      `Workflow para tipo de benefício '${tipoBeneficioId}' removido`,
      WorkflowService.name,
    );
  }

  /**
   * Ativa ou desativa um workflow
   * @param tipoBeneficioId ID do tipo de benefício
   * @param ativo Status de ativação
   * @returns DTO de resposta do workflow atualizado
   * @throws Error se o workflow não existir
   */
  async alterarStatus(
    tipoBeneficioId: string,
    ativo: boolean,
  ): Promise<WorkflowResponseDto> {
    const workflow =
      await this.workflowRepository.findByTipoBeneficio(tipoBeneficioId);
    if (!workflow) {
      throw new Error(
        `Workflow para o tipo de benefício '${tipoBeneficioId}' não encontrado`,
      );
    }

    workflow.ativo = ativo;
    const salvo = await this.workflowRepository.save(workflow);

    this.logger.log(
      `Alterando status do workflow para tipo de benefício '${tipoBeneficioId}' para ${ativo ? 'ativo' : 'inativo'}`,
      WorkflowService.name,
    );
    return this.mapearParaDto(salvo);
  }

  /**
   * Valida a consistência de um workflow
   * @param etapas Lista de etapas do workflow
   * @throws WorkflowInconsistenteException se o workflow for inconsistente
   */
  private validarConsistencia(etapas: WorkflowEtapaDto[]): void {
    this.logger.log(
      'Iniciando validação de consistência do workflow',
      WorkflowService.name,
    );

    if (!etapas || etapas.length === 0) {
      this.logger.log('Workflow sem etapas detectado', WorkflowService.name);
      throw new WorkflowInconsistenteException(
        'unknown',
        'Workflow deve ter pelo menos uma etapa',
      );
    }

    // Verificar se todas as etapas possuem IDs únicos
    const ids = new Set<string>();
    const msgErros: string[] = [];

    for (const etapa of etapas) {
      // Verificar ID único
      if (ids.has(etapa.id)) {
        msgErros.push(`Etapa com ID ${etapa.id} duplicado`);
      }
      ids.add(etapa.id);
    }

    // Verificar se todas as etapas têm próximas etapas válidas
    for (const etapa of etapas) {
      if (etapa.proximas_etapas && etapa.proximas_etapas.length > 0) {
        for (const proximoId of etapa.proximas_etapas) {
          if (!ids.has(proximoId) && proximoId !== 'FIM') {
            msgErros.push(
              `Etapa ${etapa.id} referencia uma etapa inexistente: ${proximoId}`,
            );
          }
        }
      }
    }

    // Verificar se existe pelo menos uma etapa inicial
    const etapasIniciais = etapas.filter((e) => e.inicial);
    if (etapasIniciais.length === 0) {
      msgErros.push('Workflow deve ter pelo menos uma etapa inicial');
    }
    if (etapasIniciais.length > 1) {
      msgErros.push('Workflow não pode ter mais de uma etapa inicial');
    }

    // Verificar se existe pelo menos uma etapa final (que não tem próximas etapas ou tem 'FIM')
    const temEtapaFinal = etapas.some(
      (e) =>
        !e.proximas_etapas ||
        e.proximas_etapas.length === 0 ||
        e.proximas_etapas.includes('FIM'),
    );
    if (!temEtapaFinal) {
      msgErros.push(
        'Workflow deve ter pelo menos uma etapa final (sem próximas etapas ou com FIM)',
      );
    }

    // Se encontramos erros, lançar exceção
    if (msgErros.length > 0) {
      this.logger.log(
        `Etapas inconsistentes: ${msgErros.join(', ')}`,
        WorkflowService.name,
      );
      throw new WorkflowInconsistenteException('unknown', msgErros.join('\n'));
    }

    // Verificar ciclos no workflow
    this.verificarCiclos(etapas);
  }

  /**
   * Verifica se existem ciclos no workflow
   * @param etapas Lista de etapas do workflow
   * @throws WorkflowInconsistenteException se existirem ciclos
   */
  private verificarCiclos(etapas: WorkflowEtapaDto[]): void {
    this.logger.log(
      'Iniciando detecção de ciclos no workflow',
      WorkflowService.name,
    );

    // Implementação de detecção de ciclos usando DFS (Depth-First Search)
    this.logger.log(
      'Iniciando algoritmo DFS para detecção de ciclos',
      WorkflowService.name,
    );
    const visitados = new Set<string>();
    const pilha = new Set<string>();

    // Função recursiva para DFS
    const dfs = (etapaId: string, caminho: string[] = []): void => {
      // Se já encontramos um ciclo, não precisamos continuar
      if (pilha.has(etapaId)) {
        const ciclo = [...caminho, etapaId].join(' -> ');
        this.logger.log(`Ciclo encontrado: ${ciclo}`, WorkflowService.name);
        throw new WorkflowInconsistenteException(
          'unknown',
          `Detectado ciclo no workflow: ${ciclo}`,
        );
      }

      // Se já visitamos esta etapa e não encontramos ciclo, podemos retornar
      if (visitados.has(etapaId)) {
        return;
      }

      // Marcar como visitado e adicionar à pilha atual
      visitados.add(etapaId);
      pilha.add(etapaId);

      // Encontrar a etapa atual
      const etapa = etapas.find((e) => e.id === etapaId);
      if (etapa && etapa.proximas_etapas) {
        // Explorar todas as próximas etapas
        for (const proximoId of etapa.proximas_etapas) {
          // Ignorar FIM, que é um marcador especial
          if (proximoId !== 'FIM') {
            dfs(proximoId, [...caminho, etapaId]);
          }
        }
      }

      // Remover da pilha ao retornar
      pilha.delete(etapaId);
    };

    // Começar a partir da etapa inicial
    const etapaInicial = etapas.find((e) => e.inicial);
    if (etapaInicial) {
      this.logger.log(
        `Iniciando busca a partir da etapa inicial: ${etapaInicial.id}`,
        WorkflowService.name,
      );
      dfs(etapaInicial.id);
    }
  }

  /**
   * Calcula o SLA total do workflow somando os SLAs de todas as etapas
   * @param etapas Lista de etapas do workflow
   * @returns SLA total em horas
   */
  private calcularSLATotal(etapas: WorkflowEtapaDto[]): number {
    const total = etapas.reduce(
      (total, etapa) => total + (etapa.sla_horas || 0),
      0,
    );
    this.logger.log(
      `SLA total calculado: ${total} horas`,
      WorkflowService.name,
    );
    return total;
  }

  /**
   * Calcula a próxima etapa do workflow para uma ação específica
   * @param workflow Workflow a ser consultado
   * @param etapaAtualId ID da etapa atual
   * @param acao Ação realizada
   * @returns ID da próxima etapa ou null se não houver próxima etapa
   */
  calcularProximaEtapa(
    workflow: WorkflowResponseDto,
    etapaAtualId: string,
    acao: WorkflowAcaoEnum,
  ): string | null {
    this.logger.log(
      `Calculando próxima etapa a partir de ${etapaAtualId} com ação ${acao}`,
      WorkflowService.name,
    );

    // Encontrar a etapa atual
    const etapaAtual = workflow.etapas.find((e) => e.id === etapaAtualId);
    if (!etapaAtual) {
      throw new Error(`Etapa ${etapaAtualId} não encontrada no workflow`);
    }

    // Se não tiver próximas etapas, não há para onde ir
    if (
      !etapaAtual.proximas_etapas ||
      etapaAtual.proximas_etapas.length === 0
    ) {
      return null;
    }

    // Se a ação da etapa for específica e não corresponder à ação realizada, não pode prosseguir
    if (etapaAtual.acao && etapaAtual.acao !== acao) {
      throw new Error(
        `Ação ${acao} não corresponde à ação esperada ${etapaAtual.acao} para a etapa ${etapaAtualId}`,
      );
    }

    // Se houver apenas uma próxima etapa, retorná-la
    if (etapaAtual.proximas_etapas.length === 1) {
      const proximaEtapa = etapaAtual.proximas_etapas[0];
      this.logger.log(
        `Próxima etapa única encontrada: ${proximaEtapa}`,
        WorkflowService.name,
      );
      return proximaEtapa === 'FIM' ? null : proximaEtapa;
    }

    // Se houver múltiplas próximas etapas possíveis, vai depender da implementação específica
    // do workflow. Por enquanto, retornamos a primeira que não seja um fim.
    this.logger.log(
      `Múltiplas próximas etapas possíveis: ${etapaAtual.proximas_etapas.join(', ')}`,
      WorkflowService.name,
    );

    for (const proximaEtapa of etapaAtual.proximas_etapas) {
      if (proximaEtapa !== 'FIM') {
        this.logger.log(
          `Próxima etapa selecionada: ${proximaEtapa}`,
          WorkflowService.name,
        );
        return proximaEtapa;
      }
    }

    return null;
  }

  /**
   * Encontra a etapa inicial de um workflow
   * @param workflow Workflow a ser consultado
   * @returns Etapa inicial ou erro se não existir
   */
  encontrarEtapaInicial(workflow: WorkflowResponseDto): WorkflowEtapaDto {
    const etapaInicial = workflow.etapas.find((e) => e.inicial);
    if (!etapaInicial) {
      throw new Error('Workflow não possui etapa inicial');
    }
    return etapaInicial;
  }

  /**
   * Converte uma entidade WorkflowBeneficio para um DTO de resposta
   * @param workflow Entidade a ser convertida
   * @returns DTO de resposta
   */
  private mapearParaDto(workflow: WorkflowBeneficio): WorkflowResponseDto {
    const dto = new WorkflowResponseDto();
    dto.id = workflow.id;

    // Adicionar informações do tipo de benefício
    dto.tipo_beneficio = {
      id: workflow.tipo_beneficio_id,
      nome: 'Tipo de Benefício ' + workflow.tipo_beneficio_id.substring(0, 5), // Nome temporário
    };

    // Adicionar nome e descrição do workflow
    dto.nome = workflow.nome || 'Workflow de Benefício';
    dto.descricao = workflow.descricao || 'Descrição do workflow de benefício';

    // Mapear cada etapa para incluir as informações necessárias
    if (workflow.etapas && Array.isArray(workflow.etapas)) {
      dto.etapas = workflow.etapas.map((etapa) => {
        const etapaDto = new WorkflowEtapaResponseDto();
        etapaDto.ordem = etapa.ordem;
        etapaDto.descricao = etapa.descricao;
        etapaDto.acao = etapa.acao;
        etapaDto.prazo_sla = etapa.prazo_sla;
        etapaDto.template_notificacao_id = etapa.template_notificacao_id;

        // Adicionar informações do setor (temporário até que tenhamos a busca real)
        etapaDto.setor = {
          id: etapa.setor_id,
          nome: 'Setor ' + etapa.setor_id.substring(0, 5), // Nome temporário
        };

        return etapaDto;
      });
    } else {
      dto.etapas = [];
    }

    dto.ativo = workflow.ativo;
    dto.created_at = workflow.created_at;
    dto.updated_at = workflow.updated_at;

    // Adicionar informações do usuário que atualizou (temporário)
    dto.updated_by = {
      id: workflow.updated_by || '00000000-0000-0000-0000-000000000000',
      nome: 'Administrador',
    };

    return dto;
  }
}
