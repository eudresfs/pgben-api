import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DadosAluguelSocial } from '../../../entities/dados-aluguel-social.entity';
import {
  CreateDadosAluguelSocialDto,
  UpdateDadosAluguelSocialDto,
} from '../dto/create-dados-aluguel-social.dto';

/**
 * Serviço para gerenciar dados específicos de Aluguel Social
 */
@Injectable()
export class DadosAluguelSocialService {
  constructor(
    @InjectRepository(DadosAluguelSocial)
    private readonly dadosAluguelSocialRepository: Repository<DadosAluguelSocial>,
  ) {}

  /**
   * Criar dados de aluguel social para uma solicitação
   */
  async create(
    createDto: CreateDadosAluguelSocialDto,
  ): Promise<DadosAluguelSocial> {
    // Verificar se já existem dados para esta solicitação
    const existingData = await this.dadosAluguelSocialRepository.findOne({
      where: { solicitacao_id: createDto.solicitacao_id },
    });

    if (existingData) {
      throw new Error(
        'Já existem dados de aluguel social para esta solicitação',
      );
    }

    const dadosAluguelSocial =
      this.dadosAluguelSocialRepository.create(createDto);
    return this.dadosAluguelSocialRepository.save(dadosAluguelSocial);
  }

  /**
   * Buscar dados de aluguel social por ID
   */
  async findOne(id: string): Promise<DadosAluguelSocial> {
    const dadosAluguelSocial = await this.dadosAluguelSocialRepository.findOne({
      where: { id },
      relations: ['solicitacao'],
    });

    if (!dadosAluguelSocial) {
      throw new NotFoundException('Dados de aluguel social não encontrados');
    }

    return dadosAluguelSocial;
  }

  /**
   * Buscar dados de aluguel social por solicitação
   */
  async findBySolicitacao(solicitacaoId: string): Promise<DadosAluguelSocial> {
    const dadosAluguelSocial = await this.dadosAluguelSocialRepository.findOne({
      where: { solicitacao_id: solicitacaoId },
      relations: ['solicitacao'],
    });

    if (!dadosAluguelSocial) {
      throw new NotFoundException(
        'Dados de aluguel social não encontrados para esta solicitação',
      );
    }

    return dadosAluguelSocial;
  }

  /**
   * Atualizar dados de aluguel social
   */
  async update(
    id: string,
    updateDto: UpdateDadosAluguelSocialDto,
  ): Promise<DadosAluguelSocial> {
    const dadosAluguelSocial = await this.findOne(id);

    // Atualizar apenas os campos fornecidos
    Object.assign(dadosAluguelSocial, updateDto);

    return this.dadosAluguelSocialRepository.save(dadosAluguelSocial);
  }

  /**
   * Remover dados de aluguel social
   */
  async remove(id: string): Promise<void> {
    const dadosAluguelSocial = await this.findOne(id);
    await this.dadosAluguelSocialRepository.remove(dadosAluguelSocial);
  }

  /**
   * Verificar se existem dados de aluguel social para uma solicitação
   */
  async existsBySolicitacao(solicitacaoId: string): Promise<boolean> {
    const count = await this.dadosAluguelSocialRepository.count({
      where: { solicitacao_id: solicitacaoId },
    });
    return count > 0;
  }

  /**
   * Buscar todos os dados de aluguel social com paginação
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: DadosAluguelSocial[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.dadosAluguelSocialRepository.findAndCount({
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
   * Buscar dados por público prioritário
   */
  async findByPublicoPrioritario(
    publicoPrioritario: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: DadosAluguelSocial[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [data, total] = await this.dadosAluguelSocialRepository.findAndCount({
      where: { publico_prioritario: publicoPrioritario as any },
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
