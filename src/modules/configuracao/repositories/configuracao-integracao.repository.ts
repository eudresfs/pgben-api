import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracaoIntegracao } from '../entities/configuracao-integracao.entity';
import { IntegracaoTipoEnum } from '../enums/integracao-tipo.enum';

/**
 * Repositório para gerenciamento de configurações de integração externa
 * 
 * Fornece operações de acesso a dados para entidade ConfiguracaoIntegracao
 */
@Injectable()
export class ConfiguracaoIntegracaoRepository {
  constructor(
    @InjectRepository(ConfiguracaoIntegracao)
    private readonly repository: Repository<ConfiguracaoIntegracao>,
  ) {}

  /**
   * Encontra uma configuração de integração pelo seu código
   * @param codigo Código da configuração
   * @returns Configuração encontrada ou null
   */
  async findByCodigo(codigo: string): Promise<ConfiguracaoIntegracao | null> {
    return this.repository.findOne({ where: { codigo } });
  }

  /**
   * Busca todas as configurações de integração
   * @param tipo Tipo opcional para filtrar integrações
   * @returns Lista de configurações
   */
  async findAll(tipo?: IntegracaoTipoEnum): Promise<ConfiguracaoIntegracao[]> {
    const whereClause = tipo ? { tipo } : {};
    return this.repository.find({ 
      where: whereClause,
      order: { tipo: 'ASC', codigo: 'ASC' }
    });
  }

  /**
   * Salva uma configuração de integração no banco de dados
   * @param integracao Configuração a ser salva
   * @returns Configuração salva
   */
  async save(integracao: ConfiguracaoIntegracao): Promise<ConfiguracaoIntegracao> {
    return this.repository.save(integracao);
  }

  /**
   * Remove uma configuração de integração do banco de dados
   * @param id ID da configuração a ser removida
   */
  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Busca configurações por tipo de integração
   * @param tipo Tipo das configurações
   * @returns Lista de configurações do tipo
   */
  async findByTipo(tipo: IntegracaoTipoEnum): Promise<ConfiguracaoIntegracao[]> {
    return this.repository.find({ 
      where: { tipo },
      order: { codigo: 'ASC' }
    });
  }

  /**
   * Verifica se existe uma configuração com o código especificado
   * @param codigo Código da configuração
   * @returns true se existir, false caso contrário
   */
  async existsByCodigo(codigo: string): Promise<boolean> {
    const count = await this.repository.count({ where: { codigo } });
    return count > 0;
  }

  /**
   * Encontra a configuração ativa para um determinado tipo de integração
   * @param tipo Tipo da integração
   * @returns Configuração ativa ou null
   */
  async findActiveByTipo(tipo: IntegracaoTipoEnum): Promise<ConfiguracaoIntegracao | null> {
    return this.repository.findOne({ 
      where: { tipo, ativo: true },
      order: { updated_at: 'DESC' }
    });
  }
}
