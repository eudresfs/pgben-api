import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoBeneficio, Solicitacao } from '../../../entities';
import {
  IBeneficioDataProvider,
  DadosBeneficio,
} from '../interfaces/pagamento-calculator.interface';
import { Status } from '@/enums';

/**
 * Serviço responsável por fornecer dados de benefício para o módulo de pagamento
 * sem criar dependência circular com o BeneficioModule.
 *
 * Este serviço implementa a interface IBeneficioDataProvider e acessa diretamente
 * as entidades através do TypeORM, mantendo a separação de responsabilidades.
 */
@Injectable()
export class BeneficioDataService implements IBeneficioDataProvider {
  constructor(
    @InjectRepository(TipoBeneficio)
    private readonly beneficioRepository: Repository<TipoBeneficio>,
    @InjectRepository(Solicitacao)
    private readonly solicitacaoRepository: Repository<Solicitacao>,
  ) {}

  /**
   * Busca os dados de um benefício por ID da solicitação
   * @param solicitacaoId ID da solicitação
   * @returns Dados do benefício ou null se não encontrado
   */
  async buscarDadosBeneficio(
    solicitacaoId: string,
  ): Promise<DadosBeneficio | null> {
    try {
      const solicitacao = await this.solicitacaoRepository.findOne({
        where: { id: solicitacaoId },
        relations: ['tipo_beneficio'],
      });

      if (!solicitacao?.tipo_beneficio) {
        return null;
      }

      const { tipo_beneficio } = solicitacao;

      return {
        id: tipo_beneficio.id,
        valor: tipo_beneficio.valor,
        periodicidade: tipo_beneficio.periodicidade,
        especificacoes: tipo_beneficio.especificacoes || {},
      };
    } catch (error) {
      console.error('Erro ao buscar dados do benefício:', error);
      return null;
    }
  }

  /**
   * Verifica se um benefício está ativo
   * @param beneficioId ID do benefício
   * @returns True se o benefício está ativo
   */
  async verificarBeneficioAtivo(beneficioId: string): Promise<boolean> {
    try {
      const tipo_beneficio = await this.beneficioRepository.findOne({
        where: { id: beneficioId },
        select: ['status'],
      });

      return tipo_beneficio?.status === Status.ATIVO;
    } catch (error) {
      console.error('Erro ao verificar se benefício está ativo:', error);
      return false;
    }
  }

  /**
   * Busca a configuração específica de um benefício
   * @param beneficioId ID do benefício
   * @returns Configuração do benefício
   */
  async buscarConfiguracaoBeneficio(
    beneficioId: string,
  ): Promise<Record<string, any>> {
    try {
      const tipo_beneficio = await this.beneficioRepository.findOne({
        where: { id: beneficioId },
        select: ['especificacoes'],
      });

      return tipo_beneficio?.especificacoes || {};
    } catch (error) {
      console.error('Erro ao buscar configuração do benefício:', error);
      return {};
    }
  }
}
