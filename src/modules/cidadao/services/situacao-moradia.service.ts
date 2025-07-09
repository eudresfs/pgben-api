import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SituacaoMoradia } from '../../../entities/situacao-moradia.entity';
import { Cidadao } from '../../../entities/cidadao.entity';
import { CreateSituacaoMoradiaDto } from '../dto/create-situacao-moradia.dto';
import { UpdateSituacaoMoradiaDto } from '../dto/update-situacao-moradia.dto';
import { SituacaoMoradiaResponseDto } from '../dto/situacao-moradia-response.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class SituacaoMoradiaService {
  private readonly logger = new Logger(SituacaoMoradiaService.name);

  constructor(
    @InjectRepository(SituacaoMoradia)
    private readonly situacaoMoradiaRepository: Repository<SituacaoMoradia>,
    @InjectRepository(Cidadao)
    private readonly cidadaoRepository: Repository<Cidadao>,
  ) {}

  /**
   * Cria uma nova situação de moradia (UPSERT)
   */
  async create(
    dto: CreateSituacaoMoradiaDto,
  ): Promise<SituacaoMoradiaResponseDto> {
    return this.upsert(dto);
  }

  /**
   * Cria ou atualiza situação de moradia (UPSERT) com limpeza de campos
   */
  async upsert(
    dto: CreateSituacaoMoradiaDto,
  ): Promise<SituacaoMoradiaResponseDto> {
    this.logger.log(
      `Criando/atualizando situação de moradia para cidadão: ${dto.cidadao_id}`,
    );

    // Verifica se o cidadão existe
    const cidadao = await this.cidadaoRepository.findOne({
      where: { id: dto.cidadao_id },
    });

    if (!cidadao) {
      throw new NotFoundException(
        `Cidadão com ID ${dto.cidadao_id} não encontrado`,
      );
    }

    // Verifica se já existe registro
    const existing = await this.situacaoMoradiaRepository.findOne({
      where: { cidadao_id: dto.cidadao_id },
    });

    try {
      if (existing) {
        // Atualizar dados existentes, "limpando" campos não enviados
        const dadosAtualizados = {
          ...existing,
          // Campos obrigatórios
          cidadao_id: dto.cidadao_id,
          
          // Campos opcionais - limpar se não enviados
          tipo_moradia: dto.tipo_moradia ?? null,
          numero_comodos: dto.numero_comodos ?? null,
          valor_aluguel: dto.valor_aluguel ?? null,
          tempo_moradia: dto.tempo_moradia ?? null,
          possui_banheiro: dto.possui_banheiro ?? null,
          possui_energia_eletrica: dto.possui_energia_eletrica ?? null,
          possui_agua_encanada: dto.possui_agua_encanada ?? null,
          possui_coleta_lixo: dto.possui_coleta_lixo ?? null,
          moradia_cedida: dto.moradia_cedida ?? null,
          moradia_invadida: dto.moradia_invadida ?? null,
          tipo_desastre: dto.tipo_desastre ?? null,
          descricao_desastre: dto.descricao_desastre ?? null,
          outro_tipo_moradia: dto.outro_tipo_moradia ?? null,
          programa_habitacional: dto.programa_habitacional ?? null,
          inscrito_programa_habitacional: dto.inscrito_programa_habitacional ?? null,
          reside_2_anos_natal: dto.reside_2_anos_natal ?? null,
          despesas_mensais: dto.despesas_mensais ?? null,
          observacoes: dto.observacoes ?? null,
        };

        const updated = await this.situacaoMoradiaRepository.save(dadosAtualizados);
        this.logger.log(`Situação de moradia atualizada: ${updated.id}`);
        return plainToClass(SituacaoMoradiaResponseDto, updated, {
          excludeExtraneousValues: true,
        });
      } else {
        // Cria novo registro
        const situacaoMoradia = this.situacaoMoradiaRepository.create(dto);
        const saved = await this.situacaoMoradiaRepository.save(situacaoMoradia);
        this.logger.log(`Situação de moradia criada: ${saved.id}`);
        return plainToClass(SituacaoMoradiaResponseDto, saved, {
          excludeExtraneousValues: true,
        });
      }
    } catch (error) {
      this.logger.error(
        `Erro ao criar/atualizar situação de moradia: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Erro ao processar situação de moradia');
    }
  }

  /**
   * Cria ou atualiza situação de moradia (upsert)
   */
  async createOrUpdate(
    dto: CreateSituacaoMoradiaDto,
  ): Promise<SituacaoMoradiaResponseDto> {
    this.logger.log(
      `Criando ou atualizando situação de moradia para cidadão: ${dto.cidadao_id}`,
    );

    // Verifica se o cidadão existe
    const cidadao = await this.cidadaoRepository.findOne({
      where: { id: dto.cidadao_id },
    });

    if (!cidadao) {
      throw new NotFoundException(
        `Cidadão com ID ${dto.cidadao_id} não encontrado`,
      );
    }

    // Verifica se já existe registro
    const existing = await this.situacaoMoradiaRepository.findOne({
      where: { cidadao_id: dto.cidadao_id },
    });

    try {
      if (existing) {
        // Atualiza existente
        const updated = await this.situacaoMoradiaRepository.save({
          ...existing,
          ...dto,
        });
        this.logger.log(`Situação de moradia atualizada: ${updated.id}`);
        return plainToClass(SituacaoMoradiaResponseDto, updated, {
          excludeExtraneousValues: true,
        });
      } else {
        // Cria novo registro
        const situacaoMoradia = this.situacaoMoradiaRepository.create(dto);
        const saved =
          await this.situacaoMoradiaRepository.save(situacaoMoradia);
        this.logger.log(`Situação de moradia criada: ${saved.id}`);
        return plainToClass(SituacaoMoradiaResponseDto, saved, {
          excludeExtraneousValues: true,
        });
      }
    } catch (error) {
      this.logger.error(
        `Erro ao criar/atualizar situação de moradia: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Erro ao processar situação de moradia');
    }
  }

  /**
   * Lista todas as situações de moradia com paginação e busca
   */
  async findAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<SituacaoMoradiaResponseDto[]> {
    this.logger.log(
      `Buscando situações de moradia - Página: ${options?.page}, Limite: ${options?.limit}, Busca: ${options?.search}`,
    );

    const queryBuilder = this.situacaoMoradiaRepository
      .createQueryBuilder('situacao')
      .leftJoinAndSelect('situacao.cidadao', 'cidadao')
      .orderBy('situacao.created_at', 'DESC');

    // Aplicar filtro de busca se fornecido
    if (options?.search) {
      queryBuilder.where(
        '(cidadao.nome ILIKE :search OR cidadao.cpf ILIKE :search OR situacao.tipo_moradia ILIKE :search OR situacao.programa_habitacional ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    // Aplicar paginação se fornecida
    if (options?.page && options?.limit) {
      const skip = (options.page - 1) * options.limit;
      queryBuilder.skip(skip).take(options.limit);
    }

    const situacoes = await queryBuilder.getMany();

    return situacoes.map((situacao) =>
      plainToClass(SituacaoMoradiaResponseDto, situacao, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Busca situação de moradia por ID
   */
  async findOne(id: string): Promise<SituacaoMoradiaResponseDto> {
    this.logger.log(`Buscando situação de moradia: ${id}`);

    const situacao = await this.situacaoMoradiaRepository.findOne({
      where: { id },
      relations: ['cidadao'],
    });

    if (!situacao) {
      throw new NotFoundException(
        `Situação de moradia com ID ${id} não encontrada`,
      );
    }

    return plainToClass(SituacaoMoradiaResponseDto, situacao, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Busca situação de moradia por ID do cidadão
   */
  async findByCidadaoId(
    cidadaoId: string,
  ): Promise<SituacaoMoradiaResponseDto | null> {
    this.logger.log(`Buscando situação de moradia do cidadão: ${cidadaoId}`);

    const situacao = await this.situacaoMoradiaRepository.findOne({
      where: { cidadao_id: cidadaoId },
      relations: ['cidadao'],
    });

    if (!situacao) {
      return null;
    }

    return plainToClass(SituacaoMoradiaResponseDto, situacao, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Atualiza situação de moradia
   */
  async update(
    id: string,
    dto: UpdateSituacaoMoradiaDto,
  ): Promise<SituacaoMoradiaResponseDto> {
    this.logger.log(`Atualizando situação de moradia: ${id}`);

    const situacao = await this.situacaoMoradiaRepository.findOne({
      where: { id },
    });

    if (!situacao) {
      throw new NotFoundException(
        `Situação de moradia com ID ${id} não encontrada`,
      );
    }

    try {
      const updated = await this.situacaoMoradiaRepository.save({
        ...situacao,
        ...dto,
      });

      this.logger.log(`Situação de moradia atualizada com sucesso: ${id}`);
      return plainToClass(SituacaoMoradiaResponseDto, updated, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar situação de moradia: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Erro ao atualizar situação de moradia');
    }
  }

  /**
   * Remove situação de moradia (soft delete)
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Removendo situação de moradia: ${id}`);

    const situacao = await this.situacaoMoradiaRepository.findOne({
      where: { id },
    });

    if (!situacao) {
      throw new NotFoundException(
        `Situação de moradia com ID ${id} não encontrada`,
      );
    }

    try {
      await this.situacaoMoradiaRepository.softDelete(id);
      this.logger.log(`Situação de moradia removida com sucesso: ${id}`);
    } catch (error) {
      this.logger.error(
        `Erro ao remover situação de moradia: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Erro ao remover situação de moradia');
    }
  }

  /**
   * Verifica se cidadão possui situação de moradia cadastrada
   */
  async existsByCidadaoId(cidadaoId: string): Promise<boolean> {
    const count = await this.situacaoMoradiaRepository.count({
      where: { cidadao_id: cidadaoId },
    });
    return count > 0;
  }
}
