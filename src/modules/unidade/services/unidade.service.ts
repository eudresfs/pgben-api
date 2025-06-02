import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UnidadeRepository } from '../repositories/unidade.repository';
import { SetorRepository } from '../repositories/setor.repository';
import { CreateUnidadeDto } from '../dto/create-unidade.dto';
import { UpdateUnidadeDto } from '../dto/update-unidade.dto';
import { UpdateStatusUnidadeDto } from '../dto/update-status-unidade.dto';
import { normalizeEnumFields } from '../../../shared/utils/enum-normalizer.util';

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
    const where: any = {};

    if (search) {
      where.nome = { $iLike: `%${search}%` };
    }

    if (tipo) {
      where.tipo = tipo;
    }

    if (status) {
      where.status = status;
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
      throw new NotFoundException('Unidade não encontrada');
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
      throw new ConflictException('Código já está em uso');
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
      throw new InternalServerErrorException(
        'Falha ao criar unidade. Por favor, tente novamente.',
      );
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
      throw new NotFoundException('Unidade não encontrada');
    }

    // Verificar se código já existe (se fornecido)
    if (updateUnidadeDto.codigo && updateUnidadeDto.codigo !== unidade.codigo) {
      const codigoExistente = await this.unidadeRepository.findByCodigo(
        updateUnidadeDto.codigo,
      );
      if (codigoExistente) {
        this.logger.warn(`Código ${updateUnidadeDto.codigo} já está em uso`);
        throw new ConflictException('Código já está em uso');
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
          throw new NotFoundException(
            'Unidade não encontrada após atualização',
          );
        }

        this.logger.log(`Unidade ${id} atualizada com sucesso`);
        return unidadeAtualizada;
      });
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar unidade ${id}: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Falha ao atualizar unidade. Por favor, tente novamente.',
      );
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
      throw new NotFoundException(`Unidade com ID ${id} não encontrada`);
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
          throw new NotFoundException(
            'Unidade não encontrada após atualização de status',
          );
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
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Falha ao atualizar status da unidade. Por favor, tente novamente.',
      );
    }
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
      throw new NotFoundException(`Unidade com ID ${unidadeId} não encontrada`);
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
