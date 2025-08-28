import { Injectable, Logger } from '@nestjs/common';
import {
  throwUnidadeNotFound,
  throwUnidadeAlreadyExists,
  throwUnidadeOperationFailed,
} from '../../../shared/exceptions/error-catalog/domains/unidade.errors';
import { DataSource, ILike } from 'typeorm';
import { TipoUnidade, StatusUnidade } from '../../../entities/unidade.entity';
import { UnidadeRepository } from '../repositories/unidade.repository';
import { SetorRepository } from '../repositories/setor.repository';
import { CreateUnidadeDto } from '../dto/create-unidade.dto';
import { UpdateUnidadeDto } from '../dto/update-unidade.dto';
import { UpdateStatusUnidadeDto } from '../dto/update-status-unidade.dto';
import {
  UnidadeFiltrosAvancadosDto,
  UnidadeFiltrosResponseDto,
} from '../dto/unidade-filtros-avancados.dto';
import { normalizeEnumFields } from '../../../shared/utils/enum-normalizer.util';
import { FiltrosAvancadosService } from '../../../common/services/filtros-avancados.service';

/**
 * Serviço de unidades
 *
 * Responsável pela lógica de negócio relacionada a unidades
 */
@Injectable()
export class UnidadeService {
  private readonly logger = new Logger(UnidadeService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly unidadeRepository: UnidadeRepository,
    private readonly setorRepository: SetorRepository,
    private readonly filtrosAvancadosService: FiltrosAvancadosService,
  ) {}

