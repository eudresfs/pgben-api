import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitaDomiciliar } from '../entities/visita-domiciliar.entity';
import { AgendamentoVisita } from '../entities/agendamento-visita.entity';
import { Pagamento } from '../../../entities/pagamento.entity';
import { RegistrarVisitaDto } from '../dto/registrar-visita.dto';
import { VisitaResponseDto, AtualizarVisitaDto } from '../dtos/visita.dto';
import { ResultadoVisita, TipoVisita, StatusAgendamento } from '../enums';
import { getResultadoVisitaCor, getResultadoVisitaLabel } from '../../../enums/resultado-visita.enum';
import { getTipoVisitaLabel } from '../../../enums/tipo-visita.enum';
import { VisitaRepository } from '../repositories/visita.repository';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import { PaginatedResponseDto } from '../../../shared/dtos/pagination.dto';
import { PaginationHelper } from '../helpers/pagination.helper';
import { VisitaFiltrosAvancadosDto, VisitaFiltrosResponseDto } from '../dto/visita-filtros-avancados.dto';
import { PeriodoPredefinido } from '../../../enums/periodo-predefinido.enum';
import { FiltrosAvancadosService } from '../../../common/services/filtros-avancados.service';



/**
 * Serviço responsável pelo gerenciamento de visitas domiciliares.
 * 
 * @description
 * Implementa operações para registro, execução e avaliação de visitas domiciliares,
 * incluindo validações de elegibilidade, cálculo de pontuação de risco e
 * recomendações para renovação de benefícios.
 * 
 * @author Sistema PGBEN
 * @since 2025-01-15
 */
@Injectable()
export class VisitaService {
  private readonly logger = new Logger(VisitaService.name);

  constructor(
    private readonly visitaRepository: VisitaRepository,
    @InjectRepository(VisitaDomiciliar)
    private readonly visitaEntityRepository: Repository<VisitaDomiciliar>,
    @InjectRepository(AgendamentoVisita)
    private readonly agendamentoRepository: Repository<AgendamentoVisita>,
    @InjectRepository(Pagamento)
    private readonly pagamentoRepository: Repository<Pagamento>,
    private readonly filtrosAvancadosService: FiltrosAvancadosService,
  ) { }

