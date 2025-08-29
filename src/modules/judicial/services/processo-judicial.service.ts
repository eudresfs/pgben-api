import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, FindManyOptions, Like } from 'typeorm';
import {
  ProcessoJudicial,
  StatusProcessoJudicial,
} from '../../../entities/processo-judicial.entity';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';

/**
 * Serviço para gerenciamento de processos judiciais
 *
 * Este serviço implementa operações CRUD e consultas específicas
 * para processos judiciais, incluindo busca por número, cidadão e status.
 */
@Injectable()
export class ProcessoJudicialService {
  private readonly logger = new Logger(ProcessoJudicialService.name);

  constructor(
    @InjectRepository(ProcessoJudicial)
    private readonly processoJudicialRepository: Repository<ProcessoJudicial>,
  ) {}

  /**
   * Cria um novo processo judicial
   *
   * @param data Dados do processo judicial a ser criado
   * @param usuarioId ID do usuário que está criando o processo
   * @returns O processo judicial criado
   */
  async create(
    data: Partial<ProcessoJudicial>,
    usuarioId: string,
  ): Promise<ProcessoJudicial> {
    this.logger.log(`Criando processo judicial: ${JSON.stringify(data)}`);

    // Verificar se já existe um processo com o mesmo número
    const existente = await this.processoJudicialRepository.findOne({
      where: { numero_processo: data.numero_processo },
    });

    if (existente) {
      throw new BadRequestException(
        `Já existe um processo judicial com o número: ${data.numero_processo}`,
      );
    }

    // Criar o novo processo
    const novoProcesso = this.processoJudicialRepository.create({
      ...data,
      created_by: usuarioId,
      updated_by: usuarioId,
    });

    return this.processoJudicialRepository.save(novoProcesso);
  }

  /**
   * Busca um processo judicial pelo ID
   *
   * @param id ID do processo judicial
   * @returns O processo judicial encontrado
   * @throws NotFoundException se o processo não for encontrado
   */
  async findById(id: string): Promise<ProcessoJudicial> {
    const processo = await this.processoJudicialRepository.findOne({
      where: { id },
      relations: ['determinacoes'],
    });

    if (!processo) {
      throw new NotFoundException(
        `Processo judicial com ID ${id} não encontrado`,
      );
    }

    return processo;
  }

  /**
   * Busca um processo judicial pelo número do processo
   *
   * @param numeroProcesso Número do processo judicial
   * @returns O processo judicial encontrado
   * @throws NotFoundException se o processo não for encontrado
   */
  async findByNumeroProcesso(
    numeroProcesso: string,
  ): Promise<ProcessoJudicial> {
    const processo = await this.processoJudicialRepository.findOne({
      where: { numero_processo: numeroProcesso },
      relations: ['determinacoes'],
    });

    if (!processo) {
      throw new NotFoundException(
        `Processo judicial número ${numeroProcesso} não encontrado`,
      );
    }

    return processo;
  }

  /**
   * Lista processos judiciais com paginação e filtros
   *
   * @param options Opções de busca e paginação
   * @returns Lista paginada de processos judiciais
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    cidadaoId?: string;
    status?: StatusProcessoJudicial;
    comarca?: string;
    vara?: string;
    termo?: string;
  }): Promise<PaginatedResult<ProcessoJudicial>> {
    const {
      page = 1,
      limit = 10,
      cidadaoId,
      status,
      comarca,
      vara,
      termo,
    } = options;

    const where: FindOptionsWhere<ProcessoJudicial> = {};

    // Aplicar filtros
    if (cidadaoId) {
      where.cidadao_id = cidadaoId;
    }

    if (status) {
      where.status = status;
    }

    if (comarca) {
      where.comarca = comarca;
    }

    if (vara) {
      where.vara_judicial = vara;
    }

    const findOptions: FindManyOptions<ProcessoJudicial> = {
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: {
        created_at: 'DESC',
      },
    };

    // Aplicar busca por texto, se fornecido
    if (termo) {
      findOptions.where = [
        { ...where, numero_processo: Like(`%${termo}%`) },
        { ...where, objeto: Like(`%${termo}%`) },
        { ...where, observacao: Like(`%${termo}%`) },
      ];
    }

    const [processos, total] =
      await this.processoJudicialRepository.findAndCount(findOptions);

    return {
      data: processos,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Atualiza um processo judicial
   *
   * @param id ID do processo judicial
   * @param data Dados atualizados do processo
   * @param usuarioId ID do usuário que está atualizando o processo
   * @returns O processo judicial atualizado
   * @throws NotFoundException se o processo não for encontrado
   */
  async update(
    id: string,
    data: Partial<ProcessoJudicial>,
    usuarioId: string,
  ): Promise<ProcessoJudicial> {
    const processo = await this.findById(id);

    // Verificar se está tentando alterar o número do processo para um número já existente
    if (
      data.numero_processo &&
      data.numero_processo !== processo.numero_processo
    ) {
      const existente = await this.processoJudicialRepository.findOne({
        where: { numero_processo: data.numero_processo },
      });

      if (existente) {
        throw new BadRequestException(
          `Já existe um processo judicial com o número: ${data.numero_processo}`,
        );
      }
    }

    this.logger.log(
      `Atualizando processo judicial ${id}: ${JSON.stringify(data)}`,
    );

    // Atualizar os dados do processo
    this.processoJudicialRepository.merge(processo, {
      ...data,
      updated_by: usuarioId,
    });

    return this.processoJudicialRepository.save(processo);
  }

