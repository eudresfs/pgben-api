import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DadosCestaBasica } from '../../../entities/dados-cesta-basica.entity';
import {
  CreateDadosCestaBasicaDto,
  UpdateDadosCestaBasicaDto,
} from '../dto/create-dados-cesta-basica.dto';

/**
 * Serviço para gerenciar dados específicos de Cesta Básica
 */
@Injectable()
export class DadosCestaBasicaService {
  constructor(
    @InjectRepository(DadosCestaBasica)
    private readonly dadosCestaBasicaRepository: Repository<DadosCestaBasica>,
  ) {}

  /**
   * Criar dados de cesta básica para uma solicitação
   */
  async create(
    createDto: CreateDadosCestaBasicaDto,
  ): Promise<DadosCestaBasica> {
    // Verificar se já existem dados para esta solicitação
    const existingData = await this.dadosCestaBasicaRepository.findOne({
      where: { solicitacao_id: createDto.solicitacao_id },
    });

    if (existingData) {
      throw new Error('Já existem dados de cesta básica para esta solicitação');
    }

    const dadosCestaBasica = this.dadosCestaBasicaRepository.create(createDto);
    return this.dadosCestaBasicaRepository.save(dadosCestaBasica);
  }

  /**
   * Buscar dados de cesta básica por ID
   */
  async findOne(id: string): Promise<DadosCestaBasica> {
    const dadosCestaBasica = await this.dadosCestaBasicaRepository.findOne({
      where: { id },
      relations: ['solicitacao'],
    });

    if (!dadosCestaBasica) {
      throw new NotFoundException('Dados de cesta básica não encontrados');
    }

    return dadosCestaBasica;
  }

  /**
   * Buscar dados de cesta básica por solicitação
   */
  async findBySolicitacao(solicitacaoId: string): Promise<DadosCestaBasica> {
    const dadosCestaBasica = await this.dadosCestaBasicaRepository.findOne({
      where: { solicitacao_id: solicitacaoId },
      relations: ['solicitacao'],
    });

    if (!dadosCestaBasica) {
      throw new NotFoundException(
        'Dados de cesta básica não encontrados para esta solicitação',
      );
    }

    return dadosCestaBasica;
  }

  /**
   * Atualizar dados de cesta básica
   */
  async update(
    id: string,
    updateDto: UpdateDadosCestaBasicaDto,
  ): Promise<DadosCestaBasica> {
    const dadosCestaBasica = await this.findOne(id);

    // Atualizar apenas os campos fornecidos
    Object.assign(dadosCestaBasica, updateDto);

    return this.dadosCestaBasicaRepository.save(dadosCestaBasica);
  }

  /**
   * Remover dados de cesta básica
   */
  async remove(id: string): Promise<void> {
    const dadosCestaBasica = await this.findOne(id);
    await this.dadosCestaBasicaRepository.remove(dadosCestaBasica);
  }

  /**
   * Verificar se existem dados de cesta básica para uma solicitação
   */
  async existsBySolicitacao(solicitacaoId: string): Promise<boolean> {
    const count = await this.dadosCestaBasicaRepository.count({
      where: { solicitacao_id: solicitacaoId },
    });
    return count > 0;
  }

  /**
   * Buscar todos os dados de cesta básica com paginação
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: DadosCestaBasica[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.dadosCestaBasicaRepository.findAndCount({
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
   * Buscar dados por período de concessão
   */
  async findByPeriodoConcessao(
    periodoConcessao: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: DadosCestaBasica[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.dadosCestaBasicaRepository.findAndCount({
      where: { periodo_concessao: periodoConcessao as any },
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
   * Buscar dados por origem do atendimento
   */
  async findByOrigemAtendimento(
    origemAtendimento: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: DadosCestaBasica[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.dadosCestaBasicaRepository.findAndCount({
      where: { origem_atendimento: origemAtendimento as any },
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
   * Buscar estatísticas de cestas básicas
   */
  async getEstatisticas(): Promise<{
    totalSolicitacoes: number;
    totalCestas: number;
    porPeriodo: Record<string, number>;
    porOrigem: Record<string, number>;
  }> {
    const totalSolicitacoes = await this.dadosCestaBasicaRepository.count();

    const totalCestasResult = await this.dadosCestaBasicaRepository
      .createQueryBuilder('dados')
      .select('SUM(dados.quantidade_cestas_solicitadas)', 'total')
      .getRawOne();

    const totalCestas = parseInt(totalCestasResult.total) || 0;

    // Estatísticas por período
    const porPeriodoResult = await this.dadosCestaBasicaRepository
      .createQueryBuilder('dados')
      .select('dados.periodo_concessao', 'periodo')
      .addSelect('COUNT(*)', 'quantidade')
      .groupBy('dados.periodo_concessao')
      .getRawMany();

    const porPeriodo = porPeriodoResult.reduce((acc, item) => {
      acc[item.periodo] = parseInt(item.quantidade);
      return acc;
    }, {});

    // Estatísticas por origem
    const porOrigemResult = await this.dadosCestaBasicaRepository
      .createQueryBuilder('dados')
      .select('dados.origem_atendimento', 'origem')
      .addSelect('COUNT(*)', 'quantidade')
      .groupBy('dados.origem_atendimento')
      .getRawMany();

    const porOrigem = porOrigemResult.reduce((acc, item) => {
      acc[item.origem] = parseInt(item.quantidade);
      return acc;
    }, {});

    return {
      totalSolicitacoes,
      totalCestas,
      porPeriodo,
      porOrigem,
    };
  }
}
