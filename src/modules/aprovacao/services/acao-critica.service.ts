import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcaoCritica } from '../entities/acao-critica.entity';
import { TipoAcaoCritica, PrioridadeAprovacao } from '../enums/aprovacao.enums';
import { CreateAcaoCriticaDto } from '../dtos/create-acao-critica.dto';
import { UpdateAcaoCriticaDto } from '../dtos/update-acao-critica.dto';

/**
 * Serviço responsável pelo gerenciamento de ações críticas
 * Gerencia as ações que podem requerer aprovação no sistema
 */
@Injectable()
export class AcaoCriticaService {
  constructor(
    @InjectRepository(AcaoCritica)
    private readonly acaoCriticaRepository: Repository<AcaoCritica>,
  ) {}

  /**
   * Cria uma nova ação crítica
   * @param createAcaoCriticaDto - Dados para criação da ação crítica
   * @returns Ação crítica criada
   */
  async create(
    createAcaoCriticaDto: CreateAcaoCriticaDto,
  ): Promise<AcaoCritica> {
    // Verifica se já existe uma ação crítica com o mesmo código
    const existingAcao = await this.acaoCriticaRepository.findOne({
      where: { codigo: createAcaoCriticaDto.codigo },
    });

    if (existingAcao) {
      throw new BadRequestException(
        `Já existe uma ação crítica com o código ${createAcaoCriticaDto.codigo}`,
      );
    }

    // Mapeia o enum PrioridadeAprovacao para número
    const nivelCriticidadeMap = {
      [PrioridadeAprovacao.BAIXA]: 1,
      [PrioridadeAprovacao.NORMAL]: 2,
      [PrioridadeAprovacao.ALTA]: 3,
      [PrioridadeAprovacao.CRITICA]: 4,
      [PrioridadeAprovacao.EMERGENCIAL]: 5,
    };

    const dadosAcao = {
      ...createAcaoCriticaDto,
      nivel_criticidade:
        nivelCriticidadeMap[createAcaoCriticaDto.nivel_criticidade] || 3,
    };

    const acaoCritica = this.acaoCriticaRepository.create(dadosAcao);
    const acaoCriticaSalva = await this.acaoCriticaRepository.save(acaoCritica);
    return acaoCriticaSalva;
  }

  /**
   * Lista todas as ações críticas
   * @param ativa - Filtro por status ativo/inativo
   * @returns Lista de ações críticas
   */
  async findAll(ativo?: boolean): Promise<AcaoCritica[]> {
    const where = ativo !== undefined ? { ativo } : {};
    return await this.acaoCriticaRepository.find({
      where,
      order: { nome: 'ASC' },
    });
  }

  /**
   * Busca uma ação crítica por ID
   * @param id - ID da ação crítica
   * @returns Ação crítica encontrada
   */
  async findOne(id: string): Promise<AcaoCritica> {
    const acaoCritica = await this.acaoCriticaRepository.findOne({
      where: { id },
    });

    if (!acaoCritica) {
      throw new NotFoundException(`Ação crítica com ID ${id} não encontrada`);
    }

    return acaoCritica;
  }

  /**
   * Busca uma ação crítica por código
   * @param codigo - Código da ação crítica
   * @returns Ação crítica encontrada
   */
  async findByCode(codigo: TipoAcaoCritica): Promise<AcaoCritica | null> {
    return await this.acaoCriticaRepository.findOne({
      where: { codigo },
    });
  }

  /**
   * Atualiza uma ação crítica
   * @param id - ID da ação crítica
   * @param updateAcaoCriticaDto - Dados para atualização
   * @returns Ação crítica atualizada
   */
  async update(
    id: string,
    updateAcaoCriticaDto: UpdateAcaoCriticaDto,
  ): Promise<AcaoCritica> {
    const acaoCritica = await this.findOne(id);

    // Mapeia o enum PrioridadeAprovacao para número se fornecido
    const dadosAtualizacao: any = { ...updateAcaoCriticaDto };
    if (updateAcaoCriticaDto.nivel_criticidade) {
      const nivelCriticidadeMap = {
        [PrioridadeAprovacao.BAIXA]: 1,
        [PrioridadeAprovacao.NORMAL]: 2,
        [PrioridadeAprovacao.ALTA]: 3,
        [PrioridadeAprovacao.CRITICA]: 4,
        [PrioridadeAprovacao.EMERGENCIAL]: 5,
      };
      dadosAtualizacao.nivel_criticidade =
        nivelCriticidadeMap[updateAcaoCriticaDto.nivel_criticidade] || 3;
    }

    Object.assign(acaoCritica, dadosAtualizacao);
    return await this.acaoCriticaRepository.save(acaoCritica);
  }