  /**
   * Registra uma nova visita domiciliar
   * 
   * @param registrarDto Dados da visita a ser registrada
   * @returns Dados da visita registrada
   * @throws BadRequestException se os dados forem inválidos
   * @throws ConflictException se já existir visita para o agendamento
   */
  async registrar(registrarDto: RegistrarVisitaDto): Promise<VisitaResponseDto> {
    try {
      // Validar agendamento
      const agendamento = await this.validateAgendamento(registrarDto.agendamento_id);

      // Verificar se já existe visita para este agendamento
      await this.checkExistingVisita(registrarDto.agendamento_id);

      // Validar regras de negócio
      this.validateBusinessRules(registrarDto);

      // Criar a visita
      const visita = this.visitaRepository.create({
        agendamento_id: registrarDto.agendamento_id,
        tipo_visita: registrarDto.tipo_visita,
        resultado: registrarDto.resultado,
        beneficiario_presente: registrarDto.beneficiario_presente,
        pessoa_atendeu: registrarDto.pessoa_atendeu,
        relacao_pessoa_atendeu: registrarDto.relacao_pessoa_atendeu,
        endereco_visitado: registrarDto.endereco_visitado,
        condicoes_habitacionais: registrarDto.condicoes_habitacionais ? { descricao: registrarDto.condicoes_habitacionais } : undefined,
        situacao_socioeconomica: registrarDto.situacao_socioeconomica ? { descricao: registrarDto.situacao_socioeconomica } : undefined,
        composicao_familiar_observada: registrarDto.composicao_familiar_observada ? { descricao: registrarDto.composicao_familiar_observada } : undefined,
        criterios_elegibilidade_mantidos: registrarDto.criterios_elegibilidade_mantidos,
        observacoes_criterios: registrarDto.observacoes_criterios,
        necessidades_identificadas: registrarDto.necessidades_identificadas ? [registrarDto.necessidades_identificadas] : undefined,
        encaminhamentos_realizados: registrarDto.encaminhamentos_realizados ? [registrarDto.encaminhamentos_realizados] : undefined,
        recomendacoes: registrarDto.recomendacoes,
        parecer_tecnico: registrarDto.parecer_tecnico,
        recomenda_renovacao: registrarDto.recomenda_renovacao,
        justificativa_recomendacao: registrarDto.justificativa_recomendacao,
        nota_avaliacao: registrarDto.nota_avaliacao,
        observacoes_gerais: registrarDto.observacoes_gerais,
        motivo_nao_realizacao: registrarDto.motivo_nao_realizacao,
        necessita_nova_visita: registrarDto.necessita_nova_visita,
        prazo_proxima_visita: registrarDto.prazo_proxima_visita ? registrarDto.prazo_proxima_visita.toString() : undefined,
        dados_complementares: registrarDto.dados_complementares,
        data_visita: new Date(registrarDto.data_visita),
        data_inicio: new Date(registrarDto.data_visita),
        created_at: new Date(),
        updated_at: new Date(),
      });

      const savedVisita = await this.visitaRepository.save(visita);

      // Atualizar status do agendamento
      await this.updateAgendamentoStatus(agendamento, registrarDto.resultado);

      this.logger.log(
        `Visita registrada com sucesso: ${savedVisita.id} para agendamento ${registrarDto.agendamento_id}`,
      );

      return this.buildResponseDto(savedVisita);
    } catch (error) {
      this.logger.error(
        `Erro ao registrar visita para agendamento ${registrarDto.agendamento_id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca todas as visitas com filtros opcionais
   * 
   * @param filters Filtros de busca
   * @returns Lista de visitas
   */
  async findAll(filters?: {
    beneficiario_id?: string;
    tecnico_id?: string;
    unidade_id?: string;
    resultado?: ResultadoVisita[];
    tipo_visita?: TipoVisita[];
    data_inicio?: Date;
    data_fim?: Date;
    recomenda_renovacao?: boolean;
    necessita_nova_visita?: boolean;
    criterios_elegibilidade_mantidos?: boolean;
  }): Promise<VisitaResponseDto[]> {
    try {
      const repositoryFilters = this.convertToRepositoryFilters(filters);
      const visitas = await this.visitaRepository.findWithFilters(repositoryFilters);

      return visitas.map((visita) => this.buildResponseDto(visita));
    } catch (error) {
      this.logger.error(`Erro ao buscar visitas: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Busca uma visita pelo ID
   * 
   * @param id ID da visita
   * @returns Dados da visita
   * @throws NotFoundException se não encontrada
   */
  async findById(id: string): Promise<VisitaResponseDto> {
    try {
      const visita = await this.visitaRepository.findByIdWithRelations(id);

      if (!visita) {
        throw new NotFoundException(`Visita com ID ${id} não encontrada`);
      }

      return this.buildResponseDto(visita);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Erro ao buscar visita ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Busca visitas por beneficiário
   * 
   * @param beneficiarioId ID do beneficiário
   * @returns Lista de visitas do beneficiário
   */
  async findByBeneficiario(beneficiarioId: string): Promise<VisitaResponseDto[]> {
    try {
      const visitas = await this.visitaRepository.findByBeneficiario(beneficiarioId);
      return visitas.map(visita => this.buildResponseDto(visita));
    } catch (error) {
      this.logger.error(`Erro ao buscar visitas por beneficiário ${beneficiarioId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Busca visitas por técnico
   * 
   * @param tecnicoId ID do técnico
   * @param dataInicio Data de início (opcional)
   * @param dataFim Data de fim (opcional)
   * @returns Lista de visitas do técnico
   */
  async findByTecnico(
    tecnicoId: string,
    dataInicio?: Date,
    dataFim?: Date,
  ): Promise<VisitaResponseDto[]> {
    try {
      const visitas = await this.visitaRepository.findByTecnico(tecnicoId, dataInicio, dataFim);
      return visitas.map(visita => this.buildResponseDto(visita));
    } catch (error) {
      this.logger.error(`Erro ao buscar visitas por técnico ${tecnicoId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Busca visitas que recomendam renovação
   * 
   * @returns Lista de visitas que recomendam renovação
   */
  async findRecomendamRenovacao(): Promise<VisitaResponseDto[]> {
    try {
      const visitas = await this.visitaRepository.findRecomendamRenovacao();
      return visitas.map(visita => this.buildResponseDto(visita));
    } catch (error) {
      this.logger.error(`Erro ao buscar visitas que recomendam renovação: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Busca visitas que necessitam nova visita
   * 
   * @returns Lista de visitas que necessitam nova visita
   */
  async findNecessitamNovaVisita(): Promise<VisitaResponseDto[]> {
    try {
      const visitas = await this.visitaRepository.findNecessitamNovaVisita();
      return visitas.map(visita => this.buildResponseDto(visita));
    } catch (error) {
      this.logger.error(`Erro ao buscar visitas que necessitam nova visita: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Busca visitas com critérios de elegibilidade não mantidos
   * 
   * @returns Lista de visitas com problemas de elegibilidade
   */
  async findComProblemasElegibilidade(): Promise<VisitaResponseDto[]> {
    try {
      const visitas = await this.visitaRepository.findComProblemasElegibilidade();
      return visitas.map(visita => this.buildResponseDto(visita));
    } catch (error) {
      this.logger.error(`Erro ao buscar visitas com problemas de elegibilidade: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Atualiza uma visita existente
   * 
   * @param id ID da visita
   * @param updateVisitaDto Dados para atualização
   * @returns Visita atualizada
   */
  async atualizar(
    id: string,
    updateVisitaDto: AtualizarVisitaDto,
  ): Promise<VisitaResponseDto> {
    try {
      const visita = await this.visitaRepository.findByIdWithRelations(id);

      if (!visita) {
        throw new NotFoundException(`Visita com ID ${id} não encontrada`);
      }

      // Validar regras de negócio se resultado foi alterado
      if (updateVisitaDto.resultado) {
        // Criar um objeto compatível com RegistrarVisitaDto para validação
        const visitaParaValidacao = {
          ...updateVisitaDto,
          agendamento_id: visita.agendamento_id,

        } as RegistrarVisitaDto;
        this.validateBusinessRules(visitaParaValidacao);
      }

      // Atualizar campos
      Object.assign(visita, updateVisitaDto, { updated_at: new Date() });

      const updatedVisita = await this.visitaRepository.save(visita);

      this.logger.log(`Visita ${id} atualizada com sucesso`);

      return this.buildResponseDto(updatedVisita);
    } catch (error) {
      this.logger.error(`Erro ao atualizar visita ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Valida o agendamento
   * 
   * @private
   * @param agendamentoId ID do agendamento
   * @returns Agendamento validado
   */
  private async validateAgendamento(agendamentoId: string): Promise<AgendamentoVisita> {
    const agendamento = await this.agendamentoRepository.findOne({
      where: { id: agendamentoId },
      relations: ['beneficiario', 'tecnico_responsavel', 'unidade'],
    });

    if (!agendamento) {
      throw new BadRequestException(
        `Agendamento com ID ${agendamentoId} não encontrado`,
      );
    }

    if (![StatusAgendamento.AGENDADO, StatusAgendamento.CONFIRMADO].includes(agendamento.status)) {
      throw new BadRequestException(
        `Agendamento não está em status válido para registro de visita. Status atual: ${agendamento.status}`,
      );
    }

    return agendamento;
  }

  /**
   * Verifica se já existe visita para o agendamento
   * 
   * @private
   * @param agendamentoId ID do agendamento
   */
  private async checkExistingVisita(agendamentoId: string): Promise<void> {
    const visitaExistente = await this.visitaRepository.findByAgendamentoId(agendamentoId);

    if (visitaExistente) {
      throw new ConflictException(
        'Já existe uma visita registrada para este agendamento'
      );
    }
  }

  /**
   * Busca visitas por critérios específicos
   * 
   * @param criterios Critérios de busca
   * @returns Lista de visitas que atendem aos critérios
   */
  async buscarPorCriterios(criterios: any): Promise<VisitaResponseDto[]> {
    try {
      const filtros = this.convertToRepositoryFilters(criterios);
      const visitas = await this.visitaRepository.findWithFilters(filtros);
      return visitas.map(visita => this.buildResponseDto(visita));
    } catch (error) {
      this.logger.error(`Erro ao buscar visitas por critérios: ${error.message}`);
      throw error;
    }
  }

  /**
   * Valida regras de negócio
   * 
   * @private
   * @param registrarDto Dados da visita
   */
  private validateBusinessRules(registrarDto: RegistrarVisitaDto): void {
    // Validar nota de avaliação
    if (registrarDto.nota_avaliacao < 0 || registrarDto.nota_avaliacao > 10) {
      throw new BadRequestException(
        'Nota de avaliação deve estar entre 0 e 10',
      );
    }

    // Se a visita não foi realizada, deve ter motivo
    if (registrarDto.resultado === ResultadoVisita.NAO_REALIZADA && !registrarDto.motivo_nao_realizacao) {
      throw new BadRequestException(
        'Motivo da não realização é obrigatório quando a visita não é realizada',
      );
    }

    // Se beneficiário não estava presente, deve informar quem atendeu
    if (!registrarDto.beneficiario_presente && !registrarDto.pessoa_atendeu) {
      throw new BadRequestException(
        'Deve informar quem atendeu quando o beneficiário não estava presente',
      );
    }

    // Se não recomenda renovação, deve ter justificativa
    if (!registrarDto.recomenda_renovacao && !registrarDto.justificativa_recomendacao) {
      throw new BadRequestException(
        'Justificativa é obrigatória quando não recomenda renovação',
      );
    }

    // Se necessita nova visita, deve ter prazo
    if (registrarDto.necessita_nova_visita && !registrarDto.prazo_proxima_visita) {
      throw new BadRequestException(
        'Prazo para próxima visita é obrigatório quando necessita nova visita',
      );
    }
  }

  /**
   * Atualiza o status do agendamento após registro da visita
   * 
   * @private
   * @param agendamento Agendamento a ser atualizado
   * @param resultado Resultado da visita
   */
  private async updateAgendamentoStatus(
    agendamento: AgendamentoVisita,
    resultado: ResultadoVisita,
  ): Promise<void> {
    let novoStatus: StatusAgendamento;

    switch (resultado) {
      case ResultadoVisita.CONFORME:
        novoStatus = StatusAgendamento.REALIZADO;
        break;
      case ResultadoVisita.NAO_REALIZADA:
        novoStatus = StatusAgendamento.NAO_REALIZADO;
        break;
      case ResultadoVisita.PARCIALMENTE_CONFORME:
        novoStatus = StatusAgendamento.REALIZADO;
        break;
      default:
        novoStatus = StatusAgendamento.REALIZADO;
    }

    agendamento.status = novoStatus;
    agendamento.updated_at = new Date();

    await this.agendamentoRepository.save(agendamento);

    // Atualizar campo 'monitorado' do pagamento quando visita tem resultado 'conforme'
    if (resultado === ResultadoVisita.CONFORME && agendamento.pagamento_id) {
      await this.updatePagamentoMonitorado(agendamento.pagamento_id);
    }
  }

  /**
   * Atualiza o campo 'monitorado' do pagamento para true
   * 
   * @param pagamentoId ID do pagamento a ser atualizado
   * @private
   */
  private async updatePagamentoMonitorado(pagamentoId: string): Promise<void> {
    try {
      await this.pagamentoRepository.update(
        { id: pagamentoId },
        {
          monitorado: true,
          updated_at: new Date()
        }
      );

      this.logger.log(
        `Campo 'monitorado' atualizado para true no pagamento: ${pagamentoId}`
      );
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar campo 'monitorado' do pagamento ${pagamentoId}: ${error.message}`,
        error.stack
      );
      // Não propagar o erro para não afetar o fluxo principal da visita
    }
  }

  /**
   * Busca todas as visitas com paginação
   */
  /**
   * Busca todas as visitas com paginação
   */
  async buscarTodas(
    filters: any,
    paginationParams?: PaginationParamsDto,
  ): Promise<PaginatedResponseDto<VisitaResponseDto>> {
    try {
      // Aplicar valores padrão e validar parâmetros de paginação
      const validatedParams = PaginationHelper.applyDefaults(paginationParams);

      const filtrosRepository = this.convertToRepositoryFilters(filters);

      const { items, total } = await this.visitaRepository.findWithFiltersAndPagination(
        filtrosRepository,
        validatedParams,
      );

      const visitasDto = items.map(visita => this.buildResponseDto(visita));

      return PaginationHelper.createPaginatedResponse(
        visitasDto,
        validatedParams.page,
        validatedParams.limit,
        total,
      );
    } catch (error) {
      this.logger.error(`Erro ao buscar todas as visitas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca todas as visitas (método legado para compatibilidade)
   * @deprecated Use buscarTodas com PaginationParamsDto
   */
  async buscarTodasLegacy(filters: any, page?: number, limit?: number): Promise<{ visitas: VisitaResponseDto[]; total: number }> {
    try {
      const filtrosRepository = this.convertToRepositoryFilters(filters);
      const result = await this.visitaRepository.findWithFilters(filtrosRepository);

      const visitasDto = result.map(visita => this.buildResponseDto(visita));

      return { visitas: visitasDto, total: visitasDto.length };
    } catch (error) {
      this.logger.error(`Erro ao buscar todas as visitas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca visita por ID
   */
  async buscarPorId(id: string): Promise<VisitaResponseDto> {
    const visita = await this.visitaRepository.findByIdWithRelations(id);

    if (!visita) {
      throw new NotFoundException(`Visita com ID ${id} não encontrada`);
    }

    return this.buildResponseDto(visita);
  }

  /**
   * Busca visitas por técnico com paginação
   */
  async buscarPorTecnico(
    tecnicoId: string,
    filters: any,
    paginationParams?: PaginationParamsDto,
  ): Promise<PaginatedResponseDto<VisitaResponseDto>> {
    return this.buscarTodas({ ...filters, tecnico_id: tecnicoId }, paginationParams);
  }

  /**
   * Busca visitas por técnico (método legado para compatibilidade)
   * @deprecated Use buscarPorTecnico com PaginationParamsDto
   */
  async buscarPorTecnicoLegacy(tecnicoId: string, filters: any, page?: number, limit?: number): Promise<{ visitas: VisitaResponseDto[]; total: number }> {
    return this.buscarTodasLegacy({ ...filters, tecnico_id: tecnicoId }, page, limit);
  }

  /**
   * Busca visitas por beneficiário com paginação
   */
  async buscarPorBeneficiario(
    beneficiarioId: string,
    filters: any,
    paginationParams?: PaginationParamsDto,
  ): Promise<PaginatedResponseDto<VisitaResponseDto>> {
    return this.buscarTodas({ ...filters, beneficiario_id: beneficiarioId }, paginationParams);
  }

  /**
   * Busca visitas por beneficiário (método legado para compatibilidade)
   * @deprecated Use buscarPorBeneficiario com PaginationParamsDto
   */
  async buscarPorBeneficiarioLegacy(beneficiarioId: string, filters: any, page?: number, limit?: number): Promise<{ visitas: VisitaResponseDto[]; total: number }> {
    return this.buscarTodasLegacy({ ...filters, beneficiario_id: beneficiarioId }, page, limit);
  }

  /**
   * Busca visitas por status com paginação
   */
  async buscarPorStatus(
    status: string,
    filters: any,
    paginationParams?: PaginationParamsDto,
  ): Promise<PaginatedResponseDto<VisitaResponseDto>> {
    return this.buscarTodas({ ...filters, resultado: status }, paginationParams);
  }

  /**
   * Busca visitas por status (método legado para compatibilidade)
   * @deprecated Use buscarPorStatus com PaginationParamsDto
   */
  async buscarPorStatusLegacy(
    status: string,
    filters: any,
    page?: number,
    limit?: number
  ): Promise<{ visitas: VisitaResponseDto[]; total: number }> {
    return this.buscarTodasLegacy({ ...filters, resultado: status }, page, limit);
  }

  /**
   * Converte filtros para o formato do repository
   * 
   * @private
   * @param filtros Filtros de entrada
   * @returns Filtros formatados para o repository
   */
  private convertToRepositoryFilters(filtros?: any): any {
    if (!filtros) return {};

    return {
      beneficiario_id: filtros.beneficiario_id,
      tecnico_id: filtros.tecnico_id || filtros.tecnico_id,
      unidade_id: filtros.unidade_id,
      resultado: filtros.resultado,
      tipo_visita: filtros.tipo || filtros.tipo_visita,
      data_inicio: filtros.data_inicio,
      data_fim: filtros.data_fim,
      recomenda_renovacao: filtros.recomenda_renovacao,
      necessita_nova_visita: filtros.necessita_nova_visita,
      problemas_elegibilidade: filtros.problemas_elegibilidade || filtros.criterios_elegibilidade_mantidos === false,
    };
  }

  /**
   * Remove uma visita domiciliar
   * 
   * @param id ID da visita
   * @throws NotFoundException se não encontrada
   */
  async delete(id: string): Promise<void> {
    const visita = await this.visitaRepository.findById(id);

    if (!visita) {
      throw new NotFoundException(`Visita com ID ${id} não encontrada`);
    }

    await this.visitaRepository.remove(visita);
  }

  /**
   * Busca visitas que recomendam renovação
   */
  /**
   * Busca visitas que recomendam renovação com paginação
   */
  async buscarQueRecomendamRenovacao(
    filtros: any,
    paginationParams?: PaginationParamsDto,
  ): Promise<PaginatedResponseDto<VisitaResponseDto>> {
    try {
      // Aplicar valores padrão e validar parâmetros de paginação
      const validatedParams = PaginationHelper.applyDefaults(paginationParams);

      const filtrosRepository = {
        ...this.convertToRepositoryFilters(filtros),
        recomenda_renovacao: true,
      };

      const { items, total } = await this.visitaRepository.findWithFiltersAndPagination(
        filtrosRepository,
        validatedParams,
      );

      const visitasDto = items.map(visita => this.buildResponseDto(visita));

      return PaginationHelper.createPaginatedResponse(
        visitasDto,
        validatedParams.page,
        validatedParams.limit,
        total,
      );
    } catch (error) {
      this.logger.error(`Erro ao buscar visitas que recomendam renovação: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca visitas que recomendam renovação (método legado para compatibilidade)
   * @deprecated Use buscarQueRecomendamRenovacao com PaginationParamsDto
   */
  async buscarQueRecomendamRenovacaoLegacy(
    filtros: any,
    page: number = 1,
    limit: number = 10
  ): Promise<{ visitas: VisitaResponseDto[]; total: number }> {
    const query = this.visitaRepository.createQueryBuilder('visita')
      .leftJoinAndSelect('visita.beneficiario', 'beneficiario')
      .leftJoinAndSelect('visita.tecnico_responsavel', 'tecnico')
      .leftJoinAndSelect('visita.unidade', 'unidade')
      .where('visita.recomenda_renovacao = :recomenda', { recomenda: true });

    if (filtros.unidade_id) {
      query.andWhere('visita.unidade_id = :unidadeId', { unidadeId: filtros.unidade_id });
    }

    if (filtros.data_inicio) {
      query.andWhere('visita.data_visita >= :dataInicio', { dataInicio: filtros.data_inicio });
    }

    if (filtros.data_fim) {
      query.andWhere('visita.data_visita <= :dataFim', { dataFim: filtros.data_fim });
    }

    const total = await query.getCount();
    const visitas = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      visitas: visitas.map(visita => this.buildResponseDto(visita)),
      total
    };
  }

  /**
   * Busca visitas que necessitam nova visita com paginação
   */
  async buscarQueNecessitamNovaVisita(
    filtros: any,
    paginationParams?: PaginationParamsDto,
  ): Promise<PaginatedResponseDto<VisitaResponseDto>> {
    try {
      // Aplicar valores padrão e validar parâmetros de paginação
      const validatedParams = PaginationHelper.applyDefaults(paginationParams);

      const filtrosRepository = {
        ...this.convertToRepositoryFilters(filtros),
        necessita_nova_visita: true,
      };

      const { items, total } = await this.visitaRepository.findWithFiltersAndPagination(
        filtrosRepository,
        validatedParams,
      );

      const visitasDto = items.map(visita => this.buildResponseDto(visita));

      return PaginationHelper.createPaginatedResponse(
        visitasDto,
        validatedParams.page,
        validatedParams.limit,
        total,
      );
    } catch (error) {
      this.logger.error(`Erro ao buscar visitas que necessitam nova visita: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca visitas que necessitam nova visita (método legado para compatibilidade)
   * @deprecated Use buscarQueNecessitamNovaVisita com PaginationParamsDto
   */
  async buscarQueNecessitamNovaVisitaLegacy(
    filtros: any,
    page: number = 1,
    limit: number = 10
  ): Promise<{ visitas: VisitaResponseDto[]; total: number }> {
    const query = this.visitaRepository.createQueryBuilder('visita')
      .leftJoinAndSelect('visita.beneficiario', 'beneficiario')
      .leftJoinAndSelect('visita.tecnico_responsavel', 'tecnico')
      .leftJoinAndSelect('visita.unidade', 'unidade')
      .where('visita.necessita_nova_visita = :necessita', { necessita: true });

    if (filtros.unidade_id) {
      query.andWhere('visita.unidade_id = :unidadeId', { unidadeId: filtros.unidade_id });
    }

    if (filtros.prazo_vencido) {
      query.andWhere('visita.prazo_nova_visita < :hoje', { hoje: new Date() });
    }

    const total = await query.getCount();
    const visitas = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      visitas: visitas.map(visita => this.buildResponseDto(visita)),
      total
    };
  }

  /**
   * Busca visitas com problemas de elegibilidade com paginação
   */
  async buscarComProblemasElegibilidade(
    filtros: any,
    paginationParams?: PaginationParamsDto,
  ): Promise<PaginatedResponseDto<VisitaResponseDto>> {
    try {
      // Aplicar valores padrão e validar parâmetros de paginação
      const validatedParams = PaginationHelper.applyDefaults(paginationParams);

      const filtrosRepository = {
        ...this.convertToRepositoryFilters(filtros),
        problemas_elegibilidade: true,
      };

      const { items, total } = await this.visitaRepository.findWithFiltersAndPagination(
        filtrosRepository,
        validatedParams,
      );

      const visitasDto = items.map(visita => this.buildResponseDto(visita));

      return PaginationHelper.createPaginatedResponse(
        visitasDto,
        validatedParams.page,
        validatedParams.limit,
        total,
      );
    } catch (error) {
      this.logger.error(`Erro ao buscar visitas com problemas de elegibilidade: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca visitas com problemas de elegibilidade (método legado para compatibilidade)
   * @deprecated Use buscarComProblemasElegibilidade com PaginationParamsDto
   */
  async buscarComProblemasElegibilidadeLegacy(
    filtros: any,
    page: number = 1,
    limit: number = 10
  ): Promise<{ visitas: VisitaResponseDto[]; total: number }> {
    const query = this.visitaRepository.createQueryBuilder('visita')
      .leftJoinAndSelect('visita.beneficiario', 'beneficiario')
      .leftJoinAndSelect('visita.tecnico_responsavel', 'tecnico')
      .leftJoinAndSelect('visita.unidade', 'unidade')
      .where('visita.problemas_elegibilidade = :problemas', { problemas: true });

    if (filtros.unidade_id) {
      query.andWhere('visita.unidade_id = :unidadeId', { unidadeId: filtros.unidade_id });
    }

    if (filtros.data_inicio) {
      query.andWhere('visita.data_visita >= :dataInicio', { dataInicio: filtros.data_inicio });
    }

    if (filtros.data_fim) {
      query.andWhere('visita.data_visita <= :dataFim', { dataFim: filtros.data_fim });
    }

    const total = await query.getCount();
    const visitas = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      visitas: visitas.map(visita => this.buildResponseDto(visita)),
      total
    };
  }

  /**
   * Atualiza uma visita existente
   */
  async atualizarVisita(
    id: string,
    dadosAtualizacao: Partial<RegistrarVisitaDto>
  ): Promise<VisitaResponseDto> {
    const visita = await this.visitaRepository.findOne({
      where: { id },
      relations: ['beneficiario', 'tecnico_responsavel', 'unidade']
    });

    if (!visita) {
      throw new NotFoundException('Visita não encontrada');
    }

    // Atualiza apenas os campos fornecidos
    Object.assign(visita, dadosAtualizacao);
    visita.updated_at = new Date();

    const visitaAtualizada = await this.visitaRepository.save(visita);

    return this.buildResponseDto(visitaAtualizada);
  }

  /**
   * Constrói o DTO de resposta
   * 
   * @private
   * @param visita Entidade da visita
   * @returns DTO de resposta formatado
   */
  /**
   * Mapeia uma visita domiciliar para o formato de resposta
   * 
   * @param visita Entidade da visita domiciliar
   * @returns DTO de resposta da visita
   */
  private mapearVisitaParaResponse(visita: VisitaDomiciliar): VisitaResponseDto {
    return this.buildResponseDto(visita);
  }

  private buildResponseDto(visita: VisitaDomiciliar): VisitaResponseDto {
    return {
      id: visita.id,
      agendamento_id: visita.agendamento_id,
      beneficiario: {
        id: visita.beneficiario_id,
        nome: visita.beneficiario?.nome || 'N/A',
        cpf: visita.beneficiario?.cpf || 'N/A'
      },
      tecnico: {
        id: visita.tecnico_id,
        nome: visita.tecnico_responsavel?.nome || 'N/A',
        email: visita.tecnico_responsavel?.email || 'N/A',
        role: visita.tecnico_responsavel?.role?.toString() || 'N/A'
      },
      unidade: {
        id: visita.unidade_id,
        nome: visita.unidade?.nome || 'N/A',
      },
      tipo_visita: visita.tipo_visita,
      tipo_visita_label: getTipoVisitaLabel(visita.tipo_visita),
      status: visita.status,
      data_inicio: visita.data_inicio,
      data_fim: visita.data_conclusao,
      resultado: visita.resultado,
      resultado_label: getResultadoVisitaLabel(visita.resultado),
      resultado_cor: getResultadoVisitaCor(visita.resultado),
      beneficiario_presente: visita.beneficiario_presente,
      pessoa_atendeu: visita.pessoa_atendeu,
      relacao_pessoa_atendeu: visita.relacao_pessoa_atendeu,
      endereco_visitado: visita.endereco_visitado,
      condicoes_habitacionais: visita.condicoes_habitacionais,
      situacao_socioeconomica: visita.situacao_socioeconomica,
      composicao_familiar_observada: visita.composicao_familiar_observada,
      criterios_elegibilidade_mantidos: visita.criterios_elegibilidade_mantidos,
      observacoes_criterios: visita.observacoes_criterios,
      necessidades_identificadas: visita.necessidades_identificadas,
      encaminhamentos_realizados: visita.encaminhamentos_realizados,
      recomendacoes: visita.recomendacoes,
      parecer_tecnico: visita.parecer_tecnico,
      recomenda_renovacao: visita.recomenda_renovacao,
      justificativa_recomendacao: visita.justificativa_recomendacao,
      nota_avaliacao: visita.nota_avaliacao,
      observacoes_gerais: visita.observacoes_gerais,
      motivo_nao_realizacao: visita.motivo_nao_realizacao,
      necessita_nova_visita: visita.necessita_nova_visita,
      prazo_proxima_visita: visita.prazo_proxima_visita,
      pontuacao_risco: visita.calcularPontuacaoRisco(),
      conformidade_criterios: visita.verificarConformidadeCriterios(),
      necessita_acao_imediata: visita.necessitaAcaoImediata(),
      created_at: visita.created_at.toISOString(),
      updated_at: visita.updated_at.toISOString(),
      dados_complementares: visita.dados_complementares,
    };
  }

  /**
   * Aplica filtros avançados para busca de visitas domiciliares
   * 
   * @param filtros Critérios de filtros avançados
   * @returns Resultado da busca com estatísticas e opções de filtro
   */
  async aplicarFiltrosAvancados(filtros: VisitaFiltrosAvancadosDto): Promise<VisitaFiltrosResponseDto> {
    const queryBuilder = this.visitaEntityRepository.createQueryBuilder('visita')
      .leftJoinAndSelect('visita.agendamento', 'agendamento')
      .leftJoinAndSelect('visita.beneficiario', 'beneficiario')
      .leftJoinAndSelect('visita.tecnico_responsavel', 'tecnico')
      .leftJoinAndSelect('agendamento.pagamento', 'pagamento')
      .leftJoinAndSelect('pagamento.solicitacao', 'solicitacao')
      .leftJoinAndSelect('solicitacao.unidade', 'unidade')

    // Aplicar filtros condicionais
    if (filtros.unidades?.length) {
      queryBuilder.andWhere('unidade.id IN (:...unidades)', { unidades: filtros.unidades });
    }

    if (filtros.tipos_visita?.length) {
      queryBuilder.andWhere('visita.tipo_visita IN (:...tipos)', { tipos: filtros.tipos_visita });
    }

    if (filtros.resultados?.length) {
      queryBuilder.andWhere('visita.resultado IN (:...resultados)', { resultados: filtros.resultados });
    }

    if (filtros.tecnicos?.length) {
      queryBuilder.andWhere('tecnico.id IN (:...tecnicos)', { tecnicos: filtros.tecnicos });
    }

    if (filtros.beneficiarios?.length) {
      queryBuilder.andWhere('beneficiario.id IN (:...beneficiarios)', { beneficiarios: filtros.beneficiarios });
    }

    // Filtros de período
    if (filtros.periodo) {
      const { dataInicio, dataFim } = this.filtrosAvancadosService.calcularPeriodoPredefinido(filtros.periodo);
      queryBuilder.andWhere('visita.data_realizacao BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim
      });
    } else if (filtros.data_inicio && filtros.data_fim) {
      queryBuilder.andWhere('visita.data_realizacao BETWEEN :dataInicio AND :dataFim', {
        dataInicio: filtros.data_inicio,
        dataFim: filtros.data_fim
      });
    }

    // Filtro de busca textual
    if (filtros.search) {
      queryBuilder.andWhere(
        '(beneficiario.nome ILIKE :search OR beneficiario.cpf ILIKE :search OR visita.observacoes_gerais ILIKE :search OR visita.parecer_tecnico ILIKE :search)',
        { search: `%${filtros.search}%` }
      );
    }

    // Filtros booleanos
    if (filtros.recomenda_renovacao !== undefined) {
      queryBuilder.andWhere('visita.recomenda_renovacao = :recomenda', { recomenda: filtros.recomenda_renovacao });
    }

    if (filtros.necessita_nova_visita !== undefined) {
      queryBuilder.andWhere('visita.necessita_nova_visita = :necessita', { necessita: filtros.necessita_nova_visita });
    }

    if (filtros.beneficiario_presente !== undefined) {
      queryBuilder.andWhere('visita.beneficiario_presente = :presente', { presente: filtros.beneficiario_presente });
    }

    // Ordenação
    const sortBy = filtros.sort_by || 'data_realizacao';
    const sortOrder = filtros.sort_order || 'DESC';
    queryBuilder.orderBy(`visita.${sortBy}`, sortOrder);

    // Paginação
    const page = filtros.page || 1;
    const limit = filtros.limit || 20;
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);

    // Executar consulta
    const [visitas, total] = await queryBuilder.getManyAndCount();

    // Calcular estatísticas
    const estatisticas = await this.calcularEstatisticasVisitas();

    // Obter opções de filtro
    const opcoesFilter = await this.obterOpcoesFilterVisitas();

    // Calcular metadados de paginação
    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;

    return {
      data: visitas.map(visita => this.mapearVisitaParaResponse(visita)),
      meta: {
        limit,
        total,
        page,
        pages,
        hasNext,
        hasPrev
      },
      estatisticas,
      opcoes_filtro: opcoesFilter
    };
  }

  /**
   * Calcula estatísticas gerais das visitas
   */
  private async calcularEstatisticasVisitas() {
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const fimHoje = new Date(inicioHoje.getTime() + 24 * 60 * 60 * 1000 - 1);

    const [totalVisitas, visitasRealizadas, visitasNaoLocalizadas, visitasHoje, renovacoesRecomendadas, novasVisitasNecessarias] = await Promise.all([
      this.visitaRepository.count(),
      this.visitaRepository.count({ resultado: [ResultadoVisita.REALIZADA_COM_SUCESSO] }),
      this.visitaRepository.count({ resultado: [ResultadoVisita.ENDERECO_NAO_LOCALIZADO] }),
      this.visitaRepository.count({
        data_inicio: inicioHoje,
        data_fim: fimHoje
      }),
      this.visitaRepository.count({ recomenda_renovacao: true }),
      this.visitaRepository.count({ necessita_nova_visita: true })
    ]);

    return {
      total_visitas: totalVisitas,
      visitas_realizadas: visitasRealizadas,
      visitas_nao_localizadas: visitasNaoLocalizadas,
      visitas_hoje: visitasHoje,
      renovacoes_recomendadas: renovacoesRecomendadas,
      novas_visitas_necessarias: novasVisitasNecessarias
    };
  }

  /**
   * Obtém opções disponíveis para filtros
   */
  private async obterOpcoesFilterVisitas() {
    // Obter unidades com contagem de visitas
    const unidades = await this.visitaRepository
      .createQueryBuilder('visita')
      .leftJoin('visita.agendamento', 'agendamento')
      .leftJoin('agendamento.beneficiario', 'beneficiario')
      .leftJoin('beneficiario.unidade', 'unidade')
      .select('unidade.id', 'id')
      .addSelect('unidade.nome', 'nome')
      .addSelect('COUNT(visita.id)', 'total_visitas')
      .where('unidade.id IS NOT NULL')
      .groupBy('unidade.id')
      .addGroupBy('unidade.nome')
      .getRawMany();

    // Obter tipos de visita com contagem
    const tiposVisita = await this.visitaRepository
      .createQueryBuilder('visita')
      .select('visita.tipo_visita', 'tipo')
      .addSelect('COUNT(*)', 'total')
      .groupBy('visita.tipo_visita')
      .getRawMany();

    // Obter resultados com contagem
    const resultados = await this.visitaRepository
      .createQueryBuilder('visita')
      .select('visita.resultado', 'resultado')
      .addSelect('COUNT(*)', 'total')
      .groupBy('visita.resultado')
      .getRawMany();

    // Obter técnicos com contagem de visitas
    const tecnicos = await this.visitaRepository
      .createQueryBuilder('visita')
      .leftJoin('visita.tecnico_responsavel', 'tecnico')
      .select('tecnico.id', 'id')
      .addSelect('tecnico.nome', 'nome')
      .addSelect('COUNT(visita.id)', 'total_visitas')
      .where('tecnico.id IS NOT NULL')
      .groupBy('tecnico.id')
      .addGroupBy('tecnico.nome')
      .getRawMany();

    return {
      unidades: unidades.map(u => ({
        id: u.id,
        nome: u.nome,
        total_visitas: parseInt(u.total_visitas)
      })),
      tipos_visita: tiposVisita.map(t => ({
        tipo: t.tipo,
        total: parseInt(t.total)
      })),
      resultados: resultados.map(r => ({
        resultado: r.resultado,
        total: parseInt(r.total)
      })),
      tecnicos: tecnicos.map(t => ({
        id: t.id,
        nome: t.nome,
        total_visitas: parseInt(t.total_visitas)
      })),
      periodos_disponiveis: Object.values(PeriodoPredefinido)
    };
  }
}