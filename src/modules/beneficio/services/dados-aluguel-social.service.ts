import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DadosAluguelSocial } from '../../../entities/dados-aluguel-social.entity';
import { CreateDadosAluguelSocialDto, UpdateDadosAluguelSocialDto } from '../dto/create-dados-aluguel-social.dto';
import {
  AbstractDadosBeneficioService,
  IPaginatedResult,
} from './base/abstract-dados-beneficio.service';
import {
  BeneficioErrorContext,
  BeneficioValidationErrorBuilder,
  BENEFICIO_TECH_MESSAGES,
} from '../../../shared/exceptions/error-catalog/domains/beneficio.errors';
import { BENEFICIO_CONSTANTS } from '../../../shared/constants/beneficio.constants';

/**
 * Serviço para gerenciar dados específicos de Aluguel Social
 * Estende a classe base para reutilizar operações CRUD comuns
 */
@Injectable()
export class DadosAluguelSocialService extends AbstractDadosBeneficioService<
  DadosAluguelSocial,
  CreateDadosAluguelSocialDto,
  UpdateDadosAluguelSocialDto
> {
  constructor(
    @InjectRepository(DadosAluguelSocial)
    private readonly dadosAluguelSocialRepository: Repository<DadosAluguelSocial>,
    @Inject(CACHE_MANAGER) cacheManager: Cache,
  ) {
    super(dadosAluguelSocialRepository, 'DadosAluguelSocial', CreateDadosAluguelSocialDto, cacheManager);
  }

  // Métodos CRUD básicos herdados da classe base
  // create(), findOne(), findBySolicitacao(), update(), remove(), existsBySolicitacao(), findAll()

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

  // Implementação dos métodos abstratos da classe base
  /**
   * Construir contexto de erro específico para Aluguel Social
   */
  protected buildErrorContext(data: any): BeneficioErrorContext {
    return {
      data: {
        tipoBeneficio: 'ALUGUEL_SOCIAL',
        solicitacao_id: data.solicitacao_id,
        publico_prioritario: data.publico_prioritario,
        situacao_moradia_atual: data.situacao_moradia_atual,
        especificacoes: data.especificacoes,
      },
    };
  }

  /**
   * Validação específica para criação de dados de Aluguel Social
   */
  protected async validateCreateData(data: CreateDadosAluguelSocialDto): Promise<void> {
    const errorBuilder = new BeneficioValidationErrorBuilder();
    const rules = BENEFICIO_CONSTANTS.BUSINESS_RULES.ALUGUEL_SOCIAL;

    // Validação de campos obrigatórios
    if (!data.solicitacao_id) {
      errorBuilder.add('solicitacao_id', BENEFICIO_TECH_MESSAGES.ALUGUEL_SOCIAL.SOLICITACAO_ID_REQUIRED);
    }

    if (!data.publico_prioritario) {
      errorBuilder.add('publico_prioritario', BENEFICIO_TECH_MESSAGES.ALUGUEL_SOCIAL.PUBLICO_PRIORITARIO_REQUIRED);
    }

    // Validação de situação de moradia atual
    if (data.situacao_moradia_atual && data.situacao_moradia_atual.length < rules.MIN_SITUACAO_MORADIA) {
      errorBuilder.add('situacao_moradia_atual', BENEFICIO_TECH_MESSAGES.ALUGUEL_SOCIAL.SITUACAO_MORADIA_MIN_LENGTH);
    }

    // Validação de especificações
    if (data.especificacoes && data.especificacoes.length > rules.MAX_ESPECIFICACOES) {
      errorBuilder.add('especificacoes', BENEFICIO_TECH_MESSAGES.ALUGUEL_SOCIAL.ESPECIFICACOES_MAX_LENGTH);
    }

    errorBuilder.throwIfHasErrors();
  }

  /**
   * Validação específica para atualização de dados de Aluguel Social
   */
  protected async validateUpdateData(
    data: UpdateDadosAluguelSocialDto, 
    entity: DadosAluguelSocial
  ): Promise<void> {
    const errorBuilder = new BeneficioValidationErrorBuilder();
    const rules = BENEFICIO_CONSTANTS.BUSINESS_RULES.ALUGUEL_SOCIAL;

    // Validação de situação de moradia atual
    if (data.situacao_moradia_atual && data.situacao_moradia_atual.length < rules.MIN_SITUACAO_MORADIA) {
      errorBuilder.add('situacao_moradia_atual', BENEFICIO_TECH_MESSAGES.ALUGUEL_SOCIAL.SITUACAO_MORADIA_MIN_LENGTH);
    }

    // Validação de especificações
    if (data.especificacoes && data.especificacoes.length > rules.MAX_ESPECIFICACOES) {
      errorBuilder.add('especificacoes', BENEFICIO_TECH_MESSAGES.ALUGUEL_SOCIAL.ESPECIFICACOES_MAX_LENGTH);
    }

    errorBuilder.throwIfHasErrors();
  }
}
