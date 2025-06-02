import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DadosNatalidade } from '../../../entities/dados-natalidade.entity';
import { CreateDadosNatalidadeDto, UpdateDadosNatalidadeDto } from '../dto/create-dados-natalidade.dto';

/**
 * Serviço para gerenciar dados específicos de Auxílio Natalidade
 */
@Injectable()
export class DadosNatalidadeService {
  constructor(
    @InjectRepository(DadosNatalidade)
    private readonly dadosNatalidadeRepository: Repository<DadosNatalidade>,
  ) { }

  /**
   * Criar dados de natalidade para uma solicitação
   */
  async create(createDto: CreateDadosNatalidadeDto): Promise<DadosNatalidade> {
    // Verificar se já existem dados para esta solicitação
    const existingData = await this.dadosNatalidadeRepository.findOne({
      where: { solicitacao_id: createDto.solicitacao_id },
    });

    if (existingData) {
      throw new Error('Já existem dados de natalidade para esta solicitação');
    }

    const dadosNatalidade = this.dadosNatalidadeRepository.create(createDto);
    return this.dadosNatalidadeRepository.save(dadosNatalidade);
  }

  /**
   * Buscar dados de natalidade por ID
   */
  async findOne(id: string): Promise<DadosNatalidade> {
    const dadosNatalidade = await this.dadosNatalidadeRepository.findOne({
      where: { id },
      relations: ['solicitacao'],
    });

    if (!dadosNatalidade) {
      throw new NotFoundException('Dados de natalidade não encontrados');
    }

    return dadosNatalidade;
  }

  /**
   * Buscar dados de natalidade por solicitação
   */
  async findBySolicitacao(solicitacaoId: string): Promise<DadosNatalidade> {
    const dadosNatalidade = await this.dadosNatalidadeRepository.findOne({
      where: { solicitacao_id: solicitacaoId },
      relations: ['solicitacao'],
    });

    if (!dadosNatalidade) {
      throw new NotFoundException(
        'Dados de natalidade não encontrados para esta solicitação',
      );
    }

    return dadosNatalidade;
  }

  /**
   * Atualizar dados de natalidade
   */
  async update(
    id: string,
    updateDto: UpdateDadosNatalidadeDto,
  ): Promise<DadosNatalidade> {
    const dadosNatalidade = await this.findOne(id);

    // Atualizar apenas os campos fornecidos
    Object.assign(dadosNatalidade, updateDto);

    return this.dadosNatalidadeRepository.save(dadosNatalidade);
  }

  /**
   * Remover dados de natalidade
   */
  async remove(id: string): Promise<void> {
    const dadosNatalidade = await this.findOne(id);
    await this.dadosNatalidadeRepository.remove(dadosNatalidade);
  }

  /**
   * Verificar se existem dados de natalidade para uma solicitação
   */
  async existsBySolicitacao(solicitacaoId: string): Promise<boolean> {
    const count = await this.dadosNatalidadeRepository.count({
      where: { solicitacao_id: solicitacaoId },
    });
    return count > 0;
  }

  /**
   * Buscar todos os dados de natalidade com paginação
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: DadosNatalidade[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.dadosNatalidadeRepository.findAndCount({
      relations: ['solicitacao'],
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }
}