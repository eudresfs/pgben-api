import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, Not } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ComposicaoFamiliar } from '../../../entities/composicao-familiar.entity';
import { Cidadao } from '../../../entities/cidadao.entity';
import { CreateComposicaoFamiliarDto } from '../dto/create-composicao-familiar.dto';
import { UpdateComposicaoFamiliarDto } from '../dto/update-composicao-familiar.dto';
import {
  ComposicaoFamiliarResponseDto,
  ComposicaoFamiliarPaginatedResponseDto,
} from '../dto/composicao-familiar-response.dto';
import { CacheService } from '../../../shared/cache';
import { CPFValidator } from '../validators/cpf-validator';
import { normalizeEnumFields } from '../../../shared/utils/enum-normalizer.util';

/**
 * Serviço de Composição Familiar
 *
 * Responsável pela lógica de negócio relacionada aos membros da composição familiar dos cidadãos.
 * Implementa operações CRUD completas com validações específicas, cache e auditoria.
 */
@Injectable()
export class ComposicaoFamiliarService {
  private readonly logger = new Logger(ComposicaoFamiliarService.name);
  private readonly CACHE_TTL = 3600; // 1 hora
  private readonly CACHE_PREFIX = 'composicao_familiar:';

  constructor(
    @InjectRepository(ComposicaoFamiliar)
    private readonly composicaoFamiliarRepository: Repository<ComposicaoFamiliar>,
    @InjectRepository(Cidadao)
    private readonly cidadaoRepository: Repository<Cidadao>,
    private readonly cacheService: CacheService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Cria um novo membro da composição familiar
   * @param createComposicaoFamiliarDto Dados do membro familiar
   * @param userId ID do usuário que está criando
   * @returns Membro da composição familiar criado
   */
  async create(
    createComposicaoFamiliarDto: CreateComposicaoFamiliarDto,
    userId: string,
  ): Promise<ComposicaoFamiliarResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validar se o cidadão existe
      const cidadao = await this.cidadaoRepository.findOne({
        where: { id: createComposicaoFamiliarDto.cidadao_id },
      });

      if (!cidadao) {
        throw new NotFoundException('Cidadão não encontrado');
      }

      // Validar CPF
      const cpfLimpo = createComposicaoFamiliarDto.cpf.replace(/\D/g, '');
      const cpfValidator = new CPFValidator();
      if (!cpfValidator.validate(cpfLimpo, {} as any)) {
        throw new BadRequestException('CPF inválido');
      }

      // Verificar se já existe membro com o mesmo CPF na composição familiar do cidadão
      const membroExistente = await this.composicaoFamiliarRepository.findOne({
        where: {
          cidadao_id: createComposicaoFamiliarDto.cidadao_id,
          cpf: cpfLimpo,
          removed_at: IsNull(),
        },
      });

      if (membroExistente) {
        throw new ConflictException(
          'Já existe um membro com este CPF na composição familiar',
        );
      }

      // Verificar se o CPF não é o mesmo do cidadão responsável
      if (cidadao.cpf === cpfLimpo) {
        throw new ConflictException(
          'O CPF do membro não pode ser igual ao CPF do cidadão responsável',
        );
      }

      // Validar se o nome não é duplicado na mesma composição familiar
      const nomeExistente = await this.composicaoFamiliarRepository.findOne({
        where: {
          cidadao_id: createComposicaoFamiliarDto.cidadao_id,
          nome: createComposicaoFamiliarDto.nome,
          removed_at: IsNull(),
        },
      });

      if (nomeExistente) {
        throw new ConflictException(
          'Já existe um membro com este nome na composição familiar',
        );
      }

      // Normalizar campos de enum antes de criar
      const dadosNormalizados = normalizeEnumFields({
        ...createComposicaoFamiliarDto,
        cpf: cpfLimpo,
      });

      // Criar o membro da composição familiar
      const novoMembro =
        this.composicaoFamiliarRepository.create(dadosNormalizados);

      // Validar entidade
      const errors = await validate(novoMembro);
      if (errors.length > 0) {
        const errorMessages = errors
          .map((error) => Object.values(error.constraints || {}).join(', '))
          .join('; ');
        throw new BadRequestException(`Dados inválidos: ${errorMessages}`);
      }

      const membroSalvo = await queryRunner.manager.save(novoMembro);

      await queryRunner.commitTransaction();

      // Invalidar cache relacionado
      await this.invalidateCache(createComposicaoFamiliarDto.cidadao_id);

      // Converter para DTO de resposta
      const responseDto = plainToInstance(
        ComposicaoFamiliarResponseDto,
        membroSalvo,
        {
          excludeExtraneousValues: true,
          enableImplicitConversion: true,
        },
      );

      // Cachear o resultado
      await this.cacheService.set(
        `${this.CACHE_PREFIX}id:${membroSalvo.id}`,
        responseDto,
        this.CACHE_TTL,
      );

      this.logger.log(
        `Membro da composição familiar criado: ${membroSalvo.id} por usuário ${userId}`,
      );

      return responseDto;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Erro ao criar membro da composição familiar: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Lista membros da composição familiar por cidadão
   * @param cidadaoId ID do cidadão
   * @param options Opções de paginação
   * @returns Lista paginada de membros
   */
  async findByCidadao(
    cidadaoId: string,
    options: { page: number; limit: number },
  ): Promise<ComposicaoFamiliarPaginatedResponseDto> {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    // Verificar se o cidadão existe
    const cidadao = await this.cidadaoRepository.findOne({
      where: { id: cidadaoId },
    });

    if (!cidadao) {
      throw new NotFoundException('Cidadão não encontrado');
    }

    // Verificar cache
    const cacheKey = `${this.CACHE_PREFIX}cidadao:${cidadaoId}:page:${page}:limit:${limit}`;
    const cached =
      await this.cacheService.get<ComposicaoFamiliarPaginatedResponseDto>(
        cacheKey,
      );
    if (cached) {
      return cached;
    }

    // Buscar membros da composição familiar
    const [membros, total] =
      await this.composicaoFamiliarRepository.findAndCount({
        where: {
          cidadao_id: cidadaoId,
          removed_at: IsNull(),
        },
        order: {
          created_at: 'DESC',
        },
        skip: offset,
        take: limit,
      });

    // Converter para DTOs de resposta
    const data = membros.map((membro) =>
      plainToInstance(ComposicaoFamiliarResponseDto, membro, {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      }),
    );

    // Calcular estatísticas
    const estatisticas = await this.calcularEstatisticas(cidadaoId);

    const totalPages = Math.ceil(total / limit);
    const result: ComposicaoFamiliarPaginatedResponseDto = {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      estatisticas,
    };

    // Cachear resultado
    await this.cacheService.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * Busca um membro específico da composição familiar
   * @param id ID do membro
   * @returns Dados do membro
   */
  async findOne(id: string): Promise<ComposicaoFamiliarResponseDto> {
    // Verificar cache
    const cacheKey = `${this.CACHE_PREFIX}id:${id}`;
    const cached =
      await this.cacheService.get<ComposicaoFamiliarResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const membro = await this.composicaoFamiliarRepository.findOne({
      where: {
        id,
        removed_at: IsNull(),
      },
      relations: ['cidadao'],
    });

    if (!membro) {
      throw new NotFoundException(
        'Membro da composição familiar não encontrado',
      );
    }

    const responseDto = plainToInstance(ComposicaoFamiliarResponseDto, membro, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });

    // Cachear resultado
    await this.cacheService.set(cacheKey, responseDto, this.CACHE_TTL);

    return responseDto;
  }

  /**
   * Atualiza um membro da composição familiar
   * @param id ID do membro
   * @param updateComposicaoFamiliarDto Dados para atualização
   * @param userId ID do usuário que está atualizando
   * @returns Membro atualizado
   */
  async update(
    id: string,
    updateComposicaoFamiliarDto: UpdateComposicaoFamiliarDto,
    userId: string,
  ): Promise<ComposicaoFamiliarResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const membro = await this.composicaoFamiliarRepository.findOne({
        where: {
          id,
          removed_at: IsNull(),
        },
        relations: ['cidadao'],
      });

      if (!membro) {
        throw new NotFoundException(
          'Membro da composição familiar não encontrado',
        );
      }

      // Se o CPF está sendo atualizado, validar
      if (updateComposicaoFamiliarDto.cpf) {
        const cpfLimpo = updateComposicaoFamiliarDto.cpf.replace(/\D/g, '');
        const cpfValidator = new CPFValidator();
        if (!cpfValidator.validate(cpfLimpo, {} as any)) {
          throw new BadRequestException('CPF inválido');
        }

        // Verificar se já existe outro membro com o mesmo CPF
        const membroExistente = await this.composicaoFamiliarRepository.findOne(
          {
            where: {
              cidadao_id: membro.cidadao_id,
              cpf: cpfLimpo,
              id: Not(id),
              removed_at: IsNull(),
            },
          },
        );

        if (membroExistente) {
          throw new ConflictException(
            'Já existe um membro com este CPF na composição familiar',
          );
        }

        // Verificar se o CPF não é o mesmo do cidadão responsável
        if (membro.cidadao.cpf === cpfLimpo) {
          throw new ConflictException(
            'O CPF do membro não pode ser igual ao CPF do cidadão responsável',
          );
        }

        updateComposicaoFamiliarDto.cpf = cpfLimpo;
      }

      // Se o nome está sendo atualizado, validar
      if (updateComposicaoFamiliarDto.nome) {
        const nomeExistente = await this.composicaoFamiliarRepository.findOne({
          where: {
            cidadao_id: membro.cidadao_id,
            nome: updateComposicaoFamiliarDto.nome,
            id: Not(id),
            removed_at: IsNull(),
          },
        });

        if (nomeExistente) {
          throw new ConflictException(
            'Já existe um membro com este nome na composição familiar',
          );
        }
      }

      // Normalizar campos de enum antes de atualizar
      const dadosNormalizados = normalizeEnumFields({
        ...updateComposicaoFamiliarDto,
      });

      // Atualizar dados
      Object.assign(membro, dadosNormalizados);
      membro.updated_at = new Date();

      // Validar entidade
      const errors = await validate(membro);
      if (errors.length > 0) {
        const errorMessages = errors
          .map((error) => Object.values(error.constraints || {}).join(', '))
          .join('; ');
        throw new BadRequestException(`Dados inválidos: ${errorMessages}`);
      }

      const membroAtualizado = await queryRunner.manager.save(membro);

      await queryRunner.commitTransaction();

      // Invalidar cache
      await this.invalidateCache(membro.cidadao_id, id);

      const responseDto = plainToInstance(
        ComposicaoFamiliarResponseDto,
        membroAtualizado,
        {
          excludeExtraneousValues: true,
          enableImplicitConversion: true,
        },
      );

      // Atualizar cache
      await this.cacheService.set(
        `${this.CACHE_PREFIX}id:${id}`,
        responseDto,
        this.CACHE_TTL,
      );

      this.logger.log(
        `Membro da composição familiar atualizado: ${id} por usuário ${userId}`,
      );

      return responseDto;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Erro ao atualizar membro da composição familiar: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Remove um membro da composição familiar (soft delete)
   * @param id ID do membro
   * @param userId ID do usuário que está removendo
   */
  async remove(id: string, userId: string): Promise<void> {
    const membro = await this.composicaoFamiliarRepository.findOne({
      where: {
        id,
        removed_at: IsNull(),
      },
    });

    if (!membro) {
      throw new NotFoundException(
        'Membro da composição familiar não encontrado',
      );
    }

    // Soft delete
    membro.removed_at = new Date();
    await this.composicaoFamiliarRepository.save(membro);

    // Invalidar cache
    await this.invalidateCache(membro.cidadao_id, id);

    this.logger.log(
      `Membro da composição familiar removido: ${id} por usuário ${userId}`,
    );
  }

  /**
   * Busca membros da composição familiar por CPF
   * @param cpf CPF para busca
   * @returns Lista de membros encontrados
   */
  async findByCpf(cpf: string): Promise<ComposicaoFamiliarResponseDto[]> {
    const cpfLimpo = cpf.replace(/\D/g, '');

    if (cpfLimpo.length !== 11) {
      throw new BadRequestException('CPF deve ter 11 dígitos');
    }

    const membros = await this.composicaoFamiliarRepository.find({
      where: {
        cpf: cpfLimpo,
        removed_at: IsNull(),
      },
      relations: ['cidadao'],
      order: {
        created_at: 'DESC',
      },
    });

    return membros.map((membro) =>
      plainToInstance(ComposicaoFamiliarResponseDto, membro, {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      }),
    );
  }

  /**
   * Calcula estatísticas da composição familiar
   * @param cidadaoId ID do cidadão
   * @returns Estatísticas calculadas
   */
  private async calcularEstatisticas(cidadaoId: string) {
    const membros = await this.composicaoFamiliarRepository.find({
      where: {
        cidadao_id: cidadaoId,
        removed_at: IsNull(),
      },
    });

    const totalMembros = membros.length;
    const membrosComRenda = membros.filter(
      (m) => m.renda && m.renda > 0,
    ).length;
    const rendaTotal = membros.reduce((sum, m) => sum + (m.renda || 0), 0);
    const rendaMedia = membrosComRenda > 0 ? rendaTotal / membrosComRenda : 0;
    const idadeMedia =
      totalMembros > 0
        ? membros.reduce((sum, m) => sum + m.idade, 0) / totalMembros
        : 0;

    return {
      totalMembros,
      rendaTotal,
      rendaMedia: Math.round(rendaMedia * 100) / 100,
      idadeMedia: Math.round(idadeMedia * 100) / 100,
      membrosComRenda,
    };
  }

  /**
   * Invalida cache relacionado à composição familiar
   * @param cidadaoId ID do cidadão
   * @param membroId ID do membro (opcional)
   */
  private async invalidateCache(
    cidadaoId: string,
    membroId?: string,
  ): Promise<void> {
    const patterns = [
      `${this.CACHE_PREFIX}cidadao:${cidadaoId}:*`,
      `cidadao:id:${cidadaoId}`,
      `cidadao:list:*`,
    ];

    if (membroId) {
      patterns.push(`${this.CACHE_PREFIX}id:${membroId}`);
    }

    for (const pattern of patterns) {
      await this.cacheService.del(pattern);
    }
  }
}