  /**
   * Atualiza o status de um processo judicial
   *
   * @param id ID do processo judicial
   * @param status Novo status do processo
   * @param usuarioId ID do usuário que está realizando a atualização
   * @returns O processo judicial atualizado
   * @throws NotFoundException se o processo não for encontrado
   */
  async updateStatus(
    id: string,
    status: StatusProcessoJudicial,
    usuarioId: string,
  ): Promise<ProcessoJudicial> {
    const processo = await this.findById(id);

    this.logger.log(
      `Atualizando status do processo judicial ${id} para ${status}`,
    );

    processo.status = status;
    processo.updated_by = usuarioId;

    // Se o status for CONCLUIDO, atualiza a data de conclusão
    if (status === StatusProcessoJudicial.CONCLUIDO) {
      processo.data_conclusao = new Date();
    }

    return this.processoJudicialRepository.save(processo);
  }

  /**
   * Busca processos judiciais por cidadão
   *
   * @param cidadaoId ID do cidadão
   * @returns Lista de processos judiciais do cidadão
   */
  async findByCidadao(cidadaoId: string): Promise<ProcessoJudicial[]> {
    this.logger.log(`Buscando processos judiciais do cidadão ${cidadaoId}`);

    return this.processoJudicialRepository.find({
      where: { cidadao_id: cidadaoId, ativo: true },
      order: { data_distribuicao: 'DESC' },
      relations: ['determinacoes'],
    });
  }

  /**
   * Desativa (soft delete) um processo judicial
   *
   * @param id ID do processo judicial
   * @param usuarioId ID do usuário que está desativando o processo
   * @returns Verdadeiro se a operação foi bem-sucedida
   * @throws NotFoundException se o processo não for encontrado
   */
  async desativar(id: string, usuarioId: string): Promise<boolean> {
    const processo = await this.findById(id);

    this.logger.log(`Desativando processo judicial ${id}`);

    // Desativar o processo
    processo.ativo = false;
    processo.updated_by = usuarioId;

    await this.processoJudicialRepository.save(processo);
    return true;
  }

  /**
   * Retorna estatísticas dos processos judiciais
   *
   * @returns Estatísticas agregadas dos processos
   */
  async getEstatisticas(): Promise<{
    total: number;
    porStatus: Record<StatusProcessoJudicial, number>;
    porComarca: Record<string, number>;
  }> {
    // Total de processos
    const total = await this.processoJudicialRepository.count({
      where: { ativo: true },
    });

    // Contagem por status
    const statusCounts = await this.processoJudicialRepository
      .createQueryBuilder('processo')
      .select('processo.status', 'status')
      .addSelect('COUNT(processo.id)', 'count')
      .where('processo.ativo = :ativo', { ativo: true })
      .groupBy('processo.status')
      .getRawMany();

    const porStatus = Object.values(StatusProcessoJudicial).reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<StatusProcessoJudicial, number>,
    );

    statusCounts.forEach((item) => {
      porStatus[item.status] = parseInt(item.count);
    });

    // Contagem por comarca
    const comarcaCounts = await this.processoJudicialRepository
      .createQueryBuilder('processo')
      .select('processo.comarca', 'comarca')
      .addSelect('COUNT(processo.id)', 'count')
      .where('processo.ativo = :ativo', { ativo: true })
      .groupBy('processo.comarca')
      .getRawMany();

    const porComarca = comarcaCounts.reduce(
      (acc, item) => {
        acc[item.comarca] = parseInt(item.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total,
      porStatus,
      porComarca,
    };
  }
}