  /**
   * Busca todas as unidades com filtros e paginação
   * @param options Opções de filtro e paginação
   * @returns Lista de unidades paginada
   */
  async findAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
    tipo?: string;
    status?: string;
  }) {
    const { page = 1, limit = 10, search, tipo, status } = options || {};

    // Construir filtros
    const where: {
      nome?: any;
      tipo?: TipoUnidade;
      status?: StatusUnidade;
    } = {};

    if (search) {
      where.nome = ILike(`%${search}%`);
    }

    if (tipo) {
      where.tipo = tipo as TipoUnidade;
    }

    if (status) {
      where.status = status as StatusUnidade;
    }

    // Calcular skip para paginação
    const skip = (page - 1) * limit;

    // Buscar unidades
    const [unidades, total] = await this.unidadeRepository.findAll({
      skip,
      take: limit,
      where,
    });

    return {
      items: unidades,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca uma unidade pelo ID
   * @param id ID da unidade
   * @returns Unidade encontrada
   */
  async findById(id: string) {
    const unidade = await this.unidadeRepository.findById(id);

    if (!unidade) {
      throwUnidadeNotFound(id);
    }

    return unidade;
  }

  /**
   * Cria uma nova unidade
   * @param createUnidadeDto Dados da unidade
   * @returns Unidade criada
   */
  async create(createUnidadeDto: CreateUnidadeDto) {
    this.logger.log(
      `Iniciando criação de unidade: ${JSON.stringify(createUnidadeDto)}`,
    );

    // Verificar se código já existe
    const codigoExistente = await this.unidadeRepository.findByCodigo(
      createUnidadeDto.codigo,
    );
    if (codigoExistente) {
      this.logger.warn(`Código ${createUnidadeDto.codigo} já está em uso`);
      throwUnidadeAlreadyExists({ codigo: createUnidadeDto.codigo });
    }

    try {
      // Usar transação para garantir consistência
      return await this.dataSource.transaction(async (manager) => {
        // Normalizar campos de enum antes de criar
        const normalizedData = normalizeEnumFields(createUnidadeDto);

        // Criar unidade usando o manager da transação
        const unidadeRepo = manager.getRepository('unidade');
        const unidade = unidadeRepo.create(normalizedData);

        const unidadeSalva = await unidadeRepo.save(unidade);
        this.logger.log(`Unidade criada com sucesso: ${unidadeSalva.id}`);

        return unidadeSalva;
      });
    } catch (error) {
      this.logger.error(`Erro ao criar unidade: ${error.message}`, error.stack);
      throwUnidadeOperationFailed({ unidadeId: undefined });
    }
  }

  /**
   * Atualiza uma unidade existente
   * @param id ID da unidade
   * @param updateUnidadeDto Dados a serem atualizados
   * @returns Unidade atualizada
   */
  async update(id: string, updateUnidadeDto: UpdateUnidadeDto) {
    this.logger.log(
      `Iniciando atualização da unidade ${id}: ${JSON.stringify(updateUnidadeDto)}`,
    );

    // Verificar se unidade existe
    const unidade = await this.unidadeRepository.findById(id);
    if (!unidade) {
      this.logger.warn(`Unidade não encontrada: ${id}`);
      throwUnidadeNotFound(id);
    }

    // Verificar se código já existe (se fornecido)
    if (updateUnidadeDto.codigo && updateUnidadeDto.codigo !== unidade.codigo) {
      const codigoExistente = await this.unidadeRepository.findByCodigo(
        updateUnidadeDto.codigo,
      );
      if (codigoExistente) {
        this.logger.warn(`Código ${updateUnidadeDto.codigo} já está em uso`);
        throwUnidadeAlreadyExists({ codigo: updateUnidadeDto.codigo });
      }
    }

    try {
      // Usar transação para garantir consistência
      return await this.dataSource.transaction(async (manager) => {
        // Normalizar campos de enum antes de atualizar
        const normalizedData = normalizeEnumFields(updateUnidadeDto);

        // Atualizar unidade usando o manager da transação
        const unidadeRepo = manager.getRepository('unidade');
        await unidadeRepo.update(id, normalizedData);

        const unidadeAtualizada = await unidadeRepo.findOne({ where: { id } });
        if (!unidadeAtualizada) {
          throwUnidadeNotFound(id);
        }

        this.logger.log(`Unidade ${id} atualizada com sucesso`);
        return unidadeAtualizada;
      });
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar unidade ${id}: ${error.message}`,
        error.stack,
      );
      // Re-throw erros do catálogo
      if (error.name === 'AppError') {
        throw error;
      }
      throwUnidadeOperationFailed({ unidadeId: id });
    }
  }

  /**
   * Atualiza o status de uma unidade
   * @param id ID da unidade
   * @param updateStatusUnidadeDto Novo status
   */
  async updateStatus(
    id: string,
    updateStatusUnidadeDto: UpdateStatusUnidadeDto,
  ) {
    this.logger.log(
      `Iniciando atualização de status da unidade ${id}: ${updateStatusUnidadeDto.status}`,
    );

    // Verificar se a unidade existe
    const unidade = await this.findById(id);
    if (!unidade) {
      this.logger.warn(`Unidade não encontrada: ${id}`);
      throwUnidadeNotFound(id);
    }

    // Verificar se há usuários vinculados à unidade (se estiver inativando)
    if (updateStatusUnidadeDto.status === 'inativo') {
      this.logger.log(
        `Verificando usuários vinculados à unidade ${id} antes de inativar`,
      );
      // Essa verificação seria implementada com um repositório de usuários
      // Por enquanto, vamos apenas registrar a intenção
      this.logger.log(
        `Verificação de usuários vinculados pendente de implementação`,
      );
    }

    try {
      // Usar transação para garantir consistência
      return await this.dataSource.transaction(async (manager) => {
        // Atualizar status usando o manager da transação
        const unidadeRepo = manager.getRepository('unidade');
        await unidadeRepo.update(id, { status: updateStatusUnidadeDto.status });

        const unidadeAtualizada = await unidadeRepo.findOne({ where: { id } });
        if (!unidadeAtualizada) {
          throwUnidadeNotFound(id);
        }

        this.logger.log(
          `Status da unidade ${id} atualizado para ${updateStatusUnidadeDto.status}`,
        );
        return unidadeAtualizada;
      });
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar status da unidade ${id}: ${error.message}`,
        error.stack,
      );
      // Re-throw erros do catálogo
      if (error.name === 'AppError') {
        throw error;
      }
      throwUnidadeOperationFailed({ unidadeId: id });
    }
  }

  /**
   * Busca avançada de unidades com filtros complexos
   * @param filtros Filtros avançados para busca
   * @returns Resultado da busca com metadados
   */
  async filtrosAvancados(
    filtros: UnidadeFiltrosAvancadosDto,
  ): Promise<Omit<UnidadeFiltrosResponseDto, 'execution_time_ms'>> {
    this.logger.log(
      `Iniciando busca avançada de unidades: ${JSON.stringify(filtros)}`,
    );

    // Construir query base
    const queryBuilder = this.dataSource
      .getRepository('unidade')
      .createQueryBuilder('unidade');

    // Aplicar filtros usando o serviço de filtros avançados
    const queryComFiltros = await this.filtrosAvancadosService.aplicarFiltros(
      queryBuilder,
      filtros
    );

    // Executar query para obter resultados
    const [unidades, total] = await queryComFiltros.getManyAndCount();

    // Calcular metadados de paginação
    const totalPages = Math.ceil(total / filtros.limit);
    const hasNextPage = filtros.page < totalPages;
    const hasPreviousPage = filtros.page > 1;

    this.logger.log(
      `Busca avançada concluída: ${unidades.length} unidades encontradas de ${total} total`,
    );

    return {
      items: unidades,
      total,
      filtros_aplicados: {
        status: filtros.status || [],
        tipo: filtros.tipo || [],
        search: filtros.search || null,
      },
      meta: {
        page: filtros.page,
        offset: (filtros.page - 1) * filtros.limit,
        limit: filtros.limit,
        totalPages: totalPages,
        total,
        hasNextPage,
        hasPreviousPage,
      },
      tempo_execucao: 0,
    };
  }

  /**
   * Busca os setores de uma unidade
   * @param unidadeId ID da unidade
   * @returns Lista de setores da unidade
   */
  async findSetoresByUnidadeId(unidadeId: string) {
    // Verificar se unidade existe
    const unidade = await this.findById(unidadeId);
    if (!unidade) {
      throwUnidadeNotFound(unidadeId);
    }

    // Buscar setores
    const setores = await this.setorRepository.findByUnidadeId(unidadeId);

    return {
      items: setores,
      meta: {
        total: setores.length,
      },
    };
  }
}