  /**
   * Remove uma ação crítica
   * @param id - ID da ação crítica
   */
  async remove(id: string): Promise<void> {
    const acaoCritica = await this.findOne(id);
    await this.acaoCriticaRepository.remove(acaoCritica);
  }

  /**
   * Ativa ou desativa uma ação crítica
   * @param id - ID da ação crítica
   * @param ativo - Status ativo/inativo
   * @returns Ação crítica atualizada
   */
  async toggleStatus(id: string, ativo: boolean): Promise<AcaoCritica> {
    const acaoCritica = await this.findOne(id);
    acaoCritica.ativo = ativo;
    return await this.acaoCriticaRepository.save(acaoCritica);
  }

  /**
   * Busca ações críticas por tipo
   * @param tipo - Tipo da ação crítica
   * @returns Lista de ações críticas do tipo
   */
  async findByType(tipo: TipoAcaoCritica): Promise<AcaoCritica[]> {
    return await this.acaoCriticaRepository.find({
      where: { tipo, ativo: true },
      order: { nome: 'ASC' },
    });
  }

  /**
   * Verifica se uma ação crítica está ativa
   * @param codigo - Código da ação crítica
   * @returns True se a ação está ativa
   */
  async isActive(codigo: TipoAcaoCritica): Promise<boolean> {
    const acaoCritica = await this.findByCode(codigo);
    return acaoCritica?.ativo || false;
  }

  /**
   * Lista todas as tags de ações críticas
   * @returns Lista de tags únicas
   */
  async getTags(): Promise<string[]> {
    const result = await this.acaoCriticaRepository.find({
      where: { ativo: true },
      select: ['tags'],
    });

    const allTags = result
      .filter((acao) => acao.tags && acao.tags.length > 0)
      .flatMap((acao) => acao.tags)
      .filter(Boolean);

    return [...new Set(allTags)].sort();
  }

  /**
   * Lista ações críticas com filtros
   * @param filtros - Filtros para busca
   * @returns Lista de ações críticas filtradas
   */
  async listarComFiltros(filtros: any = {}): Promise<AcaoCritica[]> {
    const where: any = {};
    
    if (filtros.ativo !== undefined) {
      where.ativo = filtros.ativo;
    }
    
    if (filtros.tipo) {
      where.tipo = filtros.tipo;
    }
    
    if (filtros.modulo) {
      where.modulo = filtros.modulo;
    }
    
    if (filtros.nivel_criticidade) {
      where.nivel_criticidade = filtros.nivel_criticidade;
    }
    
    return await this.acaoCriticaRepository.find({
      where,
      order: { nome: 'ASC' },
    });
  }

  /**
   * Obtém uma ação crítica por ID
   * @param id - ID da ação crítica
   * @returns Ação crítica encontrada
   */
  async obterPorId(id: string): Promise<AcaoCritica> {
    return this.findOne(id);
  }

  /**
   * Cria uma nova ação crítica (alias para create)
   * @param dados - Dados para criação
   * @returns Ação crítica criada
   */
  async criar(dados: CreateAcaoCriticaDto): Promise<AcaoCritica> {
    return this.create(dados);
  }

  /**
   * Atualiza uma ação crítica (alias para update)
   * @param id - ID da ação crítica
   * @param dados - Dados para atualização
   * @returns Ação crítica atualizada
   */
  async atualizar(id: string, dados: UpdateAcaoCriticaDto): Promise<AcaoCritica> {
    return this.update(id, dados);
  }

  /**
   * Remove uma ação crítica (alias para remove)
   * @param id - ID da ação crítica
   */
  async remover(id: string): Promise<void> {
    return this.remove(id);
  }
}
