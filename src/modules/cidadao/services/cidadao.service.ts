import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CacheService } from '../../../shared/cache';
import { CidadaoRepository } from '../repositories/cidadao.repository';
import { CreateCidadaoDto } from '../dto/create-cidadao.dto';
import { UpdateCidadaoDto } from '../dto/update-cidadao.dto';
import {
  CidadaoResponseDto,
  CidadaoPaginatedResponseDto,
} from '../dto/cidadao-response.dto';
import { plainToInstance } from 'class-transformer';
import { PapelCidadaoService } from './papel-cidadao.service';
import { CPFValidator } from '../validators/cpf-validator';

/**
 * Serviço de cidadãos
 *
 * Responsável pela lógica de negócio relacionada a cidadãos/beneficiários
 */
@Injectable()
export class CidadaoService {
  private readonly logger = new Logger(CidadaoService.name);
  private readonly CACHE_TTL = 3600; // 1 hora em segundos
  private readonly CACHE_PREFIX = 'cidadao:';

  constructor(
    private readonly cidadaoRepository: CidadaoRepository,
    private readonly cacheService: CacheService,
    @Inject(forwardRef(() => PapelCidadaoService))
    private readonly papelCidadaoService: PapelCidadaoService,
  ) {}

  /**
   * Busca todos os cidadãos com filtros e paginação
   * @param options Opções de filtro e paginação
   * @returns Lista de cidadãos paginada
   */
  async findAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
    bairro?: string;
    unidadeId?: string;
    ativo?: boolean;
  }): Promise<CidadaoPaginatedResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      bairro,
      unidadeId,
      ativo,
    } = options || {};

    // Construir filtros
    const where: any = {};

    // Aplicar filtro de busca (nome, CPF ou NIS)
    if (search) {
      where.$or = [
        { nome: { $iLike: `%${search}%` } },
        { cpf: { $iLike: `%${search.replace(/\D/g, '')}%` } },
        { nis: { $iLike: `%${search.replace(/\D/g, '')}%` } },
      ];
    }

    // Aplicar filtro de bairro
    if (bairro) {
      where['endereco.bairro'] = { $iLike: `%${bairro}%` };
    }

    // Aplicar filtro de status (ativo/inativo)
    if (ativo !== undefined) {
      where.ativo = ativo;
    }

    // Aplicar filtro de unidade (se fornecido)
    if (unidadeId) {
      where.unidadeId = unidadeId;
    }

    // Calcular skip para paginação
    const skip = (page - 1) * limit;

    try {
      // Buscar cidadãos sem relacionamentos para melhor performance
      const [cidadaos, total] = await this.cidadaoRepository.findAll({
        where,
        skip,
        take: limit,
        order: { nome: 'ASC' },
        includeRelations: false, // Não carregar relacionamentos na listagem
      });

      // Calcular totais para paginação
      const pages = Math.ceil(total / limit);
      const hasNext = page < pages;
      const hasPrev = page > 1;

      // Mapear para o DTO de resposta
      const items = cidadaos.map((cidadao) =>
        plainToInstance(CidadaoResponseDto, cidadao, {
          excludeExtraneousValues: true,
          enableImplicitConversion: false,
        }),
      );

      return {
        items,
        meta: {
          total,
          page,
          limit,
          pages,
          hasNext,
          hasPrev,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Erro ao buscar cidadãos');
    }
  }

  /**
   * Busca um cidadão pelo ID
   * @param id ID do cidadão
   * @param includeRelations Se deve incluir relacionamentos
   * @returns Dados do cidadão
   * @throws NotFoundException se o cidadão não for encontrado
   */
  async findById(id: string, includeRelations = true): Promise<CidadaoResponseDto> {
    if (!id || id.trim() === '') {
      throw new BadRequestException('ID é obrigatório');
    }

    try {
      // Verificar cache
      const cacheKey = `${this.CACHE_PREFIX}id:${id}:${includeRelations ? 'full' : 'basic'}`;
      const cachedCidadao =
        await this.cacheService.get<CidadaoResponseDto>(cacheKey);

      if (cachedCidadao) {
        this.logger.debug(`Cache hit para cidadão ID: ${id}`);
        return cachedCidadao;
      }

      this.logger.debug(`Cache miss para cidadão ID: ${id}`);
      const cidadao = await this.cidadaoRepository.findById(id, includeRelations);

      if (!cidadao) {
        throw new NotFoundException('Cidadão não encontrado');
      }

      const cidadaoDto = plainToInstance(CidadaoResponseDto, cidadao, {
         excludeExtraneousValues: true,
         enableImplicitConversion: false,
       });

      // Armazenar no cache
      await this.cacheService.set(cacheKey, cidadaoDto, this.CACHE_TTL);

      return cidadaoDto;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Erro ao buscar cidadão: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Erro ao buscar cidadão');
    }
  }

  /**
   * Busca um cidadão pelo CPF
   * @param cpf CPF do cidadão (com ou sem formatação)
   * @param includeRelations Se deve incluir relacionamentos
   * @returns Dados do cidadão
   * @throws BadRequestException se o CPF for inválido
   * @throws NotFoundException se o cidadão não for encontrado
   */
  async findByCpf(cpf: string, includeRelations = false): Promise<CidadaoResponseDto> {
    if (!cpf || cpf.trim() === '') {
      throw new BadRequestException('CPF é obrigatório');
    }

    // Remover formatação do CPF
    const cpfLimpo = cpf.replace(/\D/g, '');

    // Validar CPF usando o CPFValidator
    const cpfValidator = new CPFValidator();
    if (!cpfValidator.validate(cpfLimpo, {} as any)) {
      throw new BadRequestException('CPF inválido');
    }

    try {
      // Verificar cache
      const cacheKey = `${this.CACHE_PREFIX}cpf:${cpfLimpo}:${includeRelations ? 'full' : 'basic'}`;
      const cachedCidadao =
        await this.cacheService.get<CidadaoResponseDto>(cacheKey);

      if (cachedCidadao) {
        this.logger.debug(`Cache hit para cidadão CPF: ${cpfLimpo}`);
        return cachedCidadao;
      }

      this.logger.debug(`Cache miss para cidadão CPF: ${cpfLimpo}`);
      const cidadao = await this.cidadaoRepository.findByCpf(cpfLimpo, includeRelations);

      if (!cidadao) {
        throw new NotFoundException('Cidadão não encontrado');
      }

      const cidadaoDto = plainToInstance(CidadaoResponseDto, cidadao, {
         excludeExtraneousValues: true,
         enableImplicitConversion: false,
       });

      // Armazenar no cache
      await this.cacheService.set(cacheKey, cidadaoDto, this.CACHE_TTL);
      // Também armazenar por ID para referência cruzada
      await this.cacheService.set(
        `${this.CACHE_PREFIX}id:${cidadao.id}:${includeRelations ? 'full' : 'basic'}`,
        cidadaoDto,
        this.CACHE_TTL,
      );

      return cidadaoDto;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      this.logger.error(
        `Erro ao buscar cidadão por CPF: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Erro ao buscar cidadão por CPF');
    }
  }

  /**
   * Busca um cidadão pelo NIS
   * @param nis Número do NIS (PIS/PASEP)
   * @param includeRelations Se deve incluir relacionamentos
   * @returns Dados do cidadão
   * @throws BadRequestException se o NIS for inválido
   * @throws NotFoundException se o cidadão não for encontrado
   */
  async findByNis(nis: string, includeRelations = false): Promise<CidadaoResponseDto> {
    if (!nis || nis.trim() === '') {
      throw new BadRequestException('NIS é obrigatório');
    }

    // Remover formatação do NIS
    const nisLimpo = nis.replace(/\D/g, '');

    // Validar NIS
    if (nisLimpo.length !== 11 || !/^\d{11}$/.test(nisLimpo)) {
      throw new BadRequestException('NIS deve ter 11 dígitos');
    }

    try {
      // Verificar cache
      const cacheKey = `${this.CACHE_PREFIX}nis:${nisLimpo}:${includeRelations ? 'full' : 'basic'}`;
      const cachedCidadao =
        await this.cacheService.get<CidadaoResponseDto>(cacheKey);

      if (cachedCidadao) {
        this.logger.debug(`Cache hit para cidadão NIS: ${nisLimpo}`);
        return cachedCidadao;
      }

      this.logger.debug(`Cache miss para cidadão NIS: ${nisLimpo}`);
      const cidadao = await this.cidadaoRepository.findByNis(nisLimpo, includeRelations);

      if (!cidadao) {
        throw new NotFoundException('Cidadão não encontrado');
      }

      const cidadaoDto = plainToInstance(CidadaoResponseDto, cidadao, {
         excludeExtraneousValues: true,
         enableImplicitConversion: false,
       });

      // Armazenar no cache
      await this.cacheService.set(
        `${this.CACHE_PREFIX}id:${cidadao.id}:${includeRelations ? 'full' : 'basic'}`,
        cidadaoDto,
        this.CACHE_TTL,
      );
      await this.cacheService.set(
        `${this.CACHE_PREFIX}cpf:${cidadao.cpf}:${includeRelations ? 'full' : 'basic'}`,
        cidadaoDto,
        this.CACHE_TTL,
      );

      if (cidadao.nis) {
        await this.cacheService.set(
          `${this.CACHE_PREFIX}nis:${cidadao.nis}:${includeRelations ? 'full' : 'basic'}`,
          cidadaoDto,
          this.CACHE_TTL,
        );
      }

      return cidadaoDto;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new InternalServerErrorException('Erro ao buscar cidadão por NIS');
    }
  }

  /**
   * Cria um novo cidadão
   * @param createCidadaoDto Dados do cidadão a ser criado
   * @param unidadeId ID da unidade responsável pelo cadastro
   * @param userId ID do usuário que está realizando o cadastro
   * @returns Cidadão criado
   * @throws ConflictException se já existir um cidadão com o mesmo CPF ou NIS
   */
  /**
   * Invalida o cache para um cidadão específico
   * @param cidadao Dados do cidadão
   * @param cpf CPF do cidadão (opcional)
   * @param nis NIS do cidadão (opcional)
   */
  private async invalidateCache(cidadao: any, cpf?: string, nis?: string): Promise<void> {
    try {
      const keys = [
        `${this.CACHE_PREFIX}id:${cidadao.id}:basic`,
        `${this.CACHE_PREFIX}id:${cidadao.id}:full`,
        `${this.CACHE_PREFIX}list:*`,
      ];

      // Invalidar cache por CPF
      if (cidadao.cpf || cpf) {
        const cpfNormalizado = (cidadao.cpf || cpf).replace(/\D/g, '');
        keys.push(`${this.CACHE_PREFIX}cpf:${cpfNormalizado}:basic`);
        keys.push(`${this.CACHE_PREFIX}cpf:${cpfNormalizado}:full`);
      }

      // Invalidar cache por NIS
      if (cidadao.nis || nis) {
        const nisNormalizado = (cidadao.nis || nis).replace(/\D/g, '');
        keys.push(`${this.CACHE_PREFIX}nis:${nisNormalizado}:basic`);
        keys.push(`${this.CACHE_PREFIX}nis:${nisNormalizado}:full`);
      }

      await Promise.all(keys.map((key) => this.cacheService.del(key)));
    } catch (error) {
      this.logger.error(
        `Erro ao invalidar cache: ${error.message}`,
        error.stack,
      );
    }
  }

  async create(
    createCidadaoDto: CreateCidadaoDto,
    unidadeId: string,
    userId: string,
  ): Promise<CidadaoResponseDto> {
    // Validar CPF
    if (!createCidadaoDto.cpf || createCidadaoDto.cpf.trim() === '') {
      throw new BadRequestException('CPF é obrigatório');
    }

    // Remover formatação do CPF e NIS
    const cpfLimpo = createCidadaoDto.cpf.replace(/\D/g, '');
    const nisLimpo = createCidadaoDto.nis?.replace(/\D/g, '') || null;

    // Validar formato do CPF
    if (cpfLimpo.length !== 11 || !/^\d{11}$/.test(cpfLimpo)) {
      throw new BadRequestException('CPF deve ter 11 dígitos');
    }

    // Validar formato do NIS se fornecido
    if (createCidadaoDto.nis && nisLimpo) {
      if (nisLimpo.length !== 11 || !/^\d{11}$/.test(nisLimpo)) {
        throw new BadRequestException('NIS deve ter 11 dígitos');
      }
    }

    try {
      // Verificar se já existe cidadão com o mesmo CPF
      const cpfExists = await this.cidadaoRepository.findByCpf(cpfLimpo);

      if (cpfExists) {
        throw new ConflictException(
          'Já existe um cidadão cadastrado com este CPF',
        );
      }

      // Verificar se já existe cidadão com o mesmo NIS (se fornecido)
      if (nisLimpo) {
        const nisExists = await this.cidadaoRepository.findByNis(nisLimpo);

        if (nisExists) {
          throw new ConflictException(
            'Já existe um cidadão cadastrado com este NIS',
          );
        }
      }

      // Extrair papéis do DTO para processar separadamente
      const { papeis, ...cidadaoData } = createCidadaoDto;

      // Criar o cidadão
      const cidadaoCriado = await this.cidadaoRepository.create({
        ...cidadaoData,
        cpf: cpfLimpo,
        nis: nisLimpo || undefined,
      });

      // Criar papéis para o cidadão, se fornecidos
      if (papeis && papeis.length > 0) {
        await this.papelCidadaoService.createMany(
          cidadaoCriado.id,
          papeis.map((papel) => ({
            tipo_papel: papel.tipo_papel,
            metadados: papel.metadados,
          })),
        );
      }

      // Buscar cidadão com papéis para retornar
      const cidadaoCompleto = await this.cidadaoRepository.findById(
        cidadaoCriado.id,
      );

      return plainToInstance(CidadaoResponseDto, cidadaoCompleto, {
        excludeExtraneousValues: true,
        enableImplicitConversion: false,
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (error instanceof BadRequestException) throw error;
      this.logger.error(
        `Erro ao criar cidadão: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Erro ao criar cidadão');
    }
  }

  /**
   * Atualiza um cidadão existente
   * @param id ID do cidadão a ser atualizado
   * @param updateCidadaoDto Dados a serem atualizados
   * @param userId ID do usuário que está realizando a atualização
   * @returns Cidadão atualizado
   * @throws NotFoundException se o cidadão não for encontrado
   * @throws ConflictException se já existir outro cidadão com o mesmo CPF ou NIS
   */
  async update(
    id: string,
    updateCidadaoDto: UpdateCidadaoDto,
    userId: string,
  ): Promise<CidadaoResponseDto> {
    try {
      // Verificar se o cidadão existe
      const cidadao = await this.cidadaoRepository.findById(id);

      if (!cidadao) {
        throw new NotFoundException('Cidadão não encontrado');
      }

      const updateData: any = { ...updateCidadaoDto };

      // Verificar se o CPF foi alterado e se já existe outro cidadão com o novo CPF
      if (updateCidadaoDto.cpf) {
        const cpfLimpo = updateCidadaoDto.cpf.replace(/\D/g, '');

        if (cpfLimpo !== cidadao.cpf) {
          const cpfExists = await this.cidadaoRepository.findByCpf(cpfLimpo);

          if (cpfExists) {
            throw new ConflictException(
              'Já existe um cidadão cadastrado com este CPF',
            );
          }

          // Atualizar o CPF formatado
          updateData.cpf = cpfLimpo;
        }
      }

      // Verificar se o NIS foi alterado e se já existe outro cidadão com o novo NIS
      if ('nis' in updateCidadaoDto) {
        const nisLimpo = updateCidadaoDto.nis
          ? updateCidadaoDto.nis.replace(/\D/g, '')
          : null;

        if (nisLimpo !== cidadao.nis) {
          if (nisLimpo) {
            const nisExists = await this.cidadaoRepository.findByNis(nisLimpo);

            if (nisExists) {
              throw new ConflictException(
                'Já existe um cidadão cadastrado com este NIS',
              );
            }
          }

          // Atualizar o NIS formatado
          updateData.nis = nisLimpo;
        }
      }

      // Informações de auditoria são gerenciadas automaticamente pelo TypeORM

      // Atualizar o cidadão
      const cidadaoAtualizado = await this.cidadaoRepository.update(
        id,
        updateData,
      );

      // Invalidar cache
      await this.invalidateCache(cidadaoAtualizado);

      const cidadaoDto = plainToInstance(
        CidadaoResponseDto,
        cidadaoAtualizado,
        {
          excludeExtraneousValues: true,
          enableImplicitConversion: true,
        },
      );

      // Atualizar cache com novos dados
      await this.cacheService.set(
        `${this.CACHE_PREFIX}id:${cidadaoAtualizado.id}`,
        cidadaoDto,
        this.CACHE_TTL,
      );
      await this.cacheService.set(
        `${this.CACHE_PREFIX}cpf:${cidadaoAtualizado.cpf}`,
        cidadaoDto,
        this.CACHE_TTL,
      );

      if (cidadaoAtualizado.nis) {
        await this.cacheService.set(
          `${this.CACHE_PREFIX}nis:${cidadaoAtualizado.nis}`,
          cidadaoDto,
          this.CACHE_TTL,
        );
      }

      return cidadaoDto;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      )
        throw error;
      throw new InternalServerErrorException('Erro ao atualizar cidadão');
    }
  }

  /**
   * Remove um cidadão (soft delete)
   * @param id ID do cidadão a ser removido
   * @param userId ID do usuário que está realizando a remoção
   * @throws NotFoundException se o cidadão não for encontrado
   */
  async remove(id: string, userId: string): Promise<void> {
    if (!id || id.trim() === '') {
      throw new BadRequestException('ID é obrigatório');
    }

    try {
      // Verificar se o cidadão existe
      const cidadao = await this.cidadaoRepository.findById(id);

      if (!cidadao) {
        throw new NotFoundException('Cidadão não encontrado');
      }

      // Realizar soft delete
      await this.cidadaoRepository.update(id, {
        removed_at: new Date(),
      });

      // Invalidar cache
      await this.invalidateCache(cidadao);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Erro ao remover cidadão');
    }
  }

  /**
   * Obtém histórico de solicitações de um cidadão
   * @param cidadaoId ID do cidadão
   * @returns Lista de solicitações do cidadão
   * @throws NotFoundException se o cidadão não for encontrado
   */
  async findSolicitacoesByCidadaoId(cidadaoId: string) {
    // Implementação futura
    return [];
  }

  /**
   * Adiciona um membro à composição familiar do cidadão
   * @param cidadaoId ID do cidadão
   * @param createComposicaoFamiliarDto Dados do membro familiar
   * @param userId ID do usuário que está fazendo a operação
   * @returns Cidadão atualizado
   */
  async addComposicaoFamiliar(
    cidadaoId: string,
    createComposicaoFamiliarDto: any,
    userId: string,
  ): Promise<CidadaoResponseDto> {
    try {
      // Verificar se o cidadão existe
      const cidadao = await this.cidadaoRepository.findById(cidadaoId);

      if (!cidadao) {
        throw new NotFoundException('Cidadão não encontrado');
      }

      // Adicionar membro à composição familiar usando o repositório
      const cidadaoAtualizado = await this.cidadaoRepository.addComposicaoFamiliar(
        cidadaoId,
        createComposicaoFamiliarDto,
      );

      // Invalidar cache
      await this.invalidateCache(cidadaoAtualizado);

      const cidadaoDto = plainToInstance(
        CidadaoResponseDto,
        cidadaoAtualizado,
        {
          excludeExtraneousValues: true,
          enableImplicitConversion: true,
        },
      );

      // Atualizar cache
      await this.cacheService.set(
        `${this.CACHE_PREFIX}id:${cidadaoAtualizado.id}`,
        cidadaoDto,
        this.CACHE_TTL,
      );

      return cidadaoDto;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(
        `Erro ao adicionar membro à composição familiar: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Erro ao adicionar membro à composição familiar',
      );
    }
  }
}
