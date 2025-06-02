import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DadosFuneral } from '../../../entities/dados-funeral.entity';
import { CreateDadosFuneralDto, UpdateDadosFuneralDto } from '../dto/create-dados-funeral.dto';

/**
 * Serviço para gerenciar dados específicos de Auxílio Funeral
 */
@Injectable()
export class DadosFuneralService {
  constructor(
    @InjectRepository(DadosFuneral)
    private readonly dadosFuneralRepository: Repository<DadosFuneral>,
  ) {}

  /**
   * Criar dados de funeral para uma solicitação
   */
  async create(createDto: CreateDadosFuneralDto): Promise<DadosFuneral> {
    // Verificar se já existem dados para esta solicitação
    const existingData = await this.dadosFuneralRepository.findOne({
      where: { solicitacao_id: createDto.solicitacao_id },
    });

    if (existingData) {
      throw new Error('Já existem dados de funeral para esta solicitação');
    }

    const dadosFuneral = this.dadosFuneralRepository.create(createDto);
    return this.dadosFuneralRepository.save(dadosFuneral);
  }

  /**
   * Buscar dados de funeral por ID
   */
  async findOne(id: string): Promise<DadosFuneral> {
    const dadosFuneral = await this.dadosFuneralRepository.findOne({
      where: { id },
      relations: ['solicitacao'],
    });

    if (!dadosFuneral) {
      throw new NotFoundException('Dados de funeral não encontrados');
    }

    return dadosFuneral;
  }

  /**
   * Buscar dados de funeral por solicitação
   */
  async findBySolicitacao(solicitacaoId: string): Promise<DadosFuneral> {
    const dadosFuneral = await this.dadosFuneralRepository.findOne({
      where: { solicitacao_id: solicitacaoId },
      relations: ['solicitacao'],
    });

    if (!dadosFuneral) {
      throw new NotFoundException(
        'Dados de funeral não encontrados para esta solicitação',
      );
    }

    return dadosFuneral;
  }

  /**
   * Atualizar dados de funeral
   */
  async update(
    id: string,
    updateDto: UpdateDadosFuneralDto,
  ): Promise<DadosFuneral> {
    const dadosFuneral = await this.findOne(id);

    // Atualizar apenas os campos fornecidos
    Object.assign(dadosFuneral, updateDto);

    return this.dadosFuneralRepository.save(dadosFuneral);
  }

  /**
   * Remover dados de funeral
   */
  async remove(id: string): Promise<void> {
    const dadosFuneral = await this.findOne(id);
    await this.dadosFuneralRepository.remove(dadosFuneral);
  }

  /**
   * Verificar se existem dados de funeral para uma solicitação
   */
  async existsBySolicitacao(solicitacaoId: string): Promise<boolean> {
    const count = await this.dadosFuneralRepository.count({
      where: { solicitacao_id: solicitacaoId },
    });
    return count > 0;
  }

  /**
   * Buscar todos os dados de funeral com paginação
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: DadosFuneral[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.dadosFuneralRepository.findAndCount({
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

  /**
   * Buscar dados por grau de parentesco
   */
  async findByGrauParentesco(
    grauParentesco: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: DadosFuneral[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.dadosFuneralRepository.findAndCount({
      where: { grau_parentesco_requerente: grauParentesco as any },
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

  /**
   * Buscar dados por período de óbito
   */
  async findByPeriodoObito(
    dataInicio: Date,
    dataFim: Date,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: DadosFuneral[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.dadosFuneralRepository.findAndCount({
      where: {
        data_obito: {
          gte: dataInicio,
          lte: dataFim,
        } as any,
      },
      relations: ['solicitacao'],
      skip: (page - 1) * limit,
      take: limit,
      order: { data_obito: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }
}