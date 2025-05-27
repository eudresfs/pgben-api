import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracaoRenovacao } from '../entities/configuracao-renovacao.entity';

/**
 * Repositório para operações relacionadas à configuração de renovação automática
 */
@Injectable()
export class ConfiguracaoRenovacaoRepository {
  constructor(
    @InjectRepository(ConfiguracaoRenovacao)
    private readonly repository: Repository<ConfiguracaoRenovacao>,
  ) {}

  /**
   * Cria uma nova configuração de renovação automática
   * @param data Dados da configuração
   * @returns Configuração criada
   */
  async create(data: Partial<ConfiguracaoRenovacao>): Promise<ConfiguracaoRenovacao> {
    const configuracao = this.repository.create(data);
    return this.repository.save(configuracao);
  }

  /**
   * Busca todas as configurações de renovação
   * @returns Lista de configurações
   */
  async findAll(): Promise<ConfiguracaoRenovacao[]> {
    return this.repository.find({
      relations: ['tipoBeneficio'],
    });
  }

  /**
   * Busca uma configuração pelo ID
   * @param id ID da configuração
   * @returns Configuração encontrada ou null
   */
  async findById(id: string): Promise<ConfiguracaoRenovacao | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['tipoBeneficio'],
    });
  }

  /**
   * Busca uma configuração pelo ID do tipo de benefício
   * @param tipoBeneficioId ID do tipo de benefício
   * @returns Configuração encontrada ou null
   */
  async findByTipoBeneficio(tipoBeneficioId: string): Promise<ConfiguracaoRenovacao | null> {
    return this.repository.findOne({
      where: { tipo_beneficio_id: tipoBeneficioId },
      relations: ['tipoBeneficio'],
    });
  }

  /**
   * Busca todas as configurações ativas
   * @returns Lista de configurações ativas
   */
  async findAllActive(): Promise<ConfiguracaoRenovacao[]> {
    return this.repository.find({
      where: { ativo: true },
      relations: ['tipoBeneficio'],
    });
  }

  /**
   * Atualiza uma configuração existente
   * @param id ID da configuração
   * @param data Dados para atualização
   * @returns Configuração atualizada
   */
  async update(id: string, data: Partial<ConfiguracaoRenovacao>): Promise<ConfiguracaoRenovacao> {
    await this.repository.update(id, data);
    const configuracao = await this.findById(id);
    if (!configuracao) {
      throw new NotFoundException(`Configuração de renovação com ID ${id} não encontrada`);
    }
    return configuracao;
  }

  /**
   * Remove uma configuração
   * @param id ID da configuração
   */
  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
